import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { DarkTheme } from '../theme/darkTheme';
import { formatCurrency } from './GradientCard';

interface SummaryCardProps {
  label: string;
  amount: number;
  percentage?: number;
  percentageLabel?: string;
  accentColor?: string;
  placeholder?: string;
  subtitle?: string;
  style?: ViewStyle;
}

export default function SummaryCard({
  label,
  amount,
  percentage,
  percentageLabel,
  accentColor,
  placeholder,
  subtitle,
  style,
}: SummaryCardProps) {
  const amountColor = accentColor ?? DarkTheme.colors.textPrimary;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      {placeholder ? (
        <Text style={styles.placeholder}>{placeholder}</Text>
      ) : (
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatCurrency(amount)}
        </Text>
      )}
      {percentage !== undefined ? (
        <Text style={styles.percentage}>
          {percentage.toFixed(0)}%{percentageLabel ? ` ${percentageLabel}` : ''}
        </Text>
      ) : null}
      {subtitle !== undefined ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DarkTheme.colors.bgCard,
    borderRadius: 12,
    padding: 14,
    flex: 1,
  },
  label: {
    color: DarkTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    color: DarkTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  percentage: {
    color: DarkTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
  subtitle: {
    color: DarkTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
});
