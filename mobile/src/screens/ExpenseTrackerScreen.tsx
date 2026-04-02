import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StatusBar,
} from 'react-native';
import { Expense } from '../types/index';
import { addExpense, getExpenses } from '../services/api';
import ExpenseItem from '../components/ExpenseItem';
import SuccessCard from '../components/SuccessCard';
import Toast from '../components/Toast';
import SkeletonItem from '../components/SkeletonItem';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

export default function ExpenseTrackerScreen() {
  const [input, setInput] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [latestExpense, setLatestExpense] = useState<Expense | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const loadExpenses = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error: any) {
      setToast({ message: error.message || 'Could not load expenses.', type: 'error' });
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAdd = async () => {
    if (!input.trim() || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setLatestExpense(null);
    try {
      const expense = await addExpense(input.trim());
      setInput('');
      setExpenses(prev => [expense, ...prev]);
      setLatestExpense(expense);
    } catch (error: any) {
      setToast({ message: error.message || 'Could not add expense.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setToast({ message: 'Expense removed', type: 'success' });
  };

  const totalToday = expenses
    .filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.amount, 0);

  const totalMonth = expenses
    .filter(e => {
      const d = new Date(e.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F7" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={expenses}
          keyExtractor={item => String(item.id)}
          refreshing={refreshing}
          onRefresh={() => loadExpenses(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Top bar */}
              <View style={styles.topbar}>
                <View>
                  <Text style={styles.greeting}>{getGreeting()}, Mohak</Text>
                  <Text style={styles.appTitle}>Expense Tracker</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>M</Text>
                </View>
              </View>

              {/* Summary strip */}
              <View style={styles.summaryStrip}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Today</Text>
                  <Text style={styles.statValue}>
                    ₹{totalToday.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>This month</Text>
                  <Text style={styles.statValue}>
                    ₹{totalMonth.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Entries</Text>
                  <Text style={styles.statValue}>{expenses.length}</Text>
                </View>
              </View>

              {/* Input card */}
              <View style={styles.inputCard}>
                <Text style={styles.inputHint}>ADD EXPENSE</Text>
                <View style={[styles.inputRow, isInputFocused && styles.inputRowFocused]}>
                  <TextInput
                    style={styles.textInput}
                    value={input}
                    onChangeText={setInput}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder='e.g. "Uber to airport 450"'
                    placeholderTextColor="#AEAEB2"
                    multiline
                    maxLength={200}
                    returnKeyType="done"
                    editable={!loading}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.addBtn,
                      (!input.trim() || loading) && styles.addBtnDisabled,
                      pressed && input.trim() && !loading && styles.addBtnPressed,
                    ]}
                    onPress={handleAdd}
                    disabled={!input.trim() || loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#EEEDFE" size="small" />
                      : <Text style={styles.addBtnText}>Add</Text>
                    }
                  </Pressable>
                </View>

                {/* Quick-fill chips */}
                <View style={styles.chips}>
                  {['Uber 350', 'Coffee 180', 'Netflix 649', 'Groceries 1200'].map(ex => (
                    <Pressable
                      key={ex}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                      onPress={() => setInput(ex)}
                      disabled={loading}
                    >
                      <Text style={styles.chipText}>{ex}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Success card */}
              {latestExpense && (
                <SuccessCard
                  expense={latestExpense}
                  onDismiss={() => setLatestExpense(null)}
                />
              )}

              {/* Section header */}
              {expenses.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <Text style={styles.sectionCount}>{expenses.length} entries</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ExpenseItem expense={item} onDeleted={handleDeleted} />
          )}
          ListEmptyComponent={
            initialLoad ? (
              <View>
                {[1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💸</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySubtitle}>Describe what you spent above</Text>
              </View>
            )
          }
        />
      </KeyboardAvoidingView>

      {toast && (
        <Toast
          key={`${toast.message}-${toast.type}`}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  flex: { flex: 1 },
  listContent: { paddingBottom: 40 },

  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  greeting: { fontSize: 13, color: '#8E8E93' },
  appTitle: { fontSize: 24, fontWeight: '600', color: '#1C1C1E', marginTop: 2, letterSpacing: -0.4 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#AFA9EC',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#26215C' },

  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  statLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },

  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  inputHint: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#AEAEB2',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 10,
    marginBottom: 10,
  },
  inputRowFocused: {
    borderColor: 'rgba(83, 74, 183, 0.35)',
    borderWidth: 1,
    backgroundColor: '#FAFAFF',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    minHeight: 38,
    maxHeight: 90,
    lineHeight: 20,
  },
  addBtn: {
    backgroundColor: '#534AB7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  addBtnDisabled: { backgroundColor: '#C7C7CC' },
  addBtnPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  addBtnText: { color: '#EEEDFE', fontWeight: '600', fontSize: 14 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  chipPressed: { opacity: 0.55 },
  chipText: { fontSize: 12, color: '#6B6B6B' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  sectionCount: { fontSize: 12, color: '#AEAEB2' },

  emptyState: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },
});
