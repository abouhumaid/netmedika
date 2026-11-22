import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Search,
  UserRoundPlus,
  ShieldBan,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { UserRoleBadge, OrderStatusBadge } from '../components/common/Badge';
import { PageLoadingState } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { User, Order } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const UsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected user for order history modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState<boolean>(false);

  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'username' | 'role' | 'is_active'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      error('Failed to load users', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenUserOrders = async (user: User) => {
    setSelectedUser(user);
    setIsOrdersModalOpen(true);
    setIsLoadingOrders(true);
    try {
      const res = await api.getUserOrders(user.id);
      setUserOrders(res.orders || []);
    } catch (err: any) {
      error('Failed to load user orders', err.message);
      setUserOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleUpdateStatus = async (user: User, isActive: boolean) => {
    setIsUpdatingStatus(true);
    try {
      const response = await api.updateUserStatus(user.id, isActive);
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item));
      success(isActive ? 'User Unblocked' : 'User Blocked', `${user.username}'s account is ${isActive ? 'active' : 'blocked'}.`);
      setUserToToggleStatus(null);
    } catch (err: any) {
      error('Unable to Update User', err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleStatus = (user: User) => {
    if (user.is_active && user.id === currentAdmin?.id) {
      error('Action Not Allowed', 'You cannot block your own account.');
      return;
    }
    if (user.is_active) setUserToToggleStatus(user);
    else void handleUpdateStatus(user, true);
  };

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreatingAdmin(true);
    try {
      const response = await api.createAdminUser({ username: adminUsername.trim(), email: adminEmail.trim() });
      setUsers((current) => [...current, response.user]);
      success('Admin Created', `Login credentials were emailed to ${response.user.email}.`);
      setAdminUsername('');
      setAdminEmail('');
      setIsAddAdminOpen(false);
    } catch (err: any) {
      error('Admin Creation Failed', err.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const sortedUsers = useMemo(() => [...filteredUsers].sort((left, right) => {
    const leftValue = left[sortBy];
    const rightValue = right[sortBy];
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [filteredUsers, sortBy, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const visibleUsers = sortedUsers.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDirection(key === 'id' ? 'desc' : 'asc'); }
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {users.length.toLocaleString()} accounts registered in NetMedika
          </p>
        </div>
        <Button size="md" variant="primary" leftIcon={<UserRoundPlus className="h-4 w-4" />} onClick={() => setIsAddAdminOpen(true)}>
          Add admin user
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }} placeholder="Search by name or email..." aria-label="Search users" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-pharmacy-500 focus:ring-2 focus:ring-pharmacy-100" />
          </div>
          <span className="whitespace-nowrap text-xs font-medium text-slate-500">{filteredUsers.length.toLocaleString()} users</span>
        </div>

        {isLoading ? <PageLoadingState message="Loading registered accounts..." /> : filteredUsers.length === 0 ? (
          <EmptyState title="No Users Found" description={`No accounts matched your search "${searchQuery}".`} action={<Button variant="secondary" onClick={() => setSearchQuery('')}>Clear Search</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <UserSortableHeader label="ID" active={sortBy === 'id'} direction={sortDirection} onClick={() => toggleSort('id')} />
                  <UserSortableHeader label="User" active={sortBy === 'username'} direction={sortDirection} onClick={() => toggleSort('username')} />
                  <UserSortableHeader label="Role" active={sortBy === 'role'} direction={sortDirection} onClick={() => toggleSort('role')} />
                  <UserSortableHeader label="Account status" active={sortBy === 'is_active'} direction={sortDirection} onClick={() => toggleSort('is_active')} />
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visibleUsers.map((u) => {
                    const isCurrentLoggedAdmin = u.id === currentAdmin?.id;
                    return <tr key={u.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">#{u.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-pharmacy-200 bg-pharmacy-100 text-sm font-bold text-pharmacy-800">{u.profile_picture ? <img src={u.profile_picture} alt={u.username} className="h-full w-full object-cover"/> : (u.username?.[0] || 'U').toUpperCase()}</div>
                          <div className="min-w-0"><div className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="truncate">{u.username}</span>{isCurrentLoggedAdmin && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">You</span>}</div><div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500"><Mail className="h-3 w-3 shrink-0 text-slate-400"/><span className="truncate">{u.email}</span></div></div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><UserRoleBadge role={u.role} /></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />{u.is_active ? 'Active' : 'Blocked'}</span></td>
                      <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="secondary" leftIcon={<ClipboardList className="h-3.5 w-3.5" />} onClick={() => handleOpenUserOrders(u)}>Orders</Button>
                        <Button size="sm" variant={u.is_active ? 'danger' : 'success'} disabled={isCurrentLoggedAdmin && u.is_active} leftIcon={u.is_active ? <ShieldBan className="h-3.5 w-3.5"/> : <ShieldCheck className="h-3.5 w-3.5"/>} onClick={() => handleToggleStatus(u)}>{u.is_active ? 'Block' : 'Unlock'}</Button>
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row">
              <p className="text-xs text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedUsers.length)} of {sortedUsers.length} users</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <span className="px-2 text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
                <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        title="Add administrator"
        subtitle="An initial password will be generated and emailed to this address."
        maxWidth="md"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Name</label>
            <input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-pharmacy-500 focus:ring-2 focus:ring-pharmacy-100" placeholder="Administrator name" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label>
            <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-pharmacy-500 focus:ring-2 focus:ring-pharmacy-100" placeholder="admin@example.com" />
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50 p-3.5 text-xs leading-5 text-sky-800"><Mail className="mt-0.5 h-4 w-4 shrink-0"/><span>A unique temporary password will be created on the server and sent by email. It won’t be shown in this dashboard.</span></div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsAddAdminOpen(false)} disabled={isCreatingAdmin}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isCreatingAdmin}>Create admin</Button>
          </div>
        </form>
      </Modal>

      {/* SweetAlert-style block confirmation */}
      <Modal
        isOpen={Boolean(userToToggleStatus)}
        onClose={() => { if (!isUpdatingStatus) setUserToToggleStatus(null); }}
        title="Block this user?"
        subtitle={userToToggleStatus?.email}
        maxWidth="sm"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle className="h-7 w-7"/></div>
          <p className="text-sm leading-6 text-slate-600">{userToToggleStatus?.username} will no longer be able to sign in. Their current sessions will be ended.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setUserToToggleStatus(null)} disabled={isUpdatingStatus}>Cancel</Button>
            {userToToggleStatus && <Button variant="danger" onClick={() => void handleUpdateStatus(userToToggleStatus, false)} isLoading={isUpdatingStatus}>Block user</Button>}
          </div>
        </div>
      </Modal>

      {/* User Orders History Modal */}
      <Modal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        title={`Order History — ${selectedUser?.username || 'Customer'}`}
        subtitle={`User ID: #${selectedUser?.id} • Email: ${selectedUser?.email}`}
        maxWidth="xl"
      >
        {isLoadingOrders ? (
          <PageLoadingState message="Fetching user order history..." />
        ) : userOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">This user has not placed any orders yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {userOrders.map((ord) => (
              <div
                key={ord.order_id}
                onClick={() => {
                  setIsOrdersModalOpen(false);
                  navigate(`/orders/${ord.order_id}`);
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-pharmacy-400 hover:bg-pharmacy-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-pharmacy-700">
                      {ord.order_id}
                    </span>
                    <OrderStatusBadge status={ord.status} size="sm" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {ord.medication_name || 'Prescription Order'} • Qty: {ord.quantity}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDate(ord.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-slate-900">
                    {formatCurrency(ord.total_amount)}
                  </div>
                  <div className="text-[11px] text-pharmacy-600 font-medium flex items-center justify-end gap-1 mt-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

function UserSortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  const SortIcon = active ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
  return <th className="px-6 py-4"><button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 transition hover:text-pharmacy-700 ${active ? 'text-pharmacy-700' : ''}`}>{label}<SortIcon className="h-3.5 w-3.5"/></button></th>;
}
