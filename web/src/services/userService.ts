import { api, getApiErrorMessage } from '../lib/api'
import type { UpdateUserRolePayload, UserResponse, UsersResponse } from '../lib/types'

export const userService = {
  async listAll() {
    try {
      const response = await api.get<UsersResponse | UserResponse[]>('/api/v1/auth/users')
      return Array.isArray(response.data) ? response.data : response.data?.users ?? []
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to load users right now.'))
    }
  },

  async updateRole(userId: number, payload: UpdateUserRolePayload) {
    try {
      const response = await api.patch<{ message: string; user: UserResponse }>(`/api/v1/auth/users/${userId}/role`, payload)
      return response.data.user
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to update this user role right now.'))
    }
  },
}
