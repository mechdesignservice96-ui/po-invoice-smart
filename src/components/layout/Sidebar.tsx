import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Receipt, Users, BarChart3, Wallet, Building2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Sale Orders', path: '/sale-orders', icon: FileText },
  { title: 'Invoices', path: '/invoices', icon: Receipt },
  { title: 'Vendors', path: '/vendors', icon: Users },
  { title: 'Daily Expenses', path: '/expenses', icon: Wallet },
  { title: 'Reports', path: '/reports', icon: BarChart3 },
];

export const Sidebar = () => {
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">Finance Suite</h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">PO & Invoice Manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md'
                    : 'text-sidebar-foreground/80'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-5 h-5', isActive ? 'text-sidebar-primary-foreground' : '')} />
                  <span>{item.title}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Logout Section */}
      {user && (
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md'
                  : 'text-sidebar-foreground/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Building2 className={cn('w-5 h-5', isActive ? 'text-sidebar-primary-foreground' : '')} />
                <span>Profile</span>
              </>
            )}
          </NavLink>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 px-4 py-3 h-auto text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>

          <Separator className="my-2" />

          <div className="text-xs text-sidebar-foreground/60 px-2">
            <p>© 2025 Finance Suite</p>
            <p className="mt-1">Manage POs & Invoices</p>
          </div>
        </div>
      )}
    </aside>
  );
};
