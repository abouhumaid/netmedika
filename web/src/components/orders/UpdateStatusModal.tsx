import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import type { Order, OrderStatus } from '../../types';
import { OrderStatusBadge } from '../common/Badge';

interface UpdateStatusModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useNotification();
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('processing');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!order) return null;

  const statusOptions: { value: OrderStatus; label: string; desc: string }[] = [
    { value: 'processing', label: 'Processing', desc: 'Pharmacy is actively dispensing medication.' },
    { value: 'paid', label: 'Paid / Payment Confirmed', desc: 'Customer payment verified in bank account.' },
    { value: 'delivered', label: 'Delivered', desc: 'Package handed over to patient.' },
    { value: 'completed', label: 'Completed', desc: 'Fulfillment successfully closed.' },
    { value: 'cancelled', label: 'Cancelled', desc: 'Order terminated per customer or pharmacy request.' },
  ];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (order.status === 'processing' && targetStatus === 'paid') {
        await api.confirmPaymentReceipt(order.order_id);
      } else {
        await api.updateOrderStatus(order.order_id, targetStatus);
      }
      success('Status Updated', `Order #${order.order_id} is now ${targetStatus}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not update order status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Fulfillment Status"
      subtitle={`Order ID: ${order.order_id}`}
      maxWidth="md"
    >
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Current Status:</span>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            New Fulfillment Stage
          </label>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetStatus === opt.value
                    ? 'border-pharmacy-500 bg-pharmacy-50/60 ring-1 ring-pharmacy-500'
                    : 'border-slate-200 hover:bg-slate-50/80'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  checked={targetStatus === opt.value}
                  onChange={() => setTargetStatus(opt.value)}
                  className="mt-1 text-pharmacy-600 focus:ring-pharmacy-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
};
