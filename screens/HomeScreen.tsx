import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { getMonthlyTotal, getTotalByCategory, getCategories, getTotalByExpenseType, getFutureExpenses, Category } from '../database/expenseService';
import { getMonthlyConfig } from '../database/monthlyConfigService';
import { getMonthlyReimbursements } from '../database/reimbursementService';
import { MonthlyConfig, calculateSavingsProgress, calculateTotalWithReimbursements } from '../database/types';
import { useAuth } from '../utils/AuthContext';
import AddExpenseModal from '../components/AddExpenseModal';
import SalaryConfigModal from '../components/SalaryConfigModal';
import { DarkTheme } from '../theme/darkTheme';
import GradientCard from '../components/GradientCard';
import SummaryCard from '../components/SummaryCard';
import ProgressBar from '../components/ProgressBar';

function formatMonthYear(date: Date): string {
  const month = date.toLocaleDateString('es-ES', { month: 'long' });
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  const year = date.getFullYear();
  return `${capitalized} ${year}`;
}

export default function HomeScreen({ navigation }: any) {
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<{category: string, total: number}[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [monthlyConfig, setMonthlyConfig] = useState<MonthlyConfig | null>(null);
  const [reimbursementsTotal, setReimbursementsTotal] = useState(0);
  const [expenseTypeBreakdown, setExpenseTypeBreakdown] = useState<{shared: number, individual: number}>({ shared: 0, individual: 0 });
  const [futureExpenses, setFutureExpenses] = useState(0);
  const { user, logout } = useAuth();

  const loadData = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const total = await getMonthlyTotal(year, month);
    const catTotals = await getTotalByCategory();
    const allCategories = await getCategories();
    const typeBreakdown = await getTotalByExpenseType(year, month);
    const future = await getFutureExpenses(year, month);

    setMonthlyTotal(total);
    setCategoryTotals(catTotals);
    setCategories(allCategories);
    setExpenseTypeBreakdown(typeBreakdown);
    setFutureExpenses(future);

    if (user?.id) {
      const config = await getMonthlyConfig(user.id, year, month);
      const reimb = await getMonthlyReimbursements(user.id, year, month);
      setMonthlyConfig(config);
      setReimbursementsTotal(reimb);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const salary = monthlyConfig?.salary ?? null;
  const savingsGoal = monthlyConfig?.savings_goal ?? null;
  const disponibleReal = (salary ?? 0) - monthlyTotal;
  const conGastosFuturos = disponibleReal - futureExpenses;
  const savingsProgress = calculateSavingsProgress(disponibleReal, savingsGoal);
  const totalWithReimbursements = calculateTotalWithReimbursements(disponibleReal, reimbursementsTotal);
  const { shared, individual } = expenseTypeBreakdown;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {showLogoutConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Cerrar Sesión</Text>
              <Text style={styles.confirmMessage}>¿Estás seguro de que quieres cerrar sesión?</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity style={styles.confirmCancelButton} onPress={() => setShowLogoutConfirm(false)}>
                  <Text style={styles.confirmCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutButton} onPress={confirmLogout}>
                  <Text style={styles.confirmLogoutText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mis Finanzas</Text>
            <Text style={styles.headerSubtitle}>{formatMonthYear(new Date())}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* GradientCard Row */}
          <View style={styles.gradientCardRow}>
            <GradientCard
              colors={['#7C3AED', '#EC4899']}
              label="Disponible Real"
              amount={disponibleReal}
              subtitle={salary !== null ? `de $${salary.toLocaleString('es-AR')}` : 'Configurar sueldo'}
              isNegative={disponibleReal < 0}
              style={styles.gradientCardItem}
            />
            <GradientCard
              colors={['#1D4ED8', '#06B6D4']}
              label="Con Gastos Futuros"
              amount={conGastosFuturos}
              isNegative={conGastosFuturos < 0}
              style={styles.gradientCardItem}
            />
          </View>

          {/* Gastos del Mes */}
          <Text style={styles.sectionTitle}>Gastos del Mes</Text>
          <View style={styles.summaryCardRow}>
            <SummaryCard
              label="Compartido"
              amount={shared}
              percentage={monthlyTotal > 0 ? (shared / monthlyTotal) * 100 : undefined}
            />
            <SummaryCard
              label="Individual"
              amount={individual}
              percentage={monthlyTotal > 0 ? (individual / monthlyTotal) * 100 : undefined}
            />
            <SummaryCard
              label="Total"
              amount={monthlyTotal}
              percentage={salary !== null ? (monthlyTotal / salary) * 100 : undefined}
            />
          </View>

          {/* Reintegros */}
          <Text style={styles.sectionTitle}>Reintegros</Text>
          <View style={styles.summaryCardRow}>
            <SummaryCard
              label="Reintegros"
              amount={reimbursementsTotal}
              accentColor="#10B981"
              subtitle={`Total con reintegros: $${totalWithReimbursements.toLocaleString('es-AR')}`}
            />
          </View>

          {/* Objetivo de Ahorro */}
          <Text style={styles.sectionTitle}>Objetivo de ahorro</Text>
          {savingsGoal !== null ? (
            <View style={styles.savingsCard}>
              {savingsProgress >= 1.0 ? (
                <Text style={styles.savingsGoalReached}>¡Objetivo alcanzado!</Text>
              ) : (
                <ProgressBar progress={savingsProgress} style={styles.progressBar} />
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.configureButton} activeOpacity={0.7} onPress={() => setShowSalaryModal(true)}>
              <Text style={styles.configureButtonText}>Configurar objetivo</Text>
            </TouchableOpacity>
          )}

          {/* Sueldo del mes */}
          <Text style={styles.sectionTitle}>Sueldo del mes</Text>
          {salary !== null ? (
            <View style={styles.salaryCard}>
              <Text style={styles.salaryAmount}>${salary.toLocaleString('es-AR')}</Text>
              <Text style={styles.salarySubtitle}>Con reintegros: ${totalWithReimbursements.toLocaleString('es-AR')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.configureButton} activeOpacity={0.7} onPress={() => setShowSalaryModal(true)}>
              <Text style={styles.configureButtonText}>Configurar sueldo</Text>
            </TouchableOpacity>
          )}

          {/* Categorías */}
          <View style={styles.categoriesCard}>
            <Text style={styles.categoriesTitle}>Por categoría</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownButtonText}>Filtrar por categoría</Text>
              <Text style={styles.dropdownArrow}>{showCategoryDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCategoryDropdown && (
              <View style={styles.dropdownList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowCategoryDropdown(false);
                      navigation.navigate('ExpensesList', { category: cat.name });
                    }}
                  >
                    <Text style={styles.dropdownItemIcon}>{cat.icon}</Text>
                    <Text style={styles.dropdownItemText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {categoryTotals.length === 0 ? (
              <Text style={styles.emptyText}>No hay gastos registrados</Text>
            ) : (
              categoryTotals.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryItem}
                  onPress={() => navigation.navigate('ExpensesList', { category: item.category })}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.viewMoreText}>Ver detalles →</Text>
                  </View>
                  <Text style={styles.categoryAmount}>${item.total.toLocaleString('es-AR')}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón Flotante */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal Agregar Gasto */}
      <AddExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={loadData}
      />

      {/* Modal Configurar Sueldo */}
      <SalaryConfigModal
        visible={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        onSaved={loadData}
        currentConfig={monthlyConfig}
        userId={user?.id ?? 0}
        year={new Date().getFullYear()}
        month={new Date().getMonth() + 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DarkTheme.colors.bgPrimary },
  scrollContainer: { flex: 1 },
  header: {
    backgroundColor: DarkTheme.colors.bgPrimary,
    padding: 20,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: DarkTheme.colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: DarkTheme.colors.textSecondary, marginTop: 4 },
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutButtonText: { color: DarkTheme.colors.textSecondary, fontWeight: '600', fontSize: 14 },
  content: { padding: 20 },
  gradientCardRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  gradientCardItem: { flex: 1 },
  sectionTitle: { color: DarkTheme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  summaryCardRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  configureButton: {
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  configureButtonText: { color: DarkTheme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  savingsCard: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  savingsGoalReached: {
    color: DarkTheme.colors.accentGreen,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressBar: { marginTop: 4 },
  salaryCard: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  salaryAmount: { color: DarkTheme.colors.textPrimary, fontSize: 24, fontWeight: '700' },
  salarySubtitle: { color: DarkTheme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  categoriesCard: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  categoriesTitle: { fontSize: 20, fontWeight: 'bold', color: DarkTheme.colors.textPrimary, marginBottom: 16 },
  emptyText: { color: DarkTheme.colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DarkTheme.colors.border,
  },
  categoryLeft: { flex: 1 },
  categoryName: { color: DarkTheme.colors.textPrimary, fontSize: 16, fontWeight: '500' },
  viewMoreText: { fontSize: 12, color: DarkTheme.colors.accentGreen, marginTop: 2 },
  categoryAmount: { color: DarkTheme.colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DarkTheme.colors.accentGreen,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  fabText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginTop: -2 },
  confirmOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  confirmBox: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', color: DarkTheme.colors.textPrimary, marginBottom: 8 },
  confirmMessage: { fontSize: 16, color: DarkTheme.colors.textSecondary, marginBottom: 24, lineHeight: 24 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmCancelButton: {
    flex: 1, padding: 16, borderRadius: 16,
    backgroundColor: DarkTheme.colors.border, alignItems: 'center',
  },
  confirmCancelText: { color: DarkTheme.colors.textPrimary, fontWeight: 'bold' },
  confirmLogoutButton: {
    flex: 2, padding: 16, borderRadius: 16,
    backgroundColor: '#DC2626', alignItems: 'center',
  },
  confirmLogoutText: { color: '#FFFFFF', fontWeight: 'bold' },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.bgCardSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  dropdownButtonText: { fontSize: 14, color: DarkTheme.colors.textSecondary, fontWeight: '600' },
  dropdownArrow: { fontSize: 12, color: DarkTheme.colors.textSecondary },
  dropdownList: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: DarkTheme.colors.border,
  },
  dropdownItemIcon: { fontSize: 18, marginRight: 10 },
  dropdownItemText: { fontSize: 15, color: DarkTheme.colors.textPrimary },
});
