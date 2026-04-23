import { api, getApiErrorMessage } from '../lib/api'
import type { OrdersResponse, ReviewOrderPayload, ReviewOrderResponse } from '../lib/types'

export const orderService = {
  async listAll(params?: { search?: string; status?: string }) {
    try {
      const response = await api.get<OrdersResponse>('/api/v1/orders/all', {
        params: {
          search: params?.search || undefined,
          status: params?.status && params.status !== 'all' ? params.status : undefined,
        },
      })
      return response.data.orders
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
}
