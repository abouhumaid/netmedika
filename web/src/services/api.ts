import type {
  AuthResponse,
  CreateOrderParams,
  Order,
  OrderListResponse,
  NotificationItem,
  NotificationListResponse,
  ReviewOrderRequest,
  TokenResponse,
  UpdateProfileRequest,
  User,
  UserListResponse,
  UserOrdersResponse,
  UserRole,
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('netmedika_access_token');
    this.refreshToken = localStorage.getItem('netmedika_refresh_token');
  }

  public setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('netmedika_access_token', access);
    localStorage.setItem('netmedika_refresh_token', refresh);
  }

  public clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('netmedika_access_token');
    localStorage.removeItem('netmedika_refresh_token');
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});

    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response = await fetch(`${API_BASE}${endpoint}`, config);

    // If unauthorized, try refreshing token once
    if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => `${e.loc?.slice(-1)[0] || 'Field'}: ${e.msg}`).join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // failed to parse json error, use default status text
      }
      throw new Error(errorMessage);
    }

    // Handles empty 204 or responses with no body
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data: TokenResponse = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Auth Endpoints
  public async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  // Profile Endpoints
  public async getMe(): Promise<User> {
    return this.request<User>('/profile/me');
  }

  public async updateMe(payload: UpdateProfileRequest): Promise<User> {
    return this.request<User>('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async updateAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('image', file);
    return this.request<User>('/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  public async changePassword(payload: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // User Management
  public async listUsers(): Promise<UserListResponse> {
    return this.request<UserListResponse>('/auth/users');
  }

  public async updateUserRole(userId: number, role: UserRole): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  public async getNotifications(limit = 50): Promise<NotificationListResponse> {
    return this.request<NotificationListResponse>(`/notifications?limit=${limit}`);
  }

  public async markNotificationRead(notificationId: number): Promise<NotificationItem> {
    return this.request<NotificationItem>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  }

  public async markAllNotificationsRead(): Promise<{ updated_count: number }> {
    return this.request<{ updated_count: number }>('/notifications/read-all', { method: 'POST' });
  }

  public async updateUserStatus(userId: number, isActive: boolean): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  public async createAdminUser(payload: { username: string; email: string }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/auth/users/admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Order Management
  public async getAllOrders(params: {
    status?: string;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<OrderListResponse> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') {
      query.set('status', params.status);
    }
    if (params.search && params.search.trim()) {
      query.set('search', params.search.trim());
    }
    if (params.skip != null) query.set('skip', params.skip.toString());
    if (params.limit != null) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<OrderListResponse>(`/orders/all${qs}`);
  }

  public async getOrder(orderId: string): Promise<{ order: Order }> {
    return this.request<{ order: Order }>(`/orders/${orderId}`);
  }

  public async reviewOrder(orderId: string, payload: ReviewOrderRequest): Promise<{ success: boolean; message: string; order: Order }> {
    return this.request<{ success: boolean; message: string; order: Order }>(`/orders/${orderId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async confirmPaymentReceipt(orderId: string): Promise<{ success: boolean; message: string; order: Order }> {
    return this.request<{ success: boolean; message: string; order: Order }>(`/orders/${orderId}/confirm-payment-receipt`, {
      method: 'POST',
    });
  }

  public async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; message: string; order: Order }> {
    const query = new URLSearchParams({ status });
    return this.request<{ success: boolean; message: string; order: Order }>(`/orders/${orderId}/status?${query.toString()}`, {
      method: 'PATCH',
    });
  }

  public async deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/orders/delete/${orderId}`, {
      method: 'DELETE',
    });
  }

  public async createOrder(params: CreateOrderParams): Promise<{ order_id: string; message: string }> {
    const formData = new FormData();
    if (params.dosage_form) formData.append('dosage_form', params.dosage_form);
    if (params.medicine_name) formData.append('medicine_name', params.medicine_name);
    if (params.quantity) formData.append('quantity', params.quantity.toString());
    if (params.delivery_address) formData.append('delivery_address', params.delivery_address);
    if (params.uploaded_image) formData.append('uploaded_image', params.uploaded_image);

    return this.request<{ order_id: string; message: string }>('/orders/create', {
      method: 'POST',
      body: formData,
    });
  }

  public async getUserOrders(userId: number, skip: number = 0, limit: number = 20): Promise<UserOrdersResponse> {
    return this.request<UserOrdersResponse>(`/orders/user/${userId}?skip=${skip}&limit=${limit}`);
  }

  // Health
  public async checkHealth(): Promise<{ status: string }> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }
}

export const api = new ApiClient();
