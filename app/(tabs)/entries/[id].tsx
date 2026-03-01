import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Image,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
    ImageBackground,
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { s } from '../../Home.styles';
import { colors } from '@/constants/Colors';
import ImageViewer from '../../../components/ImageViewer';
import { Ionicons } from '@expo/vector-icons';

const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';
const RAN_ID = "af71f37d-2d23-4060-a17a-7adb1b1ec683";
const TOM_ID = "dc619321-d314-449c-bd2c-1aa3d12ec891";
const RanIcon = require('../../../assets/images/gleimerei.png');
const TomIcon = require('../../../assets/images/sunflower.png');

// Image URL cache to avoid fetching the same signed URLs multiple times
const urlCache = new Map<string, { url: string | null; expires: number }>();

function authorIcon(authorId?: string | null) {
    if (!authorId) return null;
    if (authorId === RAN_ID) return RanIcon;
    if (authorId === TOM_ID) return TomIcon;
    return null;
}

function formatPrettyFromYMD(ymd: string) {
    const [y, m, d] = ymd.split('-').map(Number);
    return formatPretty(new Date(y, (m - 1), d));
}


function formatPretty(d: Date) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function signedUrl(path?: string | null) {
    if (!path) return null;

    // Check cache first
    const cached = urlCache.get(path);
    if (cached && cached.expires > Date.now()) {
        return cached.url;
    }

    const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(path, 60 * 60);

    if (error) return null;
    const url = data?.signedUrl ?? null;

    // Cache for 55 minutes (5 min buffer before expiry)
    urlCache.set(path, { url, expires: Date.now() + (55 * 60 * 1000) });
    return url;
}

function Section({ title, children }: any) {
    return (
        <View style={{ marginTop: 24 }}>
            <Text
                style={{
                    fontSize: 16,
                    fontFamily: 'ArefRuqaaInk-Bold',
                    color: 'white',
                    marginBottom: 8,
                }}
            >
                {title}
            </Text>
            {children}
        </View>
    );
}

export default function EntryDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [me, setMe] = useState<string | null>(null);

    const [entry, setEntry] = useState<any>(null);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [posting, setPosting] = useState(false);

    const [likes, setLikes] = useState(0);
    const [justLiked, setJustLiked] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // viewer list
    const images = useMemo(
        () =>
            Array.isArray(imageUrls)
                ? imageUrls.filter(Boolean).map((u) => ({ uri: u }))
                : [],
        [imageUrls]
    );
    const total = images.length;

    // who am I
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) =>
            setMe(data.user?.id ?? null)
        );
    }, []);

    // sync like count if entry changes
    useEffect(() => {
        setLikes(entry?.like_count ?? 0);
    }, [entry?.like_count]);

    // fetch entry, comments, images
    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                setLoading(true);
                const [
                    { data: entryRow, error: e1 },
                    { data: commentRows, error: e2 },
                ] = await Promise.all([
                    supabase.from('entries').select('*').eq('id', id).single(),
                    supabase
                        .from('entry_comments')
                        .select('*')
                        .eq('entry_id', id)
                        .order('created_at', { ascending: true }),
                ]);
                if (e1) throw e1;

                setEntry(entryRow);
                setComments(commentRows ?? []);

                const imgs: string[] = [];
                if (entryRow?.images?.length) {
                    for (const p of entryRow.images) {
                        const u = await signedUrl(p);
                        if (u) imgs.push(u);
                    }
                }
                setImageUrls(imgs);
            } catch (e: any) {
                console.log(e);
                Alert.alert(
                    'Load failed',
                    e.message ?? 'Unknown error'
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    async function likeEntry(entryId: string) {
        const { data, error } = await supabase.rpc(
            'react_entry_like',
            {
                p_space_id: SPACE_ID,
                p_entry_id: entryId,
            }
        );
        if (error) throw error;
        return data; // { did_add, count }
    }

    async function postComment() {
        if (!me || !id) return;
        if (!commentText.trim()) return;
        try {
            setPosting(true);

            const { error } = await supabase
                .from('entry_comments')
                .insert({
                    entry_id: id,
                    author_id: me,
                    body: commentText.trim(),
                });
            if (error) throw error;

            const { data: freshRows } = await supabase
                .from('entry_comments')
                .select('*')
                .eq('entry_id', id)
                .order('created_at', { ascending: true });

            setComments(freshRows ?? []);
            setCommentText('');
        } catch (e: any) {
            Alert.alert(
                'Comment failed',
                e.message ?? 'Unknown error'
            );
        } finally {
            setPosting(false);
        }
    }

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'black',
                }}
            >
                <ActivityIndicator color="#fff" />
            </View>
        );
    }

    if (!entry) {
        return (
            <ImageBackground
                source={require('../../../assets/images/background.png')}
                style={[s.screen, { backgroundColor: 'black' }]}
            >
                <SafeAreaProvider style={{ flex: 1, padding: 16 }}>

                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: 'white',
                                fontFamily: 'ArefRuqaaInk-Regular',
                                fontSize: 16,
                            }}
                        >
                            Not found.
                        </Text>
                    </View>
                </SafeAreaProvider>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground
            source={require('../../../assets/images/background.png')}
            style={s.screen}
        >
            <SafeAreaProvider style={{ flex: 1, marginTop: 40 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 40}
                    enabled={true}
                >
                    {/* CONTENT LAYER */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: 80,
                        }}
                        keyboardShouldPersistTaps="handled"
                    >

                        {/* Glass / dark card */}
                        <View
                            style={{
                                backgroundColor: 'rgba(49, 80, 50, 0.5)',
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.15)',
                                padding: 16,
                            }}
                        >
                            {/* Images row / carousel */}
                            {(imageUrls?.length ?? 0) > 0 ? (
                                <FlatList
                                    data={imageUrls ?? []}
                                    keyExtractor={(u, i) => `${u}-${i}`}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    ItemSeparatorComponent={() => (
                                        <View style={{ width: 10 }} />
                                    )}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                if (total > 0) {
                                                    setViewerIndex(index);
                                                    setViewerOpen(true);
                                                }
                                            }}
                                        >
                                            <Image
                                                source={{ uri: item }}
                                                style={{
                                                    width: 260,
                                                    height: 200,
                                                    borderRadius: 12,
                                                }}
                                            />
                                        </TouchableOpacity>
                                    )}
                                    style={{ marginBottom: 16 }}
                                />
                            ) : null}

                            {/* Title & author icon */}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {entry.title ? (
                                    <Text
                                        style={{
                                            fontSize: 22,
                                            color: 'white',
                                            fontFamily: 'ArefRuqaaInk-Bold',
                                            marginBottom: 4,
                                        }}
                                    >
                                        {entry.title}
                                    </Text>
                                ) : null}

                                <Image
                                    source={authorIcon(entry?.author_id)}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        marginLeft: 10,
                                    }}
                                    resizeMode="cover"
                                />
                            </View>


                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                {/* Date */}
                                {entry.happened_at ? (
                                    <Text
                                        style={{
                                            opacity: 0.8,
                                            color: 'white',
                                            fontFamily: 'ArefRuqaaInk-Regular',
                                            fontSize: 16,
                                            marginBottom: 12,
                                        }}
                                    >
                                        {formatPrettyFromYMD(entry.happened_at)}
                                    </Text>
                                ) : null}

                                {/* Reactions */}
                                <Pressable
                                    onPress={async () => {
                                        try {
                                            const res = await likeEntry(entry.id);
                                            setLikes(res.count);
                                            if (res.did_add) setJustLiked(true);
                                        } catch (e: any) {
                                            Alert.alert(
                                                'Could not like',
                                                e.message
                                            );
                                        }
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="heart-outline"
                                        size={20}
                                        color={justLiked ? "green" : "white"}
                                    />
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontFamily: 'ArefRuqaaInk-Regular',
                                            fontSize: 16,
                                            marginLeft: 6,
                                        }}
                                    >
                                        {likes}
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Body */}
                            {entry.body ? (
                                <Text
                                    style={{
                                        fontSize: 18,
                                        lineHeight: 24,
                                        color: 'white',
                                        fontFamily: 'ArefRuqaaInk-Regular',
                                    }}
                                >
                                    {entry.body}
                                </Text>
                            ) : null}


                            {/* Comments */}
                            <Section title="Comments">
                                {comments.length === 0 ? (
                                    <Text
                                        style={{
                                            opacity: 0.7,
                                            color: 'white',
                                            fontFamily:
                                                'ArefRuqaaInk-Regular',
                                            fontSize: 16,
                                        }}
                                    >
                                        No comments yet.
                                    </Text>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        {comments.map((c) => (
                                            <View
                                                key={c.id}
                                                style={{
                                                    backgroundColor:
                                                        'rgba(255,255,255,0.08)',
                                                    borderColor:
                                                        'rgba(255,255,255,0.2)',
                                                    borderWidth: 1,
                                                    borderRadius: 12,
                                                    padding: 10,
                                                }}
                                            >
                                                {/* avatar + text row */}
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Image
                                                        source={authorIcon(c?.author_id)}
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 12,
                                                            marginRight: 8,
                                                        }}
                                                        resizeMode="cover"
                                                    />
                                                    <Text
                                                        style={{
                                                            fontSize: 16,
                                                            color: 'white',
                                                            fontFamily: 'ArefRuqaaInk-Regular',
                                                            flexShrink: 1,
                                                        }}
                                                    >
                                                        {c.body}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={{
                                                        opacity: 0.6,
                                                        marginTop: 4,
                                                        color: 'white',
                                                        fontSize: 10,
                                                        fontFamily:
                                                            'ArefRuqaaInk-Regular',
                                                    }}
                                                >
                                                    {new Date(
                                                        c.created_at
                                                    ).toLocaleString()}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </Section>
                        </View>
                    </ScrollView>



                    {/* COMMENT INPUT BAR */}
                    <View
                        style={{
                            borderTopWidth: 0,
                            backgroundColor: 'transparent',
                            padding: 12,
                            paddingBottom: Platform.OS === 'ios' ? 12 : 12,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                alignItems: 'center',
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(138, 179, 140, 0.20)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(138, 179, 140, 0.50)',
                                    borderRadius: 12,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                            >
                                <TextInput
                                    placeholder="Write a comment…"
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    multiline
                                    style={{
                                        fontFamily:
                                            'ArefRuqaaInk-Regular',
                                        fontSize: 16,
                                        color: '#F4FFF7',
                                    }}
                                    placeholderTextColor="rgba(244, 255, 247, 0.6)"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={postComment}
                                disabled={posting || !commentText.trim()}
                                style={{
                                    backgroundColor: '#67C8A8',
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    opacity:
                                        posting || !commentText.trim()
                                            ? 0.6
                                            : 1,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontFamily:
                                            'ArefRuqaaInk-Bold',
                                        fontSize: 16,
                                    }}
                                >
                                    {posting ? '…' : 'Send'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>

                {/* FULLSCREEN IMAGE VIEWER */}
                {total > 0 && (
                    <ImageViewer
                        images={images}
                        imageIndex={Math.min(
                            Math.max(0, viewerIndex),
                            total - 1
                        )}
                        visible={viewerOpen}
                        onRequestClose={() =>
                            setViewerOpen(false)
                        }
                        swipeToCloseEnabled
                        doubleTapToZoomEnabled
                        FooterComponent={({ imageIndex }) => (
                            <View
                                style={{
                                    alignItems: 'center',
                                    paddingBottom: 20,
                                }}
                            >
                                <Text
                                    style={{
                                        color: 'white',
                                        fontFamily:
                                            'ArefRuqaaInk-Regular',
                                    }}
                                >
                                    {imageIndex + 1} / {total}
                                </Text>
                            </View>
                        )}
                    />
                )}

            </SafeAreaProvider>
        </ImageBackground>
    );
}
