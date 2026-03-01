// app/Home.styles.ts (or screens/Home.styles.ts)
import { StyleSheet } from 'react-native';
import { colors, radius } from '../constants/Colors';

export const s = StyleSheet.create({
    // layout
    screen: { flex: 1, fontFamily: 'ArefRuqaaInk-Regular' },
    container: { marginHorizontal: 16, marginTop: 40, paddingBottom: 16 },
    bgOverlay: { ...StyleSheet.absoluteFillObject },

    // header
    headerScript: {
        color: colors.text,
        fontSize: 35,
        textShadowColor: colors.shadow,
        textShadowRadius: 6,
        textShadowOffset: { width: 0, height: 2 },
        textAlign: "center",
        margin: 20,
        marginTop: 30
    },
    headerScriptNone: {
        color: colors.textMuted,
        fontSize: 22,
        fontFamily: 'ArefRuqaaInk-Regular',
        textShadowOffset: { width: 0, height: 2 },
        textAlign: "center",
        margin: 20,
    },

    // cards
    card: {
        backgroundColor: colors.glass,
        borderColor: colors.stroke,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: 12,
        shadowColor: colors.shadow,
        shadowOpacity: 0.6,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        justifyContent: 'center',
        fontFamily: 'ArefRuqaaInk-Regular'
    },

    // latest hero
    row: { flexDirection: 'row', gap: 12 },
    thumb: { width: 100, height: 100, borderRadius: 14, alignSelf: 'center' },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.06)' },
    cardTitle: { color: colors.text, fontSize: 18, fontFamily: 'ArefRuqaaInk-Bold' },
    cardBody: { color: colors.textMuted, fontSize: 12, fontFamily: 'ArefRuqaaInk-Regular' },
    cardBodyMuted: { color: colors.textMuted, fontStyle: 'italic' },

    // chips
    chip: {
        backgroundColor: colors.chip,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.stroke,
    },
    chipText: { color: colors.text, fontSize: 12, fontFamily: 'ArefRuqaaInk-Regular' },

    // tiles (today / next up)
    tileRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    tile: { flex: 1, alignItems: 'center' },
    tileBig: { color: colors.text, fontSize: 60, fontFamily: 'ArefRuqaaInk-Regular' },
    tileSub: { color: colors.textMuted, fontFamily: 'ArefRuqaaInk-Regular' },
    tileSubDay: { color: colors.textMuted, marginTop: 2, fontFamily: 'ArefRuqaaInk-Regular' },
    tileDetail: { color: colors.mint, fontSize: 12, textAlign: 'center', fontFamily: 'ArefRuqaaInk-Regular' },
    tileLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: 'ArefRuqaaInk-Regular' },
    tileCountdown: { color: colors.text, fontSize: 15, fontFamily: 'ArefRuqaaInk-Bold' },

    // quote card
    quoteCard: {
        backgroundColor: colors.blurredglass,
        borderColor: colors.stroke,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: 12,
        shadowColor: colors.shadow,
        shadowOpacity: 0.6,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        justifyContent: 'center',
        fontFamily: 'ArefRuqaaInk-Regular',
        marginBottom: 10,
        color: colors.text
    },
    quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between', width: '100%', marginTop: 8 },
    avatar: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    quoteText: { color: colors.text, fontSize: 16 },
    reactsPill: {
        flexDirection: 'row', alignItems: 'center', marginRight: 5, alignContent: 'center', justifyContent: 'center'
    },

    // side quests
    sideRowWrap: { display: 'flex', flexDirection: 'row', gap: 12, marginTop: 12, height: '35%' },
    sideTitle: { color: colors.text, fontFamily: 'ArefRuqaaInk-Bold', fontSize: 16, marginBottom: 6, alignSelf: 'center' },
    sideCard: {
        backgroundColor: colors.glass,
        borderColor: colors.stroke,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: 12,
        shadowColor: colors.shadow,
        shadowOpacity: 0.6,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        justifyContent: 'flex-start',
        fontFamily: 'ArefRuqaaInk-Regular'
    },
    sideTile: { flex: 1, alignItems: 'flex-start' },
    sideRow: { color: colors.textMuted, fontSize: 14, flexShrink: 1 },

    // FAB
    addbtn: {
        position: 'absolute', right: 20, bottom: 60,
        height: 56, width: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint
    },
    signout: {
        position: 'absolute', left: 20, bottom: 60,
        height: 56, width: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center'
    },

    // thankfull
    thankfullheader: {
        fontFamily: 'ArefRuqaaInk-Bold', fontSize: 20, color: colors.text, marginBottom: 10
    },
    thankfullnote: { fontSize: 18, color: colors.textMuted, width: 300 },
    thankfulltime: { fontFamily: 'ArefRuqaaInk-Regular', fontSize: 10, color: colors.textMuted },
});
