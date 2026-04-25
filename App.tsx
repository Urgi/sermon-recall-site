import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.badge}>Sermon Recall</Text>
        <Text style={styles.headline}>Remember every message.</Text>
        <Text style={styles.lead}>
          The website for the Sermon Recall app—built with the same React Native stack
          (Expo) and shipped to the web.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() =>
            Linking.openURL('https://github.com/Urgi/SermonRecall').catch(() => {})
          }
        >
          <Text style={styles.ctaLabel}>View project on GitHub</Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>Run locally: cd site && npm run web</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f1419',
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  hero: {
    gap: 16,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#c4a574',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headline: {
    color: '#f5f0e8',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 42,
  },
  lead: {
    color: '#a8b0bc',
    fontSize: 17,
    lineHeight: 26,
  },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#c4a574',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    color: '#0f1419',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignSelf: 'center',
    color: '#5c6570',
    fontSize: 13,
  },
});
