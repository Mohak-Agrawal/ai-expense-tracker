import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteExpense } from '../services/api';
import { CATEGORY_EMOJIS, Expense } from '../types/index';

interface Props {
  expense: Expense;
  onDeleted: (id: number) => void;
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

function confirmDeleteExpense(expense: Expense): Promise<boolean> {
  const message = `Remove ₹${expense.amount} – ${expense.description}?`;

  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`Delete Expense?\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert('Delete Expense?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function ExpenseItem({ expense, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    void (async () => {
      const confirmed = await confirmDeleteExpense(expense);
      if (!confirmed) return;

      setDeleting(true);
      try {
        await deleteExpense(expense.id);
        onDeleted(expense.id);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to delete.');
        setDeleting(false);
      }
    })();
  };

  const emoji = CATEGORY_EMOJIS[expense.category] || '📦';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.category}>{expense.category}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {expense.description}
          {expense.merchant ? ` · ${expense.merchant}` : ''}
        </Text>
        <Text style={styles.time}>{timeAgo(expense.created_at)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.5}
        >
          {deleting
            ? <ActivityIndicator size="small" color="#C7C7CC" />
            : <Ionicons name="trash-outline" size={15} color="#C7C7CC" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  left: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 20 },
  middle: { flex: 1 },
  category: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 3,
  },
  time: {
    fontSize: 11,
    color: '#AEAEB2',
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  deleteBtn: {
    padding: 2,
  },
});
