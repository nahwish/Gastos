import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { Expense } from '@/database/repositories/expenseRepository';
import { getAllExpenses, deleteExpense } from '@/database/repositories/expenseRepository';
import { exportExpenses } from '@/features/expenses/services/exportService';
import { DarkTheme } from '@/shared/theme/darkTheme';

export default function ExpensesListScreen({ navigation, route }: any) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const categoryFilter = route.params?.category;

  const loadExpenses = async () => {
    const data = await getAllExpenses();
    setExpenses(data);

    if (categoryFilter) {
      const filtered = data.filter((e) => e.category === categoryFilter);
      setFilteredExpenses(filtered);
    } else {
      setFilteredExpenses(data);
    }
  };

  useEffect(() => {
    loadExpenses();
    const unsubscribe = navigation.addListener('focus', loadExpenses);
    return unsubscribe;
  }, [navigation, categoryFilter]);

  const handleDelete = (id: number) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm == null) return;
    await deleteExpense(showDeleteConfirm);
    setShowDeleteConfirm(null);
    loadExpenses();
  };

  const handleExport = async (filterType: 'all' | 'month' | 'category') => {
    setExportError(null);
    const now = new Date();
    try {
      let exportData = expenses;
      let filterOption: any = { type: 'all' };

      if (filterType === 'month') {
        filterOption = { type: 'month', year: now.getFullYear(), month: now.getMonth() + 1 };
      } else if (filterType === 'category') {
        exportData = filteredExpenses;
        filterOption = { type: 'all' }; // Data is already filtered manually here for simplicity
      }

      await exportExpenses(exportData, {
        format: 'csv',
        filter: filterOption,
      });
      setShowExportModal(false);
    } catch (err: any) {
      setExportError(err.message || 'No se pudo exportar');
    }
  };

  const now = new Date();
  const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={styles.container}>
      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm != null && (
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Eliminar Gasto</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que querés eliminar este gasto?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDestructiveButton} onPress={confirmDelete}>
                <Text style={styles.modalDestructiveText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de opciones de exportación */}
      {showExportModal && (
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Exportar gastos</Text>
            <Text style={styles.modalMessage}>
              Seleccioná qué registros querés exportar como CSV:
            </Text>
            {exportError && (
              <View style={styles.exportErrorBox}>
                <Text style={styles.exportErrorText}>{exportError}</Text>
              </View>
            )}

            {categoryFilter && (
              <TouchableOpacity
                style={[styles.exportOption, { borderColor: '#10B981', borderWidth: 1 }]}
                onPress={() => handleExport('category')}
              >
                <Text style={styles.exportOptionTitle}>Solo {categoryFilter}</Text>
                <Text style={styles.exportOptionSubtitle}>{filteredExpenses.length} registros</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('month')}>
              <Text style={styles.exportOptionTitle}>Este mes</Text>
              <Text style={styles.exportOptionSubtitle}>{monthName}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('all')}>
              <Text style={styles.exportOptionTitle}>Todo el historial</Text>
              <Text style={styles.exportOptionSubtitle}>{expenses.length} registros</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowExportModal(false);
                setExportError(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {categoryFilter ? `Gastos: ${categoryFilter}` : 'Todos los gastos'}
          </Text>
          <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportModal(true)}>
            <Text style={styles.exportButtonText}>↓ Exportar</Text>
          </TouchableOpacity>
        </View>

        {categoryFilter && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => navigation.setParams({ category: undefined })}
          >
            <Text style={styles.clearFilterText}>✕ Quitar filtro</Text>
          </TouchableOpacity>
        )}

        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay gastos registrados</Text>
          </View>
        ) : (
          filteredExpenses.map((expense) => {
            const hasDiscount = (expense.discount_amount ?? 0) > 0;
            const effectiveAmount = hasDiscount
              ? expense.discount_type === 'percentage'
                ? expense.amount * (1 - (expense.discount_amount ?? 0) / 100)
                : expense.amount - (expense.discount_amount ?? 0)
              : expense.amount;

            return (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.expenseTitle}>
                        {expense.description || expense.category}
                      </Text>
                      {expense.expense_type === 'compartido' && (
                        <View style={styles.sharedBadge}>
                          <Text style={styles.sharedBadgeText}>🤝</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.expenseCategory}>{expense.category}</Text>
                  </View>
                  <View style={styles.amountColumn}>
                    {hasDiscount ? (
                      <>
                        <Text style={styles.originalAmount}>
                          ${expense.amount.toLocaleString('es-AR')}
                        </Text>
                        <Text style={styles.expenseAmount}>
                          ${effectiveAmount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>
                            ↓{expense.discount_type === 'percentage' ? `${expense.discount_amount}%` : `$${expense.discount_amount}`}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.expenseAmount}>
                        ${expense.amount.toLocaleString('es-AR')}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.expenseFooter}>
                  <Text style={styles.expenseDate}>
                    {new Date(expense.date).toLocaleDateString('es-ES')}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(expense.id!)}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkTheme.colors.bgPrimary,
  },
  content: {
    padding: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
    flex: 1,
  },
  clearFilterButton: {
    backgroundColor: DarkTheme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  clearFilterText: {
    fontSize: 14,
    color: DarkTheme.colors.textSecondary,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: DarkTheme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: DarkTheme.colors.border,
  },
  exportButtonText: {
    color: DarkTheme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    color: DarkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  expenseCard: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
  },
  sharedBadge: {
    backgroundColor: DarkTheme.colors.accentYellow + '25',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sharedBadgeText: {
    fontSize: 14,
  },
  expenseCategory: {
    fontSize: 14,
    color: DarkTheme.colors.textPrimary,
    marginTop: 4,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  originalAmount: {
    fontSize: 14,
    color: DarkTheme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
  },
  discountBadge: {
    backgroundColor: DarkTheme.colors.accentGreen + '25',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: DarkTheme.colors.accentGreen,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 12,
    color: DarkTheme.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: DarkTheme.colors.deleteButtonBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: DarkTheme.colors.errorText,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  modalBox: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: DarkTheme.colors.textSecondary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: DarkTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    color: DarkTheme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalDestructiveButton: {
    flex: 1,
    backgroundColor: DarkTheme.colors.deleteButtonBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalDestructiveText: {
    color: DarkTheme.colors.errorText,
    fontWeight: '600',
    fontSize: 14,
  },
  exportOption: {
    backgroundColor: DarkTheme.colors.bgCardSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  exportOptionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: DarkTheme.colors.textPrimary,
  },
  exportOptionSubtitle: {
    fontSize: 12,
    color: DarkTheme.colors.textSecondary,
    marginTop: 2,
  },
  exportErrorBox: {
    backgroundColor: DarkTheme.colors.deleteButtonBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: DarkTheme.colors.errorText,
  },
  exportErrorText: {
    color: DarkTheme.colors.errorText,
    fontSize: 13,
  },
});
