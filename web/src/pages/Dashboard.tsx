import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowUpRight, Banknote,
  ClipboardList, Clock3, PackageCheck, Pill, RefreshCw,
  Users, type LucideIcon,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { OrderStatusBadge } from '../components/common/Badge';
import { PageLoadingState } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ReviewOrderModal } from '../components/orders/ReviewOrderModal';
import { UpdateStatusModal } from '../components/orders/UpdateStatusModal';
import { PrescriptionViewerModal } from '../components/orders/PrescriptionViewerModal';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';

const STATUS_META: { status: OrderStatus; label: string; tone: string; color: string }[] = [
  { status: 'pending', label: 'Pending review', tone: 'bg-amber-50 text-amber-800 border-amber-100', color: '#F59E0B' },
  { status: 'verified', label: 'Verified', tone: 'bg-sky-50 text-sky-800 border-sky-100', color: '#0EA5E9' },
  { status: 'processing', label: 'Processing', tone: 'bg-indigo-50 text-indigo-800 border-indigo-100', color: '#6366F1' },
  { status: 'paid', label: 'Paid', tone: 'bg-emerald-50 text-emerald-800 border-emerald-100', color: '#10B981' },
  { status: 'delivered', label: 'Delivered', tone: 'bg-teal-50 text-teal-800 border-teal-100', color: '#0F766E' },
  { status: 'rejected', label: 'Rejected', tone: 'bg-rose-50 text-rose-800 border-rose-100', color: '#F43F5E' },
  { status: 'completed', label: 'Completed', tone: 'bg-slate-100 text-slate-700 border-slate-200', color: '#94A3B8' },
  { status: 'cancelled', label: 'Cancelled', tone: 'bg-slate-100 text-slate-700 border-slate-200', color: '#CBD5E1' },
];


function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

async function fetchAllOrders() {
  const pageSize = 200;
  const firstPage = await api.getAllOrders({ skip: 0, limit: pageSize });
  const totalOrders = firstPage.total_orders || 0;
  const pageCount = Math.ceil(totalOrders / pageSize);
  if (pageCount <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      api.getAllOrders({ skip: (index + 1) * pageSize, limit: pageSize })
    )
  );
  return {
    total_orders: totalOrders,
    orders: [...firstPage.orders, ...remainingPages.flatMap((page) => page.orders)],
  };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadDashboardData = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true); else setIsLoading(true);
    try {
      const [ordersResponse, usersResponse] = await Promise.all([
        fetchAllOrders(),
        api.listUsers(),
      ]);
      setOrders(ordersResponse.orders || []);
      setTotalOrders(ordersResponse.total_orders || 0);
      setUserCount(usersResponse.users?.length || 0);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
    const interval = setInterval(() => void loadDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const counts = useMemo(() => {
    const result = {} as Record<OrderStatus, number>;
    for (const item of STATUS_META) result[item.status] = 0;
    for (const order of orders) result[order.status] = (result[order.status] || 0) + 1;
    return result;
  }, [orders]);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'pending'), [orders]);
  const inProgress = counts.verified + counts.processing + counts.paid;
  const confirmedRevenue = orders.reduce((sum, order) => (
    ['paid', 'delivered', 'completed'].includes(order.status) ? sum + (order.total_amount || 0) : sum
  ), 0);
  const completionRate = orders.length ? Math.round(((counts.delivered + counts.completed) / orders.length) * 100) : 0;
  const averageOrderValue = orders.length
    ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length
    : 0;
  const rejectionRate = orders.length ? Math.round((counts.rejected / orders.length) * 100) : 0;

  const weeklyActivity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { date, label: date.toLocaleDateString('en', { weekday: 'short' }), count: 0 };
    });
    const lookup = new Map(days.map((item) => [dayKey(item.date), item]));
    for (const order of orders) {
      const date = new Date(order.created_at);
      const bucket = lookup.get(dayKey(date));
      if (bucket) bucket.count += 1;
    }
    return days;
  }, [orders]);

  const chart = useMemo(() => {
    const width = 640;
    const height = 190;
    const max = Math.max(1, ...weeklyActivity.map((day) => day.count));
    const points = weeklyActivity.map((day, index) => ({
      x: 18 + index * ((width - 36) / 6),
      y: height - 24 - (day.count / max) * (height - 48),
    }));
    const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    return { width, height, line, area: `${line} L ${points[points.length - 1].x} ${height - 24} L ${points[0].x} ${height - 24} Z`, points };
  }, [weeklyActivity]);

  const openStatus = (order: Order) => { setSelectedOrder(order); setIsStatusOpen(true); };
  const openViewer = (order: Order) => { setSelectedOrder(order); setIsViewerOpen(true); };

  if (isLoading) return <PageLoadingState message="Preparing your pharmacy overview…" />;

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300 sm:space-y-8">

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="mt-0.5 text-xs text-slate-500">Overview of prescriptions, orders, revenue, and customer activity</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total orders" value={totalOrders.toLocaleString()} note="All customer requests" icon={ClipboardList} tone="teal" change={`${orders.length} loaded`} />
        <MetricCard label="Awaiting review" value={pendingOrders.length.toLocaleString()} note="Prescription checks needed" icon={Clock3} tone="amber" change={pendingOrders.length ? 'Action needed' : 'Queue clear'} />
        <MetricCard label="In fulfillment" value={inProgress.toLocaleString()} note="Verified, processing or paid" icon={PackageCheck} tone="indigo" change={`${completionRate}% completed`} />
        <MetricCard label="Confirmed revenue" value={formatCurrency(confirmedRevenue)} note="Paid, delivered and completed" icon={Banknote} tone="emerald" change={`Latest ${orders.length}`} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InsightCard label="Average order value" value={formatCurrency(averageOrderValue)} detail={`Across the latest ${orders.length} loaded orders`} />
        <InsightCard label="Rejection rate" value={`${rejectionRate}%`} detail={`${counts.rejected} rejected of ${orders.length} latest loaded orders`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400"><Activity size={14} className="text-teal-600"/>Operations analytics</div><h2 className="mt-1.5 text-lg font-extrabold text-slate-900">Order activity</h2><p className="mt-1 text-xs text-slate-500">New orders received over the last 7 days</p></div>
            <button type="button" disabled={isRefreshing} onClick={() => void loadDashboardData(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''}/>Refresh</button>
          </div>
          <div className="mt-5 overflow-hidden">
            <div className="mb-2 flex items-baseline gap-2"><span className="text-3xl font-extrabold tracking-tight text-slate-900">{weeklyActivity.reduce((sum, day) => sum + day.count, 0)}</span><span className="text-xs font-semibold text-slate-400">orders this week</span></div>
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-48 w-full overflow-visible" role="img" aria-label="Order activity for the last seven days">
              <defs><linearGradient id="orderActivityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0F766E" stopOpacity=".22"/><stop offset="100%" stopColor="#0F766E" stopOpacity="0"/></linearGradient></defs>
              {[0, 1, 2].map((line) => <line key={line} x1="18" x2={chart.width - 18} y1={40 + line * 52} y2={40 + line * 52} stroke="#E9EFED" strokeDasharray="4 6"/>)}
              <path d={chart.area} fill="url(#orderActivityFill)"/><path d={chart.line} fill="none" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              {chart.points.map((point, index) => <g key={weeklyActivity[index].label}><circle cx={point.x} cy={point.y} r="8" fill="white"/><circle cx={point.x} cy={point.y} r="4.5" fill="#0F766E"/><text x={point.x} y={chart.height - 2} textAnchor="middle" className="fill-slate-400 text-[11px] font-semibold">{weeklyActivity[index].label}</text></g>)}
            </svg>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400"><Activity size={14} className="text-teal-600"/>Live workload</div><h2 className="mt-1.5 text-lg font-extrabold text-slate-900">Order pipeline</h2></div><button type="button" onClick={() => navigate('/orders')} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-teal-700" aria-label="View all orders"><ArrowUpRight size={17}/></button></div>
          <div className="mt-5 space-y-4">
            {STATUS_META.slice(0, 6).map((item) => {
              const count = counts[item.status] || 0;
              const denominator = Math.max(1, orders.length);
              return <button key={item.status} type="button" onClick={() => navigate(`/orders?status=${item.status}`)} className="group w-full text-left">
                <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-600 transition group-hover:text-slate-900">{item.label}</span><span className="text-xs font-extrabold tabular-nums text-slate-800">{count}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (count / denominator) * 100)}%`, backgroundColor: item.color }}/></div>
              </button>;
            })}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3"><span className="text-xs font-semibold text-slate-500">Registered accounts</span><span className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800"><Users size={15} className="text-violet-500"/>{userCount}</span></div>
        </Card>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><div className="flex items-center gap-2"><Pill size={15} className="text-teal-600"/><h2 className="text-base font-extrabold text-slate-900">Recent orders</h2></div><p className="mt-1 text-xs text-slate-500">Latest patient requests across the platform</p></div>
        </div>
        {orders.length === 0 ? <div className="p-6"><EmptyState title="No orders yet" description="Customer prescription and medicine requests will appear here." action={<Button variant="primary" onClick={() => setIsCreateOpen(true)}>Create an order</Button>}/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400"><th className="px-6 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Medication</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 7).map((order) => <tr key={order.order_id} onClick={() => navigate(`/orders/${order.order_id}`)} className="cursor-pointer transition hover:bg-teal-50/30">
                  <td className="px-6 py-4"><span className="font-mono text-xs font-extrabold text-teal-800">{order.order_id}</span><span className="mt-1 block text-[10px] text-slate-400">Qty {order.quantity}</span></td>
                  <td className="px-4 py-4"><span className="block max-w-36 truncate text-xs font-bold text-slate-800">{order.user_name || 'Customer'}</span><span className="mt-1 block max-w-40 truncate text-[10px] text-slate-400">{order.user_email || `Account #${order.user_id}`}</span></td>
                  <td className="px-4 py-4"><span className="block max-w-44 truncate text-xs font-bold text-slate-800">{order.medication_name || 'Prescription order'}</span><span className="mt-1 block text-[10px] text-slate-400">{order.dosage_form || 'Pharmacist review'}</span></td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatCurrency(order.total_amount || order.delivery_fee)}</td>
                  <td className="px-4 py-4"><OrderStatusBadge status={order.status} size="sm"/></td>
                  <td className="px-4 py-4 text-[11px] font-medium text-slate-400">{formatRelativeTime(order.updated_at)}</td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><button type="button" title="Update order status" onClick={() => openStatus(order)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">Status</button>{order.prescription_image ? <button type="button" title="View prescription" onClick={() => openViewer(order)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">View Rx</button> : null}</div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ReviewOrderModal order={selectedOrder} isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} onSuccess={() => void loadDashboardData(true)} />
      <UpdateStatusModal order={selectedOrder} isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} onSuccess={() => void loadDashboardData(true)} />
      <PrescriptionViewerModal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} imageUrl={selectedOrder?.prescription_image} orderId={selectedOrder?.order_id} medicationName={selectedOrder?.medication_name} patientName={selectedOrder?.user_name} />
      <CreateOrderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => void loadDashboardData(true)} />
    </div>
  );
};

function MetricCard({ label, value, note, icon: Icon, tone, change }: { label: string; value: string; note: string; icon: LucideIcon; tone: 'teal' | 'amber' | 'indigo' | 'emerald'; change: string }) {
  const tones = {
    teal: { icon: 'bg-teal-50 text-teal-700', tag: 'bg-teal-50 text-teal-700' },
    amber: { icon: 'bg-amber-50 text-amber-700', tag: 'bg-amber-50 text-amber-800' },
    indigo: { icon: 'bg-indigo-50 text-indigo-700', tag: 'bg-indigo-50 text-indigo-700' },
    emerald: { icon: 'bg-emerald-50 text-emerald-700', tag: 'bg-emerald-50 text-emerald-700' },
  }[tone];
  return <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">{label}</p><p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[27px]">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones.icon}`}><Icon size={19}/></span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-medium text-slate-400">{note}</span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${tones.tag}`}>{change}</span></div></article>;
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></article>;
}


