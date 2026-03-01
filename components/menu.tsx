// components/AvatarMenu.tsx
import React, { useEffect, useState } from 'react';
import {
    Pressable, Image, View, Modal, Text, TouchableOpacity, StyleSheet, ImageSourcePropType
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../app/lib/supabase';
import { colors } from '@/constants/Colors';


// Replace with your real IDs
const RAN_ID = 'af71f37d-2d23-4060-a17a-7adb1b1ec683';
const TOM_ID = 'dc619321-d314-449c-bd2c-1aa3d12ec891';

// Your chibi heads (recommend no spaces in filenames)
const RanIcon = require('../assets/images/ran-head-default.png');
const TomIcon = require('../assets/images/tom-head-default.png');

function avatarFor(userId?: string | null): ImageSourcePropType | undefined {
    if (!userId) return undefined;
    if (userId === RAN_ID) return RanIcon;
    if (userId === TOM_ID) return TomIcon;
    return undefined;
}

type Props = {
    size?: number;
    avatarSrc?: ImageSourcePropType;   // optional override
    onSignedOut?: () => void;
};

export default function AvatarMenu({ size = 36, avatarSrc, onSignedOut }: Props) {
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [autoAvatar, setAutoAvatar] = useState<ImageSourcePropType | undefined>(undefined);

    // Auto-detect current user → avatar
    useEffect(() => {
        let mounted = true;
        async function load() {
            const { data } = await supabase.auth.getUser();
            if (!mounted) return;
            setAutoAvatar(avatarFor(data.user?.id));
        }
        load();
        const { data: sub } = supabase.auth.onAuthStateChange(() => load());
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    async function handleSignOut() {
        if (busy) return;
        try {
            setBusy(true);
            await supabase.auth.signOut();
            setOpen(false);
            onSignedOut?.();
        } finally {
            setBusy(false);
        }
    }

    const src = avatarSrc ?? autoAvatar;

    return (
        <>
            {/* Avatar button */}
            <Pressable
                onPress={() => setOpen(true)}
                style={styles.avatarBtn}
            >
                {src ? (
                    <Image
                        source={src}
                        resizeMode="cover"
                        style={{ height: 56, width: 56 }}
                    />
                ) : (
                    <Feather name="smile" size={18} color="#fff" />
                )}
            </Pressable>

            {/* Dropdown Menu */}
            <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
                {/* dim background */}
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    {/* catch presses so inner card works */}
                    <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
                        <Pressable
                            onPress={() => { }}
                            style={[
                                styles.menuCard,
                                { marginTop: insets.top + 8, marginRight: 12 } // top-right dropdown
                            ]}
                        >

                            {/* Routes */}
                            <MenuItem icon={<Ionicons color={colors.text} name="home-outline" size={18} />} label="Home" onPress={() => { setOpen(false); router.push('/'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="images-outline" size={18} />} label="Dates" onPress={() => { setOpen(false); router.push('/dates'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="sparkles-outline" size={18} />} label="Moments" onPress={() => { setOpen(false); router.push('/dates?tab=moments'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="calendar-outline" size={18} />} label="Calendar" onPress={() => { setOpen(false); router.push('/calendar'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="list-outline" size={18} />} label="Ideas" onPress={() => { setOpen(false); router.push('/ideas'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="happy-outline" size={18} />} label="Mood board" onPress={() => { setOpen(false); router.push('/mood-board'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="leaf-outline" size={18} />} label="Thankful logs" onPress={() => { setOpen(false); router.push('/gratitude'); }} />
                            <MenuItem icon={<Ionicons color={colors.text} name="chatbubble-ellipses-outline" size={18} />} label="Quotes & laughs" onPress={() => { setOpen(false); router.push('/quotes'); }} />

                            <View style={styles.divider} />

                            {/* Sign out */}
                            <TouchableOpacity onPress={handleSignOut} style={styles.signOutRow} disabled={busy}>
                                <Ionicons name="log-out-outline" size={18} color={colors.text} />
                                <Text style={[styles.signOutText, busy && { opacity: 0.6 }]}>
                                    {busy ? 'Signing out…' : 'Sign out'}
                                </Text>
                            </TouchableOpacity>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

function MenuItem({
    icon,
    label,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={styles.item}>
            <View style={{ width: 22, alignItems: 'center' }}>{icon}</View>
            <Text style={styles.itemText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    avatarBtn: {
        position: 'absolute',
        left: 20,
        bottom: 60,
        height: 56,
        width: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center'
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    menuCard: {
        width: 240,
        backgroundColor: colors.mint,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    meRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 8 },
    meText: { marginLeft: 10, fontWeight: '700', fontSize: 16, color: colors.text },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 8,
        color: colors.text
    },
    itemText: { marginLeft: 10, fontSize: 15, color: colors.text },
    divider: { height: 1, backgroundColor: colors.textMuted, marginVertical: 8 },
    signOutRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 10 },
    signOutText: { marginLeft: 10, color: colors.text, fontWeight: '700' },
});
