// app/compose/entry.tsx
import React, { useMemo, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image,
    Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase'; // <-- adjust if needed

// Keep in sync with your app/index.tsx
const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';

type Kind = 'date' | 'moment';

async function uploadToStorage(localUri: string, entryId: string): Promise<string> {
    const fileId = uuidv4();
    const ext = (localUri.split('.').pop()?.toLowerCase() || 'jpg').replace('jpeg', 'jpg');

    // FIRST SEGMENT MUST BE SPACE_ID (UUID) to satisfy your RLS policy
    const path = `${SPACE_ID}/entries/${entryId}/${fileId}.${ext}`;

    const res = await fetch(localUri);
    const ab = await res.arrayBuffer();       // RN-safe
    const bytes = new Uint8Array(ab);

    const { data, error } = await supabase
        .storage
        .from('media')
        .upload(path, bytes, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: false,
        });

    if (error) throw error;
    return data.path;
}



export default function ComposeEntry() {
    const params = useLocalSearchParams<{ kind?: Kind }>();
    const kind = (params.kind === 'moment' ? 'moment' : 'date') as Kind;

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState(''); // YYYY-MM-DD (optional for moment)
    const [imageUris, setImageUris] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const headerTitle = useMemo(
        () => (kind === 'date' ? 'New Date' : 'New Moment'),
        [kind]
    );

    async function pickImages() {
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });
        if (!result.canceled) {
            setImageUris(prev => [...prev, ...((result.assets ?? []).map(a => a.uri))]);
        }
    }

    async function save() {
        try {
            setSaving(true);

            // 1) basic insert to get an id (so we can nest storage paths by entryId)
            const { data: authUser, error: authErr } = await supabase.auth.getUser();
            if (authErr) throw authErr;
            if (!authUser.user?.id) throw new Error('Not signed in');

            const base = {
                space_id: SPACE_ID,
                author_id: authUser.user.id,
                kind,
                title: title || null,
                body: body || null,
                happened_at: date || null,
                images: [] as string[],
            };

            // temporary insert with no images to obtain id
            const { data: inserted, error: insertErr } = await supabase
                .from('entries')
                .insert(base)
                .select('*')
                .single();

            if (insertErr) throw insertErr;
            const entryId = inserted.id as string;

            // 2) upload images
            const paths: string[] = [];
            for (const uri of imageUris) {
                const p = await uploadToStorage(uri, entryId);
                paths.push(p);
            }

            // 3) update entry with image paths (if any)
            if (paths.length) {
                const { error: updErr } = await supabase
                    .from('entries')
                    .update({ images: paths })
                    .eq('id', entryId);
                if (updErr) throw updErr;
            }

            // 4) go to detail page
            router.replace({ pathname: '/entries/[id]', params: { id: entryId } });
        } catch (e: any) {
            console.log(e);
            Alert.alert('Save failed', e.message ?? 'Unknown error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ fontWeight: '700', color: '#3C7A67' }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>{headerTitle}</Text>
                <TouchableOpacity
                    onPress={save}
                    disabled={saving}
                    style={{
                        backgroundColor: '#3C7A67',
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            {/* Body */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    {/* Title (dates usually have a title; moments can leave blank) */}
                    <View style={{ backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#CFE1D9', borderRadius: 12, padding: 10 }}>
                        <TextInput
                            placeholder={kind === 'date' ? 'Title of the date' : 'Short title (optional)'}
                            value={title}
                            onChangeText={setTitle}
                            style={{ fontSize: 16 }}
                        />
                    </View>

                    {/* Body */}
                    <View style={{ backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#CFE1D9', borderRadius: 12, padding: 10, minHeight: 120 }}>
                        <TextInput
                            placeholder={kind === 'date' ? 'Write your memory…' : 'Describe the moment…'}
                            value={body}
                            onChangeText={setBody}
                            multiline
                            style={{ fontSize: 16 }}
                        />
                    </View>

                    {/* Date (optional for moment) */}
                    <View style={{ backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#CFE1D9', borderRadius: 12, padding: 10 }}>
                        <TextInput
                            placeholder="YYYY-MM-DD"
                            value={date}
                            onChangeText={setDate}
                            style={{ fontSize: 16 }}
                        />
                    </View>

                    {/* Images tray */}
                    <View style={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={pickImages}
                            style={{
                                alignSelf: 'flex-start',
                                backgroundColor: '#E6F1EC',
                                borderWidth: 1, borderColor: '#CFE1D9',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                            }}
                        >
                            <Text style={{ fontWeight: '700' }}>＋ Add photos</Text>
                        </TouchableOpacity>

                        {imageUris.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {imageUris.map((u, i) => (
                                    <Image key={u + i} source={{ uri: u }} style={{ width: 96, height: 96, borderRadius: 10 }} />
                                ))}
                            </View>
                        ) : (
                            <Text style={{ opacity: 0.6 }}>No photos yet.</Text>
                        )}
                    </View>

                    {saving ? (
                        <View style={{ alignItems: 'center', paddingTop: 8 }}>
                            <ActivityIndicator />
                        </View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaProvider>
    );
}
