// app/calendar.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Modal, TextInput, Switch, Alert, Platform, ImageBackground
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import AvatarMenu from '@/components/menu';
import { s } from '../Home.styles';
import { colors } from '@/constants/Colors';

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';

type EventRow = {
    id: string;
    space_id: string;
    title: string;
    description?: string | null;
    starts_at: string; // ISO (timestamptz)
    is_important?: boolean | null;
    created_at?: string | null;
};

/* ============================
   Yearly important dates (edit me)
   month: 1..12, day: 1..31
===============================*/
type Yearly = { title: string; month: number; day: number; description?: string };

const YEARLY_IMPORTANTS: Yearly[] = [
    // Personal (replace with yours)
    { title: "My Birthday 🎂", month: 5, day: 12, description: "Cake + cozy date" },
    { title: "Partner’s Birthday 🎉", month: 11, day: 3, description: "Dinner & movie night" },
    { title: "Anniversary 💚", month: 7, day: 28, description: "Our special day" },
    // Holidays
    { title: "New Year’s Day 🎆", month: 1, day: 1 },
    { title: "Valentine’s Day ❤️", month: 2, day: 14 },
    { title: "Christmas 🎄", month: 12, day: 25 },
];

/* Helpers for yearly */
function nextOccurrenceISO(month: number, day: number, from = new Date()): string {
    const m = from.getMonth() + 1;
    const y = (m > month || (m === month && from.getDate() > day))
        ? from.getFullYear() + 1
        : from.getFullYear();
    const dt = new Date(Date.UTC(y, month - 1, day, 12, 0, 0)); // noon UTC avoids TZ issues
    return dt.toISOString();
}
function occurrenceInRangeISO(month: number, day: number, start: Date, end: Date): string[] {
    const years = new Set<number>([start.getFullYear(), end.getFullYear()]);
    const out: string[] = [];
    years.forEach(y => {
        const dt = new Date(Date.UTC(y, month - 1, day, 12, 0, 0));
        if (dt >= start && dt <= end) out.push(dt.toISOString());
    });
    return out;
}
function yearlyToEventsForRange(rangeStart: Date, rangeEnd: Date): EventRow[] {
    const items: EventRow[] = [];
    for (const y of YEARLY_IMPORTANTS) {
        const isos = occurrenceInRangeISO(y.month, y.day, rangeStart, rangeEnd);
        for (const iso of isos) {
            items.push({
                id: `yr-${y.title}-${iso}`,
                space_id: SPACE_ID,
                title: y.title,
                description: y.description ?? null,
                starts_at: iso,
                is_important: true,
                created_at: iso,
            });
        }
    }
    return items;
}
function nextImportantYearly(from = new Date()): EventRow | null {
    let best: { iso: string; y: Yearly } | null = null;
    for (const y of YEARLY_IMPORTANTS) {
        const iso = nextOccurrenceISO(y.month, y.day, from);
        if (!best || iso < best.iso) best = { iso, y };
    }
    return best
        ? {
            id: `yr-next-${best.y.title}-${best.iso}`,
            space_id: SPACE_ID,
            title: best.y.title,
            description: best.y.description ?? null,
            starts_at: best.iso,
            is_important: true,
            created_at: best.iso,
        }
        : null;
}

/* ===== Calendar utilities ===== */
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function monthLabel(d: Date) {
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function isImportantHeuristic(e: EventRow) {
    if (e.is_important) return true;
    const t = (e.title || '').toLowerCase();
    return ['birthday', 'anniversary', 'christmas', 'valentine', 'holiday'].some(k => t.includes(k));
}

export default function CalendarScreen() {
    const [cursor, setCursor] = useState(new Date()); // current month cursor

    // data
    const [monthEvents, setMonthEvents] = useState<EventRow[]>([]);
    const [upcoming, setUpcoming] = useState<EventRow[]>([]);
    const [nextImportant, setNextImportant] = useState<EventRow | null>(null);

    // ui state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openDay, setOpenDay] = useState<Date | null>(null);

    // add-event composer state (now uses native pickers)
    const [addOpen, setAddOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [when, setWhen] = useState<Date>(new Date());
    const [desc, setDesc] = useState('');
    const [important, setImportant] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDate, setShowDate] = useState(false);
    const [showTime, setShowTime] = useState(false);

    const range = useMemo(() => ({
        start: startOfMonth(cursor),
        end: endOfMonth(cursor),
    }), [cursor]);

    // day -> events map
    const byDay = useMemo(() => {
        const map = new Map<string, EventRow[]>();
        monthEvents.forEach(ev => {
            const key = ymd(new Date(ev.starts_at));
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(ev);
        });
        return map;
    }, [monthEvents]);

    // month grid (Sunday start)
    const grid = useMemo(() => {
        const first = startOfMonth(cursor);
        const last = endOfMonth(cursor);
        const days: Date[] = [];
        const lead = first.getDay(); // 0..6
        for (let i = lead - 1; i >= 0; i--) {
            const d = new Date(first); d.setDate(first.getDate() - (i + 1)); days.push(d);
        }
        for (let d = 1; d <= last.getDate(); d++) {
            days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
        }
        while (days.length % 7 !== 0) {
            const d = new Date(days[days.length - 1]); d.setDate(d.getDate() + 1); days.push(d);
        }
        return days;
    }, [cursor]);

    // loader: DB + yearly merge
    const load = useCallback(async () => {
        try {
            setLoading(true);

            const [monthRes, upcomingRes] = await Promise.all([
                supabase
                    .from('events')
                    .select('*')
                    .eq('space_id', SPACE_ID)
                    .gte('starts_at', range.start.toISOString())
                    .lte('starts_at', range.end.toISOString())
                    .order('starts_at', { ascending: true }),
                supabase
                    .from('events')
                    .select('*')
                    .eq('space_id', SPACE_ID)
                    .gte('starts_at', new Date().toISOString())
                    .order('starts_at', { ascending: true })
                    .limit(50),
            ]);

            const monthDb = (monthRes.data ?? []) as EventRow[];
            const monthYearly = yearlyToEventsForRange(range.start, range.end);

            const monthCombined = [...monthDb, ...monthYearly].sort(
                (a, b) => (a.starts_at < b.starts_at ? -1 : 1)
            );
            setMonthEvents(monthCombined);

            const upcomingDb = (upcomingRes.data ?? []) as EventRow[];
            // build next 12 months of yearly occurrences (1–2 each)
            const now = new Date();
            const oneYearOut = new Date(now); oneYearOut.setFullYear(now.getFullYear() + 1);
            const upcomingYearly: EventRow[] = [];
            YEARLY_IMPORTANTS.forEach(y => {
                const firstIso = nextOccurrenceISO(y.month, y.day, now);
                const first = new Date(firstIso);
                if (first <= oneYearOut) {
                    upcomingYearly.push({
                        id: `yr-up-${y.title}-${firstIso}`,
                        space_id: SPACE_ID,
                        title: y.title,
                        description: y.description ?? null,
                        starts_at: firstIso,
                        is_important: true,
                        created_at: firstIso,
                    });
                    // optional 2nd occurrence (remove if you only want the next one)
                    const secondIso = nextOccurrenceISO(y.month, y.day, new Date(first.getTime() + 1000));
                    const second = new Date(secondIso);
                    if (second <= oneYearOut) {
                        upcomingYearly.push({
                            id: `yr-up-${y.title}-${secondIso}`,
                            space_id: SPACE_ID,
                            title: y.title,
                            description: y.description ?? null,
                            starts_at: secondIso,
                            is_important: true,
                            created_at: secondIso,
                        });
                    }
                }
            });

            const upcomingCombined = [...upcomingDb, ...upcomingYearly]
                .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));
            setUpcoming(upcomingCombined);

            // Choose earliest important between DB and Yearly
            const fromYearly = nextImportantYearly(now);
            const nextDbImportant = upcomingDb.find(e => e.is_important || isImportantHeuristic(e)) ?? null;
            const candidates = [fromYearly, nextDbImportant].filter(Boolean) as EventRow[];
            const nextImp = candidates.sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))[0] ?? null;
            setNextImportant(nextImp);
        } finally {
            setLoading(false);
        }
    }, [range.start, range.end]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    function DayCell({ date: d }: { date: Date }) {
        const inMonth = d.getMonth() === cursor.getMonth();
        const today = sameDay(d, new Date());
        const key = ymd(d);
        const hasEv = byDay.has(key);

        return (
            <TouchableOpacity
                onPress={() => {
                    if (inMonth && hasEv) setOpenDay(d);
                    if (inMonth && !hasEv) openAddForDate(d); // quick-add
                }}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 4, opacity: inMonth ? 1 : 0.4 }}
                activeOpacity={0.85}
            >
                <View style={{
                    flex: 1, borderRadius: 12,
                    borderWidth: today ? 2 : 1,
                    borderColor: today ? colors.mint : colors.stroke,
                    backgroundColor: colors.glass,
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{d.getDate()}</Text>
                    {hasEv ? <View style={{ height: 6 }} /> : null}
                    {hasEv ? (
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                            {[0, 1, 2].map(i => (
                                <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint }} />
                            ))}
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    }

    function openAddForDate(d?: Date | null) {
        setAddOpen(true);
        const base = d ? new Date(d) : new Date();
        base.setHours(18, 0, 0, 0); // default 6pm
        setWhen(base);
        setTitle('');
        setDesc('');
        setImportant(false);
    }

    async function saveEvent() {
        try {
            if (!title.trim()) { Alert.alert('Title required', 'Give your event a short title.'); return; }

            setSaving(true);
            const { error } = await supabase.from('events').insert({
                space_id: SPACE_ID,
                title: title.trim(),
                description: (desc || '').trim() || null,
                is_important: important,
                starts_at: when.toISOString(),
            });
            if (error) throw error;

            setAddOpen(false);
            await load();
        } catch (e: any) {
            Alert.alert('Save failed', e.message ?? 'Unknown error');
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

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                {/* Header / Month nav */}
                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => setCursor(addMonths(cursor, -1))}>
                        <Text style={{ color: colors.mint, fontWeight: '700', fontSize: 16 }}>← Prev</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{monthLabel(cursor)}</Text>
                    <TouchableOpacity onPress={() => setCursor(addMonths(cursor, 1))}>
                        <Text style={{ color: colors.mint, fontWeight: '700', fontSize: 16 }}>Next →</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 14 }}
                >
                    {/* Weekday header */}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                        {weekdayLabels.map((w) => (
                            <Text key={w} style={{ width: `${100 / 7}%`, textAlign: 'center', opacity: 0.6, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{w}</Text>
                        ))}
                    </View>

                    {/* Month grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {grid.map((d, i) => <DayCell key={i} date={d} />)}
                    </View>

                    {/* Upcoming dates (DB + yearly) */}
                    <View style={{
                        backgroundColor: colors.glass, borderColor: colors.stroke, borderWidth: 1,
                        borderRadius: 16, padding: 12,
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Upcoming dates</Text>
                        {upcoming.length === 0 ? (
                            <Text style={{ opacity: 0.7, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>No upcoming events.</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ flex: 1, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{upcoming[0].title}</Text>
                                <Text style={{ opacity: 0.7, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{new Date(upcoming[0].starts_at).toLocaleString()}</Text>
                            </View>
                        )}
                    </View>

                    {/* Next important (earliest of DB-important and Yearly) */}
                    <View style={{
                        backgroundColor: colors.glass, borderColor: colors.stroke, borderWidth: 1,
                        borderRadius: 16, padding: 12,
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Next important</Text>
                        {nextImportant ? (
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{nextImportant.title}</Text>
                                <Text style={{ opacity: 0.7, marginTop: 4, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{new Date(nextImportant.starts_at).toLocaleString()}</Text>
                                {!!nextImportant.description && <Text style={{ marginTop: 6, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{nextImportant.description}</Text>}
                            </View>
                        ) : (
                            <Text style={{ opacity: 0.7, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>No important events found.</Text>
                        )}
                    </View>
                </ScrollView>

                {/* Add button FAB */}
                <TouchableOpacity
                    onPress={() => openAddForDate(null)}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Day sheet */}
                <Modal transparent visible={!!openDay} animationType="fade" onRequestClose={() => setOpenDay(null)}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setOpenDay(null)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={{ backgroundColor: colors.darkgreen, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>
                                    {openDay ? openDay.toDateString() : ''}
                                </Text>
                                <TouchableOpacity onPress={() => { openAddForDate(openDay!); setOpenDay(null); }}>
                                    <Text style={{ color: colors.mint, fontWeight: '800', fontFamily: 'ArefRuqaaInk-Regular' }}>＋ Add on this day</Text>
                                </TouchableOpacity>
                            </View>
                            {openDay && (byDay.get(ymd(openDay)) ?? []).map(ev => (
                                <View key={ev.id} style={{ marginBottom: 10 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{ev.title}</Text>
                                    <Text style={{ opacity: 0.7, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>
                                        {new Date(ev.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {!!ev.description && <Text style={{ marginTop: 4, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{ev.description}</Text>}
                                </View>
                            ))}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* Add event sheet (with native date/time pickers) */}
                <Modal transparent visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setAddOpen(false)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={{ backgroundColor: colors.darkgreen, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Add event</Text>

                            <View style={{ borderWidth: 1, borderColor: colors.stroke, borderRadius: 12, padding: 10, backgroundColor: colors.glass, marginBottom: 8 }}>
                                <TextInput placeholder="Title (e.g., Sushi date)" value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} style={{ color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }} />
                            </View>

                            {/* Date & time selectors */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setShowDate(true)}
                                    style={{ flex: 1, borderWidth: 1, borderColor: colors.stroke, borderRadius: 12, padding: 12, backgroundColor: colors.glass }}
                                >
                                    <Text style={{ fontWeight: '700', marginBottom: 4, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Date</Text>
                                    <Text style={{ color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{when.toLocaleDateString()}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setShowTime(true)}
                                    style={{ width: 140, borderWidth: 1, borderColor: colors.stroke, borderRadius: 12, padding: 12, backgroundColor: colors.glass }}
                                >
                                    <Text style={{ fontWeight: '700', marginBottom: 4, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Time</Text>
                                    <Text style={{ color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Native pickers (conditional) */}
                            {showDate && (
                                <DateTimePicker
                                    value={when}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                                    onChange={(_, selected) => {
                                        setShowDate(Platform.OS === 'ios'); // keep inline open on iOS
                                        if (!selected) return;
                                        const next = new Date(when);
                                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                                        setWhen(next);
                                    }}
                                />
                            )}

                            {showTime && (
                                <DateTimePicker
                                    value={when}
                                    mode="time"
                                    is24Hour
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(_, selected) => {
                                        setShowTime(Platform.OS === 'ios');
                                        if (!selected) return;
                                        const next = new Date(when);
                                        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                                        setWhen(next);
                                    }}
                                />
                            )}

                            <View style={{ borderWidth: 1, borderColor: colors.stroke, borderRadius: 12, padding: 10, backgroundColor: colors.glass }}>
                                <TextInput
                                    placeholder="Description (optional)"
                                    value={desc}
                                    onChangeText={setDesc}
                                    multiline
                                    placeholderTextColor={colors.textMuted}
                                    style={{ minHeight: 64, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                                <Switch value={important} onValueChange={setImportant} />
                                <Text style={{ marginLeft: 8, color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>Mark as important</Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                                <TouchableOpacity onPress={() => setAddOpen(false)} style={{ marginRight: 10 }}>
                                    <Text style={{ fontWeight: '700', color: colors.mint, fontFamily: 'ArefRuqaaInk-Regular' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={saveEvent}
                                    disabled={saving || !title.trim()}
                                    style={{
                                        backgroundColor: colors.mint,
                                        paddingVertical: 10, paddingHorizontal: 16,
                                        borderRadius: 999, opacity: saving || !title.trim() ? 0.6 : 1
                                    }}
                                >
                                    <Text style={{ color: colors.darkgreen, fontWeight: '700', fontFamily: 'ArefRuqaaInk-Regular' }}>{saving ? 'Saving…' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaProvider>
        </ImageBackground>
    );
}
