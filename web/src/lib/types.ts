export type UserRole = 'customer' | 'admin'

export type SessionUser = {
  id: number
  username: string
  email: string
  role: UserRole
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
  role?: UserRole
}

export type RegisterResponse = {
  message: string
}

export type LoginResponse = {
  message: string
  user: SessionUser
  access_token: string
  refresh_token: string
  token_type: string
}

export type ProfileResponse = SessionUser

export type UserResponse = SessionUser

export type UsersResponse = {
  users: UserResponse[]
}

export type ApiOrder = {
  order_id: string
  user_id: number
  user_name?: string | null
  user_email?: string | null
  dosage_form?: string | null
  medication_name?: string | null
  strength?: string | null
  frequency?: string | null
  prescription_image?: string | null
  quantity: number
  delivery_address?: string | null
  delivery_fee?: number | null
  total_amount?: number | null
  status: string
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export type OrdersResponse = {
  total_orders: number
  orders: ApiOrder[]
}

export type ReviewOrderPayload = {
  decision: 'accept' | 'reject'
  reason?: string
  delivery_fee?: number
}

export type ReviewOrderResponse = {
  success: boolean
  message: string
  order: ApiOrder
}
