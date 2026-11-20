import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import type { User } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, setAuthToken } from '../lib/api.ts';

export function AdminLoginPage() {
  const { user, setUser, navigate, toast } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  // Mandatory first-login password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  if (user && user.role === 'admin' && !user.must_change_password) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShieldCheck className="w-10 h-10 mx-auto text-[#14B8A6]" />
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Admin Session Active</h1>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="px-6 py-3 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Open Admin Dashboard
        </button>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSubmitting(true);
      const res = await apiFetch<{ token: string; user: User }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuthToken(res.token);
      setUser(res.user);
      if (res.user.must_change_password) {
        setCurrentPassword(password);
        toast('Initial login detected. Please set a new secure password.', 'info');
      } else {
        toast('Administrator signed in.');
        navigate('/admin');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword === '123456') {
      setErrorMsg('Please choose a new password different from the initial setup password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    try {
      setUpdatingPw(true);
      await apiFetch('/api/auth/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (user) {
        setUser({ ...user, must_change_password: false });
      }
      toast('Password updated. Welcome to Admin Dashboard.');
      navigate('/admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setUpdatingPw(false);
    }
  };

  // Mandatory First-Login Password Change Gate
  if (user && user.role === 'admin' && user.must_change_password) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-xl">
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">
              Security Update Required
            </h1>
            <p className="text-sm text-zinc-500">
              Your administrator account is using the initial setup password. Set a new password below to enter your
              Admin Dashboard.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleMandatoryPasswordChange} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <button
              type="submit"
              disabled={updatingPw}
              className="w-full py-3 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
            >
              {updatingPw ? 'Updating...' : 'Update Password & Open Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-xl">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          >
            Customer Sign In
          </button>
          <button type="button" className="py-2 rounded-lg bg-white dark:bg-[#14B8A6] text-zinc-950 shadow-sm">
            Admin Login
          </button>
        </div>

        <div className="space-y-2">
          <div className="w-11 h-11 rounded-xl bg-[#0F6E56]/15 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Administrator Portal</h1>
          <p className="text-sm text-zinc-500">
            Authorized access only. Sign in to manage products, inventory, orders, and payment verifications.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Username</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter administrator username"
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 font-semibold"
          >
            {submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
        </button>
      </div>
    </div>
  );
}
