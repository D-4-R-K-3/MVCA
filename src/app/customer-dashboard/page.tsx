'use client';
import React from 'react';
import AppLayout from '@/components/AppLayout';
import CustomerDashboardContent from './components/CustomerDashboardContent';

export default function CustomerDashboardPage() {
  return (
    <AppLayout role="customer" currentPath="/customer-dashboard">
      <CustomerDashboardContent />
    </AppLayout>
  );
}
