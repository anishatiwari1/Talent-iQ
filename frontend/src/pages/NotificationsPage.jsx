import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Check, CheckCheck, RefreshCw, Settings, Trash2 } from 'lucide-react';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PageHeader from '../components/layout/PageHeader';
import { notificationMeta, notificationTarget } from '../components/common/notificationMeta';
import { useAuth } from '../context/AuthContext';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { useNotifications } from '../hooks/useNotifications';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  // Backend timestamps are UTC without a zone suffix.
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export const NotificationsPage = ({ title = 'Notifications' }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { openEmployeeProfile } = useEmployeeProfile();
  const {
    notifications, unreadCount, loading, error, actionError,
    refresh, markRead, markAllRead, deleteNotification, clearRead,
  } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [bulkAction, setBulkAction] = useState('');

  const types = useMemo(() => [...new Set(notifications.map((item) => item.type))], [notifications]);
  const visible = notifications.filter((item) => {
    if (filter === 'unread' && item.is_read) return false;
    if (filter === 'read' && !item.is_read) return false;
    return typeFilter === 'ALL' || item.type === typeFilter;
  });
  const readCount = notifications.filter((item) => item.is_read).length;

  const runItemAction = async (id, action) => {
    setBusyId(id);
    try { await action(); } catch { /* The hook exposes the request error. */ }
    setBusyId(null);
  };

  const runBulk = async (name, action) => {
    setBulkAction(name);
    try { await action(); } catch { /* The hook exposes the request error. */ }
    setBulkAction('');
  };

  const openNotification = async (notification) => {
    const target = notificationTarget(notification, isAdmin);
    if (!notification.is_read) {
      try { await markRead(notification.id); } catch { /* Navigation still proceeds. */ }
    }
    if (!target) return;
    if (target.employeeId && openEmployeeProfile) openEmployeeProfile(target.employeeId);
    else if (target.path) navigate(target.path);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Assignments, deliveries, workload alerts, and document updates for your account."
        actions={(
          <>
            <Button variant="ghost" size="sm" icon={Settings} onClick={() => navigate(isAdmin ? '/admin/settings' : '/employee/settings')}>Preferences</Button>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={refresh}>Refresh</Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" icon={CheckCheck} loading={bulkAction === 'read'} onClick={() => runBulk('read', markAllRead)}>
                Mark all as read
              </Button>
            )}
            {readCount > 0 && (
              <Button variant="outline" size="sm" icon={Trash2} loading={bulkAction === 'clear'} onClick={() => runBulk('clear', clearRead)}>
                Clear read
              </Button>
            )}
          </>
        )}
      />

      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}

      {loading ? (
        <div className="rounded-lg border border-[#DCE5DF] bg-white p-5" aria-live="polite" aria-busy="true">
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EFEA]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#F1F5F2]" />
            <p className="text-xs text-[#687A73]">Loading notifications...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{error}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={refresh}>Retry</Button>
          </div>
        </Card>
      ) : (
        <Card
          title="Inbox"
          subtitle={`${unreadCount ?? 0} unread · ${notifications.length} total`}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-md border border-[#DCE5DF] bg-[#F3F5EF] p-0.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.key}
                    onClick={() => setFilter(item.key)}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${filter === item.key ? 'bg-white text-[#063C32] shadow-sm' : 'text-[#687A73] hover:text-[#10221E]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {types.length > 1 && (
                <select
                  aria-label="Filter by type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-md border border-[#DCE5DF] bg-white px-2 py-1 text-xs text-[#10221E] outline-none focus:border-[#13816D]"
                >
                  <option value="ALL">All types</option>
                  {types.map((type) => <option key={type} value={type}>{notificationMeta(type).label}</option>)}
                </select>
              )}
            </div>
          )}
        >
          {visible.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">{notifications.length ? 'Nothing matches this filter' : 'You are all caught up'}</p>
              <p className="mt-1 text-xs text-[#687A73]">New assignments, deliveries, and alerts will appear here automatically.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8EFEA]">
              {visible.map((notification) => {
                const meta = notificationMeta(notification.type);
                const Icon = meta.icon;
                const target = notificationTarget(notification, isAdmin);
                return (
                  <li key={notification.id} className={`flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start ${notification.is_read ? '' : '-mx-2 rounded-md bg-[#DFF2EA]/25 px-2'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-[#10221E]">{notification.title}</h2>
                        {!notification.is_read && <Badge variant="primary" size="sm" dot>Unread</Badge>}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#42544E]">{notification.message}</p>
                      <p className="mt-2 text-xs text-[#687A73]">{meta.label} · {formatDate(notification.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {target && (
                        <Button variant="secondary" size="sm" icon={ArrowRight} iconPosition="right" onClick={() => openNotification(notification)}>
                          Open
                        </Button>
                      )}
                      {!notification.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Check}
                          loading={busyId === notification.id}
                          disabled={busyId !== null || Boolean(bulkAction)}
                          onClick={() => runItemAction(notification.id, () => markRead(notification.id))}
                        >
                          Mark read
                        </Button>
                      )}
                      <button
                        type="button"
                        aria-label={`Delete ${notification.title}`}
                        title="Delete"
                        disabled={busyId !== null || Boolean(bulkAction)}
                        onClick={() => runItemAction(notification.id, () => deleteNotification(notification.id))}
                        className="rounded-md p-1.5 text-[#687A73] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;
