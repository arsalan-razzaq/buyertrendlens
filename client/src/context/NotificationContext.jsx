import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import http, { API_BASE_URL, TOKEN_STORAGE_KEY, getErrorMessage } from '../api/http';
import { useAuth } from '../hooks/useAuth';

export const NotificationContext = createContext(null);

const DEFAULT_SOCKET_PATH = '/socket.io';
const VERCEL_SOCKET_ORIGIN = 'https://buyertrendlens.com';
const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const resolveSocketConfig = () => {
  const explicitValue = import.meta.env.VITE_SOCKET_URL?.trim();
  const isVercelHost =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');

  if (explicitValue) {
    if (isAbsoluteUrl(explicitValue)) {
      const parsedUrl = new URL(explicitValue);
      return {
        origin: parsedUrl.origin,
        path: parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname : DEFAULT_SOCKET_PATH
      };
    }

    if (explicitValue.startsWith('/')) {
      if (isVercelHost) {
        return {
          origin: VERCEL_SOCKET_ORIGIN,
          path: explicitValue
        };
      }

      if (API_BASE_URL.startsWith('http')) {
        return {
          origin: new URL(API_BASE_URL).origin,
          path: explicitValue
        };
      }

      if (typeof window !== 'undefined') {
        return {
          origin: window.location.origin,
          path: explicitValue
        };
      }
    }
  }

  if (isVercelHost) {
    return {
      origin: VERCEL_SOCKET_ORIGIN,
      path: DEFAULT_SOCKET_PATH
    };
  }

  if (API_BASE_URL.startsWith('http')) {
    return {
      origin: new URL(API_BASE_URL).origin,
      path: DEFAULT_SOCKET_PATH
    };
  }

  if (typeof window !== 'undefined') {
    return {
      origin: window.location.origin,
      path: DEFAULT_SOCKET_PATH
    };
  }

  return {
    origin: '',
    path: DEFAULT_SOCKET_PATH
  };
};

const canUseBrowserNotifications = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const pulseTimeoutRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState(
    canUseBrowserNotifications() ? window.Notification.permission : 'default'
  );
  const [bellPulse, setBellPulse] = useState(false);

  const triggerBellPulse = useCallback(() => {
    setBellPulse(true);
    window.clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = window.setTimeout(() => setBellPulse(false), 1600);
  }, []);

  const showBrowserNotification = useCallback((notification) => {
    if (!canUseBrowserNotifications() || window.Notification.permission !== 'granted') {
      return;
    }

    const nativeNotification = new window.Notification(notification.title, {
      body: notification.message,
      tag: notification._id,
      silent: false
    });

    nativeNotification.onclick = () => {
      window.focus();

      if (notification.actionUrl) {
        window.location.assign(notification.actionUrl);
      }

      nativeNotification.close();
    };
  }, []);

  const handleIncomingNotification = useCallback(
    (notification) => {
      setNotifications((current) => {
        const exists = current.some((item) => item._id === notification._id);
        const next = [notification, ...current.filter((item) => item._id !== notification._id)];

        if (!exists && !notification.readAt) {
          setUnreadCount((count) => count + 1);
        }

        return next.slice(0, 20);
      });
      triggerBellPulse();
      navigator.vibrate?.([120, 60, 120]);
      toast(notification.title, {
        description: notification.message
      });
      showBrowserNotification(notification);
    },
    [showBrowserNotification, triggerBellPulse]
  );

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const { data } = await http.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error('Notification fetch failed:', getErrorMessage(error));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      return undefined;
    }

    const { origin, path } = resolveSocketConfig();
    const nextSocket = io(origin || undefined, {
      auth: {
        token
      },
      path,
      transports: ['polling', 'websocket']
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));
    nextSocket.on('connect_error', (error) => {
      console.error('Notification socket connection failed:', error.message);
    });
    nextSocket.on('notification:new', handleIncomingNotification);

    return () => {
      nextSocket.off('connect');
      nextSocket.off('disconnect');
      nextSocket.off('connect_error');
      nextSocket.off('notification:new', handleIncomingNotification);
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [handleIncomingNotification, isAuthenticated, user?._id]);

  useEffect(
    () => () => {
      window.clearTimeout(pulseTimeoutRef.current);
    },
    []
  );

  const requestBrowserPermission = useCallback(async () => {
    if (!canUseBrowserNotifications()) {
      return 'unsupported';
    }

    const nextPermission = await window.Notification.requestPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    const { data } = await http.patch(`/notifications/${notificationId}/read`);
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === notificationId
          ? {
              ...notification,
              readAt: data.notification?.readAt || new Date().toISOString()
            }
          : notification
      )
    );
    setUnreadCount(Number(data.unreadCount || 0));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { data } = await http.patch('/notifications/read-all');
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString()
      }))
    );
    setUnreadCount(Number(data.unreadCount || 0));
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      notifications,
      unreadCount,
      permission,
      bellPulse,
      requestBrowserPermission,
      markAsRead,
      markAllAsRead,
      reloadNotifications: loadNotifications
    }),
    [
      socket,
      connected,
      notifications,
      unreadCount,
      permission,
      bellPulse,
      requestBrowserPermission,
      markAsRead,
      markAllAsRead,
      loadNotifications
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
