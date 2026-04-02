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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

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
  const [showAll, setShowAll] = useState(false); // New state for Load More
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

  // Pagination logic
  const displayedExpenses = showAll ? expenses : expenses.slice(0, 5);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.backgroundOrbLarge} />
        <View style={styles.backgroundOrbSmall} />
        <StatusBar barStyle="dark-content" backgroundColor="#FAF3EA" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={displayedExpenses}
          keyExtractor={item => String(item.id)}
          refreshing={refreshing}
          onRefresh={() => loadExpenses(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Elevated Hero Card */}
              <View style={styles.heroCard}>
                <View style={styles.topbar}>
                  <View>
                    <Text style={styles.greeting}>{getGreeting()}, Mohak</Text>
                    <Text style={styles.appTitle}>Overview</Text>
                  </View>
                  <View style={styles.avatarBorder}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>M</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.heroMainStat}>
                  <Text style={styles.heroLabel}>Total this month</Text>
                  <Text style={styles.heroValue}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    {totalMonth.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.heroSubStats}>
                  <View style={styles.subStatContainer}>
                    <View style={styles.dotIndicator} />
                    <View>
                      <Text style={styles.subStatLabel}>Today</Text>
                      <Text style={styles.subStatValue}>₹{totalToday.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={styles.subStatDivider} />
                  <View style={styles.subStatContainer}>
                    <View style={[styles.dotIndicator, { backgroundColor: '#F4C38F' }]} />
                    <View>
                      <Text style={styles.subStatLabel}>Entries</Text>
                      <Text style={styles.subStatValue}>{expenses.length}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Sync Banner */}
              {(pendingCount > 0 || isOffline || lastSyncError) && (
                <View style={styles.syncBanner}>
                  <View style={styles.syncBannerContent}>
                    <Text style={styles.syncBannerEmoji}>{isOffline ? '📡' : '🔄'}</Text>
                    <View style={styles.syncBannerTextColumn}>
                      <Text style={styles.syncBannerTitle}>
                        {isOffline ? 'Offline mode active' : 'Syncing changes...'}
                      </Text>
                      <Text style={styles.syncBannerText}>
                        {pendingCount > 0
                          ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to safely sync.`
                          : lastSyncError || 'Reconnecting to the server.'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

        {/* PREMIUM FULL-BORDER Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputHint}>✨ ADD EXPENSE</Text>
                
                <View style={[styles.inputRow, isInputFocused && styles.inputRowFocused]}>
                  <TextInput
                    style={styles.textInput}
                    value={input}
                    onChangeText={setInput}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder='e.g. "Dinner at Restaurant 1800"'
                    placeholderTextColor="#C4A892"
                    multiline
                    maxLength={200}
                    returnKeyType="done"
                    underlineColorAndroid="transparent"

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
                      ? <ActivityIndicator color="#FFF8EE" size="small" />
                      : <Text style={styles.addBtnText}>Add</Text>
                    }
                  </Pressable>
                </View>

                <View style={styles.chips}>
                  {['Uber 350', 'Coffee 180', 'Netflix 649'].map(ex => (
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

              {/* Section header */}
              {expenses.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
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
              <View style={styles.skeletonWrapper}>
                {[1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyEmoji}>☕</Text>
                </View>
                <Text style={styles.emptyTitle}>A fresh start</Text>
                <Text style={styles.emptySubtitle}>Your entries will be stored locally even if you drop offline.</Text>
              </View>
            )
          }
          ListFooterComponent={
            expenses.length > 5 && !showAll ? (
              <View style={styles.footerContainer}>
                <Pressable
                  style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.loadMoreBtnPressed]}
                  onPress={() => setShowAll(true)}
                >
                  <Text style={styles.loadMoreText}>Load {expenses.length - 5} more entries</Text>
                </Pressable>
              </View>
            ) : null
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

      {latestExpense && (
        <SuccessCard
          expense={latestExpense}
          onDismiss={() => setLatestExpense(null)}
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF3EA', overflow: 'hidden' },
  flex: { flex: 1 },
  listContent: { paddingBottom: 50, paddingTop: 10 },

  backgroundOrbLarge: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#F3E1CF',
    opacity: 0.6,
  },
  backgroundOrbSmall: {
    position: 'absolute',
    top: 150,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FCE7D0',
    opacity: 0.5,
  },

  heroCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 32,
    backgroundColor: '#331E12',
    shadowColor: '#331E12',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
  },
  greeting: { fontSize: 14, color: '#C9A98E', fontWeight: '500' },
  appTitle: { fontSize: 26, fontWeight: '700', color: '#FFF5E9', marginTop: 2, letterSpacing: -0.5 },
  avatarBorder: {
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F4C38F',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#4B2A11' },

  heroMainStat: { marginBottom: 24 },
  heroLabel: { fontSize: 13, color: '#A6866D', fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  heroValue: { fontSize: 44, fontWeight: '700', color: '#FFFDF8', letterSpacing: -1 },
  currencySymbol: { fontSize: 32, color: '#D49365', fontWeight: '600' },

  heroSubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
  },
  subStatContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dotIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E98B56' },
  subStatLabel: { fontSize: 12, color: '#A6866D', marginBottom: 2 },
  subStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF5E9' },
  subStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 16 },

  syncBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(233, 139, 86, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233, 139, 86, 0.2)',
    padding: 16,
  },
  syncBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  syncBannerEmoji: { fontSize: 20 },
  syncBannerTextColumn: { flex: 1 },
  syncBannerTitle: { fontSize: 14, fontWeight: '700', color: '#B35D2E', marginBottom: 2 },
  syncBannerText: { fontSize: 13, color: '#8E6A53', lineHeight: 18 },

// PREMIUM INPUT AREA
  inputSection: {
    marginHorizontal: 16, // Matched to hero card margins for perfect alignment
    marginTop: 20,
    marginBottom: 24,
  },
  inputHint: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#B35D2E',
    marginBottom: 10,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Crisp white contrast against the #FAF3EA app background
    borderRadius: 20, // Smooth, premium rounding
    borderWidth: 1.5, // Clear, distinct border
    borderColor: '#EBD4BB',
    padding: 6, // Padding pushes the inner items away from the border (the "inset" look)
    paddingLeft: 16,
    marginBottom: 14,
    shadowColor: '#8E6A53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, // Extremely subtle shadow just for depth
    shadowRadius: 8,
    elevation: 2,
  },
  inputRowFocused: {
    borderColor: '#B35D2E', // Deep earthy orange on focus
    shadowOpacity: 0.08,
  },
  textInput: {
    flex: 1,
    
    fontSize: 16,
    color: '#331E12',
    
    minHeight: 40,
    paddingVertical: 8,
      textAlignVertical: 'center', // 🔥 key fix

  },
  addBtn: {
    backgroundColor: '#331E12',
    borderRadius: 14, // Slightly smaller radius than the parent wrapper creates a perfect nested fit
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 12,
  },
  addBtnDisabled: { 
    backgroundColor: '#EBE2D8' 
  },
  addBtnPressed: { 
    transform: [{ scale: 0.96 }], 
    opacity: 0.9 
  },
  addBtnText: { 
    color: '#FFF8EE', 
    fontWeight: '700', 
    fontSize: 14 
  },

  // CHIPS 
  chips: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginLeft: 4,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EBD4BB',
  },
  chipPressed: { backgroundColor: '#EBD4BB' },
  chipText: { fontSize: 13, color: '#6F4B33', fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#331E12' },
  skeletonWrapper: { paddingHorizontal: 16 },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7D0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#331E12', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#8E6A53', textAlign: 'center', lineHeight: 22 },

  // LOAD MORE BUTTON
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(233, 139, 86, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233, 139, 86, 0.3)',
  },
  loadMoreBtnPressed: {
    backgroundColor: 'rgba(233, 139, 86, 0.2)',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B35D2E',
  },
});