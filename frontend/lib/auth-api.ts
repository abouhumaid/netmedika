import { Platform } from 'react-native';

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type RegisterResponse = {
  message: string;
};

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  role: string;
};

type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://100.53.230.81';
  }

  return 'http://100.53.230.81';
}

export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | LoginResponse | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to sign in right now.';

    throw new Error(message);
  }

  return data as LoginResponse;
}

export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | RegisterResponse | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to create your account right now.';

    throw new Error(message);
  }

  return data as RegisterResponse;
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/profile/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | UserProfile | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to load your profile.';

    throw new Error(message);
  }

  return data as UserProfile;
}

export async function logoutUser(accessToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | { message: string } | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to log out right now.';

    throw new Error(message);
  }

  return data;
}

export type Order = {
  order_id: string;
  medication_name: string | null;
  prescription_image: string | null;
  quantity: number;
  delivery_address: string | null;
  delivery_fee: number | null;
  total_amount: number | null;
  status: 'pending' | 'verified' | 'processing' | 'paid' | 'dispatched' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type OrdersResponse = {
  user_id: number;
  total_orders: number;
  orders: Order[];
};

export async function fetchOrders(accessToken: string, skip = 0, limit = 20): Promise<OrdersResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/orders/my-orders?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | OrdersResponse | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to load orders.';

    throw new Error(message);
  }

  return data as OrdersResponse;
}

export type CreateOrderRequest = {
  medicine_name?: string;
  dosage_form?: string;
  strength?: string;
  frequency?: string;
  quantity: number;
  delivery_address?: string;
};

export type CreateOrderResponse = {
  order_id: string;
  user_id: number;
  medication_name: string | null;
  prescription_image: string | null;
  quantity: number;
  delivery_address: string | null;
  status: 'pending' | 'verified' | 'processing' | 'paid' | 'dispatched' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  created_at: string;
  updated_at: string;
  message: string;
};

export async function createOrder(
  accessToken: string,
  payload: CreateOrderRequest,
  prescriptionImage?: { uri: string; name: string }
): Promise<CreateOrderResponse> {
  const formData = new FormData();

  if (payload.medicine_name) formData.append('medicine_name', payload.medicine_name);
  if (payload.dosage_form) formData.append('dosage_form', payload.dosage_form);
  if (payload.strength) formData.append('strength', payload.strength);
  if (payload.frequency) formData.append('frequency', payload.frequency);
  formData.append('quantity', payload.quantity.toString());
  if (payload.delivery_address) formData.append('delivery_address', payload.delivery_address);

  if (prescriptionImage) {
    formData.append('uploaded_image', {
      uri: prescriptionImage.uri,
      name: prescriptionImage.name,
      type: 'image/jpeg',
    } as any);
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/orders/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData as any,
  });

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | CreateOrderResponse | null;

  if (!response.ok) {
    const message =
      (data && 'detail' in data && data.detail) ||
      (data && 'message' in data && data.message) ||
      'Unable to create order.';

    throw new Error(message);
  }

  return data as CreateOrderResponse;
}
