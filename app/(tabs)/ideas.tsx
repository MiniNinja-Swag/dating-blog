// app/ideas.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Animated,
    ImageBackground,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Pressable
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AvatarMenu from '@/components/menu';
import { s } from '../Home.styles';

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';

// ---------- types ----------
type Idea = {
    id: string;
    space_id: string;
    author_id: string;
    text: string;
    tags: string[] | null;
    pinned: boolean;
    done: boolean;
    created_at: string;
};

type Tab = 'list' | 'done' | 'pick';

// ---------- tiny ui bits ----------
function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: active ? '#0F3D2E' : '#E6F1EC',
                marginRight: 8,
                borderWidth: 1,
                borderColor: active ? '#D4AF37' : 'transparent',
            }}
        >
            <Text
                style={{
                    color: active ? '#D4AF37' : '#0E1412',
                    fontWeight: '700',
                    fontFamily: 'ArefRuqaaInk-Regular',
                    fontSize: 16,
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// This wraps each notebook "line"
function NotebookRowContainer({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderColor: 'rgba(15,61,46,0.08)', // faint green line like notebook rule
                flexDirection: 'row',
                alignItems: 'center',
            }}
        >
            {children}
        </View>
    );
}

// Checkbox button (done/undo)
function DoneCheckbox({
    checked,
    onPress,
}: {
    checked: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: '#0F3D2E',
                backgroundColor: checked ? '#0F3D2E' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
            }}
        >
            {checked ? (
                <Text
                    style={{
                        color: '#D4AF37',
                        fontWeight: '900',
                        fontSize: 12,
                    }}
                >
                    ✓
                </Text>
            ) : null}
        </TouchableOpacity>
    );
}

// Pin button
function PinButton({
    pinned,
    onPress,
}: {
    pinned: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
        >
            <Ionicons
                name="pin"
                size={20}
                color={pinned ? '#D4AF37' : '#0F3D2E'}
                style={{
                    transform: [{ rotate: '-20deg' }],
                }}
            />
        </TouchableOpacity>
    );
}

// Roulette list highlight result
function RouletteList({
    pickCandidates,
    spinning,
    winnerId,
    onSpin,
}: {
    pickCandidates: Idea[];
    spinning: boolean;
    winnerId: string | null;
    onSpin: () => void;
}) {
    return (
        <View style={{ gap: 8 }}>
            {pickCandidates.length === 0 ? (
                <Text style={{ opacity: 0.7, fontFamily: 'ArefRuqaaInk-Regular', fontSize: 16 }}>
                    Select ideas below to include in the spin.
                </Text>
            ) : (
                <View
                    style={{
                        backgroundColor: '#FFFDF7',
                        borderWidth: 1,
                        borderColor: '#CFE1D9',
                        borderRadius: 12,
                        padding: 8,
                    }}
                >
                    {pickCandidates.map((i) => (
                        <View
                            key={i.id}
                            style={{
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                backgroundColor: winnerId === i.id ? '#FFD766' : 'transparent',
                            }}
                        >
                            <Text
                                style={{
                                    fontWeight: '700',
                                    fontFamily: 'ArefRuqaaInk-Regular',
                                    fontSize: 16,
                                    color: '#0F3D2E',
                                }}
                            >
                                {i.text}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity
                onPress={onSpin}
                disabled={spinning || pickCandidates.length < 2 || pickCandidates.length > 10}
                style={{
                    alignSelf: 'center',
                    backgroundColor: '#0F3D2E',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    opacity: spinning ? 0.7 : 1,
                    marginTop: 4,
                    marginBottom: 40,
                    borderWidth: 1,
                    borderColor: '#D4AF37',
                }}
            >
                <Text
                    style={{
                        color: '#D4AF37',
                        fontWeight: '800',
                        fontFamily: 'ArefRuqaaInk-Regular',
                        fontSize: 16,
                    }}
                >
                    {spinning ? 'Choosing…' : 'Spin'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}


// ---------- main screen ----------
export default function IdeasScreen() {
    const [tab, setTab] = useState<Tab>('list');
    const [rows, setRows] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add idea modal
    const [addOpen, setAddOpen] = useState(false);
    const [newText, setNewText] = useState('');
    const [saving, setSaving] = useState(false);

    // Roulette
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [spinning, setSpinning] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Derived lists
    const undone = useMemo(
        () =>
            rows
                .filter((r) => !r.done)
                .sort(
                    (a, b) =>
                        Number(b.pinned) - Number(a.pinned) ||
                        (a.created_at < b.created_at ? 1 : -1)
                ),
        [rows]
    );

    const done = useMemo(
        () =>
            rows
                .filter((r) => r.done)
                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        [rows]
    );

    // fetch ideas
    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ideas')
            .select('*')
            .eq('space_id', SPACE_ID)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) console.warn(error.message);
        setRows((data as Idea[]) ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    // ---- actions ----
    async function togglePin(id: string, pinned: boolean) {
        // optimistic update so tap feels instant
        setRows((prev) =>
            prev.map((row) =>
                row.id === id ? { ...row, pinned: !pinned } : row
            )
        );

        const { error } = await supabase
            .from('ideas')
            .update({ pinned: !pinned })
            .eq('id', id);

        if (error) {
            Alert.alert('Error', error.message);
            // revert if failed
            setRows((prev) =>
                prev.map((row) =>
                    row.id === id ? { ...row, pinned: pinned } : row
                )
            );
        }
    }

    async function toggleDone(id: string, doneVal: boolean) {
        // optimistic update
        setRows((prev) =>
            prev.map((row) =>
                row.id === id ? { ...row, done: !doneVal } : row
            )
        );

        const { error } = await supabase
            .from('ideas')
            .update({ done: !doneVal })
            .eq('id', id);

        if (error) {
            Alert.alert('Error', error.message);
            // revert if failed
            setRows((prev) =>
                prev.map((row) =>
                    row.id === id ? { ...row, done: doneVal } : row
                )
            );
        }
    }

    async function addIdea() {
        try {
            if (!newText.trim()) return;
            setSaving(true);
            const { data: authUser } = await supabase.auth.getUser();

            const insertRes = await supabase.from('ideas').insert({
                space_id: SPACE_ID,
                author_id: authUser.user?.id,
                text: newText.trim(),
            }).select('*').single(); // grab the new row so we can add it locally

            if (insertRes.error) throw insertRes.error;
            const newRow: Idea = insertRes.data;

            // optimistic prepend
            setRows((prev) => [newRow, ...prev]);

            setNewText('');
            setAddOpen(false);
            setTab('list');
        } catch (e: any) {
            Alert.alert('Add failed', e.message ?? 'Unknown error');
        } finally {
            setSaving(false);
        }
    }

    async function deleteIdea(id: string) {
        // optimistic delete
        setRows((prev) => prev.filter((row) => row.id !== id));

        const { error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', id);

        if (error) {
            Alert.alert('Delete failed', error.message);
            // revert optimistic delete by reloading
            load();
        }
    }

    // ----- roulette helpers -----
    const pickCandidates = useMemo(
        () => undone.filter((i) => selected[i.id]),
        [undone, selected]
    );

    function toggleSelect(id: string) {
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
        setWinnerId(null);
    }

    async function spin() {
        if (spinning) return;

        // basic safety checks stay the same
        if (pickCandidates.length < 2) {
            Alert.alert('Pick more', 'Select at least 2 ideas to spin.');
            return;
        }
        if (pickCandidates.length > 10) {
            Alert.alert('Too many', 'Select up to 10 ideas for the roulette.');
            return;
        }

        setSpinning(true);
        setWinnerId(null);

        // pick instantly
        const finalIndex = Math.floor(Math.random() * pickCandidates.length);
        const win = pickCandidates[finalIndex];
        setWinnerId(win.id);

        // log the pick in roulette_picks like before
        try {
            const { data: authUser } = await supabase.auth.getUser();
            await supabase.from('roulette_picks').insert({
                space_id: SPACE_ID,
                chooser_id: authUser.user?.id,
                idea_ids: pickCandidates.map((i) => i.id),
                winner_id: win.id,
            });
        } catch {
            // ignore failure to log
        }

        setSpinning(false);
    }


    // ----- per-row renderers -----
    function IdeaRow({ item }: { item: Idea }) {
        return (
            <NotebookRowContainer>
                {/* left side: checkbox */}
                <DoneCheckbox
                    checked={item.done}
                    onPress={() => toggleDone(item.id, item.done)}
                />

                {/* middle: idea text */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 18,
                            fontFamily: 'ArefRuqaaInk-Regular',
                            color: '#0F3D2E',
                            textDecorationLine: item.done ? 'line-through' : 'none',
                            opacity: item.done ? 0.5 : 1,
                        }}
                    >
                        {item.text}
                    </Text>
                </View>

                {/* right side: pin & delete */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <PinButton
                        pinned={item.pinned}
                        onPress={() => togglePin(item.id, item.pinned)}
                    />
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                'Delete idea',
                                'Are you sure?',
                                [
                                    { text: 'Cancel', onPress: () => { }, style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        onPress: () => deleteIdea(item.id),
                                        style: 'destructive',
                                    },
                                ]
                            );
                        }}
                    >
                        <Ionicons name="trash-outline" size={20} color="#CF6679" />
                    </TouchableOpacity>
                </View>
            </NotebookRowContainer>
        );
    }

    function PickRow({ item }: { item: Idea }) {
        return (
            <TouchableOpacity
                onPress={() => toggleSelect(item.id)}
                style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(15,61,46,0.08)',
                }}
            >
                <Text
                    style={{
                        fontSize: 18,
                        fontFamily: 'ArefRuqaaInk-Regular',
                        color: '#0F3D2E',
                    }}
                >
                    {item.text}
                </Text>
            </TouchableOpacity>
        );
    }

    // ----- notebook background -----
    // You can swap for an actual image of paper if you want.
    // For now: warm cream bg with vertical margin box.
    function ScreenBackground({ children }: { children: React.ReactNode }) {
        return (
            <ImageBackground
                // replace with your painterly paper texture for extra cuteness:
                // source={require('../assets/images/notebook-paper.png')}
                source={require('../../assets/images/background.png')}
                style={{ flex: 1 }}
                imageStyle={{ opacity: 0.4 }}
            >
                <View
                    style={{
                        flex: 1,
                        marginTop: 40,
                        backgroundColor: 'rgba(255,253,247,0.85)', // warm paper
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        borderWidth: 1,
                        borderColor: '#CFE1D9',
                        overflow: 'hidden',
                    }}
                >
                    {children}
                </View>
            </ImageBackground>
        );
    }

    // ----- main render -----
    return (
        <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                <View
                    style={{
                        flex: 1,
                        marginTop: 40,
                        backgroundColor: 'rgba(255,253,247,0.85)', // warm paper
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        borderWidth: 1,
                        borderColor: '#CFE1D9',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header with tabs*/}
                    <View
                        style={{
                            paddingHorizontal: 16,
                            paddingTop: 8,
                            paddingBottom: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ flexDirection: 'row', flexShrink: 1 }}>
                            <TabPill label="List" active={tab === 'list'} onPress={() => setTab('list')} />
                            <TabPill label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
                            <TabPill label="Pick" active={tab === 'pick'} onPress={() => setTab('pick')} />
                        </View>
                    </View>

                    {/* Body */}
                    {loading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator />
                        </View>
                    ) : tab === 'list' ? (
                        undone.length === 0 ? (
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 24,
                                }}
                            >
                                <Text
                                    style={{
                                        opacity: 0.7,
                                        fontFamily: 'ArefRuqaaInk-Regular',
                                        fontSize: 16,
                                    }}
                                >
                                    No ideas yet. Add one!
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={undone}
                                keyExtractor={(i) => i.id}
                                contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 12 }}
                                renderItem={({ item }) => <IdeaRow item={item} />}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
                            />
                        )
                    ) : tab === 'done' ? (
                        done.length === 0 ? (
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 24,
                                }}
                            >
                                <Text
                                    style={{
                                        opacity: 0.7,
                                        fontFamily: 'ArefRuqaaInk-Regular',
                                        fontSize: 16,
                                    }}
                                >
                                    Nothing done yet.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={done}
                                keyExtractor={(i) => i.id}
                                contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 12 }}
                                renderItem={({ item }) => <IdeaRow item={item} />}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
                            />
                        )
                    ) : (
                        // PICK tab
                        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    marginBottom: 8,
                                    fontFamily: 'ArefRuqaaInk-Regular',
                                    color: '#0F3D2E',
                                }}
                            >
                                Select 2-10 ideas to include:
                            </Text>

                            <View
                                style={{
                                    flex: 1,
                                    borderWidth: 1,
                                    borderColor: '#CFE1D9',
                                    borderRadius: 12,
                                    backgroundColor: '#FFFDF7',
                                    overflow: 'hidden',
                                }}
                            >
                                <FlatList
                                    data={undone}
                                    keyExtractor={(i) => i.id}
                                    renderItem={({ item }) => <PickRow item={item} />}
                                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
                                />
                            </View>

                            <View style={{ height: 16 }} />

                            <RouletteList
                                pickCandidates={pickCandidates}
                                spinning={spinning}
                                winnerId={winnerId}
                                onSpin={spin}
                            />
                        </View>
                    )}
                </View>
                {/* Add button */}
                <TouchableOpacity
                    onPress={() => setAddOpen(true)}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Add Idea modal (with keyboard avoid) */}
                <Modal
                    transparent
                    visible={addOpen}
                    animationType="fade"
                    onRequestClose={() => setAddOpen(false)}
                >
                    {/* BACKDROP */}
                    <Pressable
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            justifyContent: 'flex-end',
                        }}
                        onPress={() => {
                            Keyboard.dismiss();
                            setAddOpen(false);
                        }}
                    >
                        {/* SHEET WRAPPER (keeps sheet above keyboard) */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={64} // tweak if header overlaps
                        >
                            {/* INNER SHEET - tapping here should NOT close modal */}
                            <TouchableWithoutFeedback
                                onPress={() => {
                                    /* swallow press so it doesn't bubble up to Pressable */
                                }}
                            >
                                <View
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        padding: 16,
                                        borderTopLeftRadius: 16,
                                        borderTopRightRadius: 16,
                                    }}
                                >
                                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
                                        Add idea
                                    </Text>

                                    <View
                                        style={{
                                            backgroundColor: '#F7FAF8',
                                            borderColor: '#CFE1D9',
                                            borderWidth: 1,
                                            borderRadius: 12,
                                            padding: 10,
                                        }}
                                    >
                                        <TextInput
                                            placeholder="Write your date idea…"
                                            value={newText}
                                            onChangeText={setNewText}
                                            multiline
                                            style={{ minHeight: 60, fontSize: 16 }}
                                            autoFocus
                                        />
                                    </View>

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'flex-end',
                                            marginTop: 12,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => {
                                                setAddOpen(false);
                                            }}
                                            style={{ marginRight: 10 }}
                                        >
                                            <Text style={{ fontWeight: '700' }}>Cancel</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={addIdea}
                                            disabled={saving || !newText.trim()}
                                            style={{
                                                backgroundColor: '#3C7A67',
                                                paddingVertical: 10,
                                                paddingHorizontal: 16,
                                                borderRadius: 999,
                                                opacity: saving || !newText.trim() ? 0.7 : 1,
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: '700' }}>
                                                {saving ? 'Saving…' : 'Add'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </KeyboardAvoidingView>
                    </Pressable>
                </Modal>

            </SafeAreaProvider>
        </ImageBackground>
    );
}
