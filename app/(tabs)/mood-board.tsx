// app/mood-board.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator,
    RefreshControl, ScrollView, Alert, Modal, TextInput, Image, ImageBackground, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import AvatarMenu from '@/components/menu';
import { s } from '../Home.styles';
import { colors } from '@/constants/Colors';

const MOOD_MIN = 1;
const MOOD_MAX = 13;

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';
const RAN_ID = "af71f37d-2d23-4060-a17a-7adb1b1ec683";
const TOM_ID = "dc619321-d314-449c-bd2c-1aa3d12ec891";
type Tab = 'today' | 'week' | 'month';

type MoodName =
    | 'angry'
    | 'grumpy'
    | 'sad'
    | 'stressed'
    | 'sick'
    | 'sleepy'
    | 'missing you'
    | 'bored'
    | 'horny'
    | 'calm'
    | 'confident'
    | 'happy'
    | 'exited';

const MOOD_ORDER: MoodName[] = [
    'angry',
    'grumpy',
    'sad',
    'stressed',
    'sick',
    'sleepy',
    'missing you',
    'bored',
    'horny',
    'calm',
    'confident',
    'happy',
    'exited',
];

const MOOD_SCALE: Record<MoodName, number> = {
    angry: 1,
    grumpy: 2,
    sad: 3,
    stressed: 4,
    sick: 5,
    sleepy: 6,
    'missing you': 7,
    bored: 8,
    horny: 9,
    calm: 10,
    confident: 11,
    happy: 12,
    exited: 13,
};


// swap these require() paths for the actual art
const ranMoods: Record<MoodName, any> = {
    angry: require('../../assets/images/ran-head-default.png'),
    grumpy: require('../../assets/images/ran-head-default.png'),
    sad: require('../../assets/images/ran-head-default.png'),
    stressed: require('../../assets/images/ran-head-default.png'),
    sick: require('../../assets/images/ran-head-default.png'),
    sleepy: require('../../assets/images/ran-head-default.png'),
    'missing you': require('../../assets/images/ran-head-default.png'),
    bored: require('../../assets/images/ran-head-default.png'),
    horny: require('../../assets/images/ran-head-default.png'),
    calm: require('../../assets/images/ran-head-default.png'),
    confident: require('../../assets/images/ran-head-default.png'),
    happy: require('../../assets/images/ran-head-default.png'),
    exited: require('../../assets/images/ran-head-default.png'),
};

const tomMoods: Record<MoodName, any> = {
    angry: require('../../assets/images/tom-head-default.png'),
    grumpy: require('../../assets/images/tom-head-default.png'),
    sad: require('../../assets/images/tom-head-default.png'),
    stressed: require('../../assets/images/tom-head-default.png'),
    sick: require('../../assets/images/tom-head-default.png'),
    sleepy: require('../../assets/images/tom-head-default.png'),
    'missing you': require('../../assets/images/tom-head-default.png'),
    bored: require('../../assets/images/tom-head-default.png'),
    horny: require('../../assets/images/tom-head-default.png'),
    calm: require('../../assets/images/tom-head-default.png'),
    confident: require('../../assets/images/tom-head-default.png'),
    happy: require('../../assets/images/tom-head-default.png'),
    exited: require('../../assets/images/tom-head-default.png'),
};

function moodImageFor(userId: string | null | undefined, mood: MoodName | null | undefined) {
    if (!userId || !mood) return null;
    if (userId === RAN_ID) return ranMoods[mood];
    if (userId === TOM_ID) return tomMoods[mood];
    return null;
}


type Mood = {
    id: string;
    space_id: string;
    user_id: string;
    score: number; // 1..13
    note: string | null;
    at: string;
    mood: MoodName;
};


function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                backgroundColor: active ? '#3C7A67' : '#E6F1EC', marginRight: 8,
            }}
        >
            <Text style={{ color: active ? '#FFFFFF' : '#0E1412', fontWeight: '700' }}>{label}</Text>
        </TouchableOpacity>
    );
}

function Card({ children, style }: any) {
    return (
        <View style={[{
            backgroundColor: colors.glass,
            borderColor: colors.stroke,
            borderWidth: 1,
            borderRadius: 16,
            padding: 12,
        }, style]}>
            {children}
        </View>
    );
}

// tiny bar chart (no deps)
function BarChart({ data, max = 5 }: { data: { label: string; value: number }[]; max?: number }) {
    if (!data.length) return <Text style={{ opacity: 0.6, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>No data yet.</Text>;
    const barMaxHeight = 120;
    return (
        <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: barMaxHeight + 6 }}>
                {data.map((d, i) => {
                    const h = Math.max(2, Math.round((d.value / max) * barMaxHeight));
                    return (
                        <View key={i} style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 18, height: h,
                                backgroundColor: colors.mint,
                                borderRadius: 6,
                            }} />
                        </View>
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 6 }}>
                {data.map((d, i) => (
                    <Text key={i} numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>
                        {d.label}
                    </Text>
                ))}
            </View>
        </View>
    );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
    if (!data || data.length === 0) {
        return (
            <Text style={{ opacity: 0.6, fontSize: 14 }}>
                No data yet.
            </Text>
        );
    }

    // chart dims
    const WIDTH = 280;
    const HEIGHT = 140;
    const PADDING_LEFT = 30;  // room for Y axis labels
    const PADDING_BOTTOM = 20; // room for X labels
    const innerW = WIDTH - PADDING_LEFT;
    const innerH = HEIGHT - PADDING_BOTTOM;

    // map value (1..13) to SVG y
    function yFor(v: number) {
        // clamp just in case
        const clamped = Math.max(MOOD_MIN, Math.min(MOOD_MAX, v));
        const t = (clamped - MOOD_MIN) / (MOOD_MAX - MOOD_MIN); // 0..1
        const yPx = innerH - t * innerH; // invert (top=high mood)
        return yPx;
    }

    // map index → x
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    function xFor(i: number) {
        return PADDING_LEFT + i * stepX;
    }

    // polyline points like "x,y x,y x,y"
    const polyPoints = data
        .map((d, i) => `${xFor(i)},${yFor(d.value)}`)
        .join(' ');

    // We'll render 3 reference mood ticks on Y: 1, 7, 13
    const yTicks = [
        { moodVal: 13, label: 'exited' },
        { moodVal: 7, label: 'neutral' },
        { moodVal: 1, label: 'angry' },
    ];

    return (
        <View style={{ width: WIDTH }}>
            <Svg width={WIDTH} height={HEIGHT}>

                {/* Y axis line */}
                <Line
                    x1={PADDING_LEFT}
                    y1={0}
                    x2={PADDING_LEFT}
                    y2={innerH}
                    stroke={colors.stroke}
                    strokeWidth={1}
                />

                {/* X axis line */}
                <Line
                    x1={PADDING_LEFT}
                    y1={innerH}
                    x2={WIDTH}
                    y2={innerH}
                    stroke={colors.stroke}
                    strokeWidth={1}
                />

                {/* horizontal tick lines + labels */}
                {yTicks.map((tick, idx) => {
                    const y = yFor(tick.moodVal);
                    return (
                        <React.Fragment key={idx}>
                            <Line
                                x1={PADDING_LEFT}
                                y1={y}
                                x2={WIDTH}
                                y2={y}
                                stroke={colors.stroke}
                                strokeDasharray="4,4"
                                strokeWidth={1}
                            />

                        </React.Fragment>
                    );
                })}

                {/* polyline of moods */}
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke={colors.mint}
                    strokeWidth={2}
                />

                {/* circles on each point */}
                {data.map((d, i) => (
                    <Circle
                        key={i}
                        cx={xFor(i)}
                        cy={yFor(d.value)}
                        r={3}
                        fill={colors.mint}
                    />
                ))}
            </Svg>

            {/* Overlay labels (Y axis on left, X axis under points) */}
            <View
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: WIDTH,
                    height: HEIGHT,
                    pointerEvents: 'none',
                }}
            >
                {/* Y-axis labels */}
                {yTicks.map((tick, idx) => {
                    const y = yFor(tick.moodVal);
                    return (
                        <Text
                            key={`ytick-${idx}`}
                            style={{
                                position: 'absolute',
                                left: 2,
                                top: y - 8,
                                fontSize: 9,
                                color: colors.text,
                                fontFamily: 'ArefRuqaaInk-Regular',
                            }}
                        >
                            {tick.label}
                        </Text>
                    );
                })}

                {/* X labels (time/day strings) */}
                {data.map((d, i) => {
                    const x = xFor(i);
                    return (
                        <Text
                            key={i}
                            numberOfLines={1}
                            style={{
                                position: 'absolute',
                                top: innerH + 2,
                                left: x - 20,
                                width: 40,
                                fontSize: 9,
                                color: colors.text,
                                textAlign: 'center',
                            }}
                        >
                            {d.label}
                        </Text>
                    );
                })}
            </View>
        </View>
    );
}

// helpers
async function getPartnerId(myId: string) {
    const { data } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', SPACE_ID);
    const ids = (data ?? []).map((d: any) => d.user_id);
    return ids.find((id: string) => id !== myId) ?? null;
}
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function iso(d: Date) { return d.toISOString(); }

function bucketMoods(moods: Mood[], tab: Tab) {
    const now = new Date();

    if (tab === 'today') {
        // all moods from today, in time order
        const todays = moods
            .filter(m => {
                const t = new Date(m.at);
                return (
                    t.getFullYear() === now.getFullYear() &&
                    t.getMonth() === now.getMonth() &&
                    t.getDate() === now.getDate()
                );
            })
            .sort((a, b) => (a.at < b.at ? -1 : 1))
            .map(m => ({
                label: new Date(m.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                value: m.score,          // 1..13
            }));

        return todays;
    }

    if (tab === 'week') {
        // last 7 calendar days (including today),
        // each point is avg score from that day
        const points: { label: string; value: number }[] = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);

            const y = d.getFullYear();
            const m = d.getMonth();
            const day = d.getDate();

            // moods from this exact calendar day
            const subset = moods.filter(mo => {
                const t = new Date(mo.at);
                return (
                    t.getFullYear() === y &&
                    t.getMonth() === m &&
                    t.getDate() === day
                );
            });

            let avg = 0;
            if (subset.length) {
                avg =
                    subset.reduce((sum, mo) => sum + mo.score, 0) /
                    subset.length;
            }

            points.push({
                label: d.toLocaleDateString([], { weekday: 'short' }), // "Mon"
                value: avg || 0,
            });
        }

        return points;
    }

    // tab === 'month'
    // last 30 days, each calendar day is a point
    const points: { label: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();

        const subset = moods.filter(mo => {
            const t = new Date(mo.at);
            return (
                t.getFullYear() === y &&
                t.getMonth() === m &&
                t.getDate() === day
            );
        });

        let avg = 0;
        if (subset.length) {
            avg =
                subset.reduce((sum, mo) => sum + mo.score, 0) /
                subset.length;
        }

        points.push({
            // label like "Oct 3" or just day number
            label: `${d.getDate()}/${d.getMonth() + 1}`,
            value: avg || 0,
        });
    }
    return points;
}


export default function MoodBoard() {
    const [tab, setTab] = useState<Tab>('today');

    const [me, setMe] = useState<string | null>(null);
    const [partner, setPartner] = useState<string | null>(null);

    const [rows, setRows] = useState<Mood[]>([]);
    const [myLatest, setMyLatest] = useState<Mood | null>(null);
    const [partnerLatest, setPartnerLatest] = useState<Mood | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Log mood modal state
    const [logOpen, setLogOpen] = useState(false);
    const [chosenMood, setChosenMood] = useState<MoodName | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getUser();
            const uid = data.user?.id ?? null;
            setMe(uid);
            if (uid) setPartner(await getPartnerId(uid));
        })();
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const from = daysAgo(30);
            const [{ data: all }, { data: myRow }, { data: partnerRow }] = await Promise.all([
                supabase.from('moods').select('*')
                    .eq('space_id', SPACE_ID)
                    .gte('at', iso(from))
                    .order('at', { ascending: true }),
                me ? supabase.from('moods').select('*').eq('space_id', SPACE_ID).eq('user_id', me).order('at', { ascending: false }).limit(1)
                    : Promise.resolve({ data: [] as any }),
                partner ? supabase.from('moods').select('*').eq('space_id', SPACE_ID).eq('user_id', partner).order('at', { ascending: false }).limit(1)
                    : Promise.resolve({ data: [] as any }),
            ]);
            setRows((all as Mood[]) ?? []);
            setMyLatest((myRow as any)?.[0] ?? null);
            setPartnerLatest((partnerRow as any)?.[0] ?? null);
        } catch (e: any) {
            Alert.alert('Load failed', e.message ?? 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [me, partner]);

    useEffect(() => { if (me !== undefined) load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const chartData = useMemo(() => bucketMoods(rows, tab), [rows, tab]);

    async function submitMood() {
        try {
            if (!chosenMood) {
                Alert.alert('Pick a mood', 'Choose how you feel.');
                return;
            }
            setSaving(true);

            const { data: authUser } = await supabase.auth.getUser();
            const uid = authUser.user?.id;
            if (!uid) throw new Error('Not signed in');

            const moodScore = MOOD_SCALE[chosenMood];

            const { error } = await supabase.from('moods').insert({
                space_id: SPACE_ID,
                user_id: uid,
                mood: chosenMood,          // NEW STRING FIELD
                score: moodScore,          // keep score for charts
                note: note.trim() || null,
                // at: new Date().toISOString()  // if your table doesn't default it
            });

            if (error) throw error;

            setLogOpen(false);
            setChosenMood(null);
            setNote('');
            await load();
        } catch (e: any) {
            Alert.alert('Log failed', e.message ?? 'Unknown error');
        } finally {
            setSaving(false);
        }
    }


    if (loading) {
        return (
            <SafeAreaProvider style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
            </SafeAreaProvider>
        );
    }


    return (
        <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                {/* Header with tabs */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row' }}>
                        <TabPill label="Today" active={tab === 'today'} onPress={() => setTab('today')} />
                        <TabPill label="Week" active={tab === 'week'} onPress={() => setTab('week')} />
                        <TabPill label="Month" active={tab === 'month'} onPress={() => setTab('month')} />
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Chart */}
                    <Card>
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: '700',
                                marginBottom: 10,
                                fontFamily: 'ArefRuqaaInk-Bold',
                                color: colors.text,
                            }}
                        >
                            Mood Trend
                        </Text>

                        <LineChart data={chartData} />
                    </Card>

                    {/* Current moods */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Card style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', marginBottom: 6, color: colors.text, }}>You</Text>
                            {myLatest ? (
                                <>

                                    <Image source={moodImageFor(myLatest?.user_id, myLatest?.mood)} style={{ width: 64, height: 64 }} resizeMode="contain" />

                                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{myLatest.mood}</Text>
                                    {myLatest.note ? <Text style={{ marginTop: 6, color: colors.text }}>{myLatest.note}</Text> : null}
                                    <Text style={{ opacity: 0.6, marginTop: 6, color: colors.text }}>{new Date(myLatest.at).toLocaleString()}</Text>
                                </>
                            ) : (
                                <Text style={{ opacity: 0.7, color: colors.text, }}>No mood yet.</Text>
                            )}
                        </Card>

                        <Card style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', marginBottom: 6, color: colors.text, }}>Partner</Text>
                            {partnerLatest ? (
                                <>
                                    <Image source={moodImageFor(partnerLatest?.user_id, partnerLatest?.mood)} style={{ width: 64, height: 64 }} resizeMode="contain" />
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{partnerLatest.mood}</Text>
                                    {partnerLatest.note ? <Text style={{ marginTop: 6, color: colors.text }}>{partnerLatest.note}</Text> : null}
                                    <Text style={{ opacity: 0.6, marginTop: 6, color: colors.text }}>{new Date(partnerLatest.at).toLocaleString()}</Text>
                                </>
                            ) : (
                                <Text style={{ opacity: 0.7, color: colors.text, }}>No mood yet.</Text>
                            )}
                        </Card>
                    </View>
                </ScrollView>

                {/* Add button */}
                <TouchableOpacity
                    onPress={() => setLogOpen(true)}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Log Mood modal */}
                <Modal
                    transparent
                    visible={logOpen}
                    animationType="fade"
                    onRequestClose={() => setLogOpen(false)}
                >
                    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setLogOpen(false); }}>
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            justifyContent: 'flex-end',
                        }}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        style={{
                                            backgroundColor: colors.darkgreen,
                                            padding: 16,
                                            borderTopLeftRadius: 16,
                                            borderTopRightRadius: 16,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: '700',
                                                marginBottom: 10,
                                                fontFamily: 'ArefRuqaaInk-Bold',
                                                color: colors.text,
                                            }}
                                        >
                                            Log your mood
                                        </Text>

                                        {/* mood picker grid */}
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                                justifyContent: 'space-between',
                                                marginBottom: 16,
                                            }}
                                        >
                                            {MOOD_ORDER.map((moodName) => {
                                                const imgSource = moodImageFor(me, moodName);
                                                const active = chosenMood === moodName;
                                                return (
                                                    <TouchableOpacity
                                                        key={moodName}
                                                        onPress={() => setChosenMood(moodName)}
                                                        style={{
                                                            width: 110,
                                                            height: 50,
                                                            backgroundColor: active ? colors.mint : colors.glass,
                                                            borderColor: active ? colors.mint : colors.stroke,
                                                            borderWidth: 1,
                                                            borderRadius: 12,
                                                            padding: 10,
                                                            marginBottom: 10,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                        }}
                                                    >
                                                        {imgSource ? (
                                                            <Image
                                                                source={imgSource}
                                                                style={{ width: 20, height: 40 }}
                                                                resizeMode="contain"
                                                            />
                                                        ) : null}

                                                        <Text
                                                            style={{
                                                                flexShrink: 1,
                                                                fontFamily: 'ArefRuqaaInk-Regular',
                                                                color: active ? colors.darkgreen : colors.text,
                                                                fontSize: 10,
                                                                fontWeight: active ? '700' : '400',
                                                            }}
                                                        >
                                                            {moodName}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Optional note */}
                                        <View
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.stroke,
                                                backgroundColor: colors.glass,
                                                borderRadius: 12,
                                                padding: 10,
                                            }}
                                        >
                                            <TextInput
                                                placeholder="Optional note…"
                                                value={note}
                                                onChangeText={setNote}
                                                multiline
                                                style={{
                                                    minHeight: 60,
                                                    fontSize: 16,
                                                    fontFamily: 'ArefRuqaaInk-Regular',
                                                    color: colors.text,
                                                }}
                                                placeholderTextColor={colors.textMuted}
                                            />
                                        </View>

                                        {/* Actions */}
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'flex-end',
                                                marginTop: 12,
                                            }}
                                        >
                                            <TouchableOpacity
                                                onPress={() => setLogOpen(false)}
                                                style={{ marginRight: 10 }}
                                            >
                                                <Text
                                                    style={{
                                                        fontWeight: '700',
                                                        fontFamily: 'ArefRuqaaInk-Regular',
                                                        color: colors.mint,
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={submitMood}
                                                disabled={saving || !chosenMood}
                                                style={{
                                                    backgroundColor: colors.mint,
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 16,
                                                    borderRadius: 999,
                                                    opacity: saving || !chosenMood ? 0.6 : 1,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: colors.darkgreen,
                                                        fontWeight: '700',
                                                        fontFamily: 'ArefRuqaaInk-Bold',
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    {saving ? 'Saving…' : 'Save'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                </KeyboardAvoidingView>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </SafeAreaProvider>
        </ImageBackground>
    );
}
