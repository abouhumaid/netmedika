import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Users from './pages/Users'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import RequireAuth from './components/RequireAuth'
import DashboardLayout from './components/DashboardLayout'

export default function App(){
  const location = useLocation()
  const isAuthPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className="min-h-screen">
      <main className={isAuthPage ? 'px-4 py-8 sm:px-6 lg:px-8' : ''}>
          <Routes>
            <Route path="/" element={<Login/>} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Register/>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              <Route index element={<Dashboard/>} />
              <Route path="profile" element={<Profile/>} />
              <Route path="settings" element={<Settings/>} />
              <Route path="users" element={<Users/>} />
              <Route path="orders" element={<Orders/>} />
            </Route>
          </Routes>
      </main>
    </div>
  )
}
