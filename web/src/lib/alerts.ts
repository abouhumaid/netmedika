import Swal from 'sweetalert2'
import { API_BASE_URL } from './api'
import { formatOrderDate, getOrderItems } from './order-ui'
import type { ApiOrder } from './types'

const baseOptions = {
  confirmButtonColor: '#0F766E',
  cancelButtonColor: '#E11D48',
  background: '#ffffff',
  color: '#0F172A',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function showSuccessAlert(title: string, text?: string) {
  await Swal.fire({
    ...baseOptions,
    icon: 'success',
    title,
    text,
  })
}

export async function showErrorAlert(title: string, text?: string) {
  await Swal.fire({
    ...baseOptions,
    icon: 'error',
    title,
    text,
  })
}

export async function showInfoAlert(title: string, text?: string) {
  await Swal.fire({
    ...baseOptions,
    icon: 'info',
    title,
    text,
  })
}

export async function showConfirmAlert(title: string, text: string, confirmButtonText: string) {
  const result = await Swal.fire({
    ...baseOptions,
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
  })

  return result.isConfirmed
}

export async function showRejectReasonAlert(orderId: string, initialValue = '') {
  const result = await Swal.fire({
    ...baseOptions,
    title: `Reject ${orderId}`,
    input: 'textarea',
    inputLabel: 'Reason for rejection',
    inputValue: initialValue,
    inputPlaceholder: 'Explain clearly what needs to be corrected before approval.',
    inputAttributes: {
      'aria-label': 'Reason for rejection',
    },
    showCancelButton: true,
    confirmButtonText: 'Reject order',
    inputValidator: (value) => {
      if (!value?.trim()) {
        return 'Rejection reason is required.'
      }
      return undefined
    },
  })

  return result.isConfirmed ? result.value.trim() : null
}

export async function showAcceptOrderAlert(order: ApiOrder) {
  const orderId = escapeHtml(order.order_id)
  const customerName = escapeHtml(order.user_name || 'Unknown customer')
  const createdAt = escapeHtml(formatOrderDate(order.created_at))
  const requestSummary = escapeHtml(getOrderItems(order))

  const prescriptionUrl = order.prescription_image ? `${API_BASE_URL}/${order.prescription_image}` : null
  const prescriptionSection = prescriptionUrl
    ? `
      <div style="display:grid;grid-template-columns:1fr;gap:12px;">
        <div style="padding:12px 14px;border-radius:16px;background:#f0fdfa;display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;">
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#0f766e;font-weight:700;">Order ID</div>
            <div style="margin-top:4px;font-size:16px;font-weight:700;color:#0f172a;">${orderId}</div>
          </div>
          <a href="${prescriptionUrl}" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;font-size:18px;">
            📎
          </a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px; margin-top:12px;">
          <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Customer</div>
            <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${customerName}</div>
          </div>
          <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Time</div>
            <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${createdAt}</div>
          </div>
        </div>
        <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Request</div>
          <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${requestSummary}</div>
        </div>
      </div>
    `
    : `
      <div style="text-align:left;display:grid;gap:12px;">
        <div style="padding:12px 14px;border-radius:16px;background:#f0fdfa;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#0f766e;font-weight:700;">Order ID</div>
          <div style="margin-top:4px;font-size:16px;font-weight:700;color:#0f172a;">${orderId}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Customer</div>
            <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${customerName}</div>
          </div>
          <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Time</div>
            <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${createdAt}</div>
          </div>
        </div>
        <div style="padding:12px 14px;border-radius:16px;background:#f8fafc;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;font-weight:700;">Request</div>
          <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0f172a;">${requestSummary}</div>
        </div>
      </div>
    `

  const result = await Swal.fire({
    ...baseOptions,
    title: `Accept ${order.order_id}`,
    html: prescriptionSection,
    input: 'number',
    inputLabel: 'Order fee',
    inputValue: order.delivery_fee ?? '',
    inputPlaceholder: 'Enter delivery or order fee',
    inputAttributes: {
      min: '0',
      step: '0.01',
      'aria-label': 'Order fee',
    },
    showCancelButton: true,
    confirmButtonText: 'Accept order',
    inputValidator: (value) => {
      if (!value?.toString().trim()) {
        return 'Order fee is required before accepting.'
      }

      const amount = Number(value)
      if (Number.isNaN(amount) || amount < 0) {
        return 'Enter a valid fee amount.'
      }

      return undefined
    },
  })

  return result.isConfirmed ? Number(result.value) : null
}
