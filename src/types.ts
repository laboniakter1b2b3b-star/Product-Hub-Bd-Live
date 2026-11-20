export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: number;
  product_code: string;
  sku: string;
  barcode: string;
  name: string;
  short_description: string;
  description: string;
  regular_price: number;
  sale_price: number | null;
  effective_price: number;
  discount_percent: number;
  cost_price: number;
  category: string;
  subcategory: string;
  brand: string;
  images: string[];
  video_url: string;
  sizes: string[];
  colors: ProductColor[];
  stock_quantity: number;
  variant_stock: Record<string, number>;
  low_stock_threshold: number;
  weight: string;
  material: string;
  pieces_info: string;
  warranty_info: string;
  specifications: ProductSpec[];
  features: string[];
  tags: string[];
  search_keywords: string;
  status: 'Active' | 'Draft' | 'Out of Stock' | string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_special_offer: boolean;
  sales_count: number;
  views_count: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number | null;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: string[];
  description: string;
  image: string;
  product_count: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  country: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  road_no: string;
  house_no: string;
  flat_no: string;
  postal_code: string;
  full_address: string;
}

export interface User {
  id: number;
  username: string | null;
  name: string;
  email: string;
  phone: string;
  alt_phone: string;
  country: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  road_no: string;
  house_no: string;
  flat_no: string;
  postal_code: string;
  address: string;
  saved_addresses: SavedAddress[];
  role: 'customer' | 'admin';
  status?: string;
  must_change_password: boolean;
  created_at?: string;
}

export interface CartItem {
  productId: number;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderItem {
  productId: number;
  sku: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  order_id: string;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  alt_phone: string;
  country: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  road_no: string;
  house_no: string;
  flat_no: string;
  postal_code: string;
  full_address: string;
  delivery_instructions: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  coupon_code: string;
  tax_amount: number;
  delivery_charge: number;
  total_amount: number;
  estimated_profit: number;
  payment_method: 'bKash' | 'Nagad' | 'Cash on Delivery';
  payment_number: string;
  sender_number: string;
  transaction_id: string;
  payment_screenshot: string;
  payment_status: 'Pending Verification' | 'Payment Verified' | 'Payment Rejected' | 'Cash on Delivery';
  order_status: 'Pending' | 'Confirmed' | 'Processing' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
  courier_name: string;
  tracking_number: string;
  refund_status: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  is_active: number;
  expires_at: string;
  usage_count: number;
}

export interface StockHistoryItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  variant_key: string;
  reason: string;
  admin_name: string;
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  note: string;
  created_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  reply_note: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  actor: string;
  action: string;
  target: string;
  details: string;
  created_at: string;
}

export interface DashboardData {
  visitors: {
    total: number;
    liveActive: number;
    today: number;
    pageViews: number;
  };
  catalog: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockProducts: Product[];
    outOfStockProducts: Product[];
  };
  customers: {
    totalCustomers: number;
  };
  orders: {
    totalOrders: number;
    statusCounts: Record<string, number>;
    pendingPaymentsCount: number;
  };
  financials: {
    totalSales: number;
    totalCogs: number;
    totalExpenses: number;
    estimatedProfit: number;
  };
  charts: {
    daily: { label: string; orders: number; revenue: number }[];
    weekly: { label: string; orders: number; revenue: number }[];
    monthly: { label: string; orders: number; revenue: number }[];
    yearly: { label: string; orders: number; revenue: number }[];
  };
  topProducts: {
    id: number;
    name: string;
    sku: string;
    sales_count: number;
    stock_quantity: number;
    effective_price: number;
    image: string;
  }[];
}
