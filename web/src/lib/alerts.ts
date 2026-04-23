import Swal from 'sweetalert2'

const baseOptions = {
  confirmButtonColor: '#0F766E',
  cancelButtonColor: '#E11D48',
  background: '#ffffff',
  color: '#0F172A',
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
