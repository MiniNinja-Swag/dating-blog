// app/gratitude.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ImageBackground, Image, View, Text, TouchableOpacity, SectionList, ActivityIndicator,
    RefreshControl, Modal, TouchableWithoutFeedback, Alert, KeyboardAvoidingView, Platform, Keyboard, TextInput
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { s } from '../Home.styles';
import { colors } from '@/constants/Colors';
import { StyledText } from '@/components/StyledText';
import SignOutButton from '@/components/menu';
import AvatarMenu from '@/components/menu';

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';
const RAN_ID = "af71f37d-2d23-4060-a17a-7adb1b1ec683";
const TOM_ID = "dc619321-d314-449c-bd2c-1aa3d12ec891";
const RanAvatar = require('../../assets/images/tom-head-default.png');
const TomAvatar = require('../../assets/images/ran-head-default.png');
const RanIcon = require('../../assets/images/gleimerei.png');
const TomIcon = require('../../assets/images/sunflower.png');

function authorAvatar(authorId?: string | null) {
    if (!authorId) return null;
    if (authorId === RAN_ID) return RanAvatar;
    if (authorId === TOM_ID) return TomAvatar;
    return null;
}

type Log = {
    id: string;
    space_id: string;
    author_id: string;
    note: string;
    day: string;        // YYYY-MM-DD
    created_at: string; // ts
};

function dayLabel(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.getTime() === today.getTime()) return 'Today';
    if (d.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function GratitudeScreen() {
    const [rows, setRows] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add modal
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gratitude_logs')
                .select('*')
                .eq('space_id', SPACE_ID)
                .order('day', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) console.warn(error.message);
            setRows((data as Log[]) ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await load();
        } finally {
            setRefreshing(false);
        }
    }, [load]);

    const sections = useMemo(() => {
        const map = new Map<string, Log[]>();
        for (const r of rows) {
            if (!map.has(r.day)) map.set(r.day, []);
            map.get(r.day)!.push(r);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => (a < b ? 1 : -1)) // newest day first
            .map(([day, items]) => ({ title: dayLabel(day), data: items }));
    }, [rows]);

    async function addNote() {
        try {
            if (!text.trim()) return;
            setSaving(true);
            const { data: authUser } = await supabase.auth.getUser();
            const note = text.trim();
            const { error } = await supabase.from('gratitude_logs').insert({
                space_id: SPACE_ID,
                author_id: authUser.user?.id,
                note,
                // day defaults to today in schema; if not, uncomment next line:
                // day: new Date().toISOString().slice(0,10),
            });
            if (error) throw error;
            setText('');
            setOpen(false);
            await load();
        } catch (e: any) {
            Alert.alert('Add failed', e.message ?? 'Unknown error');
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
            <SafeAreaProvider style={{ flex: 1, marginTop: 80 }}>
                {/* List */}
                {sections.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Text style={{ opacity: 0.7 }}>No thankful notes yet. Add one!</Text>
                    </View>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        renderSectionHeader={({ section: { title } }) => (
                            <Text style={s.thankfullheader}>{title}</Text>
                        )}
                        renderItem={({ item }) => (
                            <View style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginBottom: 10 }}>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Image source={authorAvatar(item.author_id)} style={{ width: 20, height: 20, marginRight: 10 }} resizeMode="cover" />
                                    <StyledText style={s.thankfullnote}>{item.note}</StyledText>
                                </View>
                                <Text style={s.thankfulltime}>
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    />
                )}

                {/* Add button */}
                <TouchableOpacity
                    onPress={() => setOpen(true)}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Add bottom sheet */}
                <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
                    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setOpen(false); }}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
                                    <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16 }}>

                                        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Add thankful note</Text>
                                        <View style={{ backgroundColor: '#F7FAF8', borderColor: '#CFE1D9', borderWidth: 1, borderRadius: 12, padding: 10 }}>
                                            <TextInput placeholder="Write something you're thankful for…" value={text} onChangeText={setText} multiline style={{ minHeight: 80, fontSize: 16 }} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                                            <TouchableOpacity onPress={() => setOpen(false)} style={{ marginRight: 10 }}>
                                                <Text style={{ fontWeight: '700' }}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={addNote} disabled={saving || !text.trim()} style={{ backgroundColor: '#3C7A67', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, opacity: saving || !text.trim() ? 0.7 : 1, }} >
                                                <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Add'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                    </View>
                                </KeyboardAvoidingView>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </SafeAreaProvider>
        </ImageBackground>
    );
}
