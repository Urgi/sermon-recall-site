import { StatusBar } from 'expo-status-bar';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const BG = '#05070a';
const BG_ELEVATED = '#0a0f18';
const BG_FOOTER = '#020408';
const WHITE = '#ffffff';
const MUTED = '#94a3b8';
const MUTED_DIM = '#64748b';
const ACCENT = '#38bdf8';
const BORDER = 'rgba(56, 189, 248, 0.12)';
const MAX_CONTENT = 1120;
const FONT =
  Platform.OS === 'web'
    ? ('system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' as const)
    : undefined;

export default function App() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 840;
  const pad = Math.min(32, Math.max(20, width * 0.05));
  const heroMin =
    Platform.OS === 'web' && height > 520 ? Math.min(height * 0.72, 720) : undefined;
  const logoW = isWide ? Math.min(420, width * 0.38) : Math.min(360, width - pad * 2);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingHorizontal: pad }]}>
        <View style={styles.headerInner}>
          <Text style={styles.headerBrand}>Sermon Recall</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBand, heroMin != null && { minHeight: heroMin }]}>
          <View style={[styles.heroInner, { paddingHorizontal: pad }]}>
            <View style={[styles.heroGrid, isWide && styles.heroGridWide]}>
              <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
                <Text style={styles.kicker}>For pastors & church leaders</Text>
                <Text style={styles.headline}>
                  <Text style={styles.headlineWhite}>Sermon-to-Devotional </Text>
                  <Text style={styles.headlineAccent}>Pipeline</Text>
                </Text>
                <Text style={styles.lead}>
                  Bridge Sunday to the rest of the week with a clear rhythm your people can follow.
                </Text>
                <Text style={styles.body}>
                  As a pastor, your Sunday message is often where people encounter God most
                  clearly—yet without a deliberate path from pulpit to personal reflection, that
                  momentum fades by Monday. A sermon-to-devotional pipeline keeps the Word in front
                  of your flock in bite-sized form, reinforces application through the week, and
                  honors the labor you poured into study by letting it bear fruit long after the
                  service ends.
                </Text>
              </View>
              <View style={[styles.heroArt, isWide && styles.heroArtWide]}>
                <View style={styles.heroCard}>
                  <Image
                    accessibilityLabel="Sermon Recall logo"
                    source={require('./assets/SermonRecall.png')}
                    style={[styles.heroLogo, { width: logoW }]}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { paddingHorizontal: pad }]}>
          <View style={styles.sectionInner}>
            <Text style={styles.sectionTitle}>Built for weekly discipleship</Text>
            <Text style={styles.sectionSubtitle}>
              The same ideas you already care about—structured the way a modern ministry site
              presents them.
            </Text>
            <View style={[styles.cards, isWide && styles.cardsWide]}>
              {[
                {
                  t: 'Extend the sermon',
                  d: 'Turn one message into daily touchpoints instead of a single spike of attention.',
                },
                {
                  t: 'Honor your preparation',
                  d: 'Let study and illustrations keep working after the benediction.',
                },
                {
                  t: 'Shepherd with consistency',
                  d: 'Give your congregation a predictable path from hearing to doing.',
                },
              ].map((item) => (
                <View key={item.t} style={styles.card}>
                  <View style={styles.cardRule} />
                  <Text style={styles.cardTitle}>{item.t}</Text>
                  <Text style={styles.cardBody}>{item.d}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.siteFooter, { paddingHorizontal: pad }]}>
          <View style={styles.footerGrid}>
            <View style={styles.footerCol}>
              <Text style={styles.footerBrand}>Sermon Recall</Text>
              <Text style={styles.footerTag}>Listen. Remember. Grow.</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerHeading}>Stack</Text>
              <Text style={styles.footerMeta}>Expo · React Native · Web</Text>
            </View>
          </View>
          {typeof __DEV__ !== 'undefined' && __DEV__ ? (
            <Text style={styles.devHint}>Local dev: cd site && npm run web</Text>
          ) : null}
        </View>
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BG,
    ...(FONT ? { fontFamily: FONT } : {}),
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: 'rgba(5, 7, 10, 0.92)',
    ...(Platform.OS === 'web'
      ? ({
          position: 'sticky' as const,
          top: 0,
          zIndex: 50,
          backdropFilter: 'saturate(140%) blur(10px)',
          WebkitBackdropFilter: 'saturate(140%) blur(10px)',
        } as object)
      : {}),
  },
  headerInner: {
    maxWidth: MAX_CONTENT,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 16,
  },
  headerBrand: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  heroBand: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  heroInner: {
    maxWidth: MAX_CONTENT,
    width: '100%',
    alignSelf: 'center',
  },
  heroGrid: {
    gap: 40,
    alignItems: 'stretch',
  },
  heroGridWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
  },
  heroCopy: {
    flex: 1,
    gap: 16,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  heroCopyWide: {
    alignSelf: 'flex-start',
    flex: 1.1,
    maxWidth: undefined,
  },
  kicker: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -1.2,
    ...(Platform.OS === 'web' ? { maxWidth: 560 } : {}),
  },
  headlineWhite: {
    color: WHITE,
  },
  headlineAccent: {
    color: ACCENT,
  },
  lead: {
    color: '#cbd5e1',
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '500',
  },
  body: {
    color: MUTED,
    fontSize: 17,
    lineHeight: 28,
  },
  heroArt: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroArtWide: {
    flex: 0.9,
  },
  heroCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG_ELEVATED,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroLogo: {
    height: 132,
  },
  section: {
    backgroundColor: BG,
    paddingVertical: 72,
  },
  sectionInner: {
    maxWidth: MAX_CONTENT,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    color: WHITE,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sectionSubtitle: {
    color: MUTED_DIM,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 560,
    marginBottom: 40,
  },
  cards: {
    gap: 16,
  },
  cardsWide: {
    flexDirection: 'row',
    gap: 20,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG_ELEVATED,
    padding: 22,
    minWidth: 0,
  },
  cardRule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginBottom: 14,
    opacity: 0.85,
  },
  cardTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardBody: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
  },
  siteFooter: {
    backgroundColor: BG_FOOTER,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 48,
    paddingBottom: 40,
  },
  footerGrid: {
    maxWidth: MAX_CONTENT,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    rowGap: 32,
  },
  footerCol: {
    minWidth: 160,
    flex: 1,
    gap: 8,
  },
  footerBrand: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  footerTag: {
    color: MUTED_DIM,
    fontSize: 14,
  },
  footerHeading: {
    color: MUTED_DIM,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  footerMeta: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
  },
  devHint: {
    marginTop: 36,
    maxWidth: MAX_CONTENT,
    width: '100%',
    alignSelf: 'center',
    color: '#334155',
    fontSize: 12,
  },
});
