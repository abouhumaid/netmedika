import React, { useEffect, useState } from 'react'
import { showErrorAlert } from '../lib/alerts'
import type { UserResponse } from '../lib/types'
import { userService } from '../services/userService'

export default function Users() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      try {
        const data = await userService.listAll()
        setUsers(data)
      } catch (err) {
        await showErrorAlert('Unable to load users', err instanceof Error ? err.message : 'Could not fetch registered users.')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Registered users</div>
        <p className="mt-1 text-sm text-slate-500">All users currently registered in the system.</p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-teal-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-8 text-sm font-medium text-teal-800">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="text-lg font-black text-slate-900">No registered users found</div>
            <p className="mt-2 text-sm text-slate-500">Once users sign up, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-teal-100 bg-teal-50/70 text-xs uppercase tracking-[0.18em] text-teal-700">
                <tr>
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Username</th>
                  <th className="px-4 py-4 font-semibold">Email</th>
                  <th className="px-4 py-4 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-slate-700">{user.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{user.username}</td>
                    <td className="px-4 py-4 text-slate-500">{user.email}</td>
                    <td className="px-4 py-4 text-slate-700">{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
