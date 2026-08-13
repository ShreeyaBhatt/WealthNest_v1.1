/**
 * src/pages/AdminPage.jsx — admin-only user list (GET /api/users)
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiUsers, FiUserCheck, FiShield } from 'react-icons/fi';
import { getAllUsers } from '../api/users';
import StatCard from '../components/StatCard';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await getAllUsers({ page });
        setUsers(res.data);
        setPagination(res.pagination);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [page]);

  if (loading) return <div className="skeleton h-64 w-full rounded-2xl" />;

  // Computed from the current page of already-fetched users — no extra
  // API calls. "Total users" still comes from the real server-side count.
  const activeOnPage = users.filter((u) => u.isActive).length;
  const adminsOnPage = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="section-title">Admin — All Users</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={FiUsers} label="Total Users" value={pagination.total}
          subLabel="Across all pages"
          accent="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
          borderColor="border-primary-500"
        />
        <StatCard
          icon={FiUserCheck} label="Active (this page)" value={activeOnPage}
          subLabel={`Out of ${users.length} shown`}
          accent="bg-gain-50 dark:bg-gain-900/30 text-gain-600 dark:text-gain-400"
          borderColor="border-gain-500"
        />
        <StatCard
          icon={FiShield} label="Admins (this page)" value={adminsOnPage}
          subLabel={`Out of ${users.length} shown`}
          accent="bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400"
          borderColor="border-gold-400"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Active</th>
              <th className="pb-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u._id}
                className="border-b border-gray-50 dark:border-dark-800 last:border-0 odd:bg-gray-50/60 dark:odd:bg-dark-800/40 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors"
              >
                <td className="py-3 font-medium text-gray-800 dark:text-gray-100">{u.name}</td>
                <td className="py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                <td className="py-3"><span className={u.role === 'admin' ? 'badge-gold' : 'badge-gray'}>{u.role}</span></td>
                <td className="py-3">{u.isActive ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>}</td>
                <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Page {pagination.page} of {pagination.totalPages} — {pagination.total} users</span>
          <div className="flex gap-2">
            <button
              className="btn-secondary !py-1.5 !px-3 flex items-center gap-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              className="btn-secondary !py-1.5 !px-3 flex items-center gap-1 disabled:opacity-40"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
