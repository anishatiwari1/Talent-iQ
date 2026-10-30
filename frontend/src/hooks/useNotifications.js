import { useEffect, useRef, useState } from 'react';
import { notificationService } from '../services/notificationService';

export const NOTIFICATIONS_CHANGED_EVENT = 'talentiq:notifications-changed';

// How often open screens check for new notifications.
const POLL_INTERVAL_MS = 60000;

const messageFromError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Background refreshes keep the current list on screen.
    if (!hasLoaded.current) setLoading(true);
    setError('');

    Promise.all([
      notificationService.listNotifications(),
      notificationService.getUnreadCount(),
    ]).then(([items, count]) => {
      if (cancelled) return;
      setNotifications(items);
      setUnreadCount(count);
      hasLoaded.current = true;
    }).catch((loadError) => {
      if (!cancelled && !hasLoaded.current) setError(messageFromError(loadError, 'Notifications could not be loaded.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [reloadCount]);

  useEffect(() => {
    const reloadOnNotificationChange = () => setReloadCount((count) => count + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reloadOnNotificationChange);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') reloadOnNotificationChange();
    }, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reloadOnNotificationChange);
      clearInterval(timer);
    };
  }, []);

  const refresh = () => setReloadCount((count) => count + 1);

  const broadcast = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

  const markRead = async (notificationId) => {
    setActionError('');
    try {
      await notificationService.markRead(notificationId);
      setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
      setUnreadCount((count) => Math.max((count ?? 0) - 1, 0));
      broadcast();
    } catch (requestError) {
      setActionError(messageFromError(requestError, 'The notification could not be marked as read.'));
      throw requestError;
    }
  };

  const markAllRead = async () => {
    setActionError('');
    try {
      await notificationService.markAllRead();
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      broadcast();
    } catch (requestError) {
      setActionError(messageFromError(requestError, 'Notifications could not be marked as read.'));
      throw requestError;
    }
  };

  const deleteNotification = async (notificationId) => {
    setActionError('');
    try {
      const removed = notifications.find((item) => item.id === notificationId);
      await notificationService.deleteNotification(notificationId);
      setNotifications((items) => items.filter((item) => item.id !== notificationId));
      if (removed && !removed.is_read) setUnreadCount((count) => Math.max((count ?? 0) - 1, 0));
      broadcast();
    } catch (requestError) {
      setActionError(messageFromError(requestError, 'The notification could not be deleted.'));
      throw requestError;
    }
  };

  const clearRead = async () => {
    setActionError('');
    try {
      await notificationService.clearRead();
      setNotifications((items) => items.filter((item) => !item.is_read));
      broadcast();
    } catch (requestError) {
      setActionError(messageFromError(requestError, 'Read notifications could not be cleared.'));
      throw requestError;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    actionError,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
    clearRead,
  };
};
