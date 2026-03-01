import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Image,
    ActivityIndicator, RefreshControl, Modal, ImageBackground, Pressable, Alert
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { s } from '../Home.styles';
import AvatarMenu from '@/components/menu';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';
const RAN_ID = "af71f37d-2d23-4060-a17a-7adb1b1ec683";
const TOM_ID = "dc619321-d314-449c-bd2c-1aa3d12ec891";
const RanIcon = require('../../assets/images/gleimerei.png');
const TomIcon = require('../../assets/images/sunflower.png');

// Image URL cache to avoid fetching the same signed URLs multiple times
const urlCache = new Map<string, { url: string | null; expires: number }>();

function authorIcon(authorId?: string | null) {
    if (!authorId) return null;
    if (authorId === RAN_ID) return RanIcon;
    if (authorId === TOM_ID) return TomIcon;
    return null;
}

type Kind = 'date' | 'moment';

async function signedUrl(path?: string | null) {
    if (!path) return null;

    // Check cache first
    const cached = urlCache.get(path);
    if (cached && cached.expires > Date.now()) {
        return cached.url;
    }

    const { data } = await supabase.storage.from('media').createSignedUrl(path, 60 * 60);
    const url = data?.signedUrl ?? null;

    // Cache for 55 minutes (5 min buffer before expiry)
    urlCache.set(path, { url, expires: Date.now() + (55 * 60 * 1000) });
    return url;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

function formatPrettyFromYMD(ymd: string) {
    const [y, m, d] = ymd.split('-').map(Number);
    return formatPretty(new Date(y, (m - 1), d));
}


function formatPretty(d: Date) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function EntryCard({ item }: { item: any }) {
    const [uri, setUri] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            if (item.images?.length) {
                const url = await signedUrl(item.images[0]);
                if (mounted) {
                    setUri(url);
                }
            } else {
                if (mounted) {
                    setUri(null);
                }
            }
        })();

        return () => { mounted = false; };
    }, [item.images?.[0]]);  // Only depend on first image path



    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/entries/[id]', params: { id: item.id } })}
            style={{
                backgroundColor: '#F7FAF8',
                borderColor: '#CFE1D9',
                borderWidth: 1,
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            {uri ? <ImageBackground source={{ uri }}>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                    locations={[0, 0.5, 1]}
                    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
                />
                <View style={{ padding: 12, marginTop: 100 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, color: 'white', fontFamily: 'ArefRuqaaInk-Bold', }}>{item.title || (item.kind === 'date' ? 'Date' : 'Moment')}</Text>
                        <Image source={authorIcon(item?.author_id)} style={{ width: 24, height: 24, borderRadius: 12, marginLeft: 10, }} resizeMode="cover" />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        {item.happened_at ? <Text style={{ opacity: 0.7, marginTop: 2, color: 'white', fontFamily: 'ArefRuqaaInk-Regular', }}>{formatPrettyFromYMD(item.happened_at)}</Text> : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {item.like_count ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons
                                    name="heart-outline"
                                    size={20}
                                    color={"white"}
                                />
                                <Text
                                    style={{
                                        color: 'white',
                                        fontFamily: 'ArefRuqaaInk-Regular',
                                        fontSize: 16,
                                        marginLeft: 6,
                                    }}
                                >
                                    {item.like_count}
                                </Text>
                            </View> : null}
                        </View>
                    </View>
                    {item.body ? <Text numberOfLines={2} style={{ opacity: 0.9, marginTop: 6, color: 'white', fontFamily: 'ArefRuqaaInk-Regular', }}>{item.body}</Text> : null}
                </View>
            </ImageBackground> : null}
        </TouchableOpacity>
    );
}

export default function DatesScreen() {
    const [kind, setKind] = useState<Kind>('date'); // current tab
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('space_id', SPACE_ID)
            .eq('kind', kind)
            .order('happened_at', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) console.warn(error.message);
        setRows(data ?? []);
        setLoading(false);
    }, [kind]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    return (
        <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row' }}>
                        <Tab label="Dates" active={kind === 'date'} onPress={() => setKind('date')} />
                        <Tab label="Moments" active={kind === 'moment'} onPress={() => setKind('moment')} />
                    </View>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator />
                    </View>
                ) : rows.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Text style={{ opacity: 0.7 }}>No {kind === 'date' ? 'dates' : 'moments'} yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={rows}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <EntryCard item={item} />}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    />
                )}

                {/* Add button */}
                <TouchableOpacity
                    onPress={() => setPickerOpen(true)}
                    style={s.addbtn}
                >
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>＋</Text>
                </TouchableOpacity>

                <AvatarMenu />

                {/* Simple bottom picker modal */}
                <Modal transparent visible={pickerOpen} animationType="fade" onRequestClose={() => setPickerOpen(false)}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setPickerOpen(false)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    >
                        <View
                            style={{
                                backgroundColor: '#FFFFFF',
                                padding: 16,
                                borderTopLeftRadius: 16,
                                borderTopRightRadius: 16,
                                gap: 10,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>Add new</Text>

                            <TouchableOpacity
                                onPress={() => {
                                    setPickerOpen(false);
                                    router.push({ pathname: '/compose/entry', params: { kind: 'date' } });
                                }}
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#E6F1EC',
                                    borderWidth: 1, borderColor: '#CFE1D9',
                                }}
                            >
                                <Text style={{ fontWeight: '700' }}>＋ Date</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setPickerOpen(false);
                                    router.push({ pathname: '/compose/entry', params: { kind: 'moment' } });
                                }}
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#E6F1EC',
                                    borderWidth: 1, borderColor: '#CFE1D9',
                                }}
                            >
                                <Text style={{ fontWeight: '700' }}>＋ Moment</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaProvider>
        </ImageBackground>
    );
}
