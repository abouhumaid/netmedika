import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { showAcceptOrderAlert, showConfirmAlert, showErrorAlert, showRejectReasonAlert, showSuccessAlert } from '../lib/alerts'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const query = searchParams.get('search')?.trim() ?? ''

  const pageSize = 10

  async function loadOrders(filter = activeFilter, page = currentPage) {
    setLoading(true)

    try {
      const skip = (page - 1) * pageSize
      const data = await orderService.listAll({
        search: query || undefined,
        status: filter !== 'all' ? filter : undefined,
        skip,
        limit: pageSize,
      })
      setOrders(data.orders)
      setTotalOrders(data.total_orders)
    } catch (err) {
      await showErrorAlert('Could not load orders', err instanceof Error ? err.message : 'Unable to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    loadOrders(activeFilter, 1)
  }, [query, activeFilter])

  useEffect(() => {
    loadOrders(activeFilter, currentPage)
  }, [currentPage])

  async function handleAccept(order: ApiOrder) {
    const deliveryFee = await showAcceptOrderAlert(order)
    if (deliveryFee === null) return

    setMutatingOrderId(order.order_id)
    try {
      await orderService.review(order.order_id, { decision: 'accept', delivery_fee: deliveryFee })
      await showSuccessAlert('Order accepted', `${order.order_id} has been marked as accepted with a fee of ${deliveryFee}.`)
      await loadOrders(activeFilter)
    } catch (err) {
      await showErrorAlert('Accept failed', err instanceof Error ? err.message : 'Unable to accept order.')
    } finally {
      setMutatingOrderId(null)
    }
  }

  async function handleConfirmPayment(order: ApiOrder) {
    setMutatingOrderId(order.order_id)
    try {
      await orderService.confirmPaymentReceipt(order.order_id)
      await showSuccessAlert('Payment Confirmed', `Payment receipt confirmed for ${order.order_id}.`)
      await loadOrders(activeFilter)
    } catch (err) {
      await showErrorAlert('Confirmation failed', err instanceof Error ? err.message : 'Unable to confirm payment.')
    } finally {
      setMutatingOrderId(null)
    }
  }

  async function handleDelete(order: ApiOrder) {
    const confirmed = await showConfirmAlert(
      `Delete ${order.order_id}`,
      'This action will permanently remove the rejected order from the database.',
      'Delete order'
    )

    if (!confirmed) return

    setMutatingOrderId(order.order_id)
    try {
      await orderService.delete(order.order_id)
      await showSuccessAlert('Order deleted', `${order.order_id} was deleted successfully.`)
      await loadOrders(activeFilter, currentPage)
    } catch (err) {
      await showErrorAlert('Delete failed', err instanceof Error ? err.message : 'Unable to delete order.')
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
      await loadOrders(activeFilter, currentPage)
    } catch (err) {
      await showErrorAlert('Reject failed', err instanceof Error ? err.message : 'Unable to reject order.')
    } finally {
      setMutatingOrderId(null)
    }
  }

  function navigateToOrder(orderId: string) {
    navigate(`/orders/${encodeURIComponent(orderId)}`)
  }

  const insights = useMemo(() => {
    const accepted = orders.filter((order) => order.status === 'verified').length
    const pending = orders.filter((order) => order.status === 'pending').length
    const rejected = orders.filter((order) => order.status === 'rejected').length

    return { accepted, pending, rejected }
  }, [orders])

  const [localSearch, setLocalSearch] = useState('')
  const navigate = useNavigate()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const searchTerm = localSearch.trim()
    if (searchTerm) {
      navigate(`?search=${encodeURIComponent(searchTerm)}`)
    } else {
      navigate('')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Users Orders</div>
            <p className="mt-1 text-sm text-slate-500">Manage and review customer orders</p>
          </div>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2 lg:w-80">
            <input
              type="text"
              placeholder="Search by order ID, customer, or address..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-teal-200 px-4 py-2 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition"
            >
              Search
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('')
                  navigate('')
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Clear
              </button>
            )}
          </form>
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
          Search results for <span className="font-bold">{query}</span> {orders.length > 0 && <span>({orders.length} found)</span>}
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
                    <tr
                      key={order.order_id}
                      onClick={() => navigateToOrder(order.order_id)}
                      className="cursor-pointer border-b border-slate-100 align-top last:border-b-0 transition hover:bg-slate-50/70"
                    >
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
                        <div className="mt-2 text-xs text-slate-500">
                          View details: {order.order_id} • {order.user_name || 'Unknown customer'} • {formatOrderDate(order.created_at)}
                        </div>
                        {typeof order.delivery_fee === 'number' ? (
                          <div className="mt-2 text-xs font-semibold text-teal-700">Fee: {order.delivery_fee}</div>
                        ) : null}
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
                              onClick={(event) => {
                                event.stopPropagation()
                                handleAccept(order)
                              }}
                              disabled={isMutating}
                            >
                              {isMutating ? 'Working...' : 'view'}
                            </button>
                            <button
                              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleReject(order)
                              }}
                              disabled={isMutating}
                            >
                              Reject
                            </button>
                          </div>
                        ) : order.status === 'processing' ? (
                          <button
                            className="rounded-full bg-green-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleConfirmPayment(order)
                            }}
                            disabled={isMutating}
                          >
                            {isMutating ? 'Working...' : 'Confirm Payment'}
                          </button>
                        ) : order.status === 'rejected' ? (
                          <button
                            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDelete(order)
                            }}
                            disabled={isMutating}
                          >
                            Delete
                          </button>
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

      {/* Pagination */}
      {totalOrders > pageSize && (
        <div className="flex items-center justify-between rounded-[28px] border border-teal-100 bg-white px-6 py-4 shadow-sm">
          <div className="text-sm text-slate-600">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalOrders)} to{' '}
            {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-teal-200 px-3 py-1 text-sm text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-slate-700">
              Page {currentPage} of {Math.ceil(totalOrders / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === Math.ceil(totalOrders / pageSize)}
              className="rounded-lg border border-teal-200 px-3 py-1 text-sm text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
