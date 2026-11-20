import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Package,
  Heart,
  MapPin,
  Plus,
  Trash2,
  Printer,
  Search,
  GitCompare,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
} from 'lucide-react';
import type { Order, SavedAddress, User } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, setAuthToken } from '../lib/api.ts';
import { downloadJsonFile, formatBDT, formatDateTime } from '../lib/format.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'reset' }) {
  const { navigate, setUser, toast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSubmitting(true);
      if (mode === 'login') {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAuthToken(res.token);
        setUser(res.user);
        toast(`Welcome back, ${res.user.name}.`);
        navigate('/account');
      } else if (mode === 'register') {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone, password }),
        });
        setAuthToken(res.token);
        setUser(res.user);
        toast('Account created successfully.');
        navigate('/account');
      } else {
        const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, phone, newPassword: password }),
        });
        toast(res.message);
        navigate('/login');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6">
        {mode === 'login' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              className="py-2 rounded-lg bg-white dark:bg-[#14B8A6] text-zinc-950 shadow-sm"
            >
              Customer Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            >
              Admin Login
            </button>
          </div>
        )}

        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">
            {mode === 'login' ? 'Customer Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {mode === 'login'
              ? 'Access your saved addresses, wishlist, and order history.'
              : mode === 'register'
                ? 'Join PRODUCT HUB BD for faster checkout and order tracking.'
                : 'Verify your registered email and phone number to set a new password.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>

          {(mode === 'register' || mode === 'reset') && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {mode === 'reset' ? 'New Password (min 6 chars) *' : 'Password *'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Update Password'}
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 text-xs text-center text-zinc-500">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => navigate('/register')} className="text-[#14B8A6] hover:underline">
                New to PRODUCT HUB BD? Create an account
              </button>
              <button type="button" onClick={() => navigate('/reset-password')} className="hover:underline">
                Forgot your password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => navigate('/login')} className="text-[#14B8A6] hover:underline">
              Already have an account? Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AccountPage() {
  const { user, setUser, logout, navigate, toast } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [altPhone, setAltPhone] = useState(user?.alt_phone || '');
  const [district, setDistrict] = useState(user?.district || 'Dhaka');
  const [area, setArea] = useState(user?.area || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrDistrict, setNewAddrDistrict] = useState('Dhaka');
  const [newAddrArea, setNewAddrArea] = useState('');
  const [newAddrFull, setNewAddrFull] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAltPhone(user.alt_phone || '');
      setDistrict(user.district || 'Dhaka');
      setArea(user.area || '');
      setAddress(user.address || '');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <UserIcon className="w-10 h-10 mx-auto text-zinc-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Sign in to view your account</h1>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await apiFetch<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone, alt_phone: altPhone, district, area, address }),
      });
      setUser(updated);
      toast('Profile updated.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSavedAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLabel.trim() || !newAddrFull.trim()) return;
    const nextList: SavedAddress[] = [
      ...(user.saved_addresses || []),
      {
        id: `addr_${Date.now()}`,
        label: newAddrLabel.trim(),
        country: 'Bangladesh',
        division: newAddrDistrict === 'Dhaka' ? 'Dhaka' : '',
        district: newAddrDistrict,
        upazila: '',
        area: newAddrArea.trim(),
        road_no: '',
        house_no: '',
        flat_no: '',
        postal_code: '',
        full_address: newAddrFull.trim(),
      },
    ];
    try {
      const updated = await apiFetch<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ saved_addresses: nextList }),
      });
      setUser(updated);
      setNewAddrLabel('');
      setNewAddrArea('');
      setNewAddrFull('');
      toast('Saved address added.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save address', 'error');
    }
  };

  const handleDeleteSavedAddress = async (id: string) => {
    const nextList = (user.saved_addresses || []).filter((a) => a.id !== id);
    const updated = await apiFetch<User>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ saved_addresses: nextList }),
    });
    setUser(updated);
    toast('Address removed.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">My Account</h1>
          <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" /> My Orders
          </button>
          <button
            type="button"
            onClick={() => navigate('/wishlist')}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Heart className="w-4 h-4" /> Wishlist
          </button>
          <button
            type="button"
            disabled={exportingData}
            onClick={async () => {
              try {
                setExportingData(true);
                const payload = await apiFetch<Record<string, unknown>>('/api/customer/export');
                downloadJsonFile(`my-product-hub-bd-data-${new Date().toISOString().slice(0, 10)}.json`, payload);
                toast('Your account data has been downloaded.');
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Download failed', 'error');
              } finally {
                setExportingData(false);
              }
            }}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> {exportingData ? 'Preparing...' : 'Download My Data'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4 text-sm"
        >
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">Personal Information</h2>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Alt Phone</label>
              <input
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Default District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Default Area</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Default Street Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <div className="lg:col-span-6 space-y-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#14B8A6]" />
              <span>Saved Delivery Addresses</span>
            </h2>
            {(user.saved_addresses || []).length === 0 ? (
              <p className="text-xs text-zinc-500">No saved addresses yet. Add one below for 1-click checkout.</p>
            ) : (
              <div className="space-y-2.5">
                {user.saved_addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {addr.label} · {addr.area}, {addr.district}
                      </p>
                      <p className="text-zinc-500 mt-0.5">{addr.full_address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedAddress(addr.id)}
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddSavedAddress} className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">Add New Address</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Label (Home/Office)"
                  value={newAddrLabel}
                  onChange={(e) => setNewAddrLabel(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
                <input
                  type="text"
                  required
                  placeholder="District"
                  value={newAddrDistrict}
                  onChange={(e) => setNewAddrDistrict(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
                <input
                  type="text"
                  required
                  placeholder="Area"
                  value={newAddrArea}
                  onChange={(e) => setNewAddrArea(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="House, Road, Flat & Street details"
                  value={newAddrFull}
                  onChange={(e) => setNewAddrFull(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WishlistPage() {
  const { products, wishlist, navigate } = useStore();
  const savedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white mb-2">My Wishlist</h1>
      <p className="text-sm text-zinc-500 mb-8 font-mono tabular-nums">{savedProducts.length} saved items</p>

      {savedProducts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <Heart className="w-10 h-10 mx-auto text-zinc-400" />
          <p className="text-sm text-zinc-500">Your wishlist is empty.</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
          >
            Explore Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {savedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparePage() {
  const { products, compareIds, toggleCompare, clearCompare, navigate } = useStore();
  const items = products.filter((p) => compareIds.includes(p.id));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">Compare Products</h1>
          <p className="text-sm text-zinc-500 mt-1">Side-by-side specifications, pricing, and stock comparison.</p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <GitCompare className="w-10 h-10 mx-auto text-zinc-400" />
          <p className="text-sm text-zinc-500">Select up to 4 products using the compare icon to evaluate side by side.</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D]">
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <th className="p-4 w-44 text-xs font-semibold text-zinc-500">Product</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 min-w-[220px] align-top">
                    <img
                      src={p.images[0] || ''}
                      alt={p.name}
                      className="w-full aspect-[4/3] object-cover rounded-lg mb-3 cursor-pointer"
                      onClick={() => navigate(`/product/${p.id}`)}
                    />
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="font-display font-semibold text-zinc-950 dark:text-white hover:text-[#14B8A6] text-left block"
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCompare(p.id)}
                      className="text-xs text-red-500 mt-1 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Price</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 font-mono font-bold tabular-nums text-[#0F6E56] dark:text-[#14B8A6]">
                    {formatBDT(p.effective_price)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Brand &amp; Category</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 text-xs">
                    {p.brand} · {p.category}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Rating</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 font-mono text-xs tabular-nums">
                    {p.rating} / 5 ({p.review_count})
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Material &amp; Weight</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 text-xs">
                    {p.material || '—'} · {p.weight || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Available Sizes</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 font-mono text-xs">
                    {p.sizes.join(', ')}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-500">Stock</th>
                {items.map((p) => (
                  <td key={p.id} className="p-4 font-mono text-xs tabular-nums">
                    {p.stock_quantity > 0 ? `${p.stock_quantity} available` : 'Out of stock'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MyOrdersPage() {
  const { user, navigate } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<Order[]>('/api/orders/my')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-10 h-10 mx-auto text-zinc-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Sign In to View Orders</h1>
        <p className="text-sm text-zinc-500">Or track a guest order using your Order ID.</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate('/track-order')}
            className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium"
          >
            Track Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">My Orders</h1>
        <button
          type="button"
          onClick={() => navigate('/track-order')}
          className="text-sm font-medium text-[#0F6E56] dark:text-[#14B8A6] hover:underline"
        >
          Track by Order ID
        </button>
      </div>

      {loading ? (
        <div className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <p className="text-sm text-zinc-500">You have not placed any orders yet.</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="font-mono text-base font-bold text-zinc-950 dark:text-white">{o.order_id}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDateTime(o.created_at)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Order Status</span>
                    <span className="font-semibold text-zinc-950 dark:text-white">{o.order_status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Payment ({o.payment_method})</span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        o.payment_status === 'Payment Verified'
                          ? 'text-[#0F6E56] dark:text-[#14B8A6]'
                          : o.payment_status === 'Payment Rejected'
                            ? 'text-red-500'
                            : o.payment_status === 'Pending Verification'
                              ? 'text-amber-500'
                              : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {o.payment_status === 'Payment Verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {o.payment_status === 'Pending Verification' && <Clock className="w-3.5 h-3.5" />}
                      {o.payment_status === 'Payment Rejected' && <XCircle className="w-3.5 h-3.5" />}
                      <span>{o.payment_status}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintingOrder(o);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="no-print px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-medium inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Invoice
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <img src={it.image} alt={it.name} className="w-10 h-10 rounded object-cover" />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{it.name}</p>
                        <p className="text-xs text-zinc-500">
                          Size: {it.size || 'Std'} · {it.color || 'Default'} × {it.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono tabular-nums">{formatBDT(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="text-xs text-zinc-500">
                  {o.courier_name && o.tracking_number
                    ? `Courier: ${o.courier_name} · Tracking: ${o.tracking_number}`
                    : o.transaction_id
                      ? `Transaction ID: ${o.transaction_id}`
                      : `Delivering to ${o.area}, ${o.district}`}
                </div>
                <p className="font-mono text-base font-bold tabular-nums text-zinc-950 dark:text-white">
                  Total: {formatBDT(o.total_amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {printingOrder && (
        <div className="hidden print-only p-8 bg-white text-black">
          <h2 className="text-2xl font-bold">PRODUCT HUB BD — Customer Invoice</h2>
          <p>Order ID: {printingOrder.order_id}</p>
          <p>Date: {formatDateTime(printingOrder.created_at)}</p>
          <p>Customer: {printingOrder.customer_name} ({printingOrder.customer_phone})</p>
          <p>Address: {printingOrder.full_address}, {printingOrder.area}, {printingOrder.district}</p>
          <p>Payment: {printingOrder.payment_method} — {printingOrder.payment_status}</p>
          <hr className="my-4" />
          {printingOrder.items.map((it, idx) => (
            <div key={idx} className="flex justify-between py-1">
              <span>{it.name} ({it.size}/{it.color}) × {it.quantity}</span>
              <span>{formatBDT(it.unitPrice * it.quantity)}</span>
            </div>
          ))}
          <hr className="my-4" />
          <p className="font-bold text-lg">Total: {formatBDT(printingOrder.total_amount)}</p>
        </div>
      )}
    </div>
  );
}

export function TrackOrderPage() {
  const initialId = new URLSearchParams(window.location.search).get('id') || '';
  const [orderIdInput, setOrderIdInput] = useState(initialId);
  const [result, setResult] = useState<Partial<Order> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLookup = async (id: string) => {
    if (!id.trim()) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch<Partial<Order>>(`/api/orders/track/${encodeURIComponent(id.trim())}`);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) performLookup(initialId);
  }, [initialId]);

  const steps = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered'];
  const currentIdx = result?.order_status ? steps.indexOf(result.order_status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">Track Your Order</h1>
        <p className="text-sm text-zinc-500">
          Enter your unique Order ID (e.g. PHB-20261119-4821) to inspect shipment and payment verification status.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          performLookup(orderIdInput);
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
            placeholder="Enter Order ID (PHB-...)"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold text-sm"
        >
          {loading ? 'Checking...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500 text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="font-mono text-lg font-bold text-zinc-950 dark:text-white">{result.order_id}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {result.customer_name} · {result.area}, {result.district}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="text-zinc-500">Payment ({result.payment_method})</p>
              <p
                className={`font-semibold text-sm ${
                  result.payment_status === 'Payment Verified'
                    ? 'text-[#14B8A6]'
                    : result.payment_status === 'Payment Rejected'
                      ? 'text-red-500'
                      : 'text-amber-500'
                }`}
              >
                {result.payment_status}
              </p>
            </div>
          </div>

          {result.order_status === 'Cancelled' || result.order_status === 'Returned' ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500 font-semibold">
              Order Status: {result.order_status}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
              {steps.map((step, i) => {
                const done = currentIdx >= i;
                return (
                  <div
                    key={step}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium ${
                      done
                        ? 'bg-[#0F6E56]/15 dark:bg-[#14B8A6]/15 border-[#0F6E56] dark:border-[#14B8A6] text-[#0F6E56] dark:text-[#14B8A6]'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          )}

          {result.courier_name && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs flex flex-wrap justify-between gap-2">
              <span>Courier: <strong>{result.courier_name}</strong></span>
              <span>Tracking No: <strong className="font-mono">{result.tracking_number || 'Pending'}</strong></span>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {(result.items || []).map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>
                  {it.name} ({it.size || 'Std'} / {it.color || 'Default'}) × {it.quantity}
                </span>
                <span className="font-mono tabular-nums">{formatBDT(it.unitPrice * it.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 font-bold">
              <span>Total Amount</span>
              <span className="font-mono tabular-nums">{formatBDT(result.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
