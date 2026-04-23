import axios from 'axios'
import { clearSession, getSession, saveSession } from './session'

type RetriableRequestConfig = {
  _retry?: boolean
  headers?: Record<string, string>
}

const baseURL = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://100.53.230.81').replace(/\/$/, '')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const session = getSession()
  if (session?.accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error.config ?? {}) as RetriableRequestConfig
    const session = getSession()

    if (error.response?.status === 401 && session?.refreshToken && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshResponse = await axios.post(`${baseURL}/api/v1/auth/refresh`, {
          refresh_token: session.refreshToken,
        })

        const updatedSession = {
          ...session,
          accessToken: refreshResponse.data.access_token as string,
          refreshToken: refreshResponse.data.refresh_token as string,
        }

        saveSession(updatedSession)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${updatedSession.accessToken}`
        return api(originalRequest)
      } catch {
        clearSession()
      }
    }

    return Promise.reject(error)
  }
)

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    const message = error.response?.data?.message
    if (typeof detail === 'string' && detail.trim()) return detail
    if (typeof message === 'string' && message.trim()) return message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
