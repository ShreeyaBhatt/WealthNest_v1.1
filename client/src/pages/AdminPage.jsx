/**
 * src/pages/AdminPage.jsx — admin-only user list (GET /api/users)
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllUsers } from '../api/users';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await getAllUsers();
        setUsers(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) return <div className="skeleton h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="section-title">Admin — All Users</h1>

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
              <tr key={u._id} className="border-b border-gray-50 dark:border-dark-800 last:border-0">
                <td className="py-3 font-medium text-gray-800 dark:text-gray-100">{u.name}</td>
                <td className="py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                <td className="py-3"><span className="badge-gray">{u.role}</span></td>
                <td className="py-3">{u.isActive ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>}</td>
                <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
