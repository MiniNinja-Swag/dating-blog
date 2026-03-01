import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import {
  ImageBackground, StyleSheet, View, Text, TextInput, Button, Image, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, ImageSourcePropType,
  Pressable
} from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { s } from '../Home.styles';
import { colors } from '../../constants/Colors';
import { StyledText } from '@/components/StyledText';
import AvatarMenu from '@/components/menu';
import { LaughIcon } from '@/components/LaughIcon';

// ---- CONFIG ----
const SPACE_ID = '9faf527f-c30c-41bc-bf24-034c8ec937dd';
const RAN_ID = "af71f37d-2d23-4060-a17a-7adb1b1ec683";
const TOM_ID = "dc619321-d314-449c-bd2c-1aa3d12ec891";
const RanAvatar = require('../../assets/images/tom-head-default.png');
const TomAvatar = require('../../assets/images/ran-head-default.png');
const RanIcon = require('../../assets/images/gleimerei.png');
const TomIcon = require('../../assets/images/sunflower.png');

const MoodTemp = require('../../assets/images/character-temp.png');

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

function authorAvatar(authorId?: string | null) {
  if (!authorId) return null;
  if (authorId === RAN_ID) return RanAvatar;
  if (authorId === TOM_ID) return TomAvatar;
  return null;
}

function authorIcon(authorId?: string | null) {
  if (!authorId) return null;
  if (authorId === RAN_ID) return RanIcon;
  if (authorId === TOM_ID) return TomIcon;
  return null;
}

function getMoodImage(userId?: string, moodName?: string) {
  if (!userId || !moodName) return null;
  const m = moodName.toLowerCase() as MoodName;
  if (userId === RAN_ID) return ranMoods[m];
  if (userId === TOM_ID) return tomMoods[m];
  return null;
}

// ---- AUTH HOOK ----
function useSession() {
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => authSub.subscription.unsubscribe();
  }, []);
  return session;
}

// ---- SIGN IN SCREEN (email+password) ----
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    try {
      setBusy(true);
      setErr(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message ?? 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaProvider style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, marginBottom: 8, fontFamily: 'ArefRuqaaInk-Regular' }}>Welcome ♥</Text>
      <Text style={{ opacity: 0.8, marginBottom: 8, fontFamily: 'ArefRuqaaInk-Regular' }}>Sign in with your email and password.</Text>

      <TextInput
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, borderRadius: 10, fontFamily: 'ArefRuqaaInk-Regular' }}
      />

      <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={signIn} disabled={busy} />
      {err && <Text style={{ color: 'red' }}>{err}</Text>}
    </SafeAreaProvider>
  );
}

// ---- TINY UI PRIMS ----
function Card({ children, style, onPress }: any) {
  const Cmp: any = onPress ? TouchableOpacity : View;
  return (
    <Cmp
      onPress={onPress}
      activeOpacity={0.86}
      style={[
        {
          backgroundColor: '#F7FAF8',
          borderColor: '#CFE1D9',
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
        },
        style,
      ]}
    >
      {children}
    </Cmp>
  );
}

function SectionTitle({ children, onPress }: any) {
  const T = (
    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#0E1412' }}>
      {children}
    </Text>
  );
  if (!onPress) return T;
  return <TouchableOpacity onPress={onPress}>{T}</TouchableOpacity>;
}

function Row({ left, right, onPress }: any) {
  const Cmp: any = onPress ? TouchableOpacity : View;
  return (
    <Cmp
      onPress={onPress}
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}
    >
      <Text style={{ fontSize: 16 }}>{left}</Text>
      <Text style={{ opacity: 0.7 }}>{right}</Text>
    </Cmp>
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

type Props = {
  avatarSrc?: ImageSourcePropType;
};

// ---- HELPERS ----
// Image URL cache to avoid fetching the same signed URLs multiple times
const urlCache = new Map<string, { url: string | null; expires: number }>();

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

function Chip({ children }: any) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{children}</Text>
    </View>
  );
}

type Count = { d: number; h: number; m: number } | null;
function countdown(toIso?: string): Count {
  if (!toIso) return null;
  const ms = new Date(toIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;

  const safe = Math.max(0, ms);           // clamp to 0 if past
  const d = Math.floor(safe / 86_400_000);
  const h = Math.floor((safe % 86_400_000) / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  return { d, h, m };
}

// get partner id (the other member in the space)
async function getPartnerId(myId: string) {
  const { data, error } = await supabase
    .from('space_members')
    .select('user_id')
    .eq('space_id', SPACE_ID);
  if (error || !data) return null;
  const ids = data.map((d: any) => d.user_id);
  return ids.find((id: string) => id !== myId) ?? null;
}

function avatarFor(userId?: string) {
  if (!userId) return null;
  if (userId === RAN_ID) return RanAvatar;
  if (userId === TOM_ID) return TomAvatar;
  return null;
}

// ---- HOME DATA HOOK ----
function useHomeData(session: any) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>({
    todayEvent: null,
    nextEvent: null,
    latestDate: null,
    latestDateImageUrl: null,
    partnerMood: null,
    partnerGratitude: null,
    randomQuip: null,
    ideas: [],
  });

  const load = React.useCallback(async () => {
    if (!session?.user) return;
    (async () => {
      try {
        setLoading(true);
        const me = session.user.id;
        const partnerId = await getPartnerId(me);

        // Today (any event starting today)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [todayEvRes, nextEvRes, latestDateRes, moodsRes, gratRes, quipsRes, ideasRes] = await Promise.all([
          supabase
            .from('events')
            .select('*')
            .eq('space_id', SPACE_ID)
            .gte('starts_at', startOfDay.toISOString())
            .lte('starts_at', endOfDay.toISOString())
            .order('starts_at')
            .limit(1),
          supabase
            .from('events')
            .select('*')
            .eq('space_id', SPACE_ID)
            .gt('starts_at', endOfDay.toISOString())
            .order('starts_at')
            .limit(1),
          supabase
            .from('entries')
            .select('*')
            .eq('kind', 'date')
            .eq('space_id', SPACE_ID)
            .order('happened_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1),
          partnerId
            ? supabase
              .from('moods')
              .select('*')
              .eq('space_id', SPACE_ID)
              .eq('user_id', partnerId)
              .order('at', { ascending: false })
              .limit(1)
            : Promise.resolve({ data: [] } as any),
          partnerId
            ? supabase
              .from('gratitude_logs')
              .select('*')
              .eq('space_id', SPACE_ID)
              .eq('author_id', partnerId)
              .gte('created_at', startOfDay.toISOString())
              .lte('created_at', endOfDay.toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
            : Promise.resolve({ data: [] } as any),
          supabase
            .from('quips')
            .select('*')
            .eq('space_id', SPACE_ID)
            .order('created_at', { ascending: false })
            .limit(25),
          supabase
            .from('ideas')
            .select('*')
            .eq('space_id', SPACE_ID)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(8),
        ]);

        const latestDate = latestDateRes.data?.[0] ?? null;
        const hero = latestDate?.images?.[0] ? await signedUrl(latestDate.images[0]) : null;

        // pick a random quip from the recent selection
        const q = quipsRes.data ?? [];
        const randomQuip = q.length ? q[Math.floor(Math.random() * q.length)] : null;

        setState({
          todayEvent: todayEvRes.data?.[0] ?? null,
          nextEvent: nextEvRes.data?.[0] ?? null,
          latestDate,
          latestDateImageUrl: hero,
          partnerMood: moodsRes.data?.[0] ?? null,
          partnerGratitude: gratRes.data?.[0] ?? null,
          randomQuip,
          ideas: ideasRes.data ?? [],
        });
      } catch (e) {
        console.log('Home load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  // 🔔 Realtime: reload when partner (or you) changes data
  useEffect(() => {
    if (!session?.user) return;

    let timer: any = null;
    let channel: any = null;

    const scheduleReload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        load();
      }, 250);
    };

    // self:false means "don't echo my own writes back to me"
    channel = supabase.channel(`home-space-${SPACE_ID}`, {
      config: { broadcast: { self: false } }
    });

    const watch = (table: string) =>
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `space_id=eq.${SPACE_ID}` },
        () => scheduleReload()
      );

    watch('events');
    watch('entries');
    watch('ideas');
    watch('quips');
    watch('gratitude_logs');
    watch('moods');
    watch('quip_reactions');
    watch('entry_reactions');

    channel.subscribe();

    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session?.user?.id, load]);

  return { loading, state, reload: load };
}

// ---- HOME SCREEN ----
function HomeScreen({ session }: { session: any }) {
  const { loading, state } = useHomeData(session);
  const avatarSrc = avatarFor(session.user.id);
  const cd = React.useMemo(
    () => countdown(state.nextEvent?.starts_at),
    [state.nextEvent?.starts_at]
  );

  const [likeBusy, setLikeBusy] = useState(false);
  const [laughBusy, setLaughBusy] = useState(false);
  const [justLaughedQuip, setJustLaughedQuip] = useState(false);

  useEffect(() => {
    setJustLaughedQuip(false);
  }, [state.randomQuip?.id]);

  async function likeLatestDate() {
    const entryId = state.latestDate?.id;
    if (!entryId || likeBusy) return;
    setLikeBusy(true);

    // optimistic bump
    const prev = state.latestDate.like_count ?? 0;
    state.latestDate.like_count = prev + 1;
    try {
      const { data, error } = await supabase.rpc('react_entry_like', {
        p_space_id: SPACE_ID,
        p_entry_id: entryId,
      });
      if (error) throw error;
      // server wins
      state.latestDate.like_count = data?.count ?? prev + 1;
    } catch (e) {
      // rollback on error
      state.latestDate.like_count = prev;
      Alert.alert('Could not like', (e as any).message ?? 'Unknown error');
    } finally {
      setLikeBusy(false);
    }
  }

  async function laughRandomQuip() {
    const quipId = state.randomQuip?.id;
    if (!quipId || laughBusy) return;
    setLaughBusy(true);

    const prev = state.randomQuip.laugh_count ?? 0;
    state.randomQuip.laugh_count = prev + 1;
    try {
      const { data, error } = await supabase.rpc('react_quip_laugh', {
        p_space_id: SPACE_ID,
        p_quip_id: quipId,
      });
      if (error) throw error;
      state.randomQuip.laugh_count = data?.count ?? prev + 1;
      setJustLaughedQuip(true);
    } catch (e) {
      state.randomQuip.laugh_count = prev;
      Alert.alert('Could not react', (e as any).message ?? 'Unknown error');
    } finally {
      setLaughBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.png')} style={s.screen}>
      <SafeAreaProvider style={s.screen}>

        <View style={s.container}>

          {/* Thankful note */}
          {state.partnerGratitude ? (
            <StyledText onPress={() => router.push('/gratitude')} style={s.headerScript}>{state.partnerGratitude.note}</StyledText>
          ) : (
            <Text onPress={() => router.push('/gratitude')} style={s.headerScriptNone}>No thankful note yet.</Text>
          )}

          {/* Latest date */}
          <Card onPress={() => { router.push('/dates'); }} style={[s.card, { marginTop: 8 }]}>
            <View style={s.row}>
              {state.latestDateImageUrl ? (
                <Image source={{ uri: state.latestDateImageUrl }} style={s.thumb} />
              ) : (
                <View style={[s.thumb, s.thumbEmpty]}>
                  <Ionicons name="image" size={24} color={colors.silver} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={s.cardTitle}>{state.latestDate?.title || 'Title missing'}</Text>
                </View>
                {state.latestDate?.body
                  ? <Text numberOfLines={2} style={s.cardBody}>{state.latestDate.body}</Text>
                  : <></>}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, justifyContent: 'flex-end', alignContent: 'center' }}>
                  {state.latestDate?.happened_at ? <Text style={s.chipText}>{formatPrettyFromYMD(state.latestDate.happened_at)}</Text> : null}
                  {state.latestDate?.like_count ?
                    <Pressable
                      onPress={likeLatestDate}
                      disabled={likeBusy}
                      style={[s.reactsPill, { opacity: likeBusy ? 0.6 : 1 }]}
                      hitSlop={10}
                    >
                      <Ionicons name="heart-outline" size={18} color={colors.text} />
                      <Text style={{ color: colors.text, marginLeft: 6, fontFamily: 'ArefRuqaaInk-Regular' }}>{state.latestDate.like_count}</Text>
                    </Pressable> : null}
                </View>
              </View>
            </View>
          </Card>


          <View style={s.tileRow}>
            {/* Today */}
            <Card onPress={() => router.push('/calendar')} style={[s.card, s.tile]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={s.tileBig}>
                  {state.todayEvent ? new Date(state.todayEvent.starts_at).getDate() : new Date().getDate()}
                </Text>
                <View>
                  <Text style={s.tileSub}>
                    {new Date().toLocaleString(undefined, { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={[s.tileSubDay, { color: colors.mint }]}>
                    {new Date().toLocaleString(undefined, { weekday: 'short' }).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={s.tileDetail}>
                {state.todayEvent
                  ? `${new Date(state.todayEvent.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${state.todayEvent.title}`
                  : 'No plans today'}
              </Text>
            </Card>

            {/* Next up */}
            <Card onPress={() => router.push('/calendar')} style={[s.card, s.tile]}>
              <View style={{ flexDirection: "column", alignItems: "center" }}>
                <Text style={s.tileCountdown}>
                  {cd ? `Eftir ${cd.d} daga` : 'Eftir -'}
                </Text>
                <Text style={[s.tileLabel, { color: colors.mint }]}>
                  {cd ? ` ${cd.h} klst og ${cd.m} mín` : ''}
                </Text>
              </View>
              <Text style={[s.tileDetail, { marginTop: 10, color: colors.textMuted }]} numberOfLines={2}>
                {state.nextEvent ? state.nextEvent.title : 'Nothing scheduled'}
              </Text>
            </Card>
          </View>

          {/* Random quote / funny */}
          <Card onPress={() => router.push('/quotes')} style={[s.card, { marginTop: 12 }]}>
            <View style={s.quoteRow}>
              {(() => {
                const q = state.randomQuip;
                const src = authorAvatar(q?.author_id);
                return (
                  <View style={s.avatar}>
                    {src ? (
                      <Image source={src} style={{ width: '100%', height: '100%', borderRadius: 18 }} resizeMode="cover" />
                    ) : (
                      <Feather name="smile" size={colors.text ? 18 : 18} color={colors.text} />
                    )}
                  </View>
                );
              })()}

              <StyledText style={s.quoteText} numberOfLines={2}>
                {state.randomQuip
                  ? (state.randomQuip.kind === 'quote'
                    ? `“${state.randomQuip.body}”`
                    : (state.randomQuip.title || 'Funny moment'))
                  : 'Nothing'}
              </StyledText>

              <Pressable
                onPress={laughRandomQuip}
                disabled={laughBusy}
                style={[s.reactsPill, { opacity: laughBusy ? 0.6 : 1 }]}
                hitSlop={10}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: justLaughedQuip ? 0.7 : 1 }}>
                  <LaughIcon size={24} color={colors.text} />
                  <Text style={{ color: colors.text, fontFamily: 'ArefRuqaaInk-Regular' }}>{state.randomQuip.laugh_count}</Text>
                </View>
              </Pressable>
            </View>
          </Card>


          <View style={s.sideRowWrap}>
            {/* Partner mood */}
            <Card onPress={() => router.push('/mood-board')} style={[s.card, s.tile]}>
              {state.partnerMood
                ? (
                  <View style={{ flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    {(() => {
                      const moodImg = getMoodImage(state.partnerMood.user_id, state.partnerMood.mood);
                      return moodImg ? (
                        <Image
                          source={moodImg}
                          style={{ width: 80, height: 80, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      ) : null;
                    })()}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{state.partnerMood.mood}</Text>
                    {state.partnerMood.note ? (
                      <Text style={{ opacity: 0.85, fontSize: 13, color: colors.text, textAlign: 'center', fontStyle: 'italic' }}>"{state.partnerMood.note}"</Text>
                    ) : null}
                  </View>
                )
                : <Text style={[s.tileDetail, { color: colors.text }]}>No mood logged</Text>}
            </Card>


            {/* Ideas preview */}
            <Card onPress={() => router.push('/ideas')} style={[s.sideCard, s.sideTile]}>
              <Text style={s.sideTitle}>Side quests</Text>
              {state.ideas
                ?.filter((i: any) => !i.done)
                .slice(0, 6)
                .map((i: any) => (
                  <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Image
                      source={authorIcon(i?.author_id)}
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <StyledText numberOfLines={1} style={s.sideRow}>{i.text}</StyledText>
                  </View>
                ))}
            </Card>
          </View>
        </View>


        <AvatarMenu />
      </SafeAreaProvider>
    </ImageBackground>
  );
}

// ---- APP ENTRY ----
export default function Index() {
  const session = useSession();
  return session ? <HomeScreen session={session} /> : <AuthScreen />;
}
