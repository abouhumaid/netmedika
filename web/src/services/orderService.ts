import { api, getApiErrorMessage } from '../lib/api'
import type { ApiOrder, OrdersResponse, ReviewOrderPayload, ReviewOrderResponse } from '../lib/types'

export const orderService = {
  async listAll(params?: { search?: string; status?: string; skip?: number; limit?: number }) {
    try {
      const response = await api.get<OrdersResponse>('/api/v1/orders/all', {
        params: {
          search: params?.search || undefined,
          status: params?.status || undefined,
          skip: params?.skip || 0,
          limit: params?.limit || 50,
        },
      })
      return response.data
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to load orders right now.'))
    }
  },

  async review(orderId: string, payload: ReviewOrderPayload) {
    try {
      const response = await api.patch<ReviewOrderResponse>(`/api/v1/orders/${orderId}/review`, payload)
      return response.data.order
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to update this order right now.'))
    }
  },

  async getById(orderId: string) {
    try {
      const response = await api.get<{ order: ApiOrder }>(`/api/v1/orders/${orderId}`)
      return response.data.order
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to load order details right now.'))
    }
  },

  async delete(orderId: string) {
    try {
      const response = await api.delete(`/api/v1/orders/delete/${orderId}`)
      return response.data
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to delete order right now.'))
    }
  },

  async confirmPaymentReceipt(orderId: string) {
    try {
      const response = await api.post<{ success: boolean; message: string; order: any }>(`/api/v1/orders/${orderId}/confirm-payment-receipt`, {})
      return response.data.order
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to confirm payment right now.'))
    }
  },
}
