/**
 * src/pages/NotificationsPage.jsx
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBell, FiCheck } from 'react-icons/fi';
import { getNotifications, markAsRead } from '../api/notifications';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update notification');
    }
  };

  if (loading) return <div className="skeleton h-48 w-full rounded-2xl" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="section-title">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="card text-center py-12 text-gray-500 dark:text-gray-400">
          <FiBell size={28} className="mx-auto mb-3 text-gray-300 dark:text-dark-600" />
          You're all caught up.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`card flex items-start justify-between gap-4 !p-4 ${
                n.isRead ? 'border-l-4' : 'border-l-4 border-gold-500'
              }`}
            >
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 shrink-0"
                  onClick={() => handleMarkRead(n._id)}
                  aria-label="Mark read"
                  title="Mark read"
                >
                  <FiCheck size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
