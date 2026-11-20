import React, { useState } from 'react';
import { Mail, Phone, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function Footer() {
  const { settings, navigate, toast } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubmitting(true);
      const res = await apiFetch<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast(res.message);
      setEmail('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Subscription failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-zinc-100 dark:bg-[#08090C] border-t border-zinc-200 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-400 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Newsletter & Brand Strip */}
        <div className="pb-12 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-2">
            <h3 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
              {settings.site_name || 'PRODUCT HUB BD'}
            </h3>
            {settings.site_tagline && (
              <p className="text-xs font-medium text-[#0F6E56] dark:text-[#14B8A6]">{settings.site_tagline}</p>
            )}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
              {settings.footer_text ||
                'Precision essentials curated in Dhaka, delivered nationwide across all 64 districts.'}
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="lg:col-span-6 flex flex-col sm:flex-row gap-3 lg:justify-end">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email for new drops & offers"
              className="flex-1 max-w-sm px-4 py-2.5 rounded-lg bg-white dark:bg-[#14171D] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0F6E56] dark:focus:border-[#14B8A6]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>{submitting ? 'Joining...' : 'Subscribe'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Links Grid */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h4 className="font-display font-semibold text-zinc-950 dark:text-white mb-4">Storefront</h4>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/shop')} className="hover:text-[#14B8A6]">
                  All Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/categories')} className="hover:text-[#14B8A6]">
                  Categories
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/compare')} className="hover:text-[#14B8A6]">
                  Compare Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/track-order')} className="hover:text-[#14B8A6]">
                  Track Order
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-zinc-950 dark:text-white mb-4">Customer Care</h4>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/account')} className="hover:text-[#14B8A6]">
                  My Account
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/orders')} className="hover:text-[#14B8A6]">
                  My Orders
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/wishlist')} className="hover:text-[#14B8A6]">
                  My Wishlist
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/support')} className="hover:text-[#14B8A6]">
                  Customer Support
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/faq')} className="hover:text-[#14B8A6]">
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-zinc-950 dark:text-white mb-4">Policies</h4>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#14B8A6]">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shipping-policy')} className="hover:text-[#14B8A6]">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/return-policy')} className="hover:text-[#14B8A6]">
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/privacy-policy')} className="hover:text-[#14B8A6]">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/terms')} className="hover:text-[#14B8A6]">
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-zinc-950 dark:text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                <span>{settings.store_address || 'Banani, Dhaka 1213, Bangladesh'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0" />
                <a
                  href={`tel:${(settings.support_phone || '+8801711000000').replace(/\s+/g, '')}`}
                  className="font-mono hover:text-[#14B8A6]"
                >
                  {settings.support_phone || '+880 1711-000000'}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0" />
                <a
                  href={`mailto:${settings.support_email || 'robiulvv290@gmail.com'}`}
                  className="hover:text-[#14B8A6]"
                >
                  {settings.support_email || 'robiulvv290@gmail.com'}
                </a>
              </li>
              {(settings.social_facebook || settings.social_instagram || settings.social_youtube || settings.whatsapp_number) && (
                <li className="pt-1 flex flex-wrap gap-3 text-xs">
                  {settings.whatsapp_number && (
                    <a
                      href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#14B8A6]"
                    >
                      WhatsApp
                    </a>
                  )}
                  {settings.social_facebook && (
                    <a
                      href={settings.social_facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#14B8A6]"
                    >
                      Facebook
                    </a>
                  )}
                  {settings.social_instagram && (
                    <a
                      href={settings.social_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#14B8A6]"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.social_youtube && (
                    <a
                      href={settings.social_youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#14B8A6]"
                    >
                      YouTube
                    </a>
                  )}
                </li>
              )}
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/login')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-[#14B8A6]"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Accepted Payments */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {settings.site_name || 'PRODUCT HUB BD'}. All rights reserved.</p>
          <p className="font-mono">
            bKash · Nagad{settings.cod_enabled === 'true' ? ' · Cash on Delivery' : ''}
          </p>
        </div>
      </div>
    </footer>
  );
}
