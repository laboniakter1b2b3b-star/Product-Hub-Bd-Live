export type LanguageMode = 'auto' | 'bn' | 'en';
export type ResolvedLanguage = 'bn' | 'en';

export const LANG_STORAGE_KEY = 'phb_lang_mode';
const TRANSLATION_CACHE_KEY = 'phb_auto_trans_cache_v1';

// Instant offline/zero-flicker dictionary for Storefront & Admin UI (English -> Bangla)
export const STATIC_BN_DICTIONARY: Record<string, string> = {
  // Navigation & Header
  'Home': 'হোম',
  'Shop': 'শপ',
  'Categories': 'ক্যাটাগরি',
  'Track Order': 'অর্ডার ট্র্যাক',
  'Admin': 'অ্যাডমিন',
  'Sign In': 'সাইন ইন',
  'Account': 'অ্যাকাউন্ট',
  'Cart': 'কার্ট',
  'Search': 'খুঁজুন',
  'Wishlist': 'পছন্দের তালিকা',
  'Compare': 'তুলনা',
  'Install App': 'অ্যাপ ইনস্টল',
  'Install': 'ইনস্টল',
  'Offline Mode': 'অফলাইন মোড',
  'Back Online': 'অনলাইনে ফিরেছে',

  // Hero & Home
  'Shop Collection': 'কালেকশন দেখুন',
  'Browse Categories': 'ক্যাটাগরি দেখুন',
  'Explore Now': 'এখনই দেখুন',
  'View All': 'সব দেখুন',
  'Featured Products': 'জনপ্রিয় পণ্য',
  'New Arrivals': 'নতুন কালেকশন',
  'Best Sellers': 'সর্বাধিক বিক্রিত',
  'Flash Sale': 'ফ্ল্যাশ সেল',
  'Shop by Category': 'ক্যাটাগরি অনুযায়ী কেনাকাটা',
  'Curated Essentials for Modern Living': 'আধুনিক জীবনযাত্রার জন্য বাছাইকৃত পণ্য',
  'Nationwide Delivery': 'সারা দেশে ডেলিভারি',
  'Authentic Products': '১০০% আসল পণ্য',
  'Easy Returns': 'সহজ রিটার্ন সুবিধা',
  'Secure Payment': 'নিরাপদ পেমেন্ট',
  '7-Day Easy Return': '৭ দিনের সহজ রিটার্ন',
  '64 Districts Delivery': '৬৪ জেলায় ডেলিভারি',
  'Cash on Delivery': 'ক্যাশ অন ডেলিভারি',
  'bKash & Nagad Accepted': 'বিকাশ ও নগদ গ্রহণযোগ্য',

  // Product Cards & Details
  'Add to Cart': 'কার্টে যোগ করুন',
  'Buy Now': 'এখনই কিনুন',
  'Out of Stock': 'স্টক শেষ',
  'In Stock': 'স্টকে আছে',
  'Low Stock': 'স্টক সীমিত',
  'Quick View': 'দ্রুত দেখুন',
  'Save': 'সেভ',
  'Off': 'ছাড়',
  'Size': 'সাইজ',
  'Color': 'রং',
  'Quantity': 'পরিমাণ',
  'Brand': 'ব্র্যান্ড',
  'Category': 'ক্যাটাগরি',
  'Availability': 'অবস্থান',
  'Description': 'বিবরণ',
  'Specifications': 'বৈশিষ্ট্যসমূহ',
  'Reviews': 'রিভিউ',
  'Customer Reviews': 'ক্রেতাদের রিভিউ',
  'Write a Review': 'রিভিউ লিখুন',
  'Submit Review': 'রিভিউ জমা দিন',
  'Related Products': 'সম্পর্কিত পণ্য',
  'Share Product': 'পণ্য শেয়ার করুন',
  'Copy Link': 'লিংক কপি করুন',
  'Link Copied': 'লিংক কপি হয়েছে',
  'Add to Wishlist': 'পছন্দের তালিকায় যোগ করুন',
  'Remove from Wishlist': 'পছন্দের তালিকা থেকে সরান',
  'Compare Product': 'তুলনা করুন',
  'Warranty': 'ওয়ারেন্টি',
  'Package Contents': 'প্যাকেজে যা থাকছে',
  'All Products': 'সকল পণ্য',
  'Filter': 'ফিল্টার',
  'Filters': 'ফিল্টারসমূহ',
  'Clear Filters': 'ফিল্টার মুছুন',
  'Sort by': 'সাজান',
  'Newest': 'নতুনতম',
  'Price: Low to High': 'দাম: কম থেকে বেশি',
  'Price: High to Low': 'দাম: বেশি থেকে কম',
  'Highest Rated': 'সর্বোচ্চ রেটিং',
  'Most Popular': 'সবচেয়ে জনপ্রিয়',
  'Showing': 'দেখানো হচ্ছে',
  'Products': 'পণ্যসমূহ',
  'No products found': 'কোনো পণ্য পাওয়া যায়নি',

  // Cart & Checkout
  'Shopping Cart': 'শপিং কার্ট',
  'Your cart is empty': 'আপনার কার্ট খালি',
  'Continue Shopping': 'কেনাকাটা চালিয়ে যান',
  'Proceed to Checkout': 'চেকআউট করুন',
  'View Cart': 'কার্ট দেখুন',
  'Remove': 'সরান',
  'Subtotal': 'মোট মূল্য',
  'Delivery Charge': 'ডেলিভারি চার্জ',
  'Discount': 'ছাড়',
  'Total': 'সর্বমোট',
  'Coupon Code': 'কুপন কোড',
  'Apply': 'প্রয়োগ করুন',
  'Checkout': 'চেকআউট',
  'Billing & Shipping Details': 'বিলিং ও ডেলিভারি তথ্য',
  'Full Name': 'পূর্ণ নাম',
  'Phone Number': 'মোবাইল নম্বর',
  'Email Address': 'ইমেইল ঠিকানা',
  'Delivery Address': 'ডেলিভারি ঠিকানা',
  'District': 'জেলা',
  'Delivery Zone': 'ডেলিভারি এলাকা',
  'Inside Dhaka': 'ঢাকার ভেতরে',
  'Outside Dhaka': 'ঢাকার বাইরে',
  'Payment Method': 'পেমেন্ট মাধ্যম',
  'Place Order': 'অর্ডার কনফার্ম করুন',
  'Processing...': 'প্রসেসিং হচ্ছে...',
  'Order Summary': 'অর্ডার সারাংশ',
  'Transaction ID': 'ট্রানজেকশন আইডি (TrxID)',
  'Sender Number': 'যে নম্বর থেকে টাকা পাঠিয়েছেন',
  'Order Placed Successfully': 'আপনার অর্ডার সফলভাবে সম্পন্ন হয়েছে',
  'Order ID': 'অর্ডার আইডি',

  // Customer Pages & Track Order
  'Track Your Order': 'আপনার অর্ডার ট্র্যাক করুন',
  'Check Order Status': 'অর্ডার স্ট্যাটাস দেখুন',
  'My Account': 'আমার অ্যাকাউন্ট',
  'My Orders': 'আমার অর্ডারসমূহ',
  'My Wishlist': 'আমার পছন্দের তালিকা',
  'Compare Products': 'পণ্য তুলনা করুন',
  'Sign Out': 'লগ আউট',
  'Login': 'লগইন',
  'Register': 'রেজিস্টার',
  'Create Account': 'অ্যাকাউন্ট তৈরি করুন',
  'Reset Password': 'পাসওয়ার্ড রিসেট করুন',
  'Password': 'পাসওয়ার্ড',
  'Order Status': 'অর্ডারের অবস্থা',
  'Pending Verification': 'যাচাইয়ের অপেক্ষায়',
  'Pending': 'অপেক্ষমাণ',
  'Confirmed': 'নিশ্চিত হয়েছে',
  'Processing': 'প্রস্তুত হচ্ছে',
  'Shipped': 'পাঠানো হয়েছে',
  'Delivered': 'ডেলিভারি সম্পন্ন',
  'Cancelled': 'বাতিল হয়েছে',

  // Footer & Policies
  'Storefront': 'স্টোরফ্রন্ট',
  'Customer Care': 'কাস্টমার কেয়ার',
  'Policies': 'নীতিমালা',
  'Contact': 'যোগাযোগ',
  'Contact Us': 'যোগাযোগ করুন',
  'Customer Support': 'কাস্টমার সাপোর্ট',
  'FAQ': 'সাধারণ জিজ্ঞাসা',
  'Frequently Asked Questions': 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী',
  'About Us': 'আমাদের সম্পর্কে',
  'About PRODUCT HUB BD': 'PRODUCT HUB BD সম্পর্কে',
  'Shipping Policy': 'ডেলিভারি নীতিমালা',
  'Return & Refund Policy': 'রিটার্ন ও রিফান্ড নীতিমালা',
  'Privacy Policy': 'গোপনীয়তা নীতি',
  'Terms & Conditions': 'শর্তাবলী',
  'Admin Portal': 'অ্যাডমিন পোর্টাল',
  'Subscribe': 'সাবস্ক্রাইব',
  'Joining...': 'যুক্ত হচ্ছে...',
  'All rights reserved.': 'সর্বস্বত্ব সংরক্ষিত।',
  'Send Message': 'বার্তা পাঠান',

  // Search & Common Placeholders
  'Search by product name, SKU, brand, or category...': 'পণ্যের নাম, SKU, ব্র্যান্ড বা ক্যাটাগরি দিয়ে খুঁজুন...',
  'Enter email for new drops & offers': 'নতুন পণ্য ও অফারের জন্য ইমেইল দিন',
};

// Build reverse English lookup from static dictionary
export const STATIC_EN_DICTIONARY: Record<string, string> = Object.fromEntries(
  Object.entries(STATIC_BN_DICTIONARY).map(([en, bn]) => [bn, en])
);

export function detectBrowserLanguage(): ResolvedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || 'en'];

  for (const lang of candidates) {
    const normalized = String(lang || '').toLowerCase();
    if (normalized.startsWith('bn')) return 'bn';
    if (normalized.startsWith('en')) return 'en';
  }
  return 'en';
}

export function shouldSkipTranslation(rawText: string): boolean {
  const text = rawText.trim();
  if (!text || text.length < 2) return true;

  // Never translate brand name or pure numbers/currency/codes/emails/URLs
  if (/^PRODUCT\s+HUB\s+BD$/i.test(text)) return true;
  if (/^(bKash|Nagad|Robiul|ProductHubBD)$/i.test(text)) return true;
  if (/^[\s৳$€£¥₹0-9.,:%+\-–—/()|·•×✓✕!?#*@]+$/.test(text)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^#?PHB[-A-Z0-9]+$/i.test(text)) return true;
  if (/^\+?\d[\d\s\-()]{5,}$/.test(text)) return true;

  return false;
}

export function needsTranslationForTarget(text: string, target: ResolvedLanguage): boolean {
  const trimmed = text.trim();
  if (shouldSkipTranslation(trimmed)) return false;

  const hasBangla = /[\u0980-\u09FF]/.test(trimmed);
  const hasLatin = /[A-Za-z]/.test(trimmed);

  if (target === 'bn') {
    return hasLatin;
  }
  return hasBangla;
}

export function lookupStaticTranslation(rawText: string, target: ResolvedLanguage): string | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  if (target === 'bn') {
    return STATIC_BN_DICTIONARY[trimmed] ?? null;
  }
  return STATIC_EN_DICTIONARY[trimmed] ?? null;
}

export function loadLocalTranslationCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveLocalTranslationCache(cache: Record<string, string>): void {
  try {
    const entries = Object.entries(cache);
    const trimmed = entries.length > 1500 ? Object.fromEntries(entries.slice(-1500)) : cache;
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}
