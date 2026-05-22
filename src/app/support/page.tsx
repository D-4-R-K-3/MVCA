import React from 'react';
import AppLayout from '@/components/AppLayout';
import ChatSystem from '@/components/ui/ChatSystem';


export default function SupportPage() {
  return (
    <AppLayout role="customer" currentPath="/support">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-[0.24em] mb-2">Customer Support</p>
          <h1 className="text-3xl font-bold text-foreground">Inquiry</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Chat with our team about your orders. Get real-time updates on production progress.
          </p>
        </div>
        <ChatSystem userRole="customer" />
      </div>
    </AppLayout>
  );
}
