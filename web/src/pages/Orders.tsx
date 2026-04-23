import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { showConfirmAlert, showErrorAlert, showRejectReasonAlert, showSuccessAlert } from '../lib/alerts'
import { formatOrderDate, formatOrderStatus, getOrderItems, getOrderStatusTone, getOrderType } from '../lib/order-ui'
import type { ApiOrder } from '../lib/types'
import { orderService } from '../services/orderService'

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'verified' },
  { label: 'Rejected', value: 'rejected' },
]

export default function Orders() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null)
  const query = searchParams.get('search')?.trim() ?? ''

  async function loadOrders(filter = activeFilter) {
    setLoading(true)

    try {
      const data = await orderService.listAll({
        search: query || undefined,
        status: filter,
      })
      setOrders(data)
    } catch (err) {
      await showErrorAlert('Could not load orders', err instanceof Error ? err.message : 'Unable to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(activeFilter)
  }, [query, activeFilter])

  async function handleAccept(orderId: string) {
    const confirmed = await showConfirmAlert(
      'Accept order?',
      `This will mark ${orderId} as accepted for the next fulfillment step.`,
      'Accept order'
    )

    if (!confirmed) return

    setMutatingOrderId(orderId)
    try {
      await orderService.review(orderId, { decision: 'accept' })
      await showSuccessAlert('Order accepted', `${orderId} has been marked as accepted.`)
      await loadOrders(activeFilter)
    } catch (err) {
      await showErrorAlert('Accept failed', err instanceof Error ? err.message : 'Unable to accept order.')
    } finally {
      setMutatingOrderId(null)
    }
  }

  async function handleReject(order: ApiOrder) {
    const reason = await showRejectReasonAlert(order.order_id, order.rejection_reason ?? '')
    if (!reason) return

    setMutatingOrderId(order.order_id)
    try {
      await orderService.review(order.order_id, { decision: 'reject', reason })
      await showSuccessAlert('Order rejected', `${order.order_id} was rejected and the reason was saved.`)
      await loadOrders(activeFilter)
    } catch (err) {
      await showErrorAlert('Reject failed', err instanceof Error ? err.message : 'Unable to reject order.')
    } finally {
      setMutatingOrderId(null)
    }
  }

  const insights = useMemo(() => {
    const accepted = orders.filter((order) => order.status === 'verified').length
    const pending = orders.filter((order) => order.status === 'pending').length
    const rejected = orders.filter((order) => order.status === 'rejected').length

    return { accepted, pending, rejected }
  }, [orders])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Order command center</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">All user orders</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              Review every incoming request, approve valid orders, or reject them with clear reasons that the team can act on.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-teal-50 px-4 py-3">
              <div className="text-teal-700">Pending</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{insights.pending}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="text-emerald-700">Accepted</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{insights.accepted}</div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <div className="text-rose-700">Rejected</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{insights.rejected}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? 'bg-teal-700 text-white'
                  : 'border border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {query ? (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Search results for <span className="font-bold">{query}</span>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-teal-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-8 text-sm font-medium text-teal-800">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="text-lg font-black text-slate-900">No matching orders</div>
            <p className="mt-2 text-sm text-slate-500">Try clearing the search or switching the status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-teal-100 bg-teal-50/70 text-xs uppercase tracking-[0.18em] text-teal-700">
                <tr>
                  <th className="px-4 py-4 font-semibold">Order</th>
                  <th className="px-4 py-4 font-semibold">Customer</th>
                  <th className="px-4 py-4 font-semibold">Request</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isPending = order.status === 'pending'
                  const isMutating = mutatingOrderId === order.order_id

                  return (
                    <tr key={order.order_id} className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{order.order_id}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{getOrderType(order)}</div>
                        <div className="mt-2 text-xs text-slate-500">{formatOrderDate(order.created_at)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{order.user_name || 'Unknown customer'}</div>
                        <div className="mt-1 text-xs text-slate-500">{order.user_email || 'No email available'}</div>
                        <div className="mt-2 text-xs text-slate-500">{order.delivery_address || 'No address provided'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-700">{getOrderItems(order)}</div>
                        <div className="mt-2 text-xs text-slate-500">Qty: {order.quantity}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOrderStatusTone(order.status)}`}>
                          {formatOrderStatus(order.status)}
                        </span>
                        {order.rejection_reason ? (
                          <p className="mt-2 max-w-[260px] text-xs leading-5 text-rose-600">{order.rejection_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {isPending ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-full bg-teal-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => handleAccept(order.order_id)}
                              disabled={isMutating}
                            >
                              {isMutating ? 'Working...' : 'Accept'}
                            </button>
                            <button
                              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => handleReject(order)}
                              disabled={isMutating}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-400">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
