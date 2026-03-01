// app/quotes.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, ActivityIndicator,
    RefreshControl, Modal, TextInput, Alert, Pressable, ImageBackground, Image, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { s } from '../Home.styles';
import AvatarMenu from '@/components/menu';
import { Ionicons } from '@expo/vector-icons';
import { StyledText } from '@/components/StyledText';
import { colors } from '../../constants/Colors';
import { LaughIcon } from '@/components/LaughIcon';


const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';

// Your fixed user IDs + avatars
const RAN_ID = 'af71f37d-2d23-4060-a17a-7adb1b1ec683';
const TOM_ID = 'dc619321-d314-449c-bd2c-1aa3d12ec891';
const RanIcon = require('../../assets/images/ran-head-default.png');  // rename your files if needed
const TomIcon = require('../../assets/images/tom-head-default.png');

type Quip = {
    id: string;
    space_id: string;
    author_id: string;
    // said_by is optional legacy single person; we'll also use participants[]
    said_by: string | null;
    participants?: string[] | null; // NEW
    kind: 'quote' | 'funny';
    title: string | null;
    body: string;
    happened_at: string | null; // YYYY-MM-DD
    pinned: boolean | null;
    created_at: string;
    laugh_count: number;
};

type Filter = 'all' | 'ran' | 'tom';

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: active ? '#3C7A67' : '#E6F1EC',
                marginRight: 8,
            }}
        >
            <Text style={{ color: active ? '#FFFFFF' : '#0E1412', fontWeight: '700' }}>{label}</Text>
        </TouchableOpacity>
    );
}

function Row({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>{children}</View>
            {right}
        </View>
    );
}

function avatarFor(id?: string | null) {
    if (!id) return null;
    if (id === RAN_ID) return RanIcon;
    if (id === TOM_ID) return TomIcon;
    return null;
}

async function getPartnerId(myId: string) {
    const { data } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', SPACE_ID);
    const ids = (data ?? []).map((d: any) => d.user_id);
    return ids.find((id: string) => id !== myId) ?? null;
}

async function laughQuip(quipId: string) {
    const { data, error } = await supabase.rpc('react_quip_laugh', {
        p_space_id: SPACE_ID,
        p_quip_id: quipId,
    });
    if (error) throw error;
    return data; // { did_add, count }
}

export default function QuotesScreen() {
    // Filter All / Rán / Tom
    const [filter, setFilter] = useState<Filter>('all');

    const [rows, setRows] = useState<Quip[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [me, setMe] = useState<string | null>(null);
    const [partner, setPartner] = useState<string | null>(null);

    // Add modal state
    const [addOpen, setAddOpen] = useState(false);
    const [kind, setKind] = useState<'quote' | 'funny'>('quote');
    const [body, setBody] = useState('');
    const [title, setTitle] = useState('');
    const [happenedDate, setHappenedDate] = useState<Date | null>(null);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    type Who = 'me' | 'partner' | 'both';
    const [who, setWho] = useState<Who>('me');

    const [saving, setSaving] = useState(false);

    // load current user & partner
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getUser();
            const uid = data.user?.id ?? null;
            setMe(uid);
            if (uid) setPartner(await getPartnerId(uid));
        })();
    }, []);

    // Build the base query once (we fetch all kinds together)
    const load = useCallback(async () => {
        setLoading(true);

        // We fetch all rows, then filter in JS by participants
        const { data, error } = await supabase
            .from('quips')
            .select('*')
            .eq('space_id', SPACE_ID)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) console.warn(error.message);
        const list = (data as Quip[]) ?? [];

        // Normalize: ensure participants[] exists
        const normalized = list.map(q => ({
            ...q,
            participants: (q.participants && q.participants.length ? q.participants : (q.said_by ? [q.said_by] : [])),
        }));

        // client-side filter by participants
        let filtered = normalized;
        if (filter === 'ran') {
            filtered = normalized.filter(q => q.participants?.includes(RAN_ID));
        } else if (filter === 'tom') {
            filtered = normalized.filter(q => q.participants?.includes(TOM_ID));
        }

        setRows(filtered);
        setLoading(false);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    async function togglePin(id: string, pinned: boolean) {
        const { data, error } = await supabase
            .from('quips')
            .update({ pinned: !pinned })
            .eq('id', id)
            .eq('space_id', SPACE_ID)
            .select()
            .single();

        if (error) {
            Alert.alert('Error', error.message);
            return;
        }
        await load();
    }

    function formatYYYYMMDD(d: Date) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function formatPrettyFromYMD(ymd: string) {
        const [y, m, d] = ymd.split('-').map(Number);
        return formatPretty(new Date(y, (m - 1), d));
    }


    function formatPretty(d: Date) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
    }


    async function addQuip() {
        try {
            if (!body.trim() && kind === 'quote') return;
            if (kind === 'funny' && !title.trim() && !body.trim()) return;
            setSaving(true);

            const { data: authUser } = await supabase.auth.getUser();
            if (!authUser.user?.id) throw new Error('Not signed in');

            // Build participants based on who
            const parts: string[] = [];
            if (who === 'me') parts.push(authUser.user.id);
            if (who === 'partner' && partner) parts.push(partner);
            if (who === 'both') {
                parts.push(authUser.user.id);
                if (partner) parts.push(partner);
            }

            const payload: any = {
                space_id: SPACE_ID,
                author_id: authUser.user.id,
                kind,
                title: kind === 'funny' ? (title.trim() || null) : null,
                body: body.trim(),
                happened_at: happenedDate ? formatYYYYMMDD(happenedDate) : null,
                participants: parts,
            };

            // (Optionally keep said_by for legacy—set first participant)
            payload.said_by = parts[0] ?? null;

            const { error } = await supabase.from('quips').insert(payload);
            if (error) throw error;

            // reset
            setBody('');
            setTitle('');
            setHappenedDate(null);
            setWho('me');
            setKind('quote');
            setAddOpen(false);
            await load();
        } catch (e: any) {
            Alert.alert('Add failed', e.message ?? 'Unknown error');
        } finally {
            setSaving(false);
        }
    }

    // Per-row item
    function QuipRow({ item }: { item: Quip }) {
        const isQuote = item.kind === 'quote';
        const [laughs, setLaughs] = useState(item.laugh_count);
        const [justLaughed, setJustLaughed] = useState(false);

        const parts = item.participants && item.participants.length
            ? item.participants
            : (item.said_by ? [item.said_by] : []);

        // build avatar stack
        const avatars = parts.slice(0, 2).map((uid) => avatarFor(uid)).filter(Boolean) as any[];

        return (
            <View style={s.quoteCard} >
                <Row
                    right={
                        <Pressable
                            onPress={() => togglePin(item.id, !!item.pinned)}
                            style={({ pressed }) => ({
                                padding: 4,
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Ionicons
                                name={item.pinned ? 'pin' : 'pin-outline'}
                                size={20}
                                color={item.pinned ? 'lightgreen' /* gold */ : 'white' /* muted */}
                            />
                        </Pressable>
                    }
                >
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {/* Text */}
                            <View style={{ flex: 1 }}>
                                {isQuote ? (
                                    <StyledText style={{ fontSize: 20 }}>"{item.body}"</StyledText>
                                ) : (
                                    <>
                                        <Text style={{ fontSize: 15, fontFamily: 'ArefRuqaaInk-Bold', color: 'white' }}>{item.title || 'Funny moment'}</Text>
                                        {!!item.body && <Text style={{ marginTop: 2, fontSize: 12, fontFamily: 'ArefRuqaaInk-Regular', color: 'white' }}>{item.body}</Text>}
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </Row>

                {/* Meta */}
                <View style={s.quoteRow}>
                    <View style={{ display: 'flex', flexDirection: 'row', alignContent: 'center', justifyContent: 'center' }}>
                        {/* Avatar(s) */}
                        <View style={{ flexDirection: 'row' }}>
                            {avatars[0] && (
                                <Image
                                    source={avatars[0]}
                                    style={{ width: 36, height: 36, borderRadius: 12 }}
                                />
                            )}
                            {avatars[1] && (
                                <Image
                                    source={avatars[1]}
                                    style={{ width: 36, height: 36, marginLeft: -8 }}
                                />
                            )}
                        </View>
                        {!!item.happened_at && <Text style={{ opacity: 0.7, fontFamily: 'ArefRuqaaInk-Regular', color: 'white', marginLeft: 10 }}>• {formatPrettyFromYMD(item.happened_at)}</Text>}
                    </View>
                    {/* Laugh reaction */}
                    <Pressable
                        onPress={async () => {
                            try {
                                const res = await laughQuip(item.id);
                                setLaughs(res.count);
                                if (res.did_add) setJustLaughed(true);
                            } catch (e: any) {
                                Alert.alert('Could not react', e.message);
                            }
                        }}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: justLaughed ? 0.7 : 1 }}>
                            <LaughIcon size={22} color='white' />
                            <Text style={{ fontFamily: 'ArefRuqaaInk-Regular', color: 'white' }}>{laughs}</Text>
                        </View>
                    </Pressable>
                </View>



            </View>
        );
    }

    return (
        <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                {/* Header with filters */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row' }}>
                        <Pill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
                        <Pill label="Rán" active={filter === 'ran'} onPress={() => setFilter('ran')} />
                        <Pill label="Tom" active={filter === 'tom'} onPress={() => setFilter('tom')} />
                    </View>
                </View>

                {/* Body */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator />
                    </View>
                ) : rows.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Text style={{ opacity: 0.7 }}>No quotes or moments yet. Add one!</Text>
                    </View>
                ) : (
                    <FlatList
                        data={rows}
                        keyExtractor={(i) => i.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => <QuipRow item={item} />}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    />
                )}

                {/* Add floating button */}
                <TouchableOpacity
                    onPress={() => { setAddOpen(true); setKind('quote'); }}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Add modal */}
                <Modal transparent visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)}>
                    <Pressable
                        onPress={() => setAddOpen(false)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    >
                        <Pressable
                            onPress={() => { }}
                            style={{ backgroundColor: '#FFFFFF', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                        >
                            {/* Kind switch */}
                            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                                <TouchableOpacity
                                    onPress={() => setKind('quote')}
                                    style={{
                                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, marginRight: 8,
                                        backgroundColor: kind === 'quote' ? '#3C7A67' : '#E6F1EC',
                                    }}
                                >
                                    <Text style={{ color: kind === 'quote' ? '#fff' : '#0E1412', fontWeight: '700' }}>Quote</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setKind('funny')}
                                    style={{
                                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                                        backgroundColor: kind === 'funny' ? '#3C7A67' : '#E6F1EC',
                                    }}
                                >
                                    <Text style={{ color: kind === 'funny' ? '#fff' : '#0E1412', fontWeight: '700' }}>Moment</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Fields */}
                            {kind === 'funny' ? (
                                <>
                                    <View style={{ backgroundColor: '#F7FAF8', borderColor: '#CFE1D9', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                                        <TextInput
                                            placeholder="Short title (e.g., Spicy noodle disaster)"
                                            value={title}
                                            onChangeText={setTitle}
                                            style={{ fontSize: 16 }}
                                        />
                                    </View>
                                    <View style={{ backgroundColor: '#F7FAF8', borderColor: '#CFE1D9', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                                        <TextInput
                                            placeholder="Describe the moment…"
                                            value={body}
                                            onChangeText={setBody}
                                            multiline
                                            style={{ minHeight: 80, fontSize: 16 }}
                                        />
                                    </View>
                                </>
                            ) : (
                                <View style={{ backgroundColor: '#F7FAF8', borderColor: '#CFE1D9', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                                    <TextInput
                                        placeholder="What was said?"
                                        value={body}
                                        onChangeText={setBody}
                                        multiline
                                        style={{ minHeight: 80, fontSize: 16 }}
                                    />
                                </View>
                            )}

                            {/* Date: picker, not typing */}
                            <View style={{ marginBottom: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setDatePickerOpen(true)}
                                    style={{ backgroundColor: '#F7FAF8', borderColor: '#CFE1D9', borderWidth: 1, borderRadius: 12, padding: 12 }}
                                >
                                    <Text style={{ fontWeight: '700' }}>
                                        {happenedDate ? `Date: ${formatYYYYMMDD(happenedDate)}` : 'Pick a date (optional)'}
                                    </Text>
                                </TouchableOpacity>
                                {datePickerOpen && (
                                    <DateTimePicker
                                        mode="date"
                                        value={happenedDate ?? new Date()}
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        onChange={(_, d) => {
                                            setDatePickerOpen(false);
                                            if (d) setHappenedDate(d);
                                        }}
                                    />
                                )}
                            </View>

                            {/* Who: me / partner / both / none */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                <Text style={{ alignSelf: 'center' }}>Who:</Text>
                                {(['me', 'partner', 'both'] as Who[]).map(w => (
                                    <TouchableOpacity
                                        key={w}
                                        onPress={() => setWho(w)}
                                        style={{
                                            paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
                                            backgroundColor: who === w ? '#3C7A67' : '#E6F1EC'
                                        }}
                                    >
                                        <Text style={{ color: who === w ? '#fff' : '#0E1412', fontWeight: '700' }}>
                                            {w === 'me' ? 'You' : w === 'partner' ? 'Partner' : 'Both'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Actions */}
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <TouchableOpacity onPress={() => setAddOpen(false)} style={{ marginRight: 10 }}>
                                    <Text style={{ fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={addQuip}
                                    disabled={saving || (!body.trim() && kind === 'quote') || (kind === 'funny' && !title.trim() && !body.trim())}
                                    style={{
                                        backgroundColor: '#3C7A67',
                                        paddingVertical: 10, paddingHorizontal: 16,
                                        borderRadius: 999, opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Add'}</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </SafeAreaProvider>
        </ImageBackground>
    );
}
