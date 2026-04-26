import { api, getApiErrorMessage } from '../lib/api'
import type { UsersResponse } from '../lib/types'

export const userService = {
  async listAll() {
    try {
      const response = await api.get<UsersResponse>('/api/v1/auth/users')
      return response.data?.users ?? []
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to load users right now.'))
    }
  },
}
