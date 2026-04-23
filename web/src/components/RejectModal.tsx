import React, { useState } from 'react'
import { formatOrderDate, getOrderItems, getOrderType } from '../lib/order-ui'
import type { ApiOrder } from '../lib/types'

export default function RejectModal({
  order,
  onClose,
  onSubmit,
}: {
  order: ApiOrder
  onClose: () => void
  onSubmit: (orderId: string, reason: string) => void
}) {
  const [reason, setReason] = useState(order.rejection_reason ?? '')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!reason.trim()) return
    onSubmit(order.order_id, reason.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="mb-5">
          <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
            Reject order
          </div>
          <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{order.order_id}</h4>
          <p className="mt-1 text-sm text-slate-500">
            {order.user_name || 'Customer'} • {formatOrderDate(order.created_at)}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Reason for rejection</span>
              <textarea
                rows={7}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
                placeholder="Explain clearly what needs to be corrected before approval."
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Save rejection
              </button>
            </div>
          </form>

          <div className="rounded-[24px] border border-teal-100 bg-teal-50/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Order summary</div>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <div className="text-slate-500">Customer</div>
                <div className="font-bold text-slate-900">{order.user_name || 'Unknown customer'}</div>
                <div className="text-xs text-slate-500">{order.user_email || 'No email available'}</div>
              </div>
              <div>
                <div className="text-slate-500">Type</div>
                <div className="mt-1 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 ring-1 ring-teal-100">
                  {getOrderType(order)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Request</div>
                <div className="mt-1 leading-6 text-slate-700">{getOrderItems(order)}</div>
              </div>
              <div>
                <div className="text-slate-500">Address</div>
                <div className="mt-1 leading-6 text-slate-700">{order.delivery_address || 'Not provided yet'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
