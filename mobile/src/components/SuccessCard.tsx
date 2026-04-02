import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_EMOJIS, Expense } from '../types/index';

interface Props {
  expense: Expense;
  onDismiss: () => void;
}

export default function SuccessCard({ expense, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 130 }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 220, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 2800);

    return () => clearTimeout(hideTimer);
  }, []);

  const emoji = CATEGORY_EMOJIS[expense.category] || '📦';

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={13} color="#534AB7" />
        </View>
        <Text style={styles.title}>Expense added</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Amount</Text>
        <Text style={styles.value}>₹{expense.amount.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>{emoji} {expense.category}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Description</Text>
        <Text style={styles.value} numberOfLines={1}>{expense.description}</Text>
      </View>
      {expense.merchant && (
        <View style={styles.row}>
          <Text style={styles.label}>Merchant</Text>
          <Text style={styles.value}>{expense.merchant}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEEDFE',
    borderWidth: 1,
    borderColor: 'rgba(83, 74, 183, 0.2)',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(83, 74, 183, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#534AB7',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { fontSize: 13, color: '#8E8E93' },
  value: { fontSize: 13, fontWeight: '600', color: '#1C1C1E', maxWidth: '60%', textAlign: 'right' },
});
