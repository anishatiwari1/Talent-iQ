import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Sparkles,
  Check,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useEmployeeProfile } from '../../context/EmployeeProfileContext';
import { notificationMeta, notificationTarget } from '../common/notificationMeta';
import Avatar from '../common/Avatar';

export const TopNavbar = ({ onOpenMobileSidebar }) => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, unreadCount, loading, error, actionError, refresh, markRead, markAllRead } = useNotifications();
  const [readingId, setReadingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const { openEmployeeProfile } = useEmployeeProfile();

  const openNotification = async (item) => {
    const target = notificationTarget(item, isAdmin);
    if (!item.is_read) {
      try { await markRead(item.id); } catch { /* The hook exposes the request error. */ }
    }
    if (!target) return;
    setShowNotifications(false);
    if (target.employeeId && openEmployeeProfile) openEmployeeProfile(target.employeeId);
    else if (target.path) navigate(target.path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isAdmin) {
      navigate(`/admin/employees?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/employee/skills?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleMarkRead = async (notificationId) => {
    setReadingId(notificationId);
    try { await markRead(notificationId); } catch { /* The hook exposes the request error. */ }
    setReadingId(null);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try { await markAllRead(); } catch { /* The hook exposes the request error. */ }
    setMarkingAll(false);
  };

  const formatNotificationDate = (value) => {
    if (!value) return 'Date unavailable';
    // Backend timestamps are UTC without a zone suffix.
    const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-[#DCE5DF] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#687A73] hover:text-[#10221E] hover:bg-[#DFF2EA] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A6]" />
          <input
            type="text"
            placeholder={isAdmin ? "Search employees, skills, projects (e.g. 'React', 'EMP-1002')..." : "Search your skills, projects, certifications..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F3F5EF] border border-[#DCE5DF] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[#10221E] placeholder-[#9BB0A6] focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:bg-white transition-all"
          />
        </form>
      </div>

      {/* Right side: Notifications + Profile */}
      <div className="flex items-center gap-3">



        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              const opening = !showNotifications;
              setShowNotifications(opening);
              if (opening) refresh();
            }}
            className="p-2 rounded-lg text-[#687A73] hover:text-[#10221E] hover:bg-[#DFF2EA] transition-colors relative"
            title="Notifications"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#DCE5DF] z-50 py-2">
              <div className="px-4 py-2 border-b border-[#E8EFEA] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#10221E]">Notifications</h4>
                  <p className="text-[11px] text-[#687A73]">
                    {unreadCount ?? 0} unread alert{unreadCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAllRead} disabled={markingAll} className="inline-flex items-center gap-1 text-xs font-semibold text-[#075E4F] hover:underline disabled:opacity-50">
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate(isAdmin ? '/admin/notifications' : '/employee/notifications');
                    }}
                    className="text-xs text-[#075E4F] font-semibold hover:underline"
                  >
                    View all
                  </button>
                </div>
              </div>

              {actionError && <p role="alert" className="px-4 py-2 text-xs text-rose-700">{actionError}</p>}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F5EF]">
                {loading ? (
                  <div className="space-y-2 p-4" aria-live="polite" aria-busy="true">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#E8EFEA]" />
                    <div className="h-3 w-full animate-pulse rounded bg-[#F1F5F2]" />
                    <p className="text-xs text-[#687A73]">Loading notifications...</p>
                  </div>
                ) : error ? (
                  <div role="alert" className="p-4">
                    <p className="text-xs text-rose-700">{error}</p>
                    <button type="button" onClick={refresh} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#075E4F]">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="p-5 text-center text-xs text-[#687A73]">No notifications.</p>
                ) : notifications.slice(0, 5).map((item) => {
                  const meta = notificationMeta(item.type);
                  const TypeIcon = meta.icon;
                  return (
                  <div key={item.id} className={`flex items-start gap-3 p-3.5 ${!item.is_read ? 'bg-[#DFF2EA]/30' : ''}`}>
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.tone}`}><TypeIcon className="h-3.5 w-3.5" /></span>
                    <button type="button" onClick={() => openNotification(item)} className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]">
                      <p className="text-xs font-semibold leading-snug text-[#10221E]">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[#687A73]">{item.message}</p>
                      <span className="mt-1 block text-[10px] text-[#9BB0A6]">{formatNotificationDate(item.created_at)}</span>
                    </button>
                    {!item.is_read && (
                      <button
                        type="button"
                        title="Mark as read"
                        aria-label={`Mark ${item.title} as read`}
                        disabled={readingId === item.id || markingAll}
                        onClick={() => handleMarkRead(item.id)}
                        className="rounded p-1 text-[#075E4F] hover:bg-[#DFF2EA] disabled:opacity-50"
                      >
                        {readingId === item.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#DCE5DF]">
          <button type="button" onClick={() => navigate(isAdmin ? '/admin/settings' : '/employee/profile')} title={isAdmin ? 'Settings' : 'My profile'} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]">
            <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
          </button>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#10221E] leading-none">{user?.name}</p>
            <p className="text-[10px] text-[#687A73] mt-0.5">{user?.roleLabel || user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
