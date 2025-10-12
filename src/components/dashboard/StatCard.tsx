import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export const StatCard = ({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) => {
  const variantClasses = {
    default: 'border-primary/20 bg-card',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    destructive: 'border-destructive/20 bg-destructive/5',
  };

  const iconClasses = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <div
      className={cn(
        'p-6 rounded-xl border-2 shadow-card transition-all duration-300 hover:shadow-elegant hover:scale-105 animate-fade-in',
        variantClasses[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-foreground">{value}</h3>
          {trend && (
            <p
              className={cn(
                'text-xs font-medium mt-2',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconClasses[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
