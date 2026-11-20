import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import {
  AuthPage,
  AccountPage,
  WishlistPage,
  ComparePage,
  MyOrdersPage,
  TrackOrderPage,
} from './pages/CustomerAuthPages.tsx';
import {
  CategoriesPage,
  ContactSupportPage,
  PolicyPage,
  FaqPage,
  NotFoundPage,
} from './pages/ContentPages.tsx';
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { OfflineIndicator } from './components/PWAInstallButton.tsx';

function AppRouter() {
  const { route } = useStore();
  const cleanPath = route.split('?')[0].replace(/\/+$/, '') || '/';

  // Admin dashboard uses its own full-viewport sidebar layout
  if (cleanPath === '/admin') {
    return <AdminDashboardPage />;
  }

  let page: React.ReactNode;
  if (cleanPath === '/') {
    page = <HomePage />;
  } else if (cleanPath === '/shop' || cleanPath === '/products') {
    page = <ShopPage />;
  } else if (cleanPath === '/categories') {
    page = <CategoriesPage />;
  } else if (cleanPath.startsWith('/product/')) {
    const id = Number(cleanPath.replace('/product/', ''));
    page = Number.isFinite(id) && id > 0 ? <ProductDetailPage productId={id} /> : <NotFoundPage />;
  } else if (cleanPath === '/cart') {
    page = <CartPage />;
  } else if (cleanPath === '/checkout') {
    page = <CheckoutPage />;
  } else if (cleanPath === '/login') {
    page = <AuthPage mode="login" />;
  } else if (cleanPath === '/register') {
    page = <AuthPage mode="register" />;
  } else if (cleanPath === '/reset-password') {
    page = <AuthPage mode="reset" />;
  } else if (cleanPath === '/account') {
    page = <AccountPage />;
  } else if (cleanPath === '/wishlist') {
    page = <WishlistPage />;
  } else if (cleanPath === '/compare') {
    page = <ComparePage />;
  } else if (cleanPath === '/orders') {
    page = <MyOrdersPage />;
  } else if (cleanPath === '/track-order') {
    page = <TrackOrderPage />;
  } else if (cleanPath === '/about') {
    page = (
      <PolicyPage
        title="About PRODUCT HUB BD"
        settingKey="about_content"
        fallback="Founded in Dhaka, PRODUCT HUB BD curates architectural apparel, precision timepieces, leather carry, and studio audio."
      />
    );
  } else if (cleanPath === '/contact') {
    page = <ContactSupportPage title="Contact Us" />;
  } else if (cleanPath === '/support') {
    page = <ContactSupportPage title="Customer Support" />;
  } else if (cleanPath === '/faq') {
    page = <FaqPage />;
  } else if (cleanPath === '/privacy-policy') {
    page = (
      <PolicyPage
        title="Privacy Policy"
        settingKey="privacy_policy"
        fallback="Your personal information is used strictly to fulfill orders and support requests."
      />
    );
  } else if (cleanPath === '/terms') {
    page = (
      <PolicyPage
        title="Terms & Conditions"
        settingKey="terms_conditions"
        fallback="All prices are in BDT. Manual bKash and Nagad payments undergo verification prior to dispatch."
      />
    );
  } else if (cleanPath === '/shipping-policy') {
    page = (
      <PolicyPage
        title="Shipping Policy"
        settingKey="shipping_policy"
        fallback="Nationwide delivery across all 64 districts of Bangladesh."
      />
    );
  } else if (cleanPath === '/return-policy') {
    page = (
      <PolicyPage
        title="Return & Refund Policy"
        settingKey="return_policy"
        fallback="7-day returns and exchanges for unused items with original packaging."
      />
    );
  } else if (cleanPath === '/admin/login') {
    page = <AdminLoginPage />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F6] dark:bg-[#0B0D10] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <main className="flex-1">{page}</main>
      <Footer />
      <CartDrawer />
      <OfflineIndicator />
    </div>
  );
}

function AppWithLanguage() {
  const { settings } = useStore();
  return (
    <LanguageProvider defaultSiteLanguage={settings.default_language}>
      <AppRouter />
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppWithLanguage />
    </StoreProvider>
  );
}
