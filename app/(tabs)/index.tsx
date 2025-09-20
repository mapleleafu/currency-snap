import CurrencyConverter from '@/components/CurrencyConverter';
import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <CurrencyConverter />
    </SafeAreaView>
  );
}