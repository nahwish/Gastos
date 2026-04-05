import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import type { Category } from '@/database/repositories/expenseRepository';
import { addExpense, getCategories } from '@/database/repositories/expenseRepository';

const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B' },
  { id: 2, name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
  { id: 3, name: 'Entretenimiento', icon: '🎬', color: '#FFE66D' },
  { id: 4, name: 'Salud', icon: '⚕️', color: '#95E1D3' },
  { id: 5, name: 'Hogar', icon: '🏠', color: '#F38181' },
  { id: 6, name: 'Otros', icon: '📦', color: '#AA96DA' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddExpenseModal({ visible, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setDescription('');
      setSelectedCategory(categories[0] || FALLBACK_CATEGORIES[0]);
      setShowCategoryPicker(false);
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      if (cats.length > 0) {
        setCategories(cats);
        setSelectedCategory(cats[0]);
      } else {
        setSelectedCategory(FALLBACK_CATEGORIES[0]);
      }
    } catch {
      setSelectedCategory(FALLBACK_CATEGORIES[0]);
    }
  };

  const handleAmountChange = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handleSave = async () => {
    setError(null);

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresá un monto válido');
      return;
    }

    if (!selectedCategory) {
      setError('Seleccioná una categoría');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        amount: numAmount,
        description: description.trim(),
        category: selectedCategory.name,
        date: new Date().toISOString().split('T')[0],
      });
      onSaved();
      onClose();
    } catch {
      setError('No se pudo guardar el gasto');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (cat: Category) => {
    const iconMap: Record<string, string> = {
      Alimentación: '🍔',
      Transporte: '🚗',
      Entretenimiento: '🎬',
      Salud: '⚕️',
      Hogar: '🏠',
      Otros: '📦',
    };
    return cat.icon || iconMap[cat.name] || '📌';
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nuevo gasto</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#D1D5DB"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              maxLength={12}
            />
          </View>

          {/* Category Dropdown */}
          <Text style={styles.label}>Categoría</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            activeOpacity={0.7}
          >
            {selectedCategory && (
              <View style={styles.dropdownContent}>
                <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
                <Text style={styles.dropdownText}>
                  {getCategoryIcon(selectedCategory)} {selectedCategory.name}
                </Text>
              </View>
            )}
            <Text style={styles.dropdownArrow}>{showCategoryPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.pickerList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pickerItem,
                    selectedCategory?.id === cat.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.pickerItemText}>
                    {getCategoryIcon(cat)} {cat.name}
                  </Text>
                  {selectedCategory?.id === cat.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description (optional) */}
          <Text style={styles.label}>
            Descripción <Text style={styles.optionalTag}>(opcional)</Text>
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Ej: Almuerzo, Uber al trabajo..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
          />

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 23,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currencySign: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionalTag: {
    fontWeight: '400',
    color: '#9CA3AF',
    fontSize: 13,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  pickerList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  checkmark: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  descriptionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
