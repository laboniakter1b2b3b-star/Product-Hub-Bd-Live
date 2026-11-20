import React, { useState } from 'react';
import { Phone, Mail, MapPin, MessageSquare, HelpCircle, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function CategoriesPage() {
  const { categories, navigate } = useStore();
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">Product Categories</h1>
        <p className="text-sm text-zinc-500 mt-1">Browse all departments curated at PRODUCT HUB BD.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.name)}`)}
            className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 hover:border-[#0F6E56] dark:hover:border-[#14B8A6] transition-all"
          >
            <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
              <img
                src={cat.image || '/src/assets/images/product_oxford_shirt_1795097543187.jpg'}
                alt={cat.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white group-hover:text-[#14B8A6]">
                  {cat.name}
                </h2>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">{cat.product_count} items</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{cat.description}</p>
              {cat.subcategories.length > 0 && (
                <p className="text-xs text-zinc-500 pt-1">{cat.subcategories.join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactSupportPage({ title = 'Contact Us' }: { title?: string }) {
  const { settings, toast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch<{ message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      toast(res.message);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Reach our Dhaka support studio for sizing help, payment verification inquiries, or order updates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">Phone &amp; WhatsApp</p>
                <a
                  href={`tel:${(settings.support_phone || '+8801711000000').replace(/\s+/g, '')}`}
                  className="block font-mono text-zinc-600 dark:text-zinc-400 hover:text-[#14B8A6] mt-0.5"
                >
                  {settings.support_phone || '+880 1711-000000'}
                </a>
                <a
                  href={`https://wa.me/${(settings.whatsapp_number || '+8801711000000').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-mono text-xs text-[#0F6E56] dark:text-[#14B8A6] hover:underline mt-0.5"
                >
                  WhatsApp: {settings.whatsapp_number || '+8801711000000'}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">Email Support</p>
                <a
                  href={`mailto:${settings.support_email || 'robiulvv290@gmail.com'}`}
                  className="block text-zinc-600 dark:text-zinc-400 hover:text-[#14B8A6] mt-0.5"
                >
                  {settings.support_email || 'robiulvv290@gmail.com'}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">Dhaka Studio</p>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {settings.store_address || 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4 text-sm"
        >
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#14B8A6]" />
            <span>Send Support Inquiry</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Subject *</label>
              <input
                type="text"
                required
                placeholder="Order ID or topic"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Message *</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold inline-flex items-center gap-2"
          >
            <span>{submitting ? 'Sending...' : 'Send Message'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function PolicyPage({
  title,
  settingKey,
  fallback,
}: {
  title: string;
  settingKey: string;
  fallback: string;
}) {
  const { settings } = useStore();
  const content = settings[settingKey] || fallback;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20 space-y-6">
      <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">{title}</h1>
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-4 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}

export function FaqPage() {
  const faqs = [
    {
      q: 'How do manual bKash and Nagad payments work?',
      a: 'During checkout, choose bKash or Nagad to see our official personal Send Money number and the exact payable amount. Send Money from your wallet app, then enter your sender number, Transaction ID, and optionally upload a screenshot. Our team verifies your transaction and updates your order status to Payment Verified.',
    },
    {
      q: 'Will PRODUCT HUB BD ever ask for my bKash or Nagad PIN or OTP?',
      a: 'Never. We will never ask for your mobile wallet PIN, password, or OTP anywhere on our website or over the phone.',
    },
    {
      q: 'How long does delivery take across Bangladesh?',
      a: 'Inside Dhaka deliveries typically arrive within 24–48 hours. Outside Dhaka deliveries across all 64 districts arrive within 2–4 business days.',
    },
    {
      q: 'How can I exchange a size or return a product?',
      a: 'Items with original tags and packaging can be returned or exchanged within 7 days of receipt. Visit our Support page or call our Banani studio with your Order ID.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20 space-y-6">
      <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white flex items-center gap-2.5">
        <HelpCircle className="w-7 h-7 text-[#14B8A6]" />
        <span>Frequently Asked Questions</span>
      </h1>
      <div className="space-y-4">
        {faqs.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <h2 className="font-display font-semibold text-base text-zinc-950 dark:text-white">{item.q}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { navigate } = useStore();
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5">
      <p className="font-mono text-5xl font-bold text-[#0F6E56] dark:text-[#14B8A6]">404</p>
      <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">Page Not Found</h1>
      <p className="text-sm text-zinc-500">
        The page you requested does not exist or may have moved.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Back to Home
        </button>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium"
        >
          Visit Shop
        </button>
      </div>
    </div>
  );
}
