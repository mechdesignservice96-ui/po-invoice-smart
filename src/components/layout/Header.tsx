import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

export const Header = () => {
  const { dashboardStats } = useApp();

  return (
    <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Welcome back!</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your purchase orders and invoices efficiently
          </p>
        </div>

        <div className="flex items-center gap-4">
          {dashboardStats.overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
              <Bell className="w-4 h-4" />
              <span>{dashboardStats.overdueCount} Overdue</span>
            </div>
          )}

          <Button variant="ghost" size="icon" className="relative">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
