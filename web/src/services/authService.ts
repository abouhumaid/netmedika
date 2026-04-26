import { api, getApiErrorMessage } from '../lib/api'
import { clearSession, getSession, saveSession } from '../lib/session'
import type {
  LoginPayload,
  LoginResponse,
  ProfileResponse,
  RegisterPayload,
  RegisterResponse,
  SessionUser,
} from '../lib/types'

function normalizeUser(user: SessionUser): SessionUser {
  return {
    ...user,
    role: user.role.toLowerCase() as SessionUser['role'],
  }
}

export const authService = {
  async register(payload: RegisterPayload) {
    try {
      const response = await api.post<RegisterResponse>('/api/v1/auth/register', payload)
      return response.data
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to create account right now.'))
    }
  },

  async login(payload: LoginPayload) {
    try {
      const response = await api.post<LoginResponse>('/api/v1/auth/login', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const user = normalizeUser(response.data.user)
      const session = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        user,
      }
      saveSession(session)
      return user
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to sign in right now.'))
    }
  },

  async fetchProfile() {
    try {
      const response = await api.get<ProfileResponse>('/api/v1/profile/me')
      const user = normalizeUser(response.data)
      const session = getSession()
      if (session) {
        saveSession({ ...session, user })
      }
      return user
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to load your profile.'))
    }
  },

  async logout() {
    try {
      const session = getSession()
      if (session?.accessToken) {
        await api.post('/api/v1/auth/logout')
      }
    } catch {
      // Ignore logout network failures and clear local session anyway.
    } finally {
      clearSession()
    }
  },

  getCurrentUser(): SessionUser | null {
    return getSession()?.user ?? null
  },

  isAuthenticated() {
    return Boolean(getSession()?.accessToken)
  },
}
