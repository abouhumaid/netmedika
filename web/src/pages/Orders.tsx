import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  FileText,
  RefreshCw,
  Filter,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { OrderStatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoadingState } from '../components/common/LoadingSpinner';
import { PrescriptionViewerModal } from '../components/orders/PrescriptionViewerModal';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import type { Order } from '../types';
import { formatCurrency, formatDate, truncateText } from '../utils/formatters';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
  { label: 'Processing', value: 'processing' },
  { label: 'Paid', value: 'paid' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const Orders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error } = useNotification();

  const currentStatus = searchParams.get('status') || 'all';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [sortBy, setSortBy] = useState<'order_id' | 'user_name' | 'medication_name' | 'total_amount' | 'status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const res = await api.getAllOrders({
        status: currentStatus,
        search: currentSearch || undefined,
        skip,
        limit: pageSize,
      });
      setOrders(res.orders || []);
      setTotalOrders(res.total_orders || 0);
    } catch (err: any) {
      error('Failed to load orders', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentStatus, currentSearch, currentPage, pageSize, error]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusTabChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'all') params.delete('status');
    else params.set('status', status);
    params.set('page', '1');
    setSearchParams(params);
  };

  useEffect(() => {
    if (searchInput.trim() === currentSearch) return;
    const timer = window.setTimeout(() => {
      const value = searchInput.trim();
      const params = new URLSearchParams(searchParams);
      if (value) params.set('search', value);
      else params.delete('search');
      params.set('page', '1');
      setSearchParams(params, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, currentSearch, searchParams, setSearchParams]);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const totalPages = Math.ceil(totalOrders / pageSize) || 1;
  const sortedOrders = useMemo(() => [...orders].sort((left, right) => {
    const leftValue = left[sortBy] ?? '';
    const rightValue = right[sortBy] ?? '';
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [orders, sortBy, sortDirection]);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(key);
      setSortDirection(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & New Order Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Prescription Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {totalOrders} total medication order{totalOrders !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="md"
            variant="primary"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Order
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={fetchOrders}
            title="Reload orders"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Order ID, Patient Name, Email, Medication, or Delivery Address..."
              aria-label="Search orders"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-pharmacy-500 focus:ring-2 focus:ring-pharmacy-100"
            />
          </div>
          <label htmlFor="order-status-filter" className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
            <Filter className="h-4 w-4 text-slate-400" /> Status
          </label>
          <select
            id="order-status-filter"
            value={currentStatus}
            onChange={(event) => handleStatusTabChange(event.target.value)}
            className="w-full shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-pharmacy-500 focus:ring-2 focus:ring-pharmacy-100 sm:w-52"
          >
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

      {/* Orders Table */}
      {isLoading ? (
        <PageLoadingState message="Loading orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Match Your Query"
          description={
            currentSearch
              ? `No orders found matching "${currentSearch}" under status "${currentStatus}".`
              : `No orders currently found in "${currentStatus}" status.`
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchInput('');
                setSearchParams(new URLSearchParams());
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <SortableHeader label="Order ID" active={sortBy === 'order_id'} direction={sortDirection} onClick={() => toggleSort('order_id')} />
                  <SortableHeader label="Patient" active={sortBy === 'user_name'} direction={sortDirection} onClick={() => toggleSort('user_name')} />
                  <SortableHeader label="Medication" active={sortBy === 'medication_name'} direction={sortDirection} onClick={() => toggleSort('medication_name')} />
                  <th className="px-6 py-4">Prescription</th>
                  <SortableHeader label="Amount" active={sortBy === 'total_amount'} direction={sortDirection} onClick={() => toggleSort('total_amount')} />
                  <SortableHeader label="Status" active={sortBy === 'status'} direction={sortDirection} onClick={() => toggleSort('status')} />
                  <th className="px-6 py-4">Address</th>
                  <SortableHeader label="Date" active={sortBy === 'created_at'} direction={sortDirection} onClick={() => toggleSort('created_at')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedOrders.map((order) => (
                  <tr
                    key={order.order_id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/orders/${order.order_id}`)}
                  >
                    <td className="py-4 px-5 font-mono text-xs font-bold text-pharmacy-700 whitespace-nowrap">
                      {order.order_id}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {order.user_name || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]">
                        {order.user_email || `User #${order.user_id}`}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-medium text-slate-800">
                        {order.medication_name || 'Physical Prescription Upload'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.dosage_form || 'Unspecified'} • Qty: {order.quantity}
                      </div>
                    </td>

                    <td
                      className="py-4 px-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (order.prescription_image) {
                          setSelectedOrder(order);
                          setIsViewerOpen(true);
                        }
                      }}
                    >
                      {order.prescription_image ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition-colors shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Doc</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No image</span>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      {order.delivery_fee > 0 && (
                        <div className="text-[11px] text-slate-500">
                          Fee: {formatCurrency(order.delivery_fee)}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} size="sm" />
                    </td>

                    <td className="py-4 px-5 text-xs text-slate-600 max-w-[180px]">
                      <span title={order.delivery_address || 'None'}>
                        {truncateText(order.delivery_address, 30)}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-700">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-700">{totalPages}</span> ({totalOrders} total)
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
      </section>

      {/* Prescription Image Viewer */}
      <PrescriptionViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={selectedOrder?.prescription_image}
        orderId={selectedOrder?.order_id}
        medicationName={selectedOrder?.medication_name}
        patientName={selectedOrder?.user_name}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchOrders}
      />
    </div>
  );
};

function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  const SortIcon = active ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
  return (
    <th className="px-6 py-4">
      <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 transition hover:text-pharmacy-700 ${active ? 'text-pharmacy-700' : ''}`}>
        {label}<SortIcon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
