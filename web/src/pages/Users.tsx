import React, { useEffect, useState } from 'react'
import { showErrorAlert, showSuccessAlert } from '../lib/alerts'
import type { UserResponse } from '../lib/types'
import { userService } from '../services/userService'

export default function Users() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)

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

  async function handleRoleChange(user: UserResponse, role: UserResponse['role']) {
    if (role === user.role) {
      return
    }

    setUpdatingUserId(user.id)

    try {
      const updatedUser = await userService.updateRole(user.id, { role })
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
      )
      await showSuccessAlert('Role updated', `${updatedUser.username} is now assigned the ${updatedUser.role} role.`)
    } catch (err) {
      await showErrorAlert('Unable to update role', err instanceof Error ? err.message : 'Could not update the user role.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Registered users</div>
        <p className="mt-1 text-sm text-slate-500">All users currently registered in the system, including their account roles.</p>
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
                  <th className="px-4 py-4 font-semibold">Change role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-slate-700">{user.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{user.username}</td>
                    <td className="px-4 py-4 text-slate-500">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.role}
                        onChange={(event) => handleRoleChange(user, event.target.value as UserResponse['role'])}
                        disabled={updatingUserId === user.id}
                        className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="customer">customer</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
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
