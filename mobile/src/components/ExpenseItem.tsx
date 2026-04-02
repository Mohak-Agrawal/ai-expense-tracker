import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_EMOJIS, Expense } from '../types/index';

interface Props {
  expense: Expense;
  busy?: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export async function confirmDeleteExpense(expense: Expense): Promise<boolean> {
  const message = `Remove ₹${expense.amount} – ${expense.description}?`;

  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`Delete Expense?\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert('Delete Expense?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function ExpenseItem({ expense, busy = false, onEdit, onDelete }: Props) {
  const emoji = CATEGORY_EMOJIS[expense.category] || '📦';
  const syncLabel = expense.syncStatus === 'pending-create'
    ? 'Queued'
    : expense.syncStatus === 'pending-update'
      ? 'Saving'
      : null;

  return (
    <View style={styles.container}>
      <View style={[styles.left, syncLabel && styles.leftPending]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={styles.category}>{expense.category}</Text>
          {syncLabel && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{syncLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={1}>
          {expense.description}
          {expense.merchant ? ` · ${expense.merchant}` : ''}
        </Text>
        <Text style={styles.time}>{timeAgo(expense.created_at)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => onEdit(expense)} disabled={busy} style={styles.iconButton}>
            <Ionicons name="create-outline" size={16} color="#946847" />
          </Pressable>
          <Pressable onPress={() => onDelete(expense)} disabled={busy} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={16} color="#C66A4A" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F1',
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 18,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F0DECA',
    shadowColor: '#85572E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  left: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F5EBDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leftPending: {
    backgroundColor: '#F6D3AF',
  },
  emoji: { fontSize: 20 },
  middle: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E1C0E',
  },
  syncBadge: {
    backgroundColor: '#2E1C0E',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  syncBadgeText: {
    fontSize: 10,
    color: '#FFF8EE',
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: '#7A5B47',
    marginBottom: 3,
  },
  time: {
    fontSize: 11,
    color: '#B0896B',
  },
  right: {
    alignItems: 'flex-end',
    gap: 10,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E1C0E',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6EBDD',
  },
});
