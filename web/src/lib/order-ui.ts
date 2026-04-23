import type { ApiOrder } from './types'

export function formatOrderStatus(status: string) {
  switch (status) {
    case 'verified':
      return 'Accepted'
    case 'rejected':
      return 'Rejected'
    case 'delivered':
      return 'Delivered'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'paid':
      return 'Paid'
    default:
      return 'Pending'
  }
}

export function getOrderStatusTone(status: string) {
  switch (status) {
    case 'verified':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    case 'delivered':
    case 'completed':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
    case 'paid':
      return 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
    default:
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  }
}

export function getOrderType(order: ApiOrder) {
  return order.prescription_image ? 'Prescription' : 'Medicine'
}

export function getOrderItems(order: ApiOrder) {
  const details = [order.medication_name, order.dosage_form, order.strength, order.frequency].filter(Boolean)
  return details.length ? details.join(' • ') : 'Awaiting pharmacist review'
}

export function formatOrderDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}
