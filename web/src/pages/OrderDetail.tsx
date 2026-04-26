import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE_URL } from '../lib/api'
import { showAcceptOrderAlert, showConfirmAlert, showErrorAlert, showSuccessAlert, showRejectReasonAlert } from '../lib/alerts'
import { formatOrderDate, formatOrderStatus, getOrderItems, getOrderStatusTone, getOrderType } from '../lib/order-ui'
import type { ApiOrder } from '../lib/types'
import { orderService } from '../services/orderService'

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return
      setLoading(true)
      try {
        const data = await orderService.getById(orderId)
        setOrder(data)
      } catch (err) {
        await showErrorAlert('Unable to load order', err instanceof Error ? err.message : 'Could not load order details.')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId])

  async function refresh() {
    if (!orderId) return
    setLoading(true)
    try {
      const data = await orderService.getById(orderId)
      setOrder(data)
    } catch (err) {
      await showErrorAlert('Unable to refresh order', err instanceof Error ? err.message : 'Could not refresh order.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!order) return
    setMutating(true)
    try {
      const fee = await showAcceptOrderAlert(order)
      if (fee === null) return
      await orderService.review(order.order_id, { decision: 'accept', delivery_fee: fee })
      await showSuccessAlert('Order accepted', `${order.order_id} was accepted.`)
      await refresh()
    } catch (err) {
      await showErrorAlert('Review failed', err instanceof Error ? err.message : 'Unable to review order.')
    } finally {
      setMutating(false)
    }
  }

  async function handleReject() {
    if (!order) return
    const reason = await showRejectReasonAlert(order.order_id, order.rejection_reason ?? '')
    if (!reason) return
    setMutating(true)
    try {
      await orderService.review(order.order_id, { decision: 'reject', reason })
      await showSuccessAlert('Order rejected', `${order.order_id} was rejected.`)
      await refresh()
    } catch (err) {
      await showErrorAlert('Reject failed', err instanceof Error ? err.message : 'Unable to reject order.')
    } finally {
      setMutating(false)
    }
  }

  async function handleConfirmPayment() {
    if (!order) return
    setMutating(true)
    try {
      await orderService.confirmPaymentReceipt(order.order_id)
      await showSuccessAlert('Payment confirmed', `${order.order_id} is now marked paid.`)
      await refresh()
    } catch (err) {
      await showErrorAlert('Confirmation failed', err instanceof Error ? err.message : 'Unable to confirm payment.')
    } finally {
      setMutating(false)
    }
  }

  async function handleDelete() {
    if (!order) return
    const confirmed = await showConfirmAlert(
      `Delete ${order.order_id}`,
      'This action will permanently remove the rejected order from the database.',
      'Delete order'
    )
    if (!confirmed) return
    setMutating(true)
    try {
      await orderService.delete(order.order_id)
      await showSuccessAlert('Order deleted', `${order.order_id} was deleted successfully.`)
      navigate('/orders')
    } catch (err) {
      await showErrorAlert('Delete failed', err instanceof Error ? err.message : 'Unable to delete order.')
    } finally {
      setMutating(false)
    }
  }

  const hasPrescription = Boolean(order?.prescription_image)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Order detail</div>
          <p className="mt-1 text-sm text-slate-500">Manage this order separately and view prescription attachments.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="rounded-2xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
        >
          Back to orders
        </button>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="py-8 text-sm font-medium text-teal-800">Loading order details...</div>
        ) : order ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-3xl border border-teal-100 bg-teal-50/60 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-teal-700">Order</div>
                      <div className="mt-2 text-xl font-black text-slate-900">{order.order_id}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOrderStatusTone(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4 shadow-sm">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Customer</div>
                      <div className="mt-2 font-semibold text-slate-900">{order.user_name || 'Unknown customer'}</div>
                      <div className="mt-1 text-sm text-slate-500">{order.user_email || 'No email provided'}</div>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-sm">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Created</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatOrderDate(order.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Request</div>
                    <div className="mt-3 font-semibold text-slate-900">{getOrderItems(order)}</div>
                    <div className="mt-3 text-sm text-slate-500">Qty: {order.quantity}</div>
                    <div className="mt-3 text-sm text-slate-500">Delivery: {order.delivery_address || 'Not provided'}</div>
                    {typeof order.delivery_fee === 'number' && (
                      <div className="mt-3 text-sm font-semibold text-teal-700">Fee: {order.delivery_fee}</div>
                    )}
                  </div>
                  <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Details</div>
                    <div className="mt-3 space-y-3 text-sm text-slate-600">
                      <div>Status: {formatOrderStatus(order.status)}</div>
                      <div>Type: {getOrderType(order)}</div>
                      <div>Updated: {formatOrderDate(order.updated_at)}</div>
                      {order.rejection_reason ? <div>Rejection note: {order.rejection_reason}</div> : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Actions</div>
                <div className="mt-4 flex flex-col gap-3">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleAccept}
                      disabled={mutating}
                    >
                      {mutating ? 'Working...' : 'Review order'}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleReject}
                      disabled={mutating}
                    >
                      {mutating ? 'Working...' : 'Reject order'}
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      type="button"
                      className="rounded-2xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleConfirmPayment}
                      disabled={mutating}
                    >
                      {mutating ? 'Working...' : 'Confirm payment receipt'}
                    </button>
                  )}
                  {order.status === 'rejected' && (
                    <button
                      type="button"
                      className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleDelete}
                      disabled={mutating}
                    >
                      {mutating ? 'Working...' : 'Delete order'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refresh}
                    className="rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    Refresh details
                  </button>
                </div>
              </div>
            </div>

            {hasPrescription ? (
              <section className="rounded-3xl border border-teal-100 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Prescription attachment</div>
                    <div className="mt-2 text-sm text-slate-700">A prescription file was uploaded with this order.</div>
                  </div>
                  <a
                    href={`${API_BASE_URL}/${order.prescription_image}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
                  >
                    View prescription
                  </a>
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="py-8 text-sm font-medium text-slate-600">Order not found.</div>
        )}
      </section>
    </div>
  )
}
