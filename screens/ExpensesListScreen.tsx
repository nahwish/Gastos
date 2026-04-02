import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { getAllExpenses, deleteExpense, Expense } from '../database/expenseService';
import { exportExpenses } from '../utils/exportService';

export default function ExpensesListScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadExpenses = async () => {
    const data = await getAllExpenses();
    setExpenses(data);
  };

  useEffect(() => {
    loadExpenses();
    const unsubscribe = navigation.addListener('focus', loadExpenses);
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id: number) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm == null) return;
    await deleteExpense(showDeleteConfirm);
    setShowDeleteConfirm(null);
    loadExpenses();
  };

  const handleExport = async (filterType: 'all' | 'month') => {
    setExportError(null);
    const now = new Date();
    try {
      await exportExpenses(expenses, {
        format: 'csv',
        filter:
          filterType === 'month'
            ? { type: 'month', year: now.getFullYear(), month: now.getMonth() + 1 }
            : { type: 'all' },
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
            <Text style={styles.modalMessage}>¿Estás seguro de que querés eliminar este gasto?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowDeleteConfirm(null)}>
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
            <Text style={styles.modalMessage}>Seleccioná qué registros querés exportar como CSV:</Text>
            {exportError && (
              <View style={styles.exportErrorBox}>
                <Text style={styles.exportErrorText}>{exportError}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('month')}>
              <Text style={styles.exportOptionTitle}>Este mes</Text>
              <Text style={styles.exportOptionSubtitle}>{monthName}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('all')}>
              <Text style={styles.exportOptionTitle}>Todo el historial</Text>
              <Text style={styles.exportOptionSubtitle}>{expenses.length} registros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowExportModal(false); setExportError(null); }}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportModal(true)}>
          <Text style={styles.exportButtonText}>↓  Exportar CSV</Text>
        </TouchableOpacity>
        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay gastos registrados</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle}>{expense.description}</Text>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                </View>
                <Text style={styles.expenseAmount}>
                  ${expense.amount.toLocaleString('es-AR')}
                </Text>
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
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#9CA3AF',
    textAlign: 'center',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
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
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  modalDestructiveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalDestructiveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  exportOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  exportOptionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  exportOptionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  exportErrorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  exportErrorText: {
    color: '#DC2626',
    fontSize: 13,
  },
});
