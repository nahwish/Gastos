import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Category } from '@/database/repositories/expenseRepository';
import {
  addExpense,
  getCategories,
  addCategory,
} from '@/database/repositories/expenseRepository';
import { getCurrentUserId } from '@/database/repositories/userRepository';
import { DarkTheme } from '@/shared/theme/darkTheme';

const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B' },
  { id: 2, name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
  { id: 3, name: 'Entretenimiento', icon: '🎬', color: '#FFE66D' },
  { id: 4, name: 'Salud', icon: '⚕️', color: '#95E1D3' },
  { id: 5, name: 'Hogar', icon: '🏠', color: '#F38181' },
  { id: 6, name: 'Otros', icon: '📦', color: '#AA96DA' },
];

const EMOJI_OPTIONS = ['🛒', '💊', '🎮', '📚', '👕', '🐾', '💡', '🎁', '✈️', '🍕', '☕', '🏋️'];
const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA',
  '#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE',
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

  // New fields
  const [expenseType, setExpenseType] = useState<'individual' | 'compartido'>('individual');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');

  // Add category
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);

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
      setExpenseType('individual');
      setDiscountAmount('');
      setDiscountType('fixed');
      setShowAddCategory(false);
      setNewCatName('');
      setNewCatIcon('📌');
      setNewCatColor(COLOR_OPTIONS[0]);
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const userId = await getCurrentUserId();
      const cats = await getCategories(userId ?? undefined);
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
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handleDiscountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setDiscountAmount(cleaned);
  };

  const getEffectiveAmount = (): number => {
    const numAmount = parseFloat(amount) || 0;
    const numDiscount = parseFloat(discountAmount) || 0;
    if (numDiscount <= 0) return numAmount;
    if (discountType === 'percentage') {
      return numAmount * (1 - numDiscount / 100);
    }
    return Math.max(0, numAmount - numDiscount);
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

    const numDiscount = parseFloat(discountAmount) || 0;
    if (numDiscount < 0) {
      setError('El descuento no puede ser negativo');
      return;
    }
    if (discountType === 'percentage' && numDiscount > 100) {
      setError('El descuento no puede superar el 100%');
      return;
    }
    if (discountType === 'fixed' && numDiscount > numAmount) {
      setError('El descuento no puede superar el monto');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        amount: numAmount,
        description: description.trim(),
        category: selectedCategory.name,
        date: new Date().toISOString().split('T')[0],
        expense_type: expenseType,
        discount_amount: numDiscount,
        discount_type: numDiscount > 0 ? discountType : 'fixed',
      });
      onSaved();
      onClose();
    } catch {
      setError('No se pudo guardar el gasto');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      setError('El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setError('No hay usuario autenticado');
        return;
      }
      const newCat = await addCategory(newCatName.trim(), newCatIcon, newCatColor, userId);
      setCategories((prev) => [...prev, newCat]);
      setSelectedCategory(newCat);
      setShowAddCategory(false);
      setShowCategoryPicker(false);
      setNewCatName('');
      setNewCatIcon('📌');
      setNewCatColor(COLOR_OPTIONS[0]);
      setError(null);
    } catch {
      setError('No se pudo crear la categoría');
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

  const hasDiscount = parseFloat(discountAmount) > 0;
  const effectiveAmount = getEffectiveAmount();

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.sheet}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            <Text style={styles.label}>Monto</Text>
            <View style={styles.amountSection}>
              <Text style={styles.currencySign}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={DarkTheme.colors.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={handleAmountChange}
                maxLength={12}
              />
            </View>
            {/* Add Category Inline Form */}
            {showAddCategory && (
              <View style={styles.addCategoryForm}>
                <TextInput
                  style={styles.addCategoryInput}
                  placeholder="Nombre de la categoría"
                  placeholderTextColor={DarkTheme.colors.textSecondary}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  maxLength={30}
                />
                <Text style={styles.miniLabel}>Icono</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiOption,
                        newCatIcon === emoji && styles.emojiOptionSelected,
                      ]}
                      onPress={() => setNewCatIcon(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.miniLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newCatColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setNewCatColor(color)}
                    />
                  ))}
                </View>
                <TouchableOpacity style={styles.addCategorySave} onPress={handleAddCategory}>
                  <Text style={styles.addCategorySaveText}>Agregar categoría</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Expense Type Toggle */}
            <Text style={styles.label}>Tipo de gasto</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  expenseType === 'individual' && styles.toggleButtonActive,
                ]}
                onPress={() => setExpenseType('individual')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleText,
                    expenseType === 'individual' && styles.toggleTextActive,
                  ]}
                >
                  👤 Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  expenseType === 'compartido' && styles.toggleButtonActive,
                ]}
                onPress={() => setExpenseType('compartido')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleText,
                    expenseType === 'compartido' && styles.toggleTextActive,
                  ]}
                >
                  🤝 Compartido
                </Text>
              </TouchableOpacity>
            </View>

                  

            {/* Discount */}
            <Text style={styles.label}>
              Descuento <Text style={styles.optionalTag}>(opcional)</Text>
            </Text>
            <View style={styles.discountRow}>
              <View style={styles.discountInputWrapper}>
                <Text style={styles.discountPrefix}>
                  {discountType === 'fixed' ? '$' : '%'}
                </Text>
                <TextInput
                  style={styles.discountInput}
                  placeholder="0"
                  placeholderTextColor={DarkTheme.colors.textSecondary}
                  keyboardType="numeric"
                  value={discountAmount}
                  onChangeText={handleDiscountChange}
                  maxLength={8}
                />
              </View>
              <View style={styles.discountToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.discountToggle,
                    discountType === 'fixed' && styles.discountToggleActive,
                  ]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text
                    style={[
                      styles.discountToggleText,
                      discountType === 'fixed' && styles.discountToggleTextActive,
                    ]}
                  >
                    $
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.discountToggle,
                    discountType === 'percentage' && styles.discountToggleActive,
                  ]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.discountToggleText,
                      discountType === 'percentage' && styles.discountToggleTextActive,
                    ]}
                  >
                    %
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {hasDiscount && (
              <Text style={styles.effectiveAmountText}>
                Monto final: ${effectiveAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            )}

            {/* Category Dropdown */}
            <Text style={styles.label}>Categoría</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowCategoryPicker(!showCategoryPicker);
                setShowAddCategory(false);
              }}
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
                {/* Add Category Button */}
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => setShowAddCategory(!showAddCategory)}
                >
                  <Text style={styles.addCategoryButtonText}>＋ Nueva categoría</Text>
                </TouchableOpacity>
              </View>
            )}

            
            {/* Description (optional) */}
            <Text style={styles.label}>
              Descripción <Text style={styles.optionalTag}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Ej: Almuerzo, Uber al trabajo..."
              placeholderTextColor={DarkTheme.colors.textSecondary}
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
      </KeyboardAvoidingView>
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
  keyboardView: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  sheet: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 23,
    maxHeight: '90%',
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
    color: DarkTheme.colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DarkTheme.colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: DarkTheme.colors.textSecondary,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: DarkTheme.colors.deleteButtonBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: DarkTheme.colors.errorText,
  },
  errorText: {
    color: DarkTheme.colors.errorText,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DarkTheme.colors.textSecondary,
    marginBottom: 8,
  },
  optionalTag: {
    fontWeight: '400',
    color: DarkTheme.colors.textSecondary,
    fontSize: 13,
  },
  // Expense Type Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: DarkTheme.colors.bgPrimary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  toggleButtonActive: {
    backgroundColor: DarkTheme.colors.accentGreen + '20',
    borderColor: DarkTheme.colors.accentGreen,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: DarkTheme.colors.textSecondary,
  },
  toggleTextActive: {
    color: DarkTheme.colors.accentGreen,
  },
  // Amount
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  currencySign: {
    fontSize: 32,
    fontWeight: 'bold',
    color: DarkTheme.colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
    paddingVertical: 4,
  },
  // Discount
  discountRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  discountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  discountPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DarkTheme.colors.textSecondary,
    marginRight: 6,
  },
  discountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: DarkTheme.colors.textPrimary,
    paddingVertical: 12,
  },
  discountToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  discountToggle: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: DarkTheme.colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  discountToggleActive: {
    backgroundColor: DarkTheme.colors.accentGreen + '20',
    borderColor: DarkTheme.colors.accentGreen,
  },
  discountToggleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DarkTheme.colors.textSecondary,
  },
  discountToggleTextActive: {
    color: DarkTheme.colors.accentGreen,
  },
  effectiveAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: DarkTheme.colors.accentGreen,
    marginBottom: 16,
  },
  // Category Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: DarkTheme.colors.textPrimary,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: DarkTheme.colors.textSecondary,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  pickerList: {
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DarkTheme.colors.border,
  },
  pickerItemSelected: {
    backgroundColor: DarkTheme.colors.accentGreen + '15',
  },
  pickerItemText: {
    fontSize: 16,
    color: DarkTheme.colors.textPrimary,
    flex: 1,
  },
  checkmark: {
    color: DarkTheme.colors.accentGreen,
    fontSize: 18,
    fontWeight: 'bold',
  },
  addCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.bgCard,
  },
  addCategoryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: DarkTheme.colors.accentGreen,
  },
  // Add Category Form
  addCategoryForm: {
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  addCategoryInput: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: DarkTheme.colors.textPrimary,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    marginBottom: 12,
  },
  miniLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DarkTheme.colors.textSecondary,
    marginBottom: 6,
  },
  emojiRow: {
    marginBottom: 12,
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    backgroundColor: DarkTheme.colors.bgCard,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  emojiOptionSelected: {
    borderColor: DarkTheme.colors.accentGreen,
    backgroundColor: DarkTheme.colors.accentGreen + '20',
  },
  emojiText: {
    fontSize: 18,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: DarkTheme.colors.textPrimary,
  },
  addCategorySave: {
    backgroundColor: DarkTheme.colors.accentGreen,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addCategorySaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Description
  descriptionInput: {
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    color: DarkTheme.colors.textPrimary,
    marginBottom: 24,
  },
  // Save
  saveButton: {
    backgroundColor: DarkTheme.colors.accentGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: DarkTheme.colors.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
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
