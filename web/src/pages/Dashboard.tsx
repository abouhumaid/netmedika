import React, { useEffect, useMemo, useState } from 'react'
import { showErrorAlert } from '../lib/alerts'
import { authService } from '../services/authService'
import { orderService } from '../services/orderService'
import { formatOrderDate, formatOrderStatus, getOrderItems, getOrderStatusTone } from '../lib/order-ui'
import type { ApiOrder } from '../lib/types'

function MetricCard({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note: string
}) {
  return (
    <article className="rounded-[24px] border border-teal-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </article>
  )
}

export default function Dashboard() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const user = authService.getCurrentUser()

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await orderService.listAll()
        setOrders(data)
      } catch (err) {
        await showErrorAlert(
          'Dashboard unavailable',
          err instanceof Error ? err.message : 'Unable to load dashboard data.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const metrics = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending').length
    const accepted = orders.filter((order) => order.status === 'verified').length
    const rejected = orders.filter((order) => order.status === 'rejected').length
    const prescriptions = orders.filter((order) => order.prescription_image).length

    return {
      pending,
      accepted,
      rejected,
      prescriptions,
    }
  }, [orders])

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Orders" value={orders.length} note="" />
        <MetricCard label="Pending Review" value={metrics.pending} note="" />
        <MetricCard label="Accepted" value={metrics.accepted} note="" />
        <MetricCard label="Rejected" value={metrics.rejected} note="" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Latest orders</h2>
              <p className="mt-1 text-sm text-slate-500">The five newest requests arriving from the app and web clients.</p>
            </div>
            <div className="rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Live data
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-teal-50 px-4 py-6 text-sm font-medium text-teal-800">Loading orders...</div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentOrders.map((order) => (
                <div key={order.order_id} className="rounded-2xl border border-slate-100 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{order.order_id}</div>
                      <div className="mt-1 text-sm text-slate-500">{order.user_name || 'Unknown customer'} • {formatOrderDate(order.created_at)}</div>
                      <div className="mt-2 text-sm text-slate-700">{getOrderItems(order)}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOrderStatusTone(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Workflow summary</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Pending', value: metrics.pending, tone: 'bg-amber-500' },
              { label: 'Accepted', value: metrics.accepted, tone: 'bg-emerald-500' },
              { label: 'Rejected', value: metrics.rejected, tone: 'bg-rose-500' },
            ].map((item) => {
              const total = orders.length || 1
              const width = Math.max((item.value / total) * 100, item.value ? 10 : 0)
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.value}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-slate-100">
                    <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}
