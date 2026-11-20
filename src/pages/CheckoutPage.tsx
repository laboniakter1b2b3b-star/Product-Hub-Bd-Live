import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  Upload,
  CreditCard,
  Truck,
  Printer,
  AlertCircle,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import type { Order } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, uploadImageFile } from '../lib/api.ts';
import { formatBDT, formatDateTime } from '../lib/format.ts';

const BD_DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'];

export function CheckoutPage() {
  const { cart, products, user, settings, clearCart, navigate, toast, refreshProducts } = useStore();

  const urlCoupon = new URLSearchParams(window.location.search).get('coupon') || '';

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [altPhone, setAltPhone] = useState(user?.alt_phone || '');
  const [country, setCountry] = useState(user?.country || 'Bangladesh');
  const [division, setDivision] = useState(user?.division || 'Dhaka');
  const [district, setDistrict] = useState(user?.district || 'Dhaka');
  const [upazila, setUpazila] = useState(user?.upazila || '');
  const [area, setArea] = useState(user?.area || '');
  const [roadNo, setRoadNo] = useState(user?.road_no || '');
  const [houseNo, setHouseNo] = useState(user?.house_no || '');
  const [flatNo, setFlatNo] = useState(user?.flat_no || '');
  const [postalCode, setPostalCode] = useState(user?.postal_code || '');
  const [fullAddress, setFullAddress] = useState(user?.address || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [couponCode, setCouponCode] = useState(urlCoupon);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponName, setAppliedCouponName] = useState('');

  const codEnabled = settings.cod_enabled === 'true';
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Cash on Delivery'>('bKash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const [reviewStep, setReviewStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedNum, setCopiedNum] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!codEnabled && paymentMethod === 'Cash on Delivery') {
      setPaymentMethod('bKash');
    }
  }, [codEnabled, paymentMethod]);

  useEffect(() => {
    if (user) {
      setCustomerName((v) => v || user.name);
      setCustomerEmail((v) => v || user.email);
      setCustomerPhone((v) => v || user.phone);
      setAltPhone((v) => v || user.alt_phone);
      setCountry((v) => v || user.country || 'Bangladesh');
      setDivision((v) => v || user.division || 'Dhaka');
      setDistrict((v) => v || user.district || 'Dhaka');
      setUpazila((v) => v || user.upazila);
      setArea((v) => v || user.area);
      setRoadNo((v) => v || user.road_no);
      setHouseNo((v) => v || user.house_no);
      setFlatNo((v) => v || user.flat_no);
      setPostalCode((v) => v || user.postal_code);
      setFullAddress((v) => v || user.address);
    }
  }, [user]);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.product_type === 'aliexpress_affiliate') return null;
      return { ...item, product };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = detailedItems.reduce((sum, i) => sum + i.product.effective_price * i.quantity, 0);

  useEffect(() => {
    if (urlCoupon && subtotal > 0 && !appliedCouponName) {
      apiFetch<{ code: string; discount_amount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: urlCoupon, subtotal }),
      })
        .then((res) => {
          setAppliedCouponName(res.code);
          setAppliedDiscount(res.discount_amount);
        })
        .catch(() => {});
    }
  }, [urlCoupon, subtotal, appliedCouponName]);

  const afterDiscount = Math.max(0, subtotal - appliedDiscount);
  const parseSettingNum = (raw: string | undefined, fallback: number): number => {
    if (raw === undefined || raw === null || raw.trim() === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  const taxRate = parseSettingNum(settings.tax_rate_percent, 0);
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const freeThreshold = parseSettingNum(settings.free_delivery_threshold, 5000);
  const isDhaka = district.trim().toLowerCase() === 'dhaka';
  const baseDelivery = isDhaka
    ? parseSettingNum(settings.delivery_charge_dhaka, 70)
    : parseSettingNum(settings.delivery_charge_outside, 130);
  const deliveryCharge = freeThreshold > 0 && afterDiscount >= freeThreshold ? 0 : baseDelivery;
  const totalAmount = afterDiscount + taxAmount + deliveryCharge;

  const selectedWalletNumber =
    paymentMethod === 'bKash'
      ? settings.bkash_number || '01704323915'
      : paymentMethod === 'Nagad'
        ? settings.nagad_number || '01704323915'
        : '';

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiFetch<{ code: string; discount_amount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      setAppliedCouponName(res.code);
      setAppliedDiscount(res.discount_amount);
      toast(`Coupon ${res.code} applied.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Invalid coupon', 'error');
      setAppliedCouponName('');
      setAppliedDiscount(0);
    }
  };

  const handleCopyNumber = () => {
    if (!selectedWalletNumber) return;
    navigator.clipboard.writeText(selectedWalletNumber);
    setCopiedNum(true);
    toast(`Copied ${paymentMethod} number: ${selectedWalletNumber}`);
    setTimeout(() => setCopiedNum(false), 2000);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProof(true);
      const url = await uploadImageFile(file, 'payment-proof');
      setPaymentScreenshot(url);
      toast('Payment screenshot uploaded.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod !== 'Cash on Delivery') {
      if (!senderNumber.trim()) {
        toast(`Please enter your ${paymentMethod} sender mobile number.`, 'error');
        return;
      }
      if (!transactionId.trim() || transactionId.trim().length < 5) {
        toast(`Please enter a valid ${paymentMethod} Transaction ID.`, 'error');
        return;
      }
    }
    setReviewStep(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);
      const order = await apiFetch<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          alt_phone: altPhone,
          country,
          division,
          district,
          upazila,
          area,
          road_no: roadNo,
          house_no: houseNo,
          flat_no: flatNo,
          postal_code: postalCode,
          full_address: fullAddress,
          delivery_instructions: deliveryInstructions,
          items: detailedItems.map((i) => ({
            productId: i.productId,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
          coupon_code: appliedCouponName || couponCode,
          payment_method: paymentMethod,
          sender_number: senderNumber,
          transaction_id: transactionId,
          payment_screenshot: paymentScreenshot,
        }),
      });
      setConfirmedOrder(order);
      clearCart();
      refreshProducts();
      toast(`Order ${order.order_id} placed successfully!`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Order failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Order Confirmation Screen
  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20">
        <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-xs font-semibold text-[#0F6E56] dark:text-[#14B8A6]">Order Recorded</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mt-1">
                Order {confirmedOrder.order_id}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">{formatDateTime(confirmedOrder.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-2 self-start"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <p className="text-xs text-zinc-500">Order Status</p>
              <p className="font-semibold text-zinc-950 dark:text-white">{confirmedOrder.order_status}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <p className="text-xs text-zinc-500">Payment Status ({confirmedOrder.payment_method})</p>
              <p
                className={`font-semibold ${
                  confirmedOrder.payment_status === 'Pending Verification'
                    ? 'text-amber-500'
                    : 'text-[#0F6E56] dark:text-[#14B8A6]'
                }`}
              >
                {confirmedOrder.payment_status}
              </p>
              {confirmedOrder.transaction_id && (
                <p className="font-mono text-xs text-zinc-500">TrxID: {confirmedOrder.transaction_id}</p>
              )}
            </div>
          </div>

          {confirmedOrder.payment_status === 'Pending Verification' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Your manual {confirmedOrder.payment_method} payment (TrxID:{' '}
                <span className="font-mono font-semibold">{confirmedOrder.transaction_id}</span>) is saved and awaiting
                admin verification. Your payment status will change to &ldquo;Payment Verified&rdquo; once confirmed by
                our team.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-white">Ordered Items</h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {confirmedOrder.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">
                        Size: {item.size || 'Std'} · Color: {item.color || 'Default'} · Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatBDT(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-sm">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Delivery Details</p>
              <p>{confirmedOrder.customer_name}</p>
              <p className="font-mono text-xs">{confirmedOrder.customer_phone}</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {[
                  confirmedOrder.house_no && `House ${confirmedOrder.house_no}`,
                  confirmedOrder.road_no && `Road ${confirmedOrder.road_no}`,
                  confirmedOrder.flat_no && `Flat ${confirmedOrder.flat_no}`,
                  confirmedOrder.area,
                  confirmedOrder.district,
                  confirmedOrder.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-xs text-zinc-500">{confirmedOrder.full_address}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-mono tabular-nums">{formatBDT(confirmedOrder.subtotal)}</span>
              </div>
              {confirmedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-[#14B8A6]">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatBDT(confirmedOrder.discount_amount)}</span>
                </div>
              )}
              {confirmedOrder.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tax</span>
                  <span className="font-mono tabular-nums">{formatBDT(confirmedOrder.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery Charge</span>
                <span className="font-mono tabular-nums">
                  {confirmedOrder.delivery_charge === 0 ? 'Free' : formatBDT(confirmedOrder.delivery_charge)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 font-bold text-base">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums">{formatBDT(confirmedOrder.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="no-print pt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/track-order?id=${confirmedOrder.order_id}`)}
              className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
            >
              Track This Order
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (detailedItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">No Items in Checkout</h1>
        <p className="text-sm text-zinc-500">Add products to your cart before proceeding to checkout.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-sm font-semibold"
        >
          Browse Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">Checkout</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {reviewStep ? 'Step 2 of 2: Review & Confirm Order' : 'Step 1 of 2: Delivery Address & Payment'}
          </p>
        </div>
        {reviewStep && (
          <button
            type="button"
            onClick={() => setReviewStep(false)}
            className="text-sm font-medium text-[#0F6E56] dark:text-[#14B8A6] inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Form / Review */}
        <div className="lg:col-span-8 space-y-6">
          {!reviewStep ? (
            <form onSubmit={handleContinueToReview} className="space-y-6">
              {/* Saved Address Quick Fill */}
              {user && user.saved_addresses && user.saved_addresses.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <p className="text-xs font-semibold text-zinc-500">Use Saved Address</p>
                  <div className="flex flex-wrap gap-2">
                    {user.saved_addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setCountry(addr.country);
                          setDivision(addr.division);
                          setDistrict(addr.district);
                          setUpazila(addr.upazila);
                          setArea(addr.area);
                          setRoadNo(addr.road_no);
                          setHouseNo(addr.house_no);
                          setFlatNo(addr.flat_no);
                          setPostalCode(addr.postal_code);
                          setFullAddress(addr.full_address);
                          toast(`Loaded "${addr.label}" address.`);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:border-[#14B8A6]"
                      >
                        {addr.label} ({addr.area}, {addr.district})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer & Address Form */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6]" />
                  <span>Customer &amp; Delivery Address</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Optional for order updates"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Alternative Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Division *</label>
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      {BD_DIVISIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhaka, Chattogram"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Upazila / Thana *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Banani, Dhanmondi"
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Area / Village *</label>
                    <input
                      type="text"
                      required
                      placeholder="Block / Sector / Area"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Postal Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 1213"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Road No.</label>
                      <input
                        type="text"
                        value={roadNo}
                        onChange={(e) => setRoadNo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">House No.</label>
                      <input
                        type="text"
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Flat No.</label>
                      <input
                        type="text"
                        value={flatNo}
                        onChange={(e) => setFlatNo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Complete Delivery Address *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Full street address, building name, landmark..."
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Call before arrival, leave at reception..."
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* Manual Payment Method Selection */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0F6E56] dark:text-[#14B8A6]" />
                  <span>Payment Method</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['bKash', 'Nagad'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        paymentMethod === method
                          ? 'border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                      }`}
                    >
                      <p className="font-display font-bold text-sm text-zinc-950 dark:text-white">{method}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Personal Send Money</p>
                    </button>
                  ))}

                  {codEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash on Delivery')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        paymentMethod === 'Cash on Delivery'
                          ? 'border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                      }`}
                    >
                      <p className="font-display font-bold text-sm text-zinc-950 dark:text-white">Cash on Delivery</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Pay when parcel arrives</p>
                    </button>
                  )}
                </div>

                {/* Manual bKash / Nagad Send Money Instructions */}
                {(paymentMethod === 'bKash' || paymentMethod === 'Nagad') && (
                  <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#0D1014] border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <p className="text-xs text-zinc-500">
                          Send Money to Personal {paymentMethod} Number
                        </p>
                        <p className="font-mono text-2xl font-bold text-[#0F6E56] dark:text-[#14B8A6] mt-0.5">
                          {selectedWalletNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 self-start"
                      >
                        {copiedNum ? <Check className="w-3.5 h-3.5 text-[#14B8A6]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNum ? 'Copied' : 'Copy Number'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                      <p className="font-semibold text-zinc-950 dark:text-white">
                        Exact Payable Amount:{' '}
                        <span className="font-mono text-[#0F6E56] dark:text-[#14B8A6]">{formatBDT(totalAmount)}</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <li>Open your {paymentMethod} app and select <strong>Send Money</strong>.</li>
                        <li>
                          Enter personal number <span className="font-mono font-semibold">{selectedWalletNumber}</span> and
                          send the exact amount <span className="font-mono font-semibold">{formatBDT(totalAmount)}</span>.
                        </li>
                        <li>Enter your Sender Mobile Number and the Transaction ID below.</li>
                      </ol>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1">
                        <Lock className="w-3.5 h-3.5 text-[#14B8A6]" />
                        <span>
                          Security notice: We never ask for your {paymentMethod} PIN, wallet password, or OTP.
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                          Sender {paymentMethod} Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="01XXXXXXXXX"
                          value={senderNumber}
                          onChange={(e) => setSenderNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                          {paymentMethod} Transaction ID (TrxID) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BGD8A4K92P"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono uppercase"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                          Payment Screenshot (Optional Proof · PNG/JPG/WebP up to 5MB)
                        </label>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="cursor-pointer px-4 py-2.5 rounded-lg border border-dashed border-zinc-400 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-medium inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>{uploadingProof ? 'Uploading...' : 'Upload Screenshot'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleScreenshotUpload}
                              className="hidden"
                            />
                          </label>
                          {paymentScreenshot && (
                            <div className="flex items-center gap-2">
                              <img
                                src={paymentScreenshot}
                                alt="Payment proof"
                                className="w-12 h-12 rounded object-cover border border-zinc-300 dark:border-zinc-700"
                              />
                              <button
                                type="button"
                                onClick={() => setPaymentScreenshot('')}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 font-semibold text-sm"
              >
                Review Complete Order
              </button>
            </form>
          ) : (
            /* Step 2: Order Review */
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-6">
              <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
                Review Your Order Before Placing
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-500">Customer &amp; Delivery</p>
                  <p className="font-semibold text-zinc-950 dark:text-white">{customerName}</p>
                  {customerEmail && <p>{customerEmail}</p>}
                  <p className="font-mono text-xs">{customerPhone}{altPhone ? ` / ${altPhone}` : ''}</p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {[
                      houseNo && `House ${houseNo}`,
                      roadNo && `Road ${roadNo}`,
                      flatNo && `Flat ${flatNo}`,
                      area,
                      upazila,
                      district,
                      division,
                      country,
                      postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="text-xs text-zinc-500">{fullAddress}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-500">Payment Summary</p>
                  <p className="font-semibold text-zinc-950 dark:text-white">{paymentMethod}</p>
                  {paymentMethod !== 'Cash on Delivery' ? (
                    <>
                      <p className="text-xs">Paid To: <span className="font-mono">{selectedWalletNumber}</span></p>
                      <p className="text-xs">Sender: <span className="font-mono">{senderNumber}</span></p>
                      <p className="text-xs">TrxID: <span className="font-mono font-semibold">{transactionId}</span></p>
                      <p className="text-xs text-amber-500">Status on submit: Pending Verification</p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">Pay {formatBDT(totalAmount)} in cash upon delivery.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {detailedItems.map((i) => (
                  <div key={`${i.productId}-${i.size}-${i.color}`} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <img src={i.product.images[0] || ''} alt="" className="w-12 h-12 rounded object-cover" />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{i.product.name}</p>
                        <p className="text-xs text-zinc-500">
                          Size {i.size || 'Std'} · {i.color || 'Default'} · Qty {i.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatBDT(i.product.effective_price * i.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setReviewStep(false)}
                  className="px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-medium"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                  className="flex-1 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0C5A46] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Confirming Order...' : `Confirm & Place Order (${formatBDT(totalAmount)})`}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Order Summary */}
        <aside className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">Order Summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {detailedItems.map((i) => (
              <div key={`${i.productId}-${i.size}-${i.color}`} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={i.product.images[0] || ''}
                    alt={i.product.name}
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{i.product.name}</p>
                    <p className="text-zinc-500">
                      {i.size || 'Std'} · {i.color || 'Default'} × {i.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-semibold tabular-nums shrink-0">
                  {formatBDT(i.product.effective_price * i.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
            >
              Apply
            </button>
          </div>

          <div className="space-y-2 text-sm pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-[#0F6E56] dark:text-[#14B8A6]">
                <span>Discount ({appliedCouponName})</span>
                <span className="font-mono tabular-nums">-{formatBDT(appliedDiscount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax ({taxRate}%)</span>
                <span className="font-mono tabular-nums">{formatBDT(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Delivery ({isDhaka ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
              <span className="font-mono tabular-nums">{deliveryCharge === 0 ? 'Free' : formatBDT(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 font-bold text-base text-zinc-950 dark:text-white">
              <span>Payable Total</span>
              <span className="font-mono tabular-nums text-[#0F6E56] dark:text-[#14B8A6]">
                {formatBDT(totalAmount)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
