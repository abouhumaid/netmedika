import React from 'react';
import type { OrderStatus, UserRole } from '../../types';
import { cn } from '../../utils/cn';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  Truck,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface OrderBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const OrderStatusBadge: React.FC<OrderBadgeProps> = ({
  status,
  className,
  showIcon = true,
  size = 'md',
}) => {
  const configs: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending: {
      label: 'Pending Review',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200/80',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
    },
    verified: {
      label: 'Verified & Approved',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200/80',
      icon: <CheckCircle className="w-3.5 h-3.5 text-sky-600" />,
    },
    processing: {
      label: 'Processing Order',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200/80',
      icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />,
    },
    paid: {
      label: 'Payment Confirmed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
    },
    delivered: {
      label: 'Delivered',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200/80',
      icon: <Truck className="w-3.5 h-3.5 text-teal-600" />,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <CheckCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-stone-100',
      text: 'text-stone-600',
      border: 'border-stone-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-stone-500" />,
    },
  };

  const config = configs[status] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: null,
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm',
        config.bg,
        config.text,
        config.border,
        sizeClass,
        className
      )}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, className }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm',
        isAdmin
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-slate-100 text-slate-700 border-slate-200',
        className
      )}
    >
      {isAdmin ? (
        <ShieldCheck className="w-3 h-3 text-purple-600" />
      ) : (
        <UserIcon className="w-3 h-3 text-slate-500" />
      )}
      <span className="capitalize">{role}</span>
    </span>
  );
};
