import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pill,
  CreditCard,
  Printer,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { OrderStatusBadge } from '../components/common/Badge';
import { PageLoadingState } from '../components/common/LoadingSpinner';
import { ReviewOrderModal } from '../components/orders/ReviewOrderModal';
import { UpdateStatusModal } from '../components/orders/UpdateStatusModal';
import { PrescriptionViewerModal } from '../components/orders/PrescriptionViewerModal';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import type { Order, OrderStatus } from '../types';
import { formatCurrency, formatDate, resolveMediaUrl } from '../utils/formatters';

const LIFECYCLE_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: 'pending', label: 'Placed', desc: 'Prescription uploaded' },
  { key: 'verified', label: 'Verified', desc: 'Pharmacist approved' },
  { key: 'processing', label: 'Processing', desc: 'Patient paid' },
  { key: 'paid', label: 'Paid', desc: 'Receipt confirmed' },
  { key: 'delivered', label: 'Delivered', desc: 'Handed to patient' },
  { key: 'completed', label: 'Completed', desc: 'Fulfillment done' },
];

export const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await api.getOrder(orderId);
      setOrder(res.order);
    } catch (err: any) {
      error('Failed to load order', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, error]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm(`Are you sure you want to delete order #${order.order_id}?`)) return;

    try {
      await api.deleteOrder(order.order_id);
      success('Order Deleted', `Order #${order.order_id} has been deleted.`);
      navigate('/orders');
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    try {
      await api.confirmPaymentReceipt(order.order_id);
      success('Payment Receipt Confirmed', `Order #${order.order_id} marked as Paid.`);
      fetchOrder();
    } catch (err: any) {
      error('Payment Confirmation Failed', err.message);
    }
  };

  if (isLoading) {
    return <PageLoadingState message={`Loading details for Order ${orderId}...`} />;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800">Order Not Found</h3>
        <p className="text-sm text-slate-500 mt-1">Order #{orderId} could not be retrieved.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const isRejected = order.status === 'rejected';
  const isCancelled = order.status === 'cancelled';

  // Find step index in standard flow
  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top action bar & back button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-pharmacy-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Summary
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Order Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900">
              {order.order_id}
            </span>
            <OrderStatusBadge status={order.status} size="md" />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Placed: {formatDate(order.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Updated: {formatDate(order.updated_at)}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {order.status === 'pending' && (
            <Button
              size="md"
              variant="primary"
              className="w-full md:w-auto"
              onClick={() => setIsReviewOpen(true)}
            >
              Review Prescription
            </Button>
          )}

          {order.status === 'processing' && (
            <Button
              size="md"
              variant="success"
              className="w-full md:w-auto"
              leftIcon={<CreditCard className="w-4 h-4" />}
              onClick={handleConfirmPayment}
            >
              Confirm Payment Receipt
            </Button>
          )}

          <Button
            size="md"
            variant="secondary"
            className="w-full md:w-auto"
            onClick={() => setIsStatusOpen(true)}
          >
            Change Status
          </Button>
        </div>
      </div>

      {/* Rejection Alert Banner (if rejected) */}
      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3.5 text-rose-900">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-950">Prescription Rejected</h4>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              <span className="font-semibold">Reason provided:</span>{' '}
              {order.rejection_reason || 'No specific reason specified by clinical reviewer.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsReviewOpen(true)}
            className="shrink-0"
          >
            Re-evaluate
          </Button>
        </div>
      )}

      {/* Order Progression Tracker (Linear Lifecycle Stepper) */}
      {!isRejected && !isCancelled && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
            Fulfillment Stage
          </h3>

          <div className="relative">
            {/* Progress line */}
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 relative z-10">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                        isCurrent
                          ? 'bg-pharmacy-600 text-white ring-4 ring-pharmacy-100'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <div
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-pharmacy-700' : isPassed ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-[11px] text-slate-400 hidden sm:block">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Medication, Address & Prescription Image */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medication Specs */}
          <Card title="Prescription & Medication Information">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-medium">Medication</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {order.medication_name || 'Prescription Upload'}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-medium">Dosage Form</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {order.dosage_form || 'Unspecified'}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-medium">Prescribed Quantity</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {order.quantity} unit(s)
                </p>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="pt-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-pharmacy-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-slate-400 font-medium">Delivery Destination</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5 leading-relaxed">
                  {order.delivery_address || 'Patient specified pickup / No address recorded'}
                </p>
              </div>
            </div>
          </Card>

          {/* Prescription Document Preview Card */}
          <Card
            title="Prescription Document / Photo"
            subtitle="Uploaded by patient during mobile check-in"
            headerAction={
              order.prescription_image ? (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => setIsViewerOpen(true)}
                >
                  Expand Document
                </Button>
              ) : null
            }
          >
            {order.prescription_image ? (
              <div
                onClick={() => setIsViewerOpen(true)}
                className="group relative bg-slate-950 rounded-xl overflow-hidden cursor-pointer max-h-96 flex items-center justify-center p-3"
              >
                <img
                  src={resolveMediaUrl(order.prescription_image)}
                  alt="Prescription Document"
                  className="max-h-80 w-auto object-contain rounded transition-transform group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes(':8000') && order.prescription_image) {
                      target.src = `http://localhost:8000/${order.prescription_image.replace(/^\//, '')}`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-sm gap-2">
                  <FileText className="w-5 h-5" />
                  <span>Click to Zoom & Rotate</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Physical File Attached</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  This order was submitted directly using the medication name input.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Customer Info & Financial Breakdown */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <Card title="Patient Profile">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-pharmacy-100 text-pharmacy-800 flex items-center justify-center font-bold text-base shrink-0 border border-pharmacy-200">
                {(order.user_name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {order.user_name || 'Customer Account'}
                </h4>
                <p className="text-xs text-slate-500 truncate">{order.user_email || '—'}</p>
                <span className="inline-block mt-1 text-[11px] font-mono text-slate-400">
                  User ID: #{order.user_id}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => navigate(`/users`)}
              >
                View Customer Profile in Directory
              </Button>
            </div>
          </Card>

          {/* Financial Card */}
          <Card title="Billing & Quotation">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Prescription Delivery Fee:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Medication Line Items:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(Math.max(0, order.total_amount - order.delivery_fee))}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900">Total Charged:</span>
                <span className="text-xl font-extrabold text-pharmacy-700">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>

            {order.status === 'processing' && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <Button
                  size="md"
                  variant="success"
                  className="w-full"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  onClick={handleConfirmPayment}
                >
                  Confirm Payment Receipt
                </Button>
                <p className="text-[11px] text-slate-500 text-center mt-1.5">
                  Marks status as PAID after pharmacy bank reconciliation.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewOrderModal
        order={order}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSuccess={fetchOrder}
      />

      {/* Status Modal */}
      <UpdateStatusModal
        order={order}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onSuccess={fetchOrder}
      />

      {/* Prescription Viewer */}
      <PrescriptionViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={order.prescription_image}
        orderId={order.order_id}
        medicationName={order.medication_name}
        patientName={order.user_name}
      />
    </div>
  );
};
