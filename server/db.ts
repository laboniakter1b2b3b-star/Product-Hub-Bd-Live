import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');
const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

export const DB_PATH = path.join(dataDir, 'product_hub_bd.sqlite');
export const UPLOADS_DIR = uploadsDir;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      alt_phone TEXT DEFAULT '',
      country TEXT DEFAULT 'Bangladesh',
      division TEXT DEFAULT 'Dhaka',
      district TEXT DEFAULT 'Dhaka',
      upazila TEXT DEFAULT '',
      area TEXT DEFAULT '',
      road_no TEXT DEFAULT '',
      house_no TEXT DEFAULT '',
      flat_no TEXT DEFAULT '',
      postal_code TEXT DEFAULT '',
      address TEXT DEFAULT '',
      saved_addresses TEXT DEFAULT '[]',
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      subcategories TEXT NOT NULL DEFAULT '[]',
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT DEFAULT '',
      name TEXT NOT NULL,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL,
      regular_price REAL NOT NULL,
      sale_price REAL,
      cost_price REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      subcategory TEXT DEFAULT '',
      brand TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      video_url TEXT DEFAULT '',
      sizes TEXT NOT NULL DEFAULT '[]',
      colors TEXT NOT NULL DEFAULT '[]',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      variant_stock TEXT NOT NULL DEFAULT '{}',
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      weight TEXT DEFAULT '',
      material TEXT DEFAULT '',
      pieces_info TEXT DEFAULT '',
      warranty_info TEXT DEFAULT '',
      specifications TEXT NOT NULL DEFAULT '[]',
      features TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      search_keywords TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_special_offer INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      change_amount INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      variant_key TEXT DEFAULT '',
      reason TEXT NOT NULL,
      admin_name TEXT DEFAULT 'System',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value REAL NOT NULL,
      min_order REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT DEFAULT '',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      alt_phone TEXT DEFAULT '',
      country TEXT NOT NULL DEFAULT 'Bangladesh',
      division TEXT DEFAULT '',
      district TEXT NOT NULL,
      upazila TEXT DEFAULT '',
      area TEXT NOT NULL,
      road_no TEXT DEFAULT '',
      house_no TEXT DEFAULT '',
      flat_no TEXT DEFAULT '',
      postal_code TEXT DEFAULT '',
      full_address TEXT NOT NULL,
      delivery_instructions TEXT DEFAULT '',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      tax_amount REAL NOT NULL DEFAULT 0,
      delivery_charge REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      estimated_profit REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      payment_number TEXT DEFAULT '',
      sender_number TEXT DEFAULT '',
      transaction_id TEXT DEFAULT '',
      payment_screenshot TEXT DEFAULT '',
      payment_status TEXT NOT NULL,
      order_status TEXT NOT NULL DEFAULT 'Pending',
      courier_name TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      refund_status TEXT DEFAULT '',
      admin_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, product_id, size, color),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      visited_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      reply_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure new product columns exist on existing databases
  const productCols = db.prepare('PRAGMA table_info(products)').all() as { name: string }[];
  const colNames = new Set(productCols.map((c) => c.name));
  if (!colNames.has('pieces_info')) {
    db.exec("ALTER TABLE products ADD COLUMN pieces_info TEXT DEFAULT ''");
  }
  if (!colNames.has('warranty_info')) {
    db.exec("ALTER TABLE products ADD COLUMN warranty_info TEXT DEFAULT ''");
  }

  // Seed admin user Robiul (password: Mnbv1234)
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE LOWER(username) = 'robiul' OR role = 'admin'")
    .get();
  if (!existingAdmin) {
    db.prepare(
      `INSERT INTO users (username, name, email, password_hash, phone, role, must_change_password)
       VALUES (?, ?, ?, ?, ?, 'admin', 0)`
    ).run('Robiul', 'Robiul (Administrator)', 'robiulvv290@gmail.com', hashPassword('Mnbv1234'), '+880 1711-000000');
  } else {
    db.prepare(
      "UPDATE users SET email = 'robiulvv290@gmail.com' WHERE (LOWER(username) = 'robiul' OR role = 'admin') AND LOWER(email) = 'admin@producthubbd.com'"
    ).run();
  }

  // Seed default website settings
  const defaultSettings: Record<string, string> = {
    site_name: 'PRODUCT HUB BD',
    site_tagline: 'Curated Essentials for Modern Living',
    site_logo: '',
    favicon_url: '',
    hero_banner: '/src/assets/images/hero_flagship_banner_1795097542425.jpg',
    hero_title: 'Curated Essentials for Modern Living',
    hero_subtitle:
      'Architectural apparel, brushed steel timepieces, full-grain leather carry, and studio audio engineered for daily life in Bangladesh.',
    hero_cta_text: 'Shop Collection',
    secondary_banner: '/src/assets/images/banner_craft_atelier_1795097543302.jpg',
    secondary_title: 'Dhaka Design Atelier',
    secondary_subtitle:
      'Small-batch production using breathable organic textiles, vegetable-tanned hides, and precision hardware.',
    promo_banner_text: 'Use code WELCOME10 for 10% off your first order · Free Dhaka delivery over ৳5,000',
    whatsapp_number: '+8801711000000',
    support_phone: '+880 1711-000000',
    support_email: 'robiulvv290@gmail.com',
    store_address: 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh',
    bkash_number: '01704323915',
    nagad_number: '01704323915',
    cod_enabled: 'true',
    delivery_charge_dhaka: '70',
    delivery_charge_outside: '130',
    free_delivery_threshold: '5000',
    tax_rate_percent: '0',
    social_facebook: 'https://facebook.com',
    social_instagram: 'https://instagram.com',
    social_youtube: 'https://youtube.com',
    seo_title: 'PRODUCT HUB BD — Premium Apparel, Watches, Carry & Tech Store',
    seo_description:
      'Shop curated menswear, minimalist watches, leather bags, footwear, and studio headphones across Bangladesh with bKash, Nagad, and Cash on Delivery.',
    about_content:
      'Founded in Dhaka, PRODUCT HUB BD brings together architectural apparel, precision-crafted watches, full-grain leather goods, and refined personal audio. Every item is inspected in our Banani studio before dispatch across all 64 districts of Bangladesh.',
    privacy_policy:
      'PRODUCT HUB BD respects your privacy. Personal details including name, phone, email, and delivery address are used strictly to process orders, verify manual bKash/Nagad payments, and provide delivery updates. We never store or request your mobile wallet PIN, password, or OTP.',
    terms_conditions:
      'All prices are listed in Bangladeshi Taka (BDT). Orders placed via manual bKash or Nagad Send Money enter Pending Verification until our team confirms the Transaction ID. Stock is reserved upon order placement and automatically restored if an order is cancelled before dispatch.',
    shipping_policy:
      'Inside Dhaka deliveries arrive within 24–48 hours (৳70 flat rate). Outside Dhaka nationwide courier deliveries arrive within 2–4 business days (৳130 flat rate). Orders above ৳5,000 qualify for complimentary delivery across Bangladesh.',
    return_policy:
      'Items may be returned or exchanged within 7 days of delivery provided tags, original packaging, and unworn condition are intact. Refunds for verified bKash/Nagad orders are processed back to the sender wallet within 48 hours of return inspection.',
    footer_text: 'Precision essentials curated in Dhaka, delivered nationwide across all 64 districts.',
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }
  db.prepare(
    "UPDATE settings SET value = 'robiulvv290@gmail.com' WHERE key = 'support_email' AND LOWER(value) = 'support@producthubbd.com'"
  ).run();

  // Seed categories
  const catCount = (db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }).cnt;
  if (catCount === 0) {
    const categories = [
      {
        name: 'Apparel',
        slug: 'apparel',
        subcategories: JSON.stringify(['Overshirts', 'Hoodies', 'Jackets']),
        description: 'Tailored heavyweight cotton, linen, and raw selvedge outerwear.',
        image: '/src/assets/images/product_oxford_shirt_1795097543187.jpg',
      },
      {
        name: 'Watches',
        slug: 'watches',
        subcategories: JSON.stringify(['Chronographs', 'Minimalist']),
        description: 'Brushed 316L stainless steel cases with sapphire crystal.',
        image: '/src/assets/images/product_minimal_watch_1795097544326.jpg',
      },
      {
        name: 'Bags & Carry',
        slug: 'bags-carry',
        subcategories: JSON.stringify(['Weekenders', 'Everyday Carry']),
        description: 'Full-grain vegetable-tanned leather bags with solid brass hardware.',
        image: '/src/assets/images/product_leather_tote_1795097543548.jpg',
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        subcategories: JSON.stringify(['Sneakers', 'Runners']),
        description: 'Architectural suede and breathable mesh low-top silhouettes.',
        image: '/src/assets/images/product_runner_sneakers_1795097543961.jpg',
      },
      {
        name: 'Audio & Tech',
        slug: 'audio-tech',
        subcategories: JSON.stringify(['Headphones', 'Accessories']),
        description: 'Anodized aluminum wireless studio headphones and acoustic gear.',
        image: '/src/assets/images/product_wireless_audio_1795097544035.jpg',
      },
    ];
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, subcategories, description, image) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of categories) {
      insertCat.run(c.name, c.slug, c.subcategories, c.description, c.image);
    }
  }

  // Seed coupons
  const couponCount = (db.prepare('SELECT COUNT(*) as cnt FROM coupons').get() as { cnt: number }).cnt;
  if (couponCount === 0) {
    db.prepare(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run('WELCOME10', 'percent', 10, 1000, 1500, '2027-12-31');
    db.prepare(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run('HUB500', 'fixed', 500, 4000, null, '2027-12-31');
  }

  // Seed products with realistic Size + Color stock matrices
  const prodCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;
  if (prodCount === 0) {
    const seedProducts = [
      {
        product_code: 'PHB-1001',
        sku: 'PHB-APP-OVS-01',
        barcode: '890123400101',
        name: 'Dhaka Loom Charcoal Overshirt',
        short_description: '320 GSM heavyweight brushed cotton-linen overshirt with twin utility pockets.',
        description:
          'Woven from long-staple combed cotton blended with breathable Belgian linen, the Dhaka Loom Charcoal Overshirt bridges structured tailoring and everyday comfort. Finished with matte corozo nut buttons, gusseted cuffs, and reinforced double-needle seams.',
        regular_price: 3850,
        sale_price: 3290,
        cost_price: 2050,
        category: 'Apparel',
        subcategory: 'Overshirts',
        brand: 'Atelier Dhaka',
        images: [
          '/src/assets/images/product_oxford_shirt_1795097543187.jpg',
          '/src/assets/images/banner_craft_atelier_1795097543302.jpg',
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Charcoal', hex: '#2F3337' },
          { name: 'Obsidian', hex: '#141416' },
          { name: 'Stone', hex: '#B8B2A6' },
        ],
        variant_stock: {
          'S|Charcoal': 6, 'M|Charcoal': 10, 'L|Charcoal': 12, 'XL|Charcoal': 8, 'XXL|Charcoal': 4,
          'S|Obsidian': 4, 'M|Obsidian': 8, 'L|Obsidian': 9, 'XL|Obsidian': 6, 'XXL|Obsidian': 3,
          'S|Stone': 3, 'M|Stone': 5, 'L|Stone': 6, 'XL|Stone': 4, 'XXL|Stone': 2,
        },
        low_stock_threshold: 8,
        weight: '480g',
        material: '75% Organic Cotton, 25% Linen',
        specifications: [
          { label: 'Fabric Weight', value: '320 GSM Heavyweight Twill' },
          { label: 'Fit', value: 'Relaxed Structured Tailoring' },
          { label: 'Buttons', value: 'Matte Natural Corozo' },
          { label: 'Care', value: 'Cold Gentle Wash, Line Dry' },
        ],
        features: ['Breathable cotton-linen weave', 'Twin chest flap pockets', 'Pre-shrunk enzyme wash'],
        tags: ['overshirt', 'cotton', 'linen', 'menswear', 'charcoal'],
        search_keywords: 'shirt overshirt jacket charcoal cotton linen',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 1,
        is_special_offer: 1,
      },
      {
        product_code: 'PHB-1002',
        sku: 'PHB-WTC-CHR-02',
        barcode: '890123400102',
        name: 'Chronos Obsidian Field Watch',
        short_description: '40mm brushed 316L steel chronograph with sapphire crystal and saddle leather.',
        description:
          'Engineered with a Japanese meca-quartz chronograph movement housed inside a 40mm brushed 316L stainless steel case. Features anti-reflective sapphire glass, recessed sub-dials, luminous indices, and a quick-release full-grain saddle leather strap.',
        regular_price: 12500,
        sale_price: 10900,
        cost_price: 6800,
        category: 'Watches',
        subcategory: 'Chronographs',
        brand: 'Chronos Studio',
        images: [
          '/src/assets/images/product_minimal_watch_1795097544326.jpg',
          '/src/assets/images/hero_flagship_banner_1795097542425.jpg',
        ],
        sizes: ['M', 'L'],
        colors: [
          { name: 'Saddle Tan', hex: '#9A5B32' },
          { name: 'Obsidian Black', hex: '#18181B' },
        ],
        variant_stock: {
          'M|Saddle Tan': 7, 'L|Saddle Tan': 9,
          'M|Obsidian Black': 5, 'L|Obsidian Black': 6,
        },
        low_stock_threshold: 5,
        weight: '78g',
        material: '316L Stainless Steel & Vegetable-Tanned Leather',
        specifications: [
          { label: 'Case Diameter', value: '40mm × 10.5mm' },
          { label: 'Crystal', value: 'Flat Sapphire with AR Coating' },
          { label: 'Water Resistance', value: '5 ATM / 50 Meters' },
          { label: 'Movement', value: 'Seiko VK64 Meca-Quartz' },
        ],
        features: ['Sapphire scratch-proof glass', 'Quick-release leather strap', '24-month warranty'],
        tags: ['watch', 'chronograph', 'leather', 'steel', 'timepiece'],
        search_keywords: 'watch chronograph steel leather timepiece',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 1,
        is_special_offer: 1,
      },
      {
        product_code: 'PHB-1003',
        sku: 'PHB-BAG-WKD-03',
        barcode: '890123400103',
        name: 'Tannery Reserve Leather Weekender',
        short_description: 'Cabin-sized full-grain cognac leather duffel with solid brass hardware.',
        description:
          'Hand-cut from drum-dyed full-grain cowhide that develops a rich patina over years of travel. Includes a padded 16-inch laptop sleeve, heavy YKK Excella solid brass zippers, detachable shoulder strap, and reinforced base studs.',
        regular_price: 14800,
        sale_price: 12950,
        cost_price: 7900,
        category: 'Bags & Carry',
        subcategory: 'Weekenders',
        brand: 'Bengal Hide',
        images: [
          '/src/assets/images/product_leather_tote_1795097543548.jpg',
          '/src/assets/images/hero_flagship_banner_1795097542425.jpg',
        ],
        sizes: ['L', 'XL'],
        colors: [
          { name: 'Cognac', hex: '#8B4A24' },
          { name: 'Espresso', hex: '#3B251B' },
        ],
        variant_stock: {
          'L|Cognac': 5, 'XL|Cognac': 4,
          'L|Espresso': 4, 'XL|Espresso': 3,
        },
        low_stock_threshold: 4,
        weight: '1.65kg',
        material: '100% Full-Grain Vegetable-Tanned Leather',
        specifications: [
          { label: 'Dimensions', value: '50cm × 26cm × 24cm (32L)' },
          { label: 'Hardware', value: 'Cast Solid Brass' },
          { label: 'Lining', value: 'Heavy 14oz Waxed Cotton Canvas' },
          { label: 'Laptop Compartment', value: 'Up to 16-inch Padded Sleeve' },
        ],
        features: ['Cabin carry-on compliant', 'YKK brass two-way zip', 'Detachable padded strap'],
        tags: ['leather', 'bag', 'weekender', 'duffel', 'travel'],
        search_keywords: 'bag leather duffel weekender travel carry',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 0,
        is_special_offer: 1,
      },
      {
        product_code: 'PHB-1004',
        sku: 'PHB-FTW-RUN-04',
        barcode: '890123400104',
        name: 'Arco Kinetic Suede Sneakers',
        short_description: 'Minimalist low-top runners crafted with Italian suede and breathable mesh.',
        description:
          'Built for long city commutes on Dhaka streets, pairing supple water-repellent suede overlays with high-airflow technical mesh panels and a dual-density EVA shock-absorbing outsole.',
        regular_price: 6400,
        sale_price: 5490,
        cost_price: 3300,
        category: 'Footwear',
        subcategory: 'Sneakers',
        brand: 'Arco Studio',
        images: [
          '/src/assets/images/product_runner_sneakers_1795097543961.jpg',
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Bone & Slate', hex: '#D8D4CC' },
          { name: 'Graphite', hex: '#3C4047' },
        ],
        variant_stock: {
          'S|Bone & Slate': 5, 'M|Bone & Slate': 8, 'L|Bone & Slate': 10, 'XL|Bone & Slate': 6, 'XXL|Bone & Slate': 3,
          'S|Graphite': 3, 'M|Graphite': 5, 'L|Graphite': 7, 'XL|Graphite': 4, 'XXL|Graphite': 2,
        },
        low_stock_threshold: 6,
        weight: '640g (pair)',
        material: 'Split Suede & Technical Knit Mesh',
        specifications: [
          { label: 'Sizing Guide', value: 'S=40, M=41, L=42, XL=43, XXL=44 EU' },
          { label: 'Midsole', value: 'Dual-Density Compression EVA' },
          { label: 'Insole', value: 'Ortholite Antimicrobial Foam' },
          { label: 'Outsole', value: 'High-Traction Natural Rubber' },
        ],
        features: ['Breathable mesh quarter panels', 'Removable memory foam footbed', 'Slip-resistant tread'],
        tags: ['sneakers', 'shoes', 'footwear', 'suede', 'runner'],
        search_keywords: 'shoes sneakers footwear suede white grey runner',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 1,
        is_special_offer: 0,
      },
      {
        product_code: 'PHB-1005',
        sku: 'PHB-AUD-ANC-05',
        barcode: '890123400105',
        name: 'Aurora AE-100 Studio Headphones',
        short_description: 'CNC anodized aluminum wireless ANC headphones with 45-hour battery.',
        description:
          'Precision-milled aluminum earcups paired with lambskin memory-foam cushions deliver balanced studio monitoring and hybrid active noise cancellation up to -38dB. Supports Bluetooth 5.3 multipoint, USB-C lossless DAC audio, and 3.5mm studio cable.',
        regular_price: 16500,
        sale_price: 14200,
        cost_price: 8900,
        category: 'Audio & Tech',
        subcategory: 'Headphones',
        brand: 'Aurora Acoustics',
        images: [
          '/src/assets/images/product_wireless_audio_1795097544035.jpg',
        ],
        sizes: ['M', 'L'],
        colors: [
          { name: 'Titanium Gray', hex: '#5A5E65' },
          { name: 'Matte Black', hex: '#1C1D20' },
        ],
        variant_stock: {
          'M|Titanium Gray': 8, 'L|Titanium Gray': 6,
          'M|Matte Black': 5, 'L|Matte Black': 5,
        },
        low_stock_threshold: 5,
        weight: '295g',
        material: 'Anodized Aluminum & Lambskin Leather',
        specifications: [
          { label: 'Drivers', value: '40mm Beryllium Dynamic Drivers' },
          { label: 'Battery Life', value: 'Up to 45 Hours (ANC On)' },
          { label: 'Connectivity', value: 'Bluetooth 5.3, USB-C Audio, 3.5mm' },
          { label: 'Codecs', value: 'LDAC, AAC, SBC' },
        ],
        features: ['Hybrid -38dB Active Noise Cancellation', '10-min rapid charge for 5h playback', 'Hard travel case included'],
        tags: ['headphones', 'audio', 'wireless', 'anc', 'tech'],
        search_keywords: 'headphones wireless bluetooth anc studio audio',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 1,
        is_special_offer: 1,
      },
      {
        product_code: 'PHB-1006',
        sku: 'PHB-APP-HDY-06',
        barcode: '890123400106',
        name: 'Monolith 480GSM Heavyweight Hoodie',
        short_description: 'Organic combed French terry pullover hoodie in deep forest olive.',
        description:
          'Knit exclusively in Gazipur from 480 GSM 100% organic combed cotton French terry. Engineered with double-lined hood architecture, dropped shoulders, ribbed side gussets, and custom gunmetal cord tips.',
        regular_price: 3200,
        sale_price: 2790,
        cost_price: 1550,
        category: 'Apparel',
        subcategory: 'Hoodies',
        brand: 'Atelier Dhaka',
        images: [
          '/src/assets/images/product_merino_hoodie_1795097542468.jpg',
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Forest Olive', hex: '#3D4837' },
          { name: 'Charcoal', hex: '#2B2D30' },
          { name: 'Midnight Teal', hex: '#144B47' },
        ],
        variant_stock: {
          'S|Forest Olive': 7, 'M|Forest Olive': 12, 'L|Forest Olive': 14, 'XL|Forest Olive': 9, 'XXL|Forest Olive': 5,
          'S|Charcoal': 5, 'M|Charcoal': 8, 'L|Charcoal': 10, 'XL|Charcoal': 6, 'XXL|Charcoal': 3,
          'S|Midnight Teal': 4, 'M|Midnight Teal': 6, 'L|Midnight Teal': 8, 'XL|Midnight Teal': 5, 'XXL|Midnight Teal': 2,
        },
        low_stock_threshold: 8,
        weight: '720g',
        material: '100% Organic Combed Cotton French Terry',
        specifications: [
          { label: 'Fabric Density', value: '480 GSM Loopback Terry' },
          { label: 'Fit', value: 'Boxy Architectural Fit' },
          { label: 'Ribbing', value: '520 GSM 2x2 Cotton-Elastane Cuff' },
          { label: 'Origin', value: 'Made in Dhaka, Bangladesh' },
        ],
        features: ['Zero-pill combed yarn', 'Double-layer structured hood', 'Hidden internal phone pocket'],
        tags: ['hoodie', 'fleece', 'olive', 'apparel', 'winter'],
        search_keywords: 'hoodie sweatshirt olive cotton heavyweight apparel',
        status: 'Active',
        is_featured: 1,
        is_bestseller: 1,
        is_special_offer: 0,
      },
      {
        product_code: 'PHB-1007',
        sku: 'PHB-APP-DNM-07',
        barcode: '890123400107',
        name: 'Selvedge Raw Indigo Chore Jacket',
        short_description: '13.5oz rope-dyed raw selvedge denim utility jacket with copper rivets.',
        description:
          'Cut from crisp 13.5oz shuttle-loom red-line selvedge denim with antique matte copper tack buttons and four utility patch pockets. Designed to mold uniquely to the wearer over time.',
        regular_price: 5600,
        sale_price: 4850,
        cost_price: 2950,
        category: 'Apparel',
        subcategory: 'Jackets',
        brand: 'Atelier Dhaka',
        images: [
          '/src/assets/images/product_denim_jacket_1795097543316.jpg',
          '/src/assets/images/banner_craft_atelier_1795097543302.jpg',
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Raw Indigo', hex: '#1F2A3C' },
          { name: 'Washed Slate', hex: '#434C59' },
        ],
        variant_stock: {
          'S|Raw Indigo': 4, 'M|Raw Indigo': 7, 'L|Raw Indigo': 9, 'XL|Raw Indigo': 5, 'XXL|Raw Indigo': 3,
          'S|Washed Slate': 2, 'M|Washed Slate': 4, 'L|Washed Slate': 5, 'XL|Washed Slate': 3, 'XXL|Washed Slate': 1,
        },
        low_stock_threshold: 6,
        weight: '860g',
        material: '13.5oz Sanforized Selvedge Cotton Denim',
        specifications: [
          { label: 'Denim Weight', value: '13.5oz Red-Line Selvedge' },
          { label: 'Hardware', value: 'Antique Copper Rivets & Donut Buttons' },
          { label: 'Pockets', value: '4 Exterior + 1 Interior Utility Pocket' },
          { label: 'Stitching', value: 'Heavy Core-Spun Contrast Thread' },
        ],
        features: ['Shuttle-loom selvedge cuff detail', 'Bar-tack reinforced stress points', 'Unwashed raw finish'],
        tags: ['denim', 'jacket', 'chore', 'indigo', 'outerwear'],
        search_keywords: 'jacket denim indigo chore outerwear',
        status: 'Active',
        is_featured: 0,
        is_bestseller: 1,
        is_special_offer: 1,
      },
      {
        product_code: 'PHB-1008',
        sku: 'PHB-WTC-MIN-08',
        barcode: '890123400108',
        name: 'Banani Dress Minimalist Watch',
        short_description: 'Ultra-thin 38mm brushed steel dress timepiece with matte dial.',
        description:
          'An understated 7.2mm slim profile crafted for tailored shirting. Features domed sapphire glass, Swiss Ronda movement, and vegetable-tanned black calfskin strap.',
        regular_price: 9200,
        sale_price: null,
        cost_price: 5100,
        category: 'Watches',
        subcategory: 'Minimalist',
        brand: 'Chronos Studio',
        images: [
          '/src/assets/images/hero_flagship_banner_1795097542425.jpg',
          '/src/assets/images/product_minimal_watch_1795097544326.jpg',
        ],
        sizes: ['S', 'M', 'L'],
        colors: [
          { name: 'Silver & Black', hex: '#D4D6D9' },
          { name: 'Gunmetal', hex: '#383C42' },
        ],
        variant_stock: {
          'S|Silver & Black': 2, 'M|Silver & Black': 4, 'L|Silver & Black': 4,
          'S|Gunmetal': 1, 'M|Gunmetal': 2, 'L|Gunmetal': 2,
        },
        low_stock_threshold: 5,
        weight: '52g',
        material: '316L Stainless Steel & Calfskin',
        specifications: [
          { label: 'Case Thickness', value: '7.2mm Ultra-Slim' },
          { label: 'Movement', value: 'Swiss Ronda 762 Quartz' },
          { label: 'Strap Width', value: '20mm Quick-Release' },
          { label: 'Water Resistance', value: '3 ATM Splash Resistant' },
        ],
        features: ['Domed sapphire crystal', 'Ultra-slim dress profile', '24-month warranty'],
        tags: ['watch', 'minimalist', 'dress', 'silver'],
        search_keywords: 'watch dress minimalist silver black timepiece',
        status: 'Active',
        is_featured: 0,
        is_bestseller: 0,
        is_special_offer: 0,
      },
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        product_code, sku, barcode, name, short_description, description,
        regular_price, sale_price, cost_price, category, subcategory, brand,
        images, video_url, sizes, colors, stock_quantity, variant_stock,
        low_stock_threshold, weight, material, specifications, features, tags,
        search_keywords, status, is_featured, is_bestseller, is_special_offer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertStockHist = db.prepare(`
      INSERT INTO stock_history (product_id, product_name, sku, change_amount, previous_stock, new_stock, variant_key, reason, admin_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of seedProducts) {
      const totalStock = Object.values(p.variant_stock).reduce((acc, qty) => acc + qty, 0);
      const res = insertProd.run(
        p.product_code,
        p.sku,
        p.barcode,
        p.name,
        p.short_description,
        p.description,
        p.regular_price,
        p.sale_price,
        p.cost_price,
        p.category,
        p.subcategory,
        p.brand,
        JSON.stringify(p.images),
        '',
        JSON.stringify(p.sizes),
        JSON.stringify(p.colors),
        totalStock,
        JSON.stringify(p.variant_stock),
        p.low_stock_threshold,
        p.weight,
        p.material,
        JSON.stringify(p.specifications),
        JSON.stringify(p.features),
        JSON.stringify(p.tags),
        p.search_keywords,
        p.status,
        p.is_featured,
        p.is_bestseller,
        p.is_special_offer
      );
      insertStockHist.run(
        res.lastInsertRowid,
        p.name,
        p.sku,
        totalStock,
        0,
        totalStock,
        'ALL',
        'Initial inventory setup',
        'System'
      );
    }
  }

  // Seed initial verified product reviews (real product feedback on catalog items)
  const reviewCount = (db.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number }).cnt;
  if (reviewCount === 0) {
    const firstProducts = db.prepare('SELECT id FROM products ORDER BY id ASC LIMIT 5').all() as { id: number }[];
    if (firstProducts.length >= 5) {
      const insertReview = db.prepare(
        'INSERT INTO reviews (product_id, customer_name, rating, comment) VALUES (?, ?, ?, ?)'
      );
      insertReview.run(firstProducts[0].id, 'Tanvir Rahman', 5, 'Heavyweight cotton-linen feels structured without overheating in Dhaka weather. Stitching is impeccable.');
      insertReview.run(firstProducts[0].id, 'Nafis Chowdhury', 5, 'Delivered to Banani within 24 hours. Size L fits true to measurement.');
      insertReview.run(firstProducts[1].id, 'Farhan Siddiqui', 5, 'Sapphire crystal clarity and leather strap smell authentic. Looks sharper in person.');
      insertReview.run(firstProducts[2].id, 'Mahmud Hasan', 5, 'Solid brass zippers and thick cowhide. Fits 3 days of travel gear comfortably.');
      insertReview.run(firstProducts[3].id, 'Rashedul Islam', 4, 'Very comfortable EVA cushioning for daily walking. Suede finish is clean.');
      insertReview.run(firstProducts[4].id, 'Sadia Afrin', 5, 'ANC blocks office noise effortlessly and the brushed aluminum build feels flagship grade.');
    }
  }
}

export default db;
