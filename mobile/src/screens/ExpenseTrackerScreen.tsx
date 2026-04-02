import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
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
import ExpenseItem, { confirmDeleteExpense } from '../components/ExpenseItem';
import EditExpenseSheet from '../components/EditExpenseSheet';
import SuccessCard from '../components/SuccessCard';
import Toast from '../components/Toast';
import SkeletonItem from '../components/SkeletonItem';
import {
  createExpenseEntry,
  deleteExpenseEntry,
  loadExpenseSnapshot,
  updateExpenseEntry,
} from '../services/expenseRepository';
import { Expense, ExpenseSnapshot } from '../types/index';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export default function ExpenseTrackerScreen() {
  const [input, setInput] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<number | null>(null);
  const [latestExpense, setLatestExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const applySnapshot = useCallback((snapshot: ExpenseSnapshot) => {
    setExpenses(snapshot.expenses);
    setPendingCount(snapshot.pendingCount);
    setIsOffline(snapshot.isOffline);
    setLastSyncError(snapshot.lastSyncError);
  }, []);

  const loadExpenses = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const snapshot = await loadExpenseSnapshot();
      applySnapshot(snapshot);
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error, 'Could not load expenses.'), type: 'error' });
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadExpenses();
      }
    });

    return () => subscription.remove();
  }, [loadExpenses]);

  const handleAdd = async () => {
    if (!input.trim() || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setLatestExpense(null);
    try {
      const result = await createExpenseEntry(input.trim());
      setInput('');
      applySnapshot(result);

      if (result.expense) {
        setLatestExpense(result.deferred ? null : result.expense);
      }

      setToast({
        message: result.deferred ? 'Saved offline. It will sync automatically.' : 'Expense added.',
        type: 'success',
      });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error, 'Could not add expense.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    const confirmed = await confirmDeleteExpense(expense);

    if (!confirmed) {
      return;
    }

    setBusyExpenseId(expense.id);

    try {
      const result = await deleteExpenseEntry(expense);
      applySnapshot(result);
      setToast({
        message: result.deferred ? 'Removed offline. Sync pending.' : 'Expense removed.',
        type: 'success',
      });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error, 'Could not remove expense.'), type: 'error' });
    } finally {
      setBusyExpenseId(null);
    }
  };

  const handleEditSave = async (changes: {
    amount: number;
    currency: string;
    category: Expense['category'];
    description: string;
    merchant: string | null;
  }) => {
    if (!editingExpense) {
      return;
    }

    setSavingEdit(true);

    try {
      const result = await updateExpenseEntry(editingExpense, changes);
      applySnapshot(result);
      setEditingExpense(null);
      setToast({
        message: result.deferred ? 'Edit saved offline. Sync pending.' : 'Expense updated.',
        type: 'success',
      });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error, 'Could not update expense.'), type: 'error' });
    } finally {
      setSavingEdit(false);
    }
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
      <View style={styles.backgroundOrbLarge} />
      <View style={styles.backgroundOrbSmall} />
      <StatusBar barStyle="dark-content" backgroundColor="#F7EFE5" />
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
              <View style={styles.heroCard}>
                <View style={styles.topbar}>
                  <View>
                    <Text style={styles.greeting}>{getGreeting()}, Mohak</Text>
                    <Text style={styles.appTitle}>Expense Tracker</Text>
                    <Text style={styles.heroSubtitle}>Natural language in front, durable local-first sync underneath.</Text>
                  </View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>M</Text>
                  </View>
                </View>

                <View style={styles.summaryStrip}>
                  <View style={styles.statCardAccent}>
                    <Text style={styles.statLabelLight}>Today</Text>
                    <Text style={styles.statValueLight}>
                      ₹{totalToday.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.statCardSoft}>
                    <Text style={styles.statLabel}>This month</Text>
                    <Text style={styles.statValue}>
                      ₹{totalMonth.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.statCardSoft}>
                    <Text style={styles.statLabel}>Entries</Text>
                    <Text style={styles.statValue}>{expenses.length}</Text>
                  </View>
                </View>
              </View>

              {(pendingCount > 0 || isOffline || lastSyncError) && (
                <View style={styles.syncBanner}>
                  <View>
                    <Text style={styles.syncBannerTitle}>
                      {isOffline ? 'Offline mode' : 'Sync in progress'}
                    </Text>
                    <Text style={styles.syncBannerText}>
                      {pendingCount > 0
                        ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync.`
                        : lastSyncError || 'Trying to reconnect.'}
                    </Text>
                  </View>
                  {pendingCount > 0 && (
                    <View style={styles.syncPill}>
                      <Text style={styles.syncPillText}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
              )}

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

                <View style={styles.chips}>
                  {['Uber 350', 'Coffee 180', 'Netflix 649', 'Groceries 1200', 'Medicine 850'].map(ex => (
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
            <ExpenseItem
              expense={item}
              busy={busyExpenseId === item.id}
              onEdit={setEditingExpense}
              onDelete={(expense) => void handleDelete(expense)}
            />
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
                <Text style={styles.emptySubtitle}>Describe what you spent above, even if you are temporarily offline.</Text>
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

      <EditExpenseSheet
        expense={editingExpense}
        visible={editingExpense !== null}
        saving={savingEdit}
        onClose={() => setEditingExpense(null)}
        onSave={handleEditSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7EFE5' },
  flex: { flex: 1 },
  listContent: { paddingBottom: 40, paddingTop: 10 },

  backgroundOrbLarge: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(199, 133, 89, 0.16)',
  },
  backgroundOrbSmall: {
    position: 'absolute',
    top: 120,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 219, 184, 0.4)',
  },

  heroCard: {
    marginHorizontal: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 28,
    backgroundColor: '#2B180B',
    shadowColor: '#2B180B',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },

  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  greeting: { fontSize: 13, color: '#D4B89D' },
  appTitle: { fontSize: 28, fontWeight: '700', color: '#FFF5E9', marginTop: 4, letterSpacing: -0.6 },
  heroSubtitle: { fontSize: 13, color: '#DABB9D', marginTop: 8, maxWidth: 240, lineHeight: 18 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F4C38F',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#4B2A11' },

  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statCardAccent: {
    flex: 1,
    backgroundColor: '#E98B56',
    borderRadius: 20,
    padding: 12,
  },
  statCardSoft: {
    flex: 1,
    backgroundColor: '#FFF5E8',
    borderRadius: 20,
    padding: 12,
  },
  statLabelLight: { fontSize: 11, color: '#FFE6D2', marginBottom: 4 },
  statValueLight: { fontSize: 16, fontWeight: '700', color: '#FFFDF8' },
  statLabel: { fontSize: 11, color: '#9B765A', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#2B180B' },

  syncBanner: {
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: '#FCE7D0',
    borderWidth: 1,
    borderColor: '#EDCFAD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A4327',
    marginBottom: 4,
  },
  syncBannerText: {
    fontSize: 12,
    color: '#8B6042',
    maxWidth: 250,
  },
  syncPill: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B180B',
  },
  syncPillText: {
    color: '#FFF5E8',
    fontWeight: '700',
  },

  inputCard: {
    backgroundColor: '#FFF9F1',
    borderRadius: 24,
    marginHorizontal: 18,
    marginBottom: 14,
    marginTop: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0DECA',
  },
  inputHint: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#A06A45',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#FFF3E5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1DDC7',
    padding: 10,
    marginBottom: 10,
  },
  inputRowFocused: {
    borderColor: '#D49365',
    borderWidth: 1,
    backgroundColor: '#FFF9F1',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2B180B',
    minHeight: 38,
    maxHeight: 90,
    lineHeight: 20,
  },
  addBtn: {
    backgroundColor: '#2B180B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  addBtnDisabled: { backgroundColor: '#C9B8A7' },
  addBtnPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  addBtnText: { color: '#FFF8EE', fontWeight: '700', fontSize: 14 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    backgroundColor: '#F7E9D7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EBD4BB',
  },
  chipPressed: { opacity: 0.55 },
  chipText: { fontSize: 12, color: '#6F4B33' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2B180B' },
  sectionCount: { fontSize: 12, color: '#A06A45' },

  emptyState: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#2B180B', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#8E6A53', textAlign: 'center' },
});
