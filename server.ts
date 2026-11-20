import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import db, { initDatabase, hashPassword, verifyPassword, UPLOADS_DIR } from './server/db.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '40mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

interface AuthUser {
  id: number;
  username: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  must_change_password: number;
}

interface AuthedRequest extends Request {
  user?: AuthUser;
}

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = getTokenFromReq(req);
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.username, u.name, u.email, u.role, u.status, u.must_change_password, s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(token) as (AuthUser & { expires_at: string }) | undefined;

    if (row && new Date(row.expires_at).getTime() > Date.now() && row.status === 'active') {
      req.user = {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        must_change_password: row.must_change_password,
      };
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}

app.use(attachUser);

function createSession(userId: number, role: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    role,
    expiresAt
  );
  return token;
}

function logActivity(actor: string, action: string, target = '', details = ''): void {
  db.prepare('INSERT INTO activity_logs (actor, action, target, details) VALUES (?, ?, ?, ?)').run(
    actor,
    action,
    target,
    details
  );
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hydrateProduct(row: Record<string, unknown>) {
  const pid = Number(row.id);
  const reviewStats = db
    .prepare('SELECT COUNT(*) as review_count, COALESCE(AVG(rating), 0) as avg_rating FROM reviews WHERE product_id = ?')
    .get(pid) as { review_count: number; avg_rating: number };

  const regularPrice = Number(row.regular_price);
  const salePrice = row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null;
  const effectivePrice = salePrice !== null && salePrice < regularPrice ? salePrice : regularPrice;
  const discountPercent =
    salePrice !== null && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;

  return {
    id: pid,
    product_code: String(row.product_code),
    sku: String(row.sku),
    barcode: String(row.barcode || ''),
    name: String(row.name),
    short_description: String(row.short_description),
    description: String(row.description),
    regular_price: regularPrice,
    sale_price: salePrice,
    effective_price: effectivePrice,
    discount_percent: discountPercent,
    cost_price: Number(row.cost_price || 0),
    category: String(row.category),
    subcategory: String(row.subcategory || ''),
    brand: String(row.brand),
    images: safeJsonParse<string[]>(row.images as string, []),
    video_url: String(row.video_url || ''),
    sizes: safeJsonParse<string[]>(row.sizes as string, []),
    colors: safeJsonParse<{ name: string; hex: string }[]>(row.colors as string, []),
    stock_quantity: Number(row.stock_quantity || 0),
    variant_stock: safeJsonParse<Record<string, number>>(row.variant_stock as string, {}),
    low_stock_threshold: Number(row.low_stock_threshold || 5),
    weight: String(row.weight || ''),
    material: String(row.material || ''),
    pieces_info: String(row.pieces_info || ''),
    warranty_info: String(row.warranty_info || ''),
    specifications: safeJsonParse<{ label: string; value: string }[]>(row.specifications as string, []),
    features: safeJsonParse<string[]>(row.features as string, []),
    tags: safeJsonParse<string[]>(row.tags as string, []),
    search_keywords: String(row.search_keywords || ''),
    status: String(row.status),
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_special_offer: Boolean(row.is_special_offer),
    sales_count: Number(row.sales_count || 0),
    views_count: Number(row.views_count || 0),
    rating: Number(reviewStats.avg_rating.toFixed(1)),
    review_count: Number(reviewStats.review_count),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function getSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES (?, ?, ?, ?, 'customer')`
      )
      .run(name.trim(), cleanEmail, hashPassword(password), (phone || '').trim());

    const userId = Number(result.lastInsertRowid);
    const token = createSession(userId, 'customer');
    const user = db
      .prepare(
        'SELECT id, username, name, email, phone, alt_phone, country, division, district, upazila, area, road_no, house_no, flat_no, postal_code, address, saved_addresses, role, must_change_password FROM users WHERE id = ?'
      )
      .get(userId) as Record<string, unknown>;

    res.status(201).json({
      token,
      user: {
        ...user,
        saved_addresses: safeJsonParse(user.saved_addresses as string, []),
        must_change_password: Boolean(user.must_change_password),
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db
      .prepare('SELECT * FROM users WHERE email = ? AND role = ?')
      .get(cleanEmail, 'customer') as Record<string, unknown> | undefined;

    if (!user || !verifyPassword(password, String(user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ error: 'Your account is currently suspended. Contact support.' });
      return;
    }
    const token = createSession(Number(user.id), 'customer');
    const { password_hash: _pw, ...safeUser } = user;
    res.json({
      token,
      user: {
        ...safeUser,
        saved_addresses: safeJsonParse(safeUser.saved_addresses as string, []),
        must_change_password: Boolean(safeUser.must_change_password),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, phone, newPassword } = req.body as {
      email?: string;
      phone?: string;
      newPassword?: string;
    };
    if (!email?.trim() || !phone?.trim() || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Registered email, phone number, and new password (min 6 chars) are required.' });
      return;
    }
    const user = db
      .prepare('SELECT id, phone FROM users WHERE email = ? AND role = ?')
      .get(email.trim().toLowerCase(), 'customer') as { id: number; phone: string } | undefined;

    if (!user) {
      res.status(404).json({ error: 'No customer account matches that email.' });
      return;
    }
    const normalizedDbPhone = (user.phone || '').replace(/\D/g, '');
    const normalizedInputPhone = phone.replace(/\D/g, '');
    if (!normalizedDbPhone || normalizedDbPhone.slice(-8) !== normalizedInputPhone.slice(-8)) {
      res.status(403).json({ error: 'Phone number does not match the registered account.' });
      return;
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
    res.json({ message: 'Password updated successfully. You may now sign in.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

app.post('/api/auth/admin/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username?.trim() || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const admin = db
      .prepare("SELECT * FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND role = 'admin'")
      .get(username.trim(), username.trim()) as Record<string, unknown> | undefined;

    if (!admin || !verifyPassword(password, String(admin.password_hash))) {
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }
    const token = createSession(Number(admin.id), 'admin');
    logActivity(String(admin.username || admin.name), 'Admin Login', 'Session', 'Administrator signed in');
    const { password_hash: _pw, ...safeAdmin } = admin;
    res.json({
      token,
      user: {
        ...safeAdmin,
        saved_addresses: [],
        must_change_password: Boolean(safeAdmin.must_change_password),
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

app.post('/api/auth/admin/change-password', requireAdmin, (req: AuthedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Current password and new password (min 6 chars) are required.' });
      return;
    }
    if (newPassword === '123456') {
      res.status(400).json({ error: 'Please choose a stronger password different from the initial password.' });
      return;
    }
    const admin = db.prepare('SELECT id, password_hash, username FROM users WHERE id = ?').get(req.user!.id) as {
      id: number;
      password_hash: string;
      username: string;
    };
    if (!verifyPassword(currentPassword, admin.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
      hashPassword(newPassword),
      admin.id
    );
    logActivity(admin.username, 'Changed Password', 'Admin Account', 'Updated administrator password');
    res.json({ message: 'Administrator password updated successfully.' });
  } catch (err) {
    console.error('Change admin password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getTokenFromReq(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = db
    .prepare(
      'SELECT id, username, name, email, phone, alt_phone, country, division, district, upazila, area, road_no, house_no, flat_no, postal_code, address, saved_addresses, role, status, must_change_password, created_at FROM users WHERE id = ?'
    )
    .get(req.user!.id) as Record<string, unknown> | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    ...user,
    saved_addresses: safeJsonParse(user.saved_addresses as string, []),
    must_change_password: Boolean(user.must_change_password),
  });
});

app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  try {
    const {
      name,
      phone,
      alt_phone,
      country,
      division,
      district,
      upazila,
      area,
      road_no,
      house_no,
      flat_no,
      postal_code,
      address,
      saved_addresses,
    } = req.body as Record<string, unknown>;

    db.prepare(
      `UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        alt_phone = COALESCE(?, alt_phone),
        country = COALESCE(?, country),
        division = COALESCE(?, division),
        district = COALESCE(?, district),
        upazila = COALESCE(?, upazila),
        area = COALESCE(?, area),
        road_no = COALESCE(?, road_no),
        house_no = COALESCE(?, house_no),
        flat_no = COALESCE(?, flat_no),
        postal_code = COALESCE(?, postal_code),
        address = COALESCE(?, address),
        saved_addresses = COALESCE(?, saved_addresses)
       WHERE id = ?`
    ).run(
      name ? String(name).trim() : null,
      phone !== undefined ? String(phone) : null,
      alt_phone !== undefined ? String(alt_phone) : null,
      country !== undefined ? String(country) : null,
      division !== undefined ? String(division) : null,
      district !== undefined ? String(district) : null,
      upazila !== undefined ? String(upazila) : null,
      area !== undefined ? String(area) : null,
      road_no !== undefined ? String(road_no) : null,
      house_no !== undefined ? String(house_no) : null,
      flat_no !== undefined ? String(flat_no) : null,
      postal_code !== undefined ? String(postal_code) : null,
      address !== undefined ? String(address) : null,
      saved_addresses !== undefined ? JSON.stringify(saved_addresses) : null,
      req.user!.id
    );

    const updated = db
      .prepare(
        'SELECT id, username, name, email, phone, alt_phone, country, division, district, upazila, area, road_no, house_no, flat_no, postal_code, address, saved_addresses, role, must_change_password FROM users WHERE id = ?'
      )
      .get(req.user!.id) as Record<string, unknown>;

    res.json({
      ...updated,
      saved_addresses: safeJsonParse(updated.saved_addresses as string, []),
      must_change_password: Boolean(updated.must_change_password),
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/customer/export', requireAuth, (req: AuthedRequest, res: Response) => {
  try {
    const profile = db
      .prepare(
        `SELECT id, username, name, email, phone, alt_phone, country, division, district, upazila, area, road_no, house_no, flat_no, postal_code, address, saved_addresses, role, status, created_at
         FROM users WHERE id = ?`
      )
      .get(req.user!.id) as Record<string, unknown> | undefined;

    if (!profile) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const orders = (
      db
        .prepare('SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY id DESC')
        .all(req.user!.id, req.user!.email) as Record<string, unknown>[]
    ).map((o) => ({
      ...o,
      items: safeJsonParse(o.items as string, []),
    }));

    const wishlistRows = db
      .prepare(
        `SELECT w.product_id, w.created_at, p.name, p.sku, p.regular_price, p.sale_price
         FROM wishlists w
         LEFT JOIN products p ON p.id = w.product_id
         WHERE w.user_id = ?
         ORDER BY w.created_at DESC`
      )
      .all(req.user!.id);

    const reviews = db
      .prepare(
        `SELECT r.id, r.product_id, p.name as product_name, r.rating, r.comment, r.created_at
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.user_id = ?
         ORDER BY r.id DESC`
      )
      .all(req.user!.id);

    const payload = {
      exported_at: new Date().toISOString(),
      account: {
        ...profile,
        saved_addresses: safeJsonParse(profile.saved_addresses as string, []),
      },
      summary: {
        total_orders: orders.length,
        wishlist_items: wishlistRows.length,
        reviews_written: reviews.length,
      },
      orders,
      wishlist: wishlistRows,
      reviews,
    };

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="my-product-hub-bd-data-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(payload);
  } catch (err) {
    console.error('Customer export error:', err);
    res.status(500).json({ error: 'Failed to export account data' });
  }
});

// ==========================================
// FILE UPLOAD (SECURE IMAGE STORAGE)
// ==========================================

app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'No image data provided' });
      return;
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'Only PNG, JPG, and WebP images are supported.' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size must be 5MB or smaller.' });
      return;
    }
    const safeBase = (filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'upload';
    const outName = `${safeBase}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
    res.json({ url: `/uploads/${outName}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to store uploaded file' });
  }
});

app.post('/api/upload-video', (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'No video data provided' });
      return;
    }
    const match = dataUrl.match(/^data:video\/(mp4|webm|quicktime);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'Only MP4, WebM, and MOV videos are supported.' });
      return;
    }
    const ext = match[1] === 'quicktime' ? 'mov' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 25 * 1024 * 1024) {
      res.status(400).json({ error: 'Video size must be 25MB or smaller.' });
      return;
    }
    const safeBase = (filename || 'video').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'video';
    const outName = `${safeBase}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
    res.json({ url: `/uploads/${outName}` });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: 'Failed to store uploaded video' });
  }
});

// ==========================================
// PUBLIC STOREFRONT ENDPOINTS
// ==========================================

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(getSettingsMap());
});

app.get('/api/categories', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id ASC').all() as Record<string, unknown>[];
  const counts = db
    .prepare("SELECT category, COUNT(*) as product_count FROM products WHERE status = 'Active' GROUP BY category")
    .all() as { category: string; product_count: number }[];
  const countMap = new Map(counts.map((c) => [c.category, c.product_count]));

  res.json(
    rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      subcategories: safeJsonParse<string[]>(r.subcategories as string, []),
      description: String(r.description || ''),
      image: String(r.image || ''),
      product_count: countMap.get(String(r.name)) || 0,
    }))
  );
});

app.get('/api/products', (req: AuthedRequest, res: Response) => {
  const {
    search,
    category,
    subcategory,
    brand,
    size,
    color,
    minPrice,
    maxPrice,
    minRating,
    availability,
    featured,
    bestseller,
    specialOffer,
    sort,
    includeDrafts,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string | undefined>;

  const isAdmin = req.user?.role === 'admin' && includeDrafts === '1';
  let rows = db
    .prepare(isAdmin ? 'SELECT * FROM products ORDER BY id DESC' : "SELECT * FROM products WHERE status != 'Draft' ORDER BY id DESC")
    .all() as Record<string, unknown>[];

  let products = rows.map(hydrateProduct);

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.search_keywords.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (category && category !== 'all') {
    products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (subcategory && subcategory !== 'all') {
    products = products.filter((p) => p.subcategory.toLowerCase() === subcategory.toLowerCase());
  }
  if (brand && brand !== 'all') {
    products = products.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
  }
  if (size && size !== 'all') {
    products = products.filter((p) => p.sizes.includes(size));
  }
  if (color && color !== 'all') {
    products = products.filter((p) => p.colors.some((c) => c.name.toLowerCase() === color.toLowerCase()));
  }
  if (minPrice) {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) products = products.filter((p) => p.effective_price >= min);
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) products = products.filter((p) => p.effective_price <= max);
  }
  if (minRating) {
    const mr = Number(minRating);
    if (!Number.isNaN(mr) && mr > 0) products = products.filter((p) => p.rating >= mr);
  }
  if (availability === 'in_stock') {
    products = products.filter((p) => p.stock_quantity > 0 && p.status !== 'Out of Stock');
  } else if (availability === 'out_of_stock') {
    products = products.filter((p) => p.stock_quantity <= 0 || p.status === 'Out of Stock');
  }
  if (featured === '1') {
    products = products.filter((p) => p.is_featured);
  }
  if (bestseller === '1') {
    products = products.filter((p) => p.is_bestseller);
  }
  if (specialOffer === '1') {
    products = products.filter((p) => p.is_special_offer || p.discount_percent > 0);
  }

  switch (sort) {
    case 'price_asc':
      products.sort((a, b) => a.effective_price - b.effective_price);
      break;
    case 'price_desc':
      products.sort((a, b) => b.effective_price - a.effective_price);
      break;
    case 'popular':
      products.sort((a, b) => b.sales_count + b.views_count - (a.sales_count + a.views_count));
      break;
    case 'rating':
      products.sort((a, b) => b.rating - a.rating || b.review_count - a.review_count);
      break;
    case 'newest':
    default:
      products.sort((a, b) => b.id - a.id);
      break;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const total = products.length;
  const paginated = products.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    products: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum)),
  });
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  db.prepare('UPDATE products SET views_count = views_count + 1 WHERE id = ?').run(id);
  const product = hydrateProduct({ ...row, views_count: Number(row.views_count || 0) + 1 });
  const reviews = db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC')
    .all(id);
  const relatedRows = db
    .prepare("SELECT * FROM products WHERE category = ? AND id != ? AND status != 'Draft' LIMIT 4")
    .all(product.category, id) as Record<string, unknown>[];

  res.json({
    product,
    reviews,
    related: relatedRows.map(hydrateProduct),
  });
});

app.post('/api/products/:id/reviews', (req: AuthedRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { customer_name, rating, comment } = req.body as {
      customer_name?: string;
      rating?: number;
      comment?: string;
    };
    const numRating = Number(rating);
    const author = (req.user?.name || customer_name || '').trim();
    if (!author || !comment?.trim() || Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'Name, rating (1-5), and review comment are required.' });
      return;
    }
    const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!prod) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const result = db
      .prepare('INSERT INTO reviews (product_id, user_id, customer_name, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .run(productId, req.user?.id || null, author, Math.round(numRating), comment.trim());
    const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

app.post('/api/coupons/validate', (req: Request, res: Response) => {
  const { code, subtotal } = req.body as { code?: string; subtotal?: number };
  if (!code?.trim()) {
    res.status(400).json({ error: 'Enter a coupon code' });
    return;
  }
  const coupon = db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1')
    .get(code.trim()) as Record<string, unknown> | undefined;

  if (!coupon) {
    res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    return;
  }
  if (coupon.expires_at && new Date(String(coupon.expires_at)).getTime() < Date.now()) {
    res.status(400).json({ error: 'This coupon has expired.' });
    return;
  }
  const sub = Number(subtotal || 0);
  const minOrder = Number(coupon.min_order || 0);
  if (sub < minOrder) {
    res.status(400).json({ error: `Minimum order of ৳${minOrder.toLocaleString()} required for this coupon.` });
    return;
  }
  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = Math.round((sub * Number(coupon.discount_value)) / 100);
    if (coupon.max_discount) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  } else {
    discount = Math.min(sub, Number(coupon.discount_value));
  }
  res.json({
    code: String(coupon.code),
    discount_type: String(coupon.discount_type),
    discount_value: Number(coupon.discount_value),
    discount_amount: discount,
  });
});

app.post('/api/visitors/heartbeat', (req: Request, res: Response) => {
  try {
    const { sessionId, pagePath, isPageView } = req.body as {
      sessionId?: string;
      pagePath?: string;
      isPageView?: boolean;
    };
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' });
      return;
    }
    const existing = db.prepare('SELECT id FROM visitors WHERE session_id = ?').get(sessionId) as
      | { id: number }
      | undefined;

    if (existing) {
      db.prepare("UPDATE visitors SET last_seen_at = datetime('now'), page_path = ? WHERE id = ?").run(
        pagePath || '/',
        existing.id
      );
    } else {
      db.prepare('INSERT INTO visitors (session_id, page_path, user_agent) VALUES (?, ?, ?)').run(
        sessionId,
        pagePath || '/',
        req.headers['user-agent'] || ''
      );
    }
    if (isPageView) {
      db.prepare('INSERT INTO page_views (session_id, page_path) VALUES (?, ?)').run(
        sessionId,
        pagePath || '/'
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Visitor heartbeat error:', err);
    res.status(500).json({ ok: false });
  }
});

app.post('/api/contact', (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body as Record<string, string>;
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Name, email, subject, and message are required.' });
      return;
    }
    const result = db
      .prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), email.trim(), (phone || '').trim(), subject.trim(), message.trim());
    res.status(201).json({ id: result.lastInsertRowid, message: 'Message received. Our support team will respond shortly.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/api/newsletter', (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim() || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').run(email.trim().toLowerCase());
    res.status(201).json({ message: 'Subscribed to PRODUCT HUB BD updates.' });
  } catch (err) {
    console.error('Newsletter error:', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// ==========================================
// CUSTOMER CART & WISHLIST
// ==========================================

app.get('/api/cart', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT product_id, size, color, quantity FROM cart_items WHERE user_id = ?')
    .all(req.user!.id);
  res.json(rows);
});

app.put('/api/cart', requireAuth, (req: AuthedRequest, res: Response) => {
  const { items } = req.body as {
    items?: { productId: number; size: string; color: string; quantity: number }[];
  };
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.id);
    if (Array.isArray(items)) {
      const insert = db.prepare(
        'INSERT INTO cart_items (user_id, product_id, size, color, quantity) VALUES (?, ?, ?, ?, ?)'
      );
      for (const item of items) {
        if (item.productId && item.quantity > 0) {
          insert.run(req.user!.id, item.productId, item.size || '', item.color || '', item.quantity);
        }
      }
    }
  });
  tx();
  res.json({ ok: true });
});

app.get('/api/wishlist', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db.prepare('SELECT product_id FROM wishlists WHERE user_id = ?').all(req.user!.id) as {
    product_id: number;
  }[];
  res.json(rows.map((r) => r.product_id));
});

app.post('/api/wishlist/toggle', requireAuth, (req: AuthedRequest, res: Response) => {
  const { productId } = req.body as { productId?: number };
  if (!productId) {
    res.status(400).json({ error: 'productId required' });
    return;
  }
  const exists = db
    .prepare('SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?')
    .get(req.user!.id, productId);
  if (exists) {
    db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(req.user!.id, productId);
    res.json({ added: false });
  } else {
    db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)').run(req.user!.id, productId);
    res.json({ added: true });
  }
});

// ==========================================
// CHECKOUT & ORDERS (TRANSACTIONAL)
// ==========================================

app.post('/api/orders', (req: AuthedRequest, res: Response) => {
  try {
    const body = req.body as {
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      alt_phone?: string;
      country?: string;
      division?: string;
      district?: string;
      upazila?: string;
      area?: string;
      road_no?: string;
      house_no?: string;
      flat_no?: string;
      postal_code?: string;
      full_address?: string;
      delivery_instructions?: string;
      items?: { productId: number; size: string; color: string; quantity: number }[];
      coupon_code?: string;
      payment_method?: 'bKash' | 'Nagad' | 'Cash on Delivery';
      sender_number?: string;
      transaction_id?: string;
      payment_screenshot?: string;
    };

    if (
      !body.customer_name?.trim() ||
      !body.customer_email?.trim() ||
      !body.customer_phone?.trim() ||
      !body.district?.trim() ||
      !body.area?.trim() ||
      !body.full_address?.trim()
    ) {
      res.status(400).json({ error: 'Please complete all required customer and delivery address fields.' });
      return;
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const settings = getSettingsMap();
    const paymentMethod = body.payment_method || 'Cash on Delivery';

    if (paymentMethod === 'Cash on Delivery' && settings.cod_enabled !== 'true') {
      res.status(400).json({ error: 'Cash on Delivery is currently disabled by store administration.' });
      return;
    }

    let paymentNumber = '';
    let paymentStatus = 'Cash on Delivery';
    const cleanTrxId = (body.transaction_id || '').trim();
    const cleanSender = (body.sender_number || '').trim();

    if (paymentMethod === 'bKash' || paymentMethod === 'Nagad') {
      paymentNumber = paymentMethod === 'bKash' ? settings.bkash_number || '' : settings.nagad_number || '';
      if (!cleanSender) {
        res.status(400).json({ error: `Please enter the ${paymentMethod} sender mobile number.` });
        return;
      }
      if (!cleanTrxId || cleanTrxId.length < 5) {
        res.status(400).json({ error: `Please enter a valid ${paymentMethod} Transaction ID.` });
        return;
      }
      // Prevent duplicate transaction ID usage
      const dupTrx = db
        .prepare("SELECT order_id FROM orders WHERE LOWER(transaction_id) = LOWER(?) AND payment_status != 'Payment Rejected'")
        .get(cleanTrxId) as { order_id: string } | undefined;
      if (dupTrx) {
        res.status(409).json({
          error: `Transaction ID "${cleanTrxId}" has already been submitted for order ${dupTrx.order_id}.`,
        });
        return;
      }
      paymentStatus = 'Pending Verification';
    }

    const placeOrderTx = db.transaction(() => {
      let subtotal = 0;
      let totalCost = 0;
      const orderItems: Record<string, unknown>[] = [];

      for (const reqItem of body.items!) {
        const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 0));
        const prodRow = db.prepare('SELECT * FROM products WHERE id = ?').get(reqItem.productId) as
          | Record<string, unknown>
          | undefined;
        if (!prodRow || prodRow.status === 'Draft') {
          throw new Error(`Product ID ${reqItem.productId} is unavailable.`);
        }
        const prod = hydrateProduct(prodRow);
        const variantKey = `${reqItem.size || ''}|${reqItem.color || ''}`;
        const hasMatrix = Object.keys(prod.variant_stock).length > 0;
        const availableVariantStock = hasMatrix
          ? prod.variant_stock[variantKey] ?? 0
          : prod.stock_quantity;

        if (availableVariantStock < qty || prod.stock_quantity < qty) {
          throw new Error(
            `Insufficient stock for ${prod.name} (${reqItem.size || 'Std'} / ${reqItem.color || 'Default'}). Only ${availableVariantStock} left.`
          );
        }

        // Deduct stock atomically inside transaction
        const newVariantStock = { ...prod.variant_stock };
        if (hasMatrix) {
          newVariantStock[variantKey] = availableVariantStock - qty;
        }
        const newTotalStock = Math.max(0, prod.stock_quantity - qty);
        const newStatus = newTotalStock === 0 ? 'Out of Stock' : prod.status;

        db.prepare(
          `UPDATE products SET
            stock_quantity = ?,
            variant_stock = ?,
            status = ?,
            sales_count = sales_count + ?,
            updated_at = datetime('now')
           WHERE id = ?`
        ).run(newTotalStock, JSON.stringify(newVariantStock), newStatus, qty, prod.id);

        db.prepare(
          `INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          prod.id,
          prod.name,
          prod.sku,
          -qty,
          prod.stock_quantity,
          newTotalStock,
          variantKey,
          'Customer Order Deduction',
          body.customer_name!.trim()
        );

        const lineTotal = prod.effective_price * qty;
        subtotal += lineTotal;
        totalCost += prod.cost_price * qty;

        orderItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          image: prod.images[0] || '',
          size: reqItem.size || '',
          color: reqItem.color || '',
          quantity: qty,
          unitPrice: prod.effective_price,
          costPrice: prod.cost_price,
          lineTotal,
        });
      }

      // Coupon calculation
      let discountAmount = 0;
      let appliedCoupon = '';
      if (body.coupon_code?.trim()) {
        const coupon = db
          .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1')
          .get(body.coupon_code.trim()) as Record<string, unknown> | undefined;
        if (coupon && subtotal >= Number(coupon.min_order || 0)) {
          if (!coupon.expires_at || new Date(String(coupon.expires_at)).getTime() >= Date.now()) {
            appliedCoupon = String(coupon.code);
            if (coupon.discount_type === 'percent') {
              discountAmount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
              if (coupon.max_discount) {
                discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
              }
            } else {
              discountAmount = Math.min(subtotal, Number(coupon.discount_value));
            }
            db.prepare('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?').run(coupon.id);
          }
        }
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const parseSettingNum = (raw: string | undefined, fallback: number): number => {
        if (raw === undefined || raw === null || raw.trim() === '') return fallback;
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
      };
      const taxPercent = parseSettingNum(settings.tax_rate_percent, 0);
      const taxAmount = Math.round((afterDiscount * taxPercent) / 100);

      const freeThreshold = parseSettingNum(settings.free_delivery_threshold, 5000);
      const isDhaka = body.district!.trim().toLowerCase() === 'dhaka';
      const baseDelivery = isDhaka
        ? parseSettingNum(settings.delivery_charge_dhaka, 70)
        : parseSettingNum(settings.delivery_charge_outside, 130);
      const deliveryCharge = freeThreshold > 0 && afterDiscount >= freeThreshold ? 0 : baseDelivery;

      const totalAmount = afterDiscount + taxAmount + deliveryCharge;
      const estimatedProfit = Math.max(0, afterDiscount - totalCost);

      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = crypto.randomInt(1000, 9999);
      const orderId = `PHB-${datePart}-${randPart}`;

      db.prepare(
        `INSERT INTO orders (
          order_id, user_id, customer_name, customer_email, customer_phone, alt_phone,
          country, division, district, upazila, area, road_no, house_no, flat_no, postal_code,
          full_address, delivery_instructions, items, subtotal, discount_amount, coupon_code,
          tax_amount, delivery_charge, total_amount, estimated_profit,
          payment_method, payment_number, sender_number, transaction_id, payment_screenshot,
          payment_status, order_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
      ).run(
        orderId,
        req.user?.id || null,
        body.customer_name!.trim(),
        body.customer_email!.trim().toLowerCase(),
        body.customer_phone!.trim(),
        (body.alt_phone || '').trim(),
        (body.country || 'Bangladesh').trim(),
        (body.division || '').trim(),
        body.district!.trim(),
        (body.upazila || '').trim(),
        body.area!.trim(),
        (body.road_no || '').trim(),
        (body.house_no || '').trim(),
        (body.flat_no || '').trim(),
        (body.postal_code || '').trim(),
        body.full_address!.trim(),
        (body.delivery_instructions || '').trim(),
        JSON.stringify(orderItems),
        subtotal,
        discountAmount,
        appliedCoupon,
        taxAmount,
        deliveryCharge,
        totalAmount,
        estimatedProfit,
        paymentMethod,
        paymentNumber,
        cleanSender,
        cleanTrxId,
        body.payment_screenshot || '',
        paymentStatus
      );

      if (req.user?.id) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
      }

      return db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId) as Record<string, unknown>;
    });

    const createdOrder = placeOrderTx();
    res.status(201).json({
      ...createdOrder,
      items: safeJsonParse(createdOrder.items as string, []),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to place order';
    res.status(400).json({ error: message });
  }
});

app.get('/api/orders/my', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY id DESC')
    .all(req.user!.id, req.user!.email) as Record<string, unknown>[];

  res.json(
    rows.map((r) => ({
      ...r,
      items: safeJsonParse(r.items as string, []),
    }))
  );
});

app.get('/api/orders/track/:orderId', (req: Request, res: Response) => {
  const orderId = req.params.orderId.trim().toUpperCase();
  const row = db.prepare('SELECT * FROM orders WHERE UPPER(order_id) = ?').get(orderId) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Order ID not found. Please check your receipt.' });
    return;
  }
  res.json({
    order_id: row.order_id,
    customer_name: row.customer_name,
    district: row.district,
    area: row.area,
    items: safeJsonParse(row.items as string, []),
    subtotal: row.subtotal,
    discount_amount: row.discount_amount,
    tax_amount: row.tax_amount,
    delivery_charge: row.delivery_charge,
    total_amount: row.total_amount,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    transaction_id: row.transaction_id ? `***${String(row.transaction_id).slice(-4)}` : '',
    order_status: row.order_status,
    courier_name: row.courier_name,
    tracking_number: row.tracking_number,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

// ==========================================
// ADMIN DASHBOARD & ANALYTICS (REAL DB)
// ==========================================

app.get('/api/admin/dashboard', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const totalVisitors = (db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM visitors').get() as { c: number }).c;
  const liveActiveVisitors = (
    db
      .prepare("SELECT COUNT(DISTINCT session_id) as c FROM visitors WHERE last_seen_at >= datetime('now', '-5 minutes')")
      .get() as { c: number }
  ).c;
  const todayVisitors = (
    db
      .prepare("SELECT COUNT(DISTINCT session_id) as c FROM visitors WHERE date(visited_at) = date('now')")
      .get() as { c: number }
  ).c;
  const totalPageViews = (db.prepare('SELECT COUNT(*) as c FROM page_views').get() as { c: number }).c;

  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const totalCustomers = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get() as { c: number }
  ).c;

  const orderRows = db.prepare('SELECT * FROM orders').all() as Record<string, unknown>[];
  const totalOrders = orderRows.length;

  const statusCounts: Record<string, number> = {
    Pending: 0,
    Confirmed: 0,
    Processing: 0,
    Packed: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
    Returned: 0,
  };

  let totalSales = 0;
  let totalCogs = 0;
  let pendingPaymentsCount = 0;

  for (const o of orderRows) {
    const st = String(o.order_status);
    if (st in statusCounts) statusCounts[st]++;
    if (st !== 'Cancelled' && st !== 'Returned') {
      totalSales += Number(o.total_amount || 0);
      const items = safeJsonParse<{ costPrice?: number; quantity?: number }[]>(o.items as string, []);
      for (const it of items) {
        totalCogs += Number(it.costPrice || 0) * Number(it.quantity || 1);
      }
    }
    if (String(o.payment_status) === 'Pending Verification') {
      pendingPaymentsCount++;
    }
  }

  const totalExpenses = (db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM expenses').get() as { s: number }).s;
  const estimatedProfit = totalSales - totalCogs - totalExpenses;

  const allProducts = db.prepare('SELECT * FROM products').all() as Record<string, unknown>[];
  const hydratedProducts = allProducts.map(hydrateProduct);
  const lowStockProducts = hydratedProducts.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  );
  const outOfStockProducts = hydratedProducts.filter(
    (p) => p.stock_quantity === 0 || p.status === 'Out of Stock'
  );

  // Daily (last 7 days), Weekly (last 4 weeks), Monthly (last 6 months), Yearly (last 3 years)
  const dailySeries = db
    .prepare(
      `SELECT date(created_at) as label,
              COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN order_status NOT IN ('Cancelled', 'Returned') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY label ASC`
    )
    .all();

  const weeklySeries = db
    .prepare(
      `SELECT strftime('%Y-W%W', created_at) as label,
              COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN order_status NOT IN ('Cancelled', 'Returned') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders
       WHERE created_at >= datetime('now', '-28 days')
       GROUP BY strftime('%Y-W%W', created_at)
       ORDER BY label ASC`
    )
    .all();

  const monthlySeries = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) as label,
              COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN order_status NOT IN ('Cancelled', 'Returned') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders
       WHERE created_at >= datetime('now', '-180 days')
       GROUP BY strftime('%Y-%m', created_at)
       ORDER BY label ASC`
    )
    .all();

  const yearlySeries = db
    .prepare(
      `SELECT strftime('%Y', created_at) as label,
              COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN order_status NOT IN ('Cancelled', 'Returned') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders
       GROUP BY strftime('%Y', created_at)
       ORDER BY label ASC`
    )
    .all();

  const topProducts = [...hydratedProducts]
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      sales_count: p.sales_count,
      stock_quantity: p.stock_quantity,
      effective_price: p.effective_price,
      image: p.images[0] || '',
    }));

  res.json({
    visitors: {
      total: totalVisitors,
      liveActive: liveActiveVisitors,
      today: todayVisitors,
      pageViews: totalPageViews,
    },
    catalog: {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 8),
      outOfStockProducts: outOfStockProducts.slice(0, 8),
    },
    customers: {
      totalCustomers,
    },
    orders: {
      totalOrders,
      statusCounts,
      pendingPaymentsCount,
    },
    financials: {
      totalSales,
      totalCogs,
      totalExpenses,
      estimatedProfit,
    },
    charts: {
      daily: dailySeries,
      weekly: weeklySeries,
      monthly: monthlySeries,
      yearly: yearlySeries,
    },
    topProducts,
  });
});

// ==========================================
// ADMIN PRODUCT MANAGEMENT
// ==========================================

app.post('/api/admin/products', requireAdmin, (req: AuthedRequest, res: Response) => {
  try {
    const b = req.body as Record<string, unknown>;
    const name = String(b.name || '').trim();
    const sku = String(b.sku || '').trim();
    const regularPrice = Number(b.regular_price);
    const hasSalePrice = b.sale_price !== null && b.sale_price !== '' && b.sale_price !== undefined;
    const salePrice = hasSalePrice ? Number(b.sale_price) : null;

    if (!name || !sku) {
      res.status(400).json({ error: 'Product name and SKU are required.' });
      return;
    }
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      res.status(400).json({ error: 'Regular price must be greater than 0.' });
      return;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= regularPrice)) {
      res.status(400).json({ error: 'Discount price must be non-negative and less than the regular price.' });
      return;
    }

    const existingSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)').get(sku);
    if (existingSku) {
      res.status(409).json({ error: `SKU "${sku}" already exists.` });
      return;
    }

    const productCode = String(b.product_code || `PHB-${crypto.randomInt(1000, 9999)}`).trim();
    const existingCode = db.prepare('SELECT id FROM products WHERE LOWER(product_code) = LOWER(?)').get(productCode);
    if (existingCode) {
      res.status(409).json({ error: `Product ID "${productCode}" already exists.` });
      return;
    }

    const variantStock = (b.variant_stock as Record<string, number>) || {};
    const computedStock =
      Object.keys(variantStock).length > 0
        ? Object.values(variantStock).reduce((a, v) => a + Math.max(0, Number(v) || 0), 0)
        : Math.max(0, Math.floor(Number(b.stock_quantity) || 0));

    const status = computedStock === 0 && b.status === 'Active' ? 'Out of Stock' : String(b.status || 'Active');

    const result = db
      .prepare(
        `INSERT INTO products (
          product_code, sku, barcode, name, short_description, description,
          regular_price, sale_price, cost_price, category, subcategory, brand,
          images, video_url, sizes, colors, stock_quantity, variant_stock,
          low_stock_threshold, weight, material, pieces_info, warranty_info,
          specifications, features, tags, search_keywords, status,
          is_featured, is_bestseller, is_special_offer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        productCode,
        sku,
        String(b.barcode || ''),
        name,
        String(b.short_description || name),
        String(b.description || ''),
        regularPrice,
        salePrice,
        Number(b.cost_price || 0),
        String(b.category || 'Apparel'),
        String(b.subcategory || ''),
        String(b.brand || 'PRODUCT HUB BD'),
        JSON.stringify(b.images || []),
        String(b.video_url || ''),
        JSON.stringify(b.sizes ?? []),
        JSON.stringify(b.colors ?? []),
        computedStock,
        JSON.stringify(variantStock),
        Number(b.low_stock_threshold || 5),
        String(b.weight || ''),
        String(b.material || ''),
        String(b.pieces_info || ''),
        String(b.warranty_info || ''),
        JSON.stringify(b.specifications || []),
        JSON.stringify(b.features || []),
        JSON.stringify(b.tags || []),
        String(b.search_keywords || ''),
        status,
        b.is_featured ? 1 : 0,
        b.is_bestseller ? 1 : 0,
        b.is_special_offer ? 1 : 0
      );

    const newId = Number(result.lastInsertRowid);
    db.prepare(
      `INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
       VALUES (?, ?, ?, ?, 0, ?, 'ALL', 'Product Created', ?)`
    ).run(newId, name, sku, computedStock, computedStock, req.user!.username || req.user!.name);

    logActivity(req.user!.username || req.user!.name, 'Created Product', sku, name);
    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(newId) as Record<string, unknown>;
    res.status(201).json(hydrateProduct(created));
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    const nextName = String(b.name ?? existing.name).trim();
    const nextSku = String(b.sku ?? existing.sku).trim();
    const nextProductCode = String(b.product_code ?? existing.product_code).trim();
    const regularPrice = Number(b.regular_price ?? existing.regular_price);
    const hasSalePrice = b.sale_price !== null && b.sale_price !== '' && b.sale_price !== undefined;
    const salePrice =
      b.sale_price === undefined
        ? (existing.sale_price !== null ? Number(existing.sale_price) : null)
        : hasSalePrice
          ? Number(b.sale_price)
          : null;

    if (!nextName || !nextSku) {
      res.status(400).json({ error: 'Product name and SKU are required.' });
      return;
    }
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      res.status(400).json({ error: 'Regular price must be greater than 0.' });
      return;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= regularPrice)) {
      res.status(400).json({ error: 'Discount price must be non-negative and less than the regular price.' });
      return;
    }

    const dupSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?').get(nextSku, id);
    if (dupSku) {
      res.status(409).json({ error: `SKU "${nextSku}" is already used by another product.` });
      return;
    }
    const dupCode = db
      .prepare('SELECT id FROM products WHERE LOWER(product_code) = LOWER(?) AND id != ?')
      .get(nextProductCode, id);
    if (dupCode) {
      res.status(409).json({ error: `Product ID "${nextProductCode}" is already used by another product.` });
      return;
    }

    const variantStock: Record<string, number> =
      b.variant_stock !== undefined
        ? (b.variant_stock as Record<string, number>)
        : safeJsonParse<Record<string, number>>(existing.variant_stock as string, {});
    const computedStock: number =
      Object.keys(variantStock).length > 0
        ? Object.values(variantStock).reduce<number>((a, v) => a + Math.max(0, Number(v) || 0), 0)
        : Math.max(0, Math.floor(Number(b.stock_quantity ?? existing.stock_quantity)));

    const prevStock = Number(existing.stock_quantity || 0);
    const nextStatus =
      b.status === 'Draft'
        ? 'Draft'
        : computedStock === 0
          ? 'Out of Stock'
          : String(b.status || existing.status || 'Active');

    db.prepare(
      `UPDATE products SET
        product_code = ?, sku = ?, barcode = ?, name = ?, short_description = ?, description = ?,
        regular_price = ?, sale_price = ?, cost_price = ?, category = ?, subcategory = ?, brand = ?,
        images = ?, video_url = ?, sizes = ?, colors = ?, stock_quantity = ?, variant_stock = ?,
        low_stock_threshold = ?, weight = ?, material = ?, pieces_info = ?, warranty_info = ?,
        specifications = ?, features = ?, tags = ?, search_keywords = ?, status = ?,
        is_featured = ?, is_bestseller = ?, is_special_offer = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextProductCode,
      nextSku,
      String(b.barcode ?? existing.barcode),
      nextName,
      String(b.short_description ?? existing.short_description),
      String(b.description ?? existing.description),
      regularPrice,
      salePrice,
      Number(b.cost_price ?? existing.cost_price),
      String(b.category ?? existing.category),
      String(b.subcategory ?? existing.subcategory),
      String(b.brand ?? existing.brand),
      JSON.stringify(b.images ?? safeJsonParse(existing.images as string, [])),
      String(b.video_url ?? existing.video_url),
      JSON.stringify(b.sizes ?? safeJsonParse(existing.sizes as string, [])),
      JSON.stringify(b.colors ?? safeJsonParse(existing.colors as string, [])),
      computedStock,
      JSON.stringify(variantStock),
      Number(b.low_stock_threshold ?? existing.low_stock_threshold),
      String(b.weight ?? existing.weight),
      String(b.material ?? existing.material),
      String(b.pieces_info ?? existing.pieces_info ?? ''),
      String(b.warranty_info ?? existing.warranty_info ?? ''),
      JSON.stringify(b.specifications ?? safeJsonParse(existing.specifications as string, [])),
      JSON.stringify(b.features ?? safeJsonParse(existing.features as string, [])),
      JSON.stringify(b.tags ?? safeJsonParse(existing.tags as string, [])),
      String(b.search_keywords ?? existing.search_keywords),
      nextStatus,
      b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : existing.is_featured,
      b.is_bestseller !== undefined ? (b.is_bestseller ? 1 : 0) : existing.is_bestseller,
      b.is_special_offer !== undefined ? (b.is_special_offer ? 1 : 0) : existing.is_special_offer,
      id
    );

    if (computedStock !== prevStock) {
      db.prepare(
        `INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
         VALUES (?, ?, ?, ?, ?, ?, 'ALL', 'Product Edit Stock Sync', ?)`
      ).run(
        id,
        nextName,
        nextSku,
        computedStock - prevStock,
        prevStock,
        computedStock,
        req.user!.username || req.user!.name
      );
    }

    logActivity(req.user!.username || req.user!.name, 'Updated Product', nextSku, nextName);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown>;
    res.json(hydrateProduct(updated));
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.post('/api/admin/products/:id/duplicate', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const suffix = crypto.randomInt(100, 999);
  const newSku = `${existing.sku}-COPY-${suffix}`;
  const newCode = `PHB-${crypto.randomInt(1000, 9999)}`;
  const result = db
    .prepare(
      `INSERT INTO products (
        product_code, sku, barcode, name, short_description, description,
        regular_price, sale_price, cost_price, category, subcategory, brand,
        images, video_url, sizes, colors, stock_quantity, variant_stock,
        low_stock_threshold, weight, material, pieces_info, warranty_info,
        specifications, features, tags, search_keywords, status,
        is_featured, is_bestseller, is_special_offer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', 0, 0, 0)`
    )
    .run(
      newCode,
      newSku,
      existing.barcode,
      `${existing.name} (Copy)`,
      existing.short_description,
      existing.description,
      existing.regular_price,
      existing.sale_price,
      existing.cost_price,
      existing.category,
      existing.subcategory,
      existing.brand,
      existing.images,
      existing.video_url,
      existing.sizes,
      existing.colors,
      existing.stock_quantity,
      existing.variant_stock,
      existing.low_stock_threshold,
      existing.weight,
      existing.material,
      existing.pieces_info || '',
      existing.warranty_info || '',
      existing.specifications,
      existing.features,
      existing.tags,
      existing.search_keywords
    );
  logActivity(req.user!.username || req.user!.name, 'Duplicated Product', newSku, `${existing.name}`);
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  res.status(201).json(hydrateProduct(created));
});

app.delete('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(id) as
    | { name: string; sku: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  logActivity(req.user!.username || req.user!.name, 'Deleted Product', existing.sku, existing.name);
  res.json({ ok: true });
});

app.post('/api/admin/products/import', requireAdmin, (req: AuthedRequest, res: Response) => {
  try {
    const { products: rows } = req.body as { products?: Record<string, unknown>[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No product records provided for import.' });
      return;
    }
    let imported = 0;
    const tx = db.transaction(() => {
      for (const r of rows) {
        const name = String(r.name || '').trim();
        const sku = String(r.sku || '').trim();
        if (!name || !sku) continue;
        const exists = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
        if (exists) continue;
        const qty = Math.max(0, Number(r.stock_quantity || 10));
        db.prepare(
          `INSERT INTO products (
            product_code, sku, name, short_description, description,
            regular_price, sale_price, cost_price, category, brand,
            images, sizes, colors, stock_quantity, variant_stock, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `PHB-${crypto.randomInt(1000, 9999)}`,
          sku,
          name,
          String(r.short_description || name),
          String(r.description || name),
          Number(r.regular_price || 1000),
          r.sale_price ? Number(r.sale_price) : null,
          Number(r.cost_price || 500),
          String(r.category || 'Apparel'),
          String(r.brand || 'PRODUCT HUB BD'),
          JSON.stringify([r.image || '/src/assets/images/product_oxford_shirt_1795097543187.jpg']),
          JSON.stringify(['S', 'M', 'L', 'XL']),
          JSON.stringify([{ name: 'Charcoal', hex: '#2F3337' }]),
          qty,
          JSON.stringify({ 'M|Charcoal': qty }),
          qty > 0 ? 'Active' : 'Out of Stock'
        );
        imported++;
      }
    });
    tx();
    logActivity(req.user!.username || req.user!.name, 'Bulk Imported Products', `${imported} items`);
    res.json({ imported });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ==========================================
// ADMIN CATEGORIES & COUPONS
// ==========================================

app.post('/api/admin/categories', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { name, subcategories, description, image } = req.body as {
    name?: string;
    subcategories?: string[];
    description?: string;
    image?: string;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  try {
    const result = db
      .prepare('INSERT INTO categories (name, slug, subcategories, description, image) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), slug, JSON.stringify(subcategories || []), description || '', image || '');
    logActivity(req.user!.username || req.user!.name, 'Created Category', name.trim());
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), slug });
  } catch {
    res.status(409).json({ error: 'Category already exists' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { name, subcategories, description, image } = req.body as {
    name?: string;
    subcategories?: string[];
    description?: string;
    image?: string;
  };
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const newName = (name || String(existing.name)).trim();
  const slug = newName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  db.prepare('UPDATE categories SET name = ?, slug = ?, subcategories = ?, description = ?, image = ? WHERE id = ?').run(
    newName,
    slug,
    JSON.stringify(subcategories ?? safeJsonParse(existing.subcategories as string, [])),
    description ?? existing.description,
    image ?? existing.image,
    id
  );
  if (newName !== existing.name) {
    db.prepare('UPDATE products SET category = ? WHERE category = ?').run(newName, existing.name);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/coupons', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

app.post('/api/admin/coupons', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { code, discount_type, discount_value, min_order, max_discount, expires_at } = req.body as Record<
    string,
    unknown
  >;
  if (!code || !discount_value) {
    res.status(400).json({ error: 'Coupon code and discount value required' });
    return;
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(code).trim().toUpperCase(),
        String(discount_type || 'percent'),
        Number(discount_value),
        Number(min_order || 0),
        max_discount ? Number(max_discount) : null,
        String(expires_at || '')
      );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch {
    res.status(409).json({ error: 'Coupon code already exists' });
  }
});

app.put('/api/admin/coupons/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { is_active } = req.body as { is_active?: boolean };
  db.prepare('UPDATE coupons SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ==========================================
// ADMIN ORDERS & PAYMENT VERIFICATION
// ==========================================

app.get('/api/admin/orders', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { search, orderStatus, paymentStatus } = req.query as Record<string, string | undefined>;
  let rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Record<string, unknown>[];
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.order_id).toLowerCase().includes(q) ||
        String(r.customer_name).toLowerCase().includes(q) ||
        String(r.customer_phone).toLowerCase().includes(q) ||
        String(r.transaction_id || '').toLowerCase().includes(q)
    );
  }
  if (orderStatus && orderStatus !== 'all') {
    rows = rows.filter((r) => r.order_status === orderStatus);
  }
  if (paymentStatus && paymentStatus !== 'all') {
    rows = rows.filter((r) => r.payment_status === paymentStatus);
  }
  res.json(
    rows.map((r) => ({
      ...r,
      items: safeJsonParse(r.items as string, []),
    }))
  );
});

app.post('/api/admin/orders/:id/verify-payment', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { action, admin_note } = req.body as { action?: 'approve' | 'reject'; admin_note?: string };
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({ error: 'Invalid payment verification action' });
    return;
  }
  const newPaymentStatus = action === 'approve' ? 'Payment Verified' : 'Payment Rejected';
  const nextOrderStatus =
    action === 'approve' && order.order_status === 'Pending' ? 'Confirmed' : String(order.order_status);

  db.prepare(
    `UPDATE orders SET payment_status = ?, order_status = ?, admin_note = COALESCE(?, admin_note), updated_at = datetime('now') WHERE id = ?`
  ).run(newPaymentStatus, nextOrderStatus, admin_note ?? null, id);

  logActivity(
    req.user!.username || req.user!.name,
    action === 'approve' ? 'Approved Manual Payment' : 'Rejected Manual Payment',
    String(order.order_id),
    `${order.payment_method} TrxID: ${order.transaction_id}`
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>;
  res.json({ ...updated, items: safeJsonParse(updated.items as string, []) });
});

app.put('/api/admin/orders/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const { order_status, courier_name, tracking_number, refund_status, admin_note } = req.body as {
      order_status?: string;
      courier_name?: string;
      tracking_number?: string;
      refund_status?: string;
      admin_note?: string;
    };

    const prevStatus = String(existing.order_status);
    const nextStatus = order_status || prevStatus;
    const isRestoringStatus = nextStatus === 'Cancelled' || nextStatus === 'Returned';
    const wasRestoringStatus = prevStatus === 'Cancelled' || prevStatus === 'Returned';

    const updateTx = db.transaction(() => {
      db.prepare(
        `UPDATE orders SET
          order_status = ?,
          courier_name = COALESCE(?, courier_name),
          tracking_number = COALESCE(?, tracking_number),
          refund_status = COALESCE(?, refund_status),
          admin_note = COALESCE(?, admin_note),
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        nextStatus,
        courier_name ?? null,
        tracking_number ?? null,
        refund_status ?? null,
        admin_note ?? null,
        id
      );

      // Restore stock automatically if cancelled or returned
      if (isRestoringStatus && !wasRestoringStatus) {
        const items = safeJsonParse<
          { productId: number; size: string; color: string; quantity: number }[]
        >(existing.items as string, []);
        for (const it of items) {
          const prodRow = db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId) as
            | Record<string, unknown>
            | undefined;
          if (!prodRow) continue;
          const variantStock = safeJsonParse<Record<string, number>>(prodRow.variant_stock as string, {});
          const key = `${it.size || ''}|${it.color || ''}`;
          if (Object.keys(variantStock).length > 0) {
            variantStock[key] = (variantStock[key] || 0) + it.quantity;
          }
          const prevQty = Number(prodRow.stock_quantity || 0);
          const nextQty = prevQty + it.quantity;
          const nextProdStatus = prodRow.status === 'Out of Stock' && nextQty > 0 ? 'Active' : String(prodRow.status);
          db.prepare(
            `UPDATE products SET stock_quantity = ?, variant_stock = ?, status = ?, sales_count = MAX(0, sales_count - ?) WHERE id = ?`
          ).run(nextQty, JSON.stringify(variantStock), nextProdStatus, it.quantity, it.productId);

          db.prepare(
            `INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            it.productId,
            String(prodRow.name),
            String(prodRow.sku),
            it.quantity,
            prevQty,
            nextQty,
            key,
            `Stock Restored (${nextStatus}: ${existing.order_id})`,
            req.user!.username || req.user!.name
          );
        }
      }
    });

    updateTx();
    logActivity(
      req.user!.username || req.user!.name,
      'Updated Order',
      String(existing.order_id),
      `Status: ${prevStatus} → ${nextStatus}`
    );

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>;
    res.json({ ...updated, items: safeJsonParse(updated.items as string, []) });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ==========================================
// ADMIN INVENTORY, CUSTOMERS, REPORTS & SETTINGS
// ==========================================

app.get('/api/admin/inventory/history', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM stock_history ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

app.post('/api/admin/inventory/adjust', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { productId, variantKey, newVariantQty, reason } = req.body as {
    productId?: number;
    variantKey?: string;
    newVariantQty?: number;
    reason?: string;
  };
  const prodRow = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(productId)) as
    | Record<string, unknown>
    | undefined;
  if (!prodRow) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const qty = Math.max(0, Math.floor(Number(newVariantQty) || 0));
  const variantStock = safeJsonParse<Record<string, number>>(prodRow.variant_stock as string, {});
  const prevTotal = Number(prodRow.stock_quantity || 0);
  let nextTotal = qty;

  if (variantKey && Object.keys(variantStock).length > 0) {
    variantStock[variantKey] = qty;
    nextTotal = Object.values(variantStock).reduce((a, v) => a + Math.max(0, Number(v) || 0), 0);
  }

  const nextStatus = nextTotal === 0 ? 'Out of Stock' : prodRow.status === 'Out of Stock' ? 'Active' : String(prodRow.status);
  db.prepare(
    `UPDATE products SET stock_quantity = ?, variant_stock = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(nextTotal, JSON.stringify(variantStock), nextStatus, Number(productId));

  db.prepare(
    `INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    Number(productId),
    String(prodRow.name),
    String(prodRow.sku),
    nextTotal - prevTotal,
    prevTotal,
    nextTotal,
    variantKey || 'ALL',
    (reason || 'Manual Inventory Adjustment').trim(),
    req.user!.username || req.user!.name
  );

  logActivity(
    req.user!.username || req.user!.name,
    'Adjusted Stock',
    String(prodRow.sku),
    `${variantKey || 'Total'}: ${prevTotal} → ${nextTotal}`
  );
  res.json({ ok: true, stock_quantity: nextTotal, variant_stock: variantStock });
});

app.get('/api/admin/customers', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const users = db
    .prepare(
      `SELECT id, name, email, phone, district, area, address, status, created_at
       FROM users WHERE role = 'customer' ORDER BY id DESC`
    )
    .all() as Record<string, unknown>[];

  const orders = db.prepare('SELECT user_id, customer_email, total_amount, order_status FROM orders').all() as {
    user_id: number | null;
    customer_email: string;
    total_amount: number;
    order_status: string;
  }[];

  res.json(
    users.map((u) => {
      const custOrders = orders.filter(
        (o) => o.user_id === u.id || o.customer_email.toLowerCase() === String(u.email).toLowerCase()
      );
      const totalSpent = custOrders
        .filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
        .reduce((a, o) => a + Number(o.total_amount || 0), 0);
      return {
        ...u,
        order_count: custOrders.length,
        total_spent: totalSpent,
      };
    })
  );
});

app.put('/api/admin/customers/:id/status', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { status } = req.body as { status?: 'active' | 'suspended' };
  db.prepare('UPDATE users SET status = ? WHERE id = ? AND role = ?').run(
    status === 'suspended' ? 'suspended' : 'active',
    Number(req.params.id),
    'customer'
  );
  res.json({ ok: true });
});

app.get('/api/admin/messages', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all());
});

app.put('/api/admin/messages/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { status, reply_note } = req.body as { status?: string; reply_note?: string };
  db.prepare('UPDATE contact_messages SET status = COALESCE(?, status), reply_note = COALESCE(?, reply_note) WHERE id = ?').run(
    status ?? null,
    reply_note ?? null,
    Number(req.params.id)
  );
  res.json({ ok: true });
});

app.get('/api/admin/expenses', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC').all());
});

app.post('/api/admin/expenses', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { title, category, amount, expense_date, note } = req.body as Record<string, unknown>;
  if (!title || !amount) {
    res.status(400).json({ error: 'Expense title and amount are required.' });
    return;
  }
  const result = db
    .prepare('INSERT INTO expenses (title, category, amount, expense_date, note) VALUES (?, ?, ?, ?, ?)')
    .run(
      String(title).trim(),
      String(category || 'Operations'),
      Number(amount),
      String(expense_date || new Date().toISOString().slice(0, 10)),
      String(note || '')
    );
  logActivity(req.user!.username || req.user!.name, 'Logged Expense', String(title), `৳${amount}`);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/admin/expenses/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/reports', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  let orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Record<string, unknown>[];
  let expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all() as Record<string, unknown>[];

  if (from) {
    orders = orders.filter((o) => String(o.created_at).slice(0, 10) >= from);
    expenses = expenses.filter((e) => String(e.expense_date) >= from);
  }
  if (to) {
    orders = orders.filter((o) => String(o.created_at).slice(0, 10) <= to);
    expenses = expenses.filter((e) => String(e.expense_date) <= to);
  }

  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned');
  const revenue = validOrders.reduce((a, o) => a + Number(o.total_amount || 0), 0);
  const cogs = validOrders.reduce((acc, o) => {
    const items = safeJsonParse<{ costPrice?: number; quantity?: number }[]>(o.items as string, []);
    return acc + items.reduce((s, it) => s + Number(it.costPrice || 0) * Number(it.quantity || 1), 0);
  }, 0);
  const expenseTotal = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);

  const paymentBreakdown = {
    bKash: orders.filter((o) => o.payment_method === 'bKash').length,
    Nagad: orders.filter((o) => o.payment_method === 'Nagad').length,
    COD: orders.filter((o) => o.payment_method === 'Cash on Delivery').length,
    verifiedCount: orders.filter((o) => o.payment_status === 'Payment Verified').length,
    pendingCount: orders.filter((o) => o.payment_status === 'Pending Verification').length,
    rejectedCount: orders.filter((o) => o.payment_status === 'Payment Rejected').length,
  };

  res.json({
    summary: {
      totalOrders: orders.length,
      validOrders: validOrders.length,
      cancelledOrReturned: orders.length - validOrders.length,
      revenue,
      cogs,
      expenses: expenseTotal,
      netProfit: revenue - cogs - expenseTotal,
    },
    paymentBreakdown,
    orders: orders.map((o) => ({ ...o, items: safeJsonParse(o.items as string, []) })),
    expenses,
  });
});

app.put('/api/admin/settings', requireAdmin, (req: AuthedRequest, res: Response) => {
  const updates = req.body as Record<string, unknown>;
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const numericKeys = new Set([
    'delivery_charge_dhaka',
    'delivery_charge_outside',
    'free_delivery_threshold',
    'tax_rate_percent',
  ]);

  const tx = db.transaction(() => {
    for (const [k, rawVal] of Object.entries(updates)) {
      if (rawVal === undefined || rawVal === null) continue;
      let val = String(rawVal);
      if (k === 'cod_enabled') {
        val = val === 'true' ? 'true' : 'false';
      } else if (numericKeys.has(k)) {
        const num = Number(val);
        val = Number.isFinite(num) && num >= 0 ? String(num) : '0';
      } else {
        val = val.trim();
      }
      upsert.run(k, val);
    }
  });
  tx();
  logActivity(
    req.user!.username || req.user!.name,
    'Updated Website Settings',
    `${Object.keys(updates).length} settings saved`
  );
  res.json(getSettingsMap());
});

app.get('/api/admin/activity-logs', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 150').all());
});

function buildStoreBackupSnapshot(exportedBy: string) {
  const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all() as Record<string, unknown>[];
  const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all() as Record<string, unknown>[];
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id ASC').all() as Record<string, unknown>[];
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Record<string, unknown>[];
  const users = db
    .prepare(
      `SELECT id, username, name, email, phone, alt_phone, country, division, district, upazila, area, road_no, house_no, flat_no, postal_code, address, saved_addresses, role, status, created_at
       FROM users ORDER BY id ASC`
    )
    .all() as Record<string, unknown>[];
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY id DESC').all() as Record<string, unknown>[];
  const contactMessages = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all() as Record<string, unknown>[];
  const newsletterSubscribers = db
    .prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC')
    .all() as Record<string, unknown>[];
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC').all() as Record<string, unknown>[];
  const stockHistory = db.prepare('SELECT * FROM stock_history ORDER BY id DESC').all() as Record<string, unknown>[];
  const visitors = db.prepare('SELECT * FROM visitors ORDER BY id DESC').all() as Record<string, unknown>[];
  const pageViews = db.prepare('SELECT * FROM page_views ORDER BY id DESC').all() as Record<string, unknown>[];
  const activityLogs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC').all() as Record<string, unknown>[];
  const settingsMap = getSettingsMap();

  return {
    exported_at: new Date().toISOString(),
    exported_by: exportedBy,
    summary: {
      categories: categories.length,
      products: products.length,
      coupons: coupons.length,
      orders: orders.length,
      users: users.length,
      reviews: reviews.length,
      contact_messages: contactMessages.length,
      newsletter_subscribers: newsletterSubscribers.length,
      expenses: expenses.length,
      stock_history: stockHistory.length,
      visitors: visitors.length,
      page_views: pageViews.length,
      activity_logs: activityLogs.length,
    },
    settings: settingsMap,
    categories: categories.map((c) => ({
      ...c,
      subcategories: safeJsonParse(c.subcategories as string, []),
    })),
    products: products.map((p) => hydrateProduct(p)),
    coupons,
    orders: orders.map((o) => ({
      ...o,
      items: safeJsonParse(o.items as string, []),
    })),
    users: users.map((u) => ({
      ...u,
      saved_addresses: safeJsonParse(u.saved_addresses as string, []),
    })),
    reviews,
    contact_messages: contactMessages,
    newsletter_subscribers: newsletterSubscribers,
    expenses,
    stock_history: stockHistory,
    visitors,
    page_views: pageViews,
    activity_logs: activityLogs,
  };
}

function buildCsvContent(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  return `\uFEFF${lines.join('\r\n')}`;
}

function addDirectoryToZip(zipFolder: JSZip, diskDir: string, excludeNames: Set<string>): number {
  let fileCount = 0;
  if (!fs.existsSync(diskDir)) return 0;
  const entries = fs.readdirSync(diskDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeNames.has(entry.name)) continue;
    const fullPath = path.join(diskDir, entry.name);
    if (entry.isDirectory()) {
      const sub = zipFolder.folder(entry.name);
      if (sub) {
        fileCount += addDirectoryToZip(sub, fullPath, excludeNames);
      }
    } else if (entry.isFile()) {
      zipFolder.file(entry.name, fs.readFileSync(fullPath));
      fileCount += 1;
    }
  }
  return fileCount;
}

app.get('/api/admin/backup', requireAdmin, (req: AuthedRequest, res: Response) => {
  const actor = req.user!.username || req.user!.name;
  const snapshot = buildStoreBackupSnapshot(actor);
  logActivity(actor, 'Exported Full Store Backup (JSON)');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="product-hub-bd-full-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.json(snapshot);
});

app.get('/api/admin/full-website-archive', requireAdmin, async (req: AuthedRequest, res: Response) => {
  const actor = req.user!.username || req.user!.name;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const tempSqlite = path.join(os.tmpdir(), `phb-backup-${Date.now()}-${crypto.randomInt(1000, 9999)}.sqlite`);

  try {
    const snapshot = buildStoreBackupSnapshot(actor);
    const zip = new JSZip();

    // 1. Complete JSON & binary SQLite Database Snapshot
    const dbFolder = zip.folder('database');
    if (dbFolder) {
      dbFolder.file('complete-store-data.json', JSON.stringify(snapshot, null, 2));
      try {
        await db.backup(tempSqlite);
        if (fs.existsSync(tempSqlite)) {
          dbFolder.file('product_hub_bd.sqlite', fs.readFileSync(tempSqlite));
        }
      } catch (backupErr) {
        console.warn('SQLite live backup skipped:', backupErr);
      }
    }

    // 2. Excel-ready CSV spreadsheets
    const csvFolder = zip.folder('excel-csv');
    if (csvFolder) {
      csvFolder.file(
        'products.csv',
        buildCsvContent(
          [
            'ID',
            'Product Code',
            'SKU',
            'Name',
            'Category',
            'Subcategory',
            'Brand',
            'Regular Price',
            'Discount Price',
            'Purchase Price',
            'Stock',
            'Pieces Info',
            'Weight',
            'Warranty',
            'Status',
            'Created At',
          ],
          snapshot.products.map((p) => [
            p.id,
            p.product_code,
            p.sku,
            p.name,
            p.category,
            p.subcategory,
            p.brand,
            p.regular_price,
            p.sale_price ?? '',
            p.cost_price,
            p.stock_quantity,
            p.pieces_info,
            p.weight,
            p.warranty_info,
            p.status,
            p.created_at,
          ])
        )
      );
      csvFolder.file(
        'orders.csv',
        buildCsvContent(
          ['Order ID', 'Customer', 'Phone', 'Email', 'District', 'Area', 'Full Address', 'Payment Method', 'Payment Status', 'Order Status', 'TrxID', 'Total', 'Date'],
          snapshot.orders.map((row) => {
            const o = row as Record<string, unknown>;
            return [
              String(o.order_id ?? ''),
              String(o.customer_name ?? ''),
              String(o.customer_phone ?? ''),
              String(o.customer_email ?? ''),
              String(o.district ?? ''),
              String(o.area ?? ''),
              String(o.full_address ?? ''),
              String(o.payment_method ?? ''),
              String(o.payment_status ?? ''),
              String(o.order_status ?? ''),
              String(o.transaction_id ?? ''),
              Number(o.total_amount ?? 0),
              String(o.created_at ?? ''),
            ];
          })
        )
      );
      csvFolder.file(
        'customers.csv',
        buildCsvContent(
          ['ID', 'Name', 'Email', 'Phone', 'District', 'Area', 'Address', 'Role', 'Status', 'Created At'],
          snapshot.users.map((row) => {
            const u = row as Record<string, unknown>;
            return [
              Number(u.id ?? 0),
              String(u.name ?? ''),
              String(u.email ?? ''),
              String(u.phone ?? ''),
              String(u.district ?? ''),
              String(u.area ?? ''),
              String(u.address ?? ''),
              String(u.role ?? ''),
              String(u.status ?? ''),
              String(u.created_at ?? ''),
            ];
          })
        )
      );
      csvFolder.file(
        'categories.csv',
        buildCsvContent(
          ['ID', 'Name', 'Subcategories', 'Description', 'Image URL'],
          snapshot.categories.map((c) => {
            const record = c as Record<string, unknown>;
            return [
              Number(record.id ?? 0),
              String(record.name ?? ''),
              Array.isArray(record.subcategories) ? record.subcategories.join('; ') : '',
              String(record.description ?? ''),
              String(record.image ?? ''),
            ];
          })
        )
      );
      csvFolder.file(
        'website-settings.csv',
        buildCsvContent(
          ['Setting Key', 'Setting Value'],
          Object.entries(snapshot.settings).map(([k, v]) => [k, v])
        )
      );
      csvFolder.file(
        'expenses.csv',
        buildCsvContent(
          ['ID', 'Title', 'Category', 'Amount', 'Date', 'Note'],
          snapshot.expenses.map((ex) => [
            Number(ex.id ?? 0),
            String(ex.title ?? ''),
            String(ex.category ?? ''),
            Number(ex.amount ?? 0),
            String(ex.expense_date ?? ''),
            String(ex.note ?? ''),
          ])
        )
      );
      csvFolder.file(
        'stock-history.csv',
        buildCsvContent(
          ['ID', 'Product ID', 'Product Name', 'SKU', 'Variant', 'Change', 'Prev Stock', 'New Stock', 'Reason', 'Admin', 'Date'],
          snapshot.stock_history.map((h) => [
            Number(h.id ?? 0),
            Number(h.product_id ?? 0),
            String(h.product_name ?? ''),
            String(h.sku ?? ''),
            String(h.variant_key ?? ''),
            Number(h.change_amount ?? 0),
            Number(h.previous_stock ?? 0),
            Number(h.new_stock ?? 0),
            String(h.reason ?? ''),
            String(h.admin_name ?? ''),
            String(h.created_at ?? ''),
          ])
        )
      );
      csvFolder.file(
        'contact-messages.csv',
        buildCsvContent(
          ['ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Created At'],
          snapshot.contact_messages.map((m) => [
            Number(m.id ?? 0),
            String(m.name ?? ''),
            String(m.email ?? ''),
            String(m.phone ?? ''),
            String(m.subject ?? ''),
            String(m.message ?? ''),
            String(m.status ?? ''),
            String(m.created_at ?? ''),
          ])
        )
      );
      csvFolder.file(
        'newsletter-subscribers.csv',
        buildCsvContent(
          ['ID', 'Email', 'Subscribed At'],
          snapshot.newsletter_subscribers.map((s) => [
            Number(s.id ?? 0),
            String(s.email ?? ''),
            String(s.created_at ?? ''),
          ])
        )
      );
    }

    // 3. Uploaded media assets (images, videos, payment screenshots, logos)
    const uploadsFolder = zip.folder('uploads');
    const uploadedFilesCount = uploadsFolder ? addDirectoryToZip(uploadsFolder, UPLOADS_DIR, new Set()) : 0;

    // 4. Complete Website Application Source Code
    const sourceFolder = zip.folder('website-source');
    let sourceFilesCount = 0;
    if (sourceFolder) {
      const rootDir = process.cwd();
      const skipTop = new Set(['node_modules', '.git', 'dist', 'data']);
      const srcSub = sourceFolder.folder('src');
      if (srcSub) sourceFilesCount += addDirectoryToZip(srcSub, path.join(rootDir, 'src'), skipTop);
      const srvSub = sourceFolder.folder('server');
      if (srvSub) sourceFilesCount += addDirectoryToZip(srvSub, path.join(rootDir, 'server'), skipTop);
      const pubDir = path.join(rootDir, 'public');
      if (fs.existsSync(pubDir)) {
        const pubSub = sourceFolder.folder('public');
        if (pubSub) sourceFilesCount += addDirectoryToZip(pubSub, pubDir, skipTop);
      }
      for (const rootFile of [
        'server.ts',
        'index.html',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'metadata.json',
        '.env.example',
        'Dockerfile',
        'render.yaml',
      ]) {
        const fp = path.join(rootDir, rootFile);
        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
          sourceFolder.file(rootFile, fs.readFileSync(fp));
          sourceFilesCount += 1;
        }
      }
    }

    // 5. README manifest inside archive
    zip.file(
      'README.txt',
      [
        'PRODUCT HUB BD — COMPLETE WEBSITE & DATA ARCHIVE',
        `Exported At: ${snapshot.exported_at}`,
        `Exported By: ${actor}`,
        '',
        'CONTENTS:',
        '1. database/complete-store-data.json  -> Complete JSON backup of all 14 tables & 34 website settings',
        '2. database/product_hub_bd.sqlite     -> Full binary SQLite database snapshot',
        '3. excel-csv/*.csv                    -> Excel-ready UTF-8 spreadsheets (Products, Orders, Customers, etc.)',
        `4. uploads/                           -> ${uploadedFilesCount} uploaded media files (images, videos, payment proofs)`,
        `5. website-source/                    -> ${sourceFilesCount} complete application source files (Frontend + Backend)`,
        '',
        'SUMMARY COUNTS:',
        ...Object.entries(snapshot.summary).map(([k, v]) => `- ${k}: ${v}`),
      ].join('\n')
    );

    const archiveBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    logActivity(actor, 'Downloaded Complete Website Archive (.ZIP)');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="product-hub-bd-complete-website-${dateStamp}.zip"`
    );
    res.setHeader('Content-Length', String(archiveBuffer.length));
    res.send(archiveBuffer);
  } catch (err) {
    console.error('Full website archive error:', err);
    res.status(500).json({ error: 'Failed to generate complete website archive' });
  } finally {
    if (fs.existsSync(tempSqlite)) {
      try {
        fs.unlinkSync(tempSqlite);
      } catch {
        // ignore cleanup error
      }
    }
  }
});

app.post('/api/admin/restore', requireAdmin, async (req: AuthedRequest, res: Response) => {
  const actor = req.user!.username || req.user!.name;
  try {
    let snapshot: Record<string, unknown> | null = null;
    let restoredUploadFiles = 0;

    if (typeof req.body?.zipBase64 === 'string' && req.body.zipBase64.trim()) {
      const b64 = req.body.zipBase64.includes('base64,')
        ? req.body.zipBase64.split('base64,')[1]
        : req.body.zipBase64;
      const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
      const jsonFile = zip.file('database/complete-store-data.json');
      if (!jsonFile) {
        res.status(400).json({ error: 'ZIP archive does not contain database/complete-store-data.json.' });
        return;
      }
      snapshot = JSON.parse(await jsonFile.async('string')) as Record<string, unknown>;

      // Restore any uploaded media files inside uploads/ safely
      for (const [entryPath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir || !entryPath.startsWith('uploads/')) continue;
        const safeRel = path.basename(entryPath);
        if (!safeRel || safeRel === '.' || safeRel === '..') continue;
        const dest = path.join(UPLOADS_DIR, safeRel);
        fs.writeFileSync(dest, await zipEntry.async('nodebuffer'));
        restoredUploadFiles += 1;
      }
    } else if (req.body && typeof req.body === 'object') {
      snapshot = req.body as Record<string, unknown>;
    }

    if (!snapshot || (!snapshot.products && !snapshot.settings && !snapshot.categories)) {
      res.status(400).json({ error: 'Invalid backup payload. Please select a valid .json or .zip store backup.' });
      return;
    }

    const counts = {
      settings: 0,
      categories: 0,
      coupons: 0,
      products: 0,
      orders: 0,
      uploadedFiles: restoredUploadFiles,
    };

    const runRestore = db.transaction(() => {
      if (snapshot!.settings && typeof snapshot!.settings === 'object') {
        const upsertSet = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const [k, v] of Object.entries(snapshot!.settings as Record<string, unknown>)) {
          if (k) {
            upsertSet.run(String(k), String(v ?? ''));
            counts.settings += 1;
          }
        }
      }

      if (Array.isArray(snapshot!.categories)) {
        const upsertCat = db.prepare(
          `INSERT INTO categories (name, slug, subcategories, description, image)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET
             slug = excluded.slug,
             subcategories = excluded.subcategories,
             description = excluded.description,
             image = excluded.image`
        );
        for (const c of snapshot!.categories as Record<string, unknown>[]) {
          const name = String(c.name || '').trim();
          if (!name) continue;
          const slug = String(c.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          const subs = Array.isArray(c.subcategories) ? JSON.stringify(c.subcategories) : String(c.subcategories || '[]');
          upsertCat.run(name, slug, subs, String(c.description || ''), String(c.image || ''));
          counts.categories += 1;
        }
      }

      if (Array.isArray(snapshot!.coupons)) {
        const upsertCoupon = db.prepare(
          `INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, is_active, expires_at, usage_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET
             discount_type = excluded.discount_type,
             discount_value = excluded.discount_value,
             min_order = excluded.min_order,
             max_discount = excluded.max_discount,
             is_active = excluded.is_active,
             expires_at = excluded.expires_at`
        );
        for (const cp of snapshot!.coupons as Record<string, unknown>[]) {
          const code = String(cp.code || '').trim().toUpperCase();
          if (!code) continue;
          upsertCoupon.run(
            code,
            String(cp.discount_type || 'percent'),
            Number(cp.discount_value || 0),
            Number(cp.min_order || 0),
            cp.max_discount !== null && cp.max_discount !== undefined ? Number(cp.max_discount) : null,
            cp.is_active ? 1 : 0,
            String(cp.expires_at || ''),
            Number(cp.usage_count || 0)
          );
          counts.coupons += 1;
        }
      }

      if (Array.isArray(snapshot!.products)) {
        const upsertProd = db.prepare(
          `INSERT INTO products (
            product_code, sku, barcode, name, short_description, description,
            regular_price, sale_price, cost_price, category, subcategory, brand,
            images, video_url, sizes, colors, stock_quantity, variant_stock,
            low_stock_threshold, weight, material, pieces_info, warranty_info,
            specifications, features, tags, search_keywords, status,
            is_featured, is_bestseller, is_special_offer, sales_count, views_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sku) DO UPDATE SET
            name = excluded.name,
            short_description = excluded.short_description,
            description = excluded.description,
            regular_price = excluded.regular_price,
            sale_price = excluded.sale_price,
            cost_price = excluded.cost_price,
            category = excluded.category,
            subcategory = excluded.subcategory,
            brand = excluded.brand,
            images = excluded.images,
            video_url = excluded.video_url,
            sizes = excluded.sizes,
            colors = excluded.colors,
            stock_quantity = excluded.stock_quantity,
            variant_stock = excluded.variant_stock,
            low_stock_threshold = excluded.low_stock_threshold,
            weight = excluded.weight,
            material = excluded.material,
            pieces_info = excluded.pieces_info,
            warranty_info = excluded.warranty_info,
            specifications = excluded.specifications,
            features = excluded.features,
            tags = excluded.tags,
            search_keywords = excluded.search_keywords,
            status = excluded.status,
            is_featured = excluded.is_featured,
            is_bestseller = excluded.is_bestseller,
            is_special_offer = excluded.is_special_offer,
            updated_at = datetime('now')`
        );
        for (const p of snapshot!.products as Record<string, unknown>[]) {
          const sku = String(p.sku || '').trim();
          const name = String(p.name || '').trim();
          if (!sku || !name) continue;
          const code = String(p.product_code || `PHB-${crypto.randomInt(1000, 9999)}`);
          const safeCode = db.prepare('SELECT id FROM products WHERE product_code = ? AND sku != ?').get(code, sku)
            ? `${code}-${crypto.randomInt(100, 999)}`
            : code;
          upsertProd.run(
            safeCode,
            sku,
            String(p.barcode || ''),
            name,
            String(p.short_description || ''),
            String(p.description || ''),
            Number(p.regular_price || 0),
            p.sale_price !== null && p.sale_price !== undefined && p.sale_price !== '' ? Number(p.sale_price) : null,
            Number(p.cost_price || 0),
            String(p.category || 'Menswear'),
            String(p.subcategory || ''),
            String(p.brand || 'PRODUCT HUB BD'),
            Array.isArray(p.images) ? JSON.stringify(p.images) : String(p.images || '[]'),
            String(p.video_url || ''),
            Array.isArray(p.sizes) ? JSON.stringify(p.sizes) : String(p.sizes || '[]'),
            Array.isArray(p.colors) ? JSON.stringify(p.colors) : String(p.colors || '[]'),
            Number(p.stock_quantity || 0),
            p.variant_stock && typeof p.variant_stock === 'object'
              ? JSON.stringify(p.variant_stock)
              : String(p.variant_stock || '{}'),
            Number(p.low_stock_threshold ?? 5),
            String(p.weight || ''),
            String(p.material || ''),
            String(p.pieces_info || ''),
            String(p.warranty_info || ''),
            Array.isArray(p.specifications) ? JSON.stringify(p.specifications) : String(p.specifications || '[]'),
            Array.isArray(p.features) ? JSON.stringify(p.features) : String(p.features || '[]'),
            Array.isArray(p.tags) ? JSON.stringify(p.tags) : String(p.tags || '[]'),
            String(p.search_keywords || ''),
            String(p.status || 'Active'),
            p.is_featured ? 1 : 0,
            p.is_bestseller ? 1 : 0,
            p.is_special_offer ? 1 : 0,
            Number(p.sales_count || 0),
            Number(p.views_count || 0)
          );
          counts.products += 1;
        }
      }

      if (Array.isArray(snapshot!.orders)) {
        const upsertOrder = db.prepare(
          `INSERT INTO orders (
            order_id, customer_name, customer_email, customer_phone, alt_phone, country, division, district, upazila, area,
            road_no, house_no, flat_no, postal_code, full_address, delivery_instructions, items, subtotal, discount_amount,
            coupon_code, tax_amount, delivery_charge, total_amount, estimated_profit, payment_method, payment_number,
            sender_number, transaction_id, payment_screenshot, payment_status, order_status, courier_name, tracking_number,
            refund_status, admin_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(order_id) DO UPDATE SET
            payment_status = excluded.payment_status,
            order_status = excluded.order_status,
            courier_name = excluded.courier_name,
            tracking_number = excluded.tracking_number,
            admin_note = excluded.admin_note`
        );
        for (const o of snapshot!.orders as Record<string, unknown>[]) {
          const oid = String(o.order_id || '').trim();
          if (!oid) continue;
          upsertOrder.run(
            oid,
            String(o.customer_name || ''),
            String(o.customer_email || ''),
            String(o.customer_phone || ''),
            String(o.alt_phone || ''),
            String(o.country || 'Bangladesh'),
            String(o.division || ''),
            String(o.district || 'Dhaka'),
            String(o.upazila || ''),
            String(o.area || ''),
            String(o.road_no || ''),
            String(o.house_no || ''),
            String(o.flat_no || ''),
            String(o.postal_code || ''),
            String(o.full_address || ''),
            String(o.delivery_instructions || ''),
            Array.isArray(o.items) ? JSON.stringify(o.items) : String(o.items || '[]'),
            Number(o.subtotal || 0),
            Number(o.discount_amount || 0),
            String(o.coupon_code || ''),
            Number(o.tax_amount || 0),
            Number(o.delivery_charge || 0),
            Number(o.total_amount || 0),
            Number(o.estimated_profit || 0),
            String(o.payment_method || 'Cash on Delivery'),
            String(o.payment_number || ''),
            String(o.sender_number || ''),
            String(o.transaction_id || ''),
            String(o.payment_screenshot || ''),
            String(o.payment_status || 'Cash on Delivery'),
            String(o.order_status || 'Pending'),
            String(o.courier_name || ''),
            String(o.tracking_number || ''),
            String(o.refund_status || ''),
            String(o.admin_note || '')
          );
          counts.orders += 1;
        }
      }

      if (Array.isArray(snapshot!.newsletter_subscribers)) {
        const insSub = db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)');
        for (const s of snapshot!.newsletter_subscribers as Record<string, unknown>[]) {
          const email = String(s.email || '').trim().toLowerCase();
          if (email) insSub.run(email);
        }
      }
    });

    runRestore();
    logActivity(actor, 'Restored Store Backup', `${counts.products} products, ${counts.orders} orders`);
    res.json({ ok: true, restored: counts });
  } catch (err) {
    console.error('Restore backup error:', err);
    res.status(500).json({ error: 'Failed to restore backup file.' });
  }
});

app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      `Sitemap: ${baseUrl.replace(/\/+$/, '')}/sitemap.xml`,
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const staticPaths = ['/', '/shop', '/categories', '/track-order', '/about', '/contact', '/faq'];
  const activeProducts = db
    .prepare("SELECT id, updated_at FROM products WHERE status != 'Draft' ORDER BY id DESC")
    .all() as { id: number; updated_at: string }[];

  const urls = [
    ...staticPaths.map(
      (p) =>
        `  <url>\n    <loc>${baseUrl}${p}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`
    ),
    ...activeProducts.map(
      (prod) =>
        `  <url>\n    <loc>${baseUrl}/product/${prod.id}</loc>\n    <lastmod>${new Date(prod.updated_at).toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`
    ),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  );
});

// ==========================================
// VITE DEV / PRODUCTION STATIC ROUTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PRODUCT HUB BD server running on http://localhost:${PORT}`);
  });
}

startServer();
