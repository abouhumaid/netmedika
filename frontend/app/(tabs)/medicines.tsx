import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyColors } from '../../constants/Colors';

export default function MedicinesScreen() {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.helpTextContainer}>
        <Animated.Text style={styles.helpText}>
          Order any medicine and we deliver to your doorstep!
        </Animated.Text>
      </View>
      <Animated.View style={[styles.searchBox, { transform: [{ scale: scaleAnim }] }]}> 
        <Ionicons name="search" size={24} color={PharmacyColors.accent} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Search medicines..."
          placeholderTextColor={PharmacyColors.gray}
          value={search}
          onChangeText={setSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </Animated.View>
      <View style={styles.disclaimerContainer}>
        <Animated.Text style={styles.disclaimerHeading}>Disclaimer</Animated.Text>
        <View style={styles.disclaimerRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Animated.Text style={styles.disclaimerText}>
            This app is a marketplace that connects users with licensed pharmacies.
          </Animated.Text>
        </View>
        <View style={styles.disclaimerRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Animated.Text style={styles.disclaimerText}>
            We do not sell, dispense, or provide medical advice. All medicines are supplied by third-party pharmacies.
          </Animated.Text>
        </View>
        <View style={styles.disclaimerRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Animated.Text style={styles.disclaimerText}>
            Always consult a qualified healthcare professional before using any medication.
          </Animated.Text>
        </View>
        <View style={styles.disclaimerRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Animated.Text style={styles.disclaimerText}>
            A valid prescription may be required for certain medicines.
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PharmacyColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  helpTextContainer: {
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 20,
    color: PharmacyColors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: PharmacyColors.textPrimary,
    fontWeight: '500',
    letterSpacing: 0.5,
    backgroundColor: 'transparent',
  },
  disclaimerContainer: {
    marginTop: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'flex-start',
    backgroundColor: PharmacyColors.background,
    padding: 12,
    borderRadius: 12,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  disclaimerHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.error,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  bullet: {
    fontSize: 18,
    color: PharmacyColors.accent,
    marginRight: 10,
    marginTop: 1,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  disclaimerText: {
    fontSize: 13,
    color: PharmacyColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
