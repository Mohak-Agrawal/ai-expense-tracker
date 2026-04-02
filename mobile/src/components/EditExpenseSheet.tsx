import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Expense, ExpenseCategory, ExpenseWritePayload } from '../types';
import { EXPENSE_CATEGORIES } from '../types';

interface Props {
  expense: Expense | null;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Omit<ExpenseWritePayload, 'original_input'>) => void;
}

export default function EditExpenseSheet({ expense, visible, saving, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');

  useEffect(() => {
    if (!expense) {
      return;
    }

    setAmount(String(expense.amount));
    setDescription(expense.description);
    setMerchant(expense.merchant ?? '');
    setCategory(expense.category);
  }, [expense]);

  const handleSave = () => {
    const parsedAmount = Number(amount.replace(/,/g, ''));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || description.trim().length === 0) {
      return;
    }

    onSave({
      amount: Number(parsedAmount.toFixed(2)),
      currency: expense?.currency ?? 'INR',
      category,
      description: description.trim(),
      merchant: merchant.trim() || null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>EDIT EXPENSE</Text>
                <Text style={styles.title}>Refine the details</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.closeLabel}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#A68D7B"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this for?"
                  placeholderTextColor="#A68D7B"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Merchant</Text>
                <TextInput
                  style={styles.input}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Optional"
                  placeholderTextColor="#A68D7B"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((categoryOption) => (
                    <Pressable
                      key={categoryOption}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        category === categoryOption && styles.categoryChipActive,
                        pressed && styles.categoryChipPressed,
                      ]}
                      onPress={() => setCategory(categoryOption)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === categoryOption && styles.categoryChipTextActive,
                        ]}
                      >
                        {categoryOption}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable style={styles.secondaryButton} onPress={onClose} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(41, 29, 17, 0.22)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF8EE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: '58%',
  },
  handle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#DEC9B3',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#A06A45',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#27170A',
  },
  closeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A583F',
  },
  form: {
    gap: 18,
    paddingBottom: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#573823',
  },
  input: {
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5D3C1',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#27170A',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F4E7D6',
  },
  categoryChipActive: {
    backgroundColor: '#27170A',
  },
  categoryChipPressed: {
    opacity: 0.8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#734B30',
  },
  categoryChipTextActive: {
    color: '#FFF8EE',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F0E2D3',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D4C38',
  },
  primaryButton: {
    flex: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#27170A',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF8EE',
  },
});