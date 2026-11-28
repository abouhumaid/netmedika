import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

export default function StartupSplash() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const iconScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.08] });

  return (
    <LinearGradient
      colors={['#073A53', '#0B806F', '#20B6A2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <View style={styles.content}>
        <View style={styles.iconStage}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <Animated.View style={[styles.iconCard, { transform: [{ scale: iconScale }] }]}>
            <Image
              source={require('../assets/images/app-icon.png')}
              resizeMode="contain"
              style={styles.icon}
              accessibilityLabel="Netmedika"
            />
          </Animated.View>
        </View>

        <Text style={styles.brand}>Netmedika</Text>
        <Text style={styles.tagline}>Wellness at your convenience</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>CARE, MADE CONVENIENT</Text>
        <View style={styles.footerDot} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbTop: {
    width: 300,
    height: 300,
    top: -155,
    right: -105,
  },
  orbBottom: {
    width: 360,
    height: 360,
    bottom: -220,
    left: -180,
  },
  content: {
    alignItems: 'center',
    marginTop: -24,
  },
  iconStage: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  glow: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
  },
  iconCard: {
    width: 128,
    height: 128,
    padding: 5,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    shadowColor: '#002E38',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 12,
  },
  icon: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 9,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.35,
  },
  footer: {
    position: 'absolute',
    bottom: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.7,
  },
});
