import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import type { Order } from '../../types';
import { Check, XCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface ReviewOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewOrderModal: React.FC<ReviewOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useNotification();
  const [decision, setDecision] = useState<'accept' | 'reject'>('accept');
  const [deliveryFee, setDeliveryFee] = useState<string>('1500');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'reject' && !reason.trim()) {
      error('Rejection Reason Required', 'Please provide a clear reason for rejecting this prescription.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        decision,
        reason: decision === 'reject' ? reason.trim() : undefined,
        delivery_fee: decision === 'accept' ? parseFloat(deliveryFee) || 0 : undefined,
      };

      await api.reviewOrder(order.order_id, payload);
      success(
        `Order ${decision === 'accept' ? 'Verified' : 'Rejected'}`,
        `Order #${order.order_id} has been successfully ${decision === 'accept' ? 'approved with delivery fee' : 'declined'}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Review Failed', err.message || 'Could not complete the prescription review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prescription Clinical Review"
      subtitle={`Order ID: ${order.order_id} • Patient: ${order.user_name || order.user_email || 'Customer'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Order Summary box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span className="font-medium">Medication:</span>
            <span className="font-semibold text-slate-800">{order.medication_name || 'Prescription Upload'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="font-medium">Dosage Form & Qty:</span>
            <span className="text-slate-800">{order.dosage_form || 'Unspecified'} • {order.quantity} item(s)</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="font-medium">Delivery Address:</span>
            <span className="text-slate-800 truncate max-w-[220px]" title={order.delivery_address || 'None'}>
              {order.delivery_address || 'Pickup / Undefined'}
            </span>
          </div>
        </div>

        {/* Decision Toggle */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Verification Decision
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision('accept')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium text-sm transition-all ${
                decision === 'accept'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Approve & Verify</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('reject')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium text-sm transition-all ${
                decision === 'reject'
                  ? 'border-rose-500 bg-rose-50/70 text-rose-800 ring-2 ring-rose-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Reject Request</span>
            </button>
          </div>
        </div>

        {/* Conditional inputs */}
        {decision === 'accept' ? (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Assigned Delivery Fee (₦)
            </label>
            <div className="relative rounded-xl shadow-xs">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-semibold text-sm">
                ₦
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="1500"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm font-semibold text-slate-800"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              The customer will be notified with this delivery quotation ({formatCurrency(parseFloat(deliveryFee) || 0)}) to proceed with payment.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Prescription is illegible, requires valid doctor signature and date, or medication is currently restricted/out of stock."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-slate-800 placeholder:text-slate-400"
            />
            {/* Quick quick-pick templates for convenience */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                'Illegible prescription handwriting',
                'Expired prescription date',
                'Medication requires physical consultation',
                'Missing doctor signature or license',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setReason(template)}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={decision === 'accept' ? 'primary' : 'danger'}
            isLoading={isSubmitting}
          >
            {decision === 'accept' ? 'Confirm Verification' : 'Reject Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
