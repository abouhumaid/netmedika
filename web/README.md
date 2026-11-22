# NetMedika Admin Dashboard Web

A modern, responsive administrative web application for **NetMedika** (Online Medicine Order & Prescription Fulfillment Platform). Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**, powered by the FastAPI backend.

---

## 🚀 Features

- **Clinical Operations Dashboard**
  - High-level KPIs: Total Orders, Pending Clinical Reviews, Active Processing, Completed Orders, and Revenue Volume.
  - Urgent Clinical Action Banner highlighting prescriptions requiring immediate pharmacist review.
  - Order Lifecycle Breakdown covering all 7 stages (`pending`, `verified`, `processing`, `paid`, `delivered`, `rejected`, `completed`).
  - Real-time Backend Health Indicator (pinging `/health` with live status dot).
  - Quick action toolbar and recent orders table.

- **Prescription & Order Management (`/orders`)**
  - Real-time status filtering tabs (`All`, `Pending`, `Verified`, `Processing`, `Paid`, `Delivered`, `Rejected`, `Cancelled`, `Completed`).
  - Server-side search by Order ID, Patient Name, Email, Medication, or Delivery Address.
  - Full pagination controls.
  - **Prescription Document Viewer**: In-modal image viewer with zoom in/out, 90° rotation, reset, and full-resolution download.
  - **Review Prescription Flow**: Accept order with assigned delivery fee quotation, or Reject order with mandatory clinical explanation.
  - **Payment Reconciliation**: Confirm payment receipt (`/confirm-payment-receipt`) when order is in processing state.
  - **Manual Order Creation**: Admin tool to place an order or attach prescription photos on behalf of patients.

- **Order Specification Detail Page (`/orders/:orderId`)**
  - Visual linear lifecycle progression stepper tracking order fulfillment.
  - Patient contact card with user identifier and delivery destination.
  - Detailed pricing table showing medication line items, delivery fee, and grand total.
  - Printable summary layout (`window.print()`).

- **User Accounts & Role Management (`/users`)**
  - Customer directory with account details, addresses, and phone numbers.
  - Role management to toggle user roles (`customer` ↔ `admin`) with built-in self-protection safeguards.
  - Direct order history lookup drawer for any individual patient.

- **Administrator Profile & Security (`/profile`)**
  - Profile customization: username, phone number, operating address.
  - Profile photo avatar upload (`/profile/avatar`).
  - Password change with old password verification (`/profile/change-password`).
  - Environment diagnostics.

- **Authentication & Guarding (`/login`)**
  - JWT Bearer authentication with automatic token rotation (`/auth/refresh`).
  - Enforced `admin` role authorization: Non-admin users are rejected from accessing admin routes.
  - Quick-Fill Demo Admin button for seamless zero-friction testing.

---

## 🔑 Default Administrator Credentials

Use these pre-configured administrator credentials to log in:

- **Email**: `admin@netmedika.com`
- **Password**: `Admin123456!`

*(Alternatively, click the **"Quick-Fill Admin Credentials"** button on the `/login` page)*

---

## 🛠️ Getting Started

### 1. Prerequisites
Ensure the FastAPI backend is running on `http://localhost:8000`:
```bash
cd backend
# With python virtual environment activated
uvicorn backend.main:app --reload
```

### 2. Start the Frontend Dev Server
```bash
cd web
npm install
npm run dev
```

The portal runs on **`http://localhost:5173`**.

API calls to `/api`, `/health`, and `/uploads` are automatically reverse-proxied to the FastAPI server on port 8000.

### 3. Build for Production
```bash
npm run build
```
Generates an optimized bundle in the `dist/` directory.

---

## 🎨 Theme & Styling

Built using the NetMedika brand palette:
- **Primary Brand Colors**:
  - `pharmacy-500`: `#14B8A6`
  - `pharmacy-600`: `#0F766E`
  - `pharmacy-700`: `#115E59`
  - `pharmacy-900`: `#134E4A`
- **Dark Elements**: `slateink: #0F172A`
- **Typography**: Plus Jakarta Sans & JetBrains Mono
