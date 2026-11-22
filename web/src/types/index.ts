export type UserRole = 'admin' | 'customer';

export type OrderStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'processing'
  | 'paid'
  | 'delivered'
  | 'cancelled'
  | 'completed';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  profile_picture?: string | null;
  address?: string | null;
  phone_number?: string | null;
  is_active: boolean;
}

export interface Order {
  order_id: string;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  dosage_form?: string | null;
  medication_name?: string | null;
  prescription_image?: string | null;
  quantity: number;
  delivery_address?: string | null;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewOrderRequest {
  decision: 'accept' | 'reject';
  reason?: string;
  delivery_fee?: number;
}

export interface CreateOrderParams {
  dosage_form?: string;
  medicine_name?: string;
  uploaded_image?: File | null;
  quantity: number;
  delivery_address?: string;
}

export interface UpdateProfileRequest {
  username: string;
  phone_number?: string | null;
  address?: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface OrderListResponse {
  total_orders: number;
  orders: Order[];
}

export interface UserOrdersResponse {
  user_id: number;
  total_orders: number;
  orders: Order[];
}

export interface UserListResponse {
  users: User[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  kind: string;
  link?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export interface DashboardMetrics {
  totalOrders: number;
  pendingReviews: number;
  processingOrders: number;
  completedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
}
