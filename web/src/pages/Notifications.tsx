import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, ClipboardList, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoadingState } from '../components/common/LoadingSpinner';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import type { NotificationItem } from '../types';
import { formatDate, formatRelativeTime } from '../utils/formatters';

export const Notifications: React.FC = () => {
  const { error, success } = useNotification();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const response = await api.getNotifications(100);
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
    } catch (err) {
      error('Unable to load notifications', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(false), 30000);
    const refreshOnFocus = () => { void loadNotifications(false); };
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadNotifications]);

  const visibleNotifications = useMemo(
    () => filter === 'unread' ? notifications.filter((item) => !item.read_at) : notifications,
    [filter, notifications],
  );

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.read_at) return;
    try {
      const updated = await api.markNotificationRead(notification.id);
      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      error('Unable to update notification', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => item.read_at ? item : { ...item, read_at: readAt }));
      setUnreadCount(0);
      success('Notifications cleared', 'All notifications are marked as read.');
    } catch (err) {
      error('Unable to update notifications', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const openNotification = async (item: NotificationItem) => {
    await markAsRead(item);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Notifications</h2>
          <p className="mt-0.5 text-xs text-slate-500">Track new order activity and updates for your workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => void loadNotifications()} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
          <Button variant="secondary" size="md" disabled={unreadCount === 0 || isMarkingAll} isLoading={isMarkingAll} leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => void markAllAsRead()}>Mark all read</Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          {(['all', 'unread'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition ${filter === value ? 'bg-pharmacy-50 text-pharmacy-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              {value === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {isLoading ? <PageLoadingState message="Loading notifications..." /> : visibleNotifications.length === 0 ? (
          <EmptyState icon={<Bell className="h-7 w-7" />} title={filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'} description={filter === 'unread' ? 'New unread updates will appear here.' : 'New order activity will appear here.'} />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleNotifications.map((item) => (
              <div key={item.id} className={`flex items-start gap-3 px-5 py-4 transition-colors sm:px-6 ${item.read_at ? 'bg-white' : 'bg-teal-50/40'}`}>
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.kind === 'order' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                  {item.kind === 'order' ? <ClipboardList className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <button type="button" onClick={() => void openNotification(item)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-slate-900">{item.title}</span>{!item.read_at && <span className="h-2 w-2 rounded-full bg-teal-600"/>}</div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400" title={formatDate(item.created_at)}>{formatRelativeTime(item.created_at)}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {item.link && <button type="button" aria-label="Open related page" onClick={() => void openNotification(item)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700"><ExternalLink className="h-4 w-4"/></button>}
                  {!item.read_at && <button type="button" aria-label="Mark as read" onClick={() => void markAsRead(item)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700"><Check className="h-4 w-4"/></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
