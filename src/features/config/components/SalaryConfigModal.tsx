import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { saveMonthlyConfig } from '@/database/repositories/configRepository';
import { DarkTheme } from '@/shared/theme/darkTheme';
import type { MonthlyConfig } from '@/shared/types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentConfig: MonthlyConfig | null;
  userId: number;
  year: number;
  month: number;
}

export default function SalaryConfigModal({
  visible,
  onClose,
  onSaved,
  currentConfig,
  userId,
  year,
  month,
}: Props) {
  const [salary, setSalary] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSalary(currentConfig?.salary != null ? String(currentConfig.salary) : '');
      setSavingsGoal(currentConfig?.savings_goal != null ? String(currentConfig.savings_goal) : '');
      setError(null);
      setSaving(false);
    }
  }, [visible, currentConfig]);

  const handleNumericChange = (setter: (v: string) => void) => (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    setter(cleaned);
  };

  const validate = (): boolean => {
    const salaryNum = salary === '' ? null : parseFloat(salary);
    const goalNum = savingsGoal === '' ? null : parseFloat(savingsGoal);

    if (salaryNum !== null && (isNaN(salaryNum) || salaryNum <= 0)) {
      setError('El sueldo debe ser un número positivo');
      return false;
    }
    if (goalNum !== null && (isNaN(goalNum) || goalNum <= 0)) {
      setError('El objetivo de ahorro debe ser un número positivo');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    if (!validate()) return;

    const salaryNum = salary === '' ? null : parseFloat(salary);
    const goalNum = savingsGoal === '' ? null : parseFloat(savingsGoal);

    setSaving(true);
    try {
      await saveMonthlyConfig({
        user_id: userId,
        year,
        month,
        salary: salaryNum,
        savings_goal: goalNum,
      });
      onSaved();
      onClose();
    } catch {
      setError('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Configurar sueldo</Text>
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

        {/* Salary field */}
        <Text style={styles.label}>Sueldo mensual</Text>
        <View style={styles.inputRow}>
          <Text style={styles.currencySign}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={DarkTheme.colors.textSecondary}
            keyboardType="numeric"
            value={salary}
            onChangeText={handleNumericChange(setSalary)}
            maxLength={12}
          />
        </View>

        {/* Savings goal field */}
        <Text style={styles.label}>Objetivo de ahorro</Text>
        <View style={styles.inputRow}>
          <Text style={styles.currencySign}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={DarkTheme.colors.textSecondary}
            keyboardType="numeric"
            value={savingsGoal}
            onChangeText={handleNumericChange(setSavingsGoal)}
            maxLength={12}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
        </TouchableOpacity>
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
    backgroundColor: DarkTheme.colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: DarkTheme.colors.border,
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
    marginBottom: 16,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  currencySign: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DarkTheme.colors.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: DarkTheme.colors.textPrimary,
  },
  saveButton: {
    backgroundColor: DarkTheme.colors.accentGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
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
