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
  const translateY = useRef(new Animated.Value(-24)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 140 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 17, stiffness: 180 }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -18, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.98, duration: 220, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 2800);

    return () => clearTimeout(hideTimer);
  }, [onDismiss, opacity, scale, translateY]);

  const emoji = CATEGORY_EMOJIS[expense.category] || '📦';

  return (
    <Animated.View style={[styles.shell, { opacity, transform: [{ translateY }, { scale }] }]} pointerEvents="none">
      <View style={styles.glow} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark" size={13} color="#FFF8EE" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.kicker}>Saved just now</Text>
            <Text style={styles.title}>Expense added</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.amountBlock}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{emoji} {expense.category}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={1}>{expense.description}</Text>
        {expense.merchant && <Text style={styles.merchant}>at {expense.merchant}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    top: 18,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  glow: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    bottom: -10,
    borderRadius: 28,
    backgroundColor: 'rgba(179, 93, 46, 0.16)',
  },
  container: {
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#EBC9A7',
    borderRadius: 26,
    padding: 16,
    shadowColor: '#7A4C2D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B35D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#C4875E',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#331E12',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  amountBlock: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#A88467',
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#331E12',
    letterSpacing: -0.6,
  },
  metaBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F7E6D2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8CFB4',
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4B2B',
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B2A11',
    marginBottom: 4,
  },
  merchant: {
    fontSize: 13,
    color: '#8E6A53',
  },
});
