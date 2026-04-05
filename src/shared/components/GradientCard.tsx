import React from 'react';
import type { ViewStyle} from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  colors: [string, string];
  label: string;
  amount: number;
  subtitle?: string;
  isNegative?: boolean;
  style?: ViewStyle;
}

export function formatCurrency(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return '$' + amount.toLocaleString('es-AR');
}

export function getAmountColor(amount: number): string {
  return amount < 0 ? '#FCA5A5' : '#FFFFFF';
}

export default function GradientCard({
  colors,
  label,
  amount,
  subtitle,
  isNegative = false,
  style,
}: GradientCardProps) {
  const amountColor = isNegative ? '#FCA5A5' : '#FFFFFF';

  return (
    <LinearGradient
      colors={colors}
      style={[styles.container, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color: amountColor }]}>{formatCurrency(amount)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 6,
  },
});
