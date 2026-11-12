const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let sql = `-- ==============================================================================
-- HỢP VỊ AI - SUPABASE POSTGRESQL SCHEMA & INITIAL DATA SEED (ĐỒNG NAI)
-- Chạy toàn bộ mã SQL này trong Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. BẢNG RESTAURANTS (21 quán ăn khảo sát thực địa Biên Hòa - Đồng Nai)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    area TEXT NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    opening_hours TEXT,
    status TEXT DEFAULT 'approved',
    verification_status TEXT DEFAULT 'verified',
    verification_source TEXT,
    verified_at TEXT,
    is_specialty_spot BOOLEAN DEFAULT false,
    avatar_url TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG MENU_ITEMS (146 món ăn niêm yết giá chính xác)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    raw_price_text TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG SPECIALTIES (4 Tứ đại đặc sản Đồng Nai)
CREATE TABLE IF NOT EXISTS public.specialties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classification TEXT,
    summary TEXT,
    description TEXT,
    reference_price_range TEXT,
    typical_restaurant TEXT,
    typical_restaurant_id TEXT,
    suggested_query TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    cover_image TEXT
);

-- 4. BẢNG FEEDBACKS (Đánh giá thực khách)
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT DEFAULT 'customer',
    rating INTEGER DEFAULT 5,
    comment TEXT NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. BẢNG PARTNER_SUBMISSIONS (Hồ sơ menu quét AI từ chủ quán)
CREATE TABLE IF NOT EXISTS public.partner_submissions (
    id TEXT PRIMARY KEY,
    partner_id TEXT,
    partner_name TEXT,
    restaurant_name TEXT,
    restaurant_address TEXT,
    restaurant_area TEXT,
    phone TEXT,
    menu_text TEXT,
    image_url TEXT,
    extracted_items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. BẢNG USERS (Quản trị & Phân quyền RBAC)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    restaurant_name TEXT,
    restaurant_address TEXT,
    restaurant_area TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. BẢNG SYSTEM_METADATA
CREATE TABLE IF NOT EXISTS public.system_metadata (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- BẬT ROW LEVEL SECURITY & CẤP QUYỀN ĐỌC CHO ANON KEY (PUBLISHABLE)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on approved restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Allow public read on approved menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read on specialties" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "Allow public read on feedbacks" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on partner_submissions" ON public.partner_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on system_metadata" ON public.system_metadata FOR SELECT USING (true);

-- BƠM DỮ LIỆU BAN ĐẦU (SEED DATA)\n`;

// Metadata
sql += `INSERT INTO public.system_metadata (key, value) VALUES ('project_meta', '${JSON.stringify(db.metadata).replace(/'/g, "''")}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n\n`;

// Restaurants
sql += `-- Chèn ${db.restaurants.length} Quán ăn\n`;
for (const r of db.restaurants) {
  const photosJson = JSON.stringify(r.photos || []).replace(/'/g, "''");
  sql += `INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    '${r.id}',
    '${r.name.replace(/'/g, "''")}',
    '${r.address.replace(/'/g, "''")}',
    '${r.area.replace(/'/g, "''")}',
    ${r.lat},
    ${r.lng},
    '${(r.openingHours || '').replace(/'/g, "''")}',
    '${r.status || 'approved'}',
    '${r.verificationStatus || 'verified'}',
    '${(r.verificationSource || '').replace(/'/g, "''")}',
    '${r.verifiedAt || ''}',
    ${Boolean(r.isSpecialtySpot)},
    '${(r.avatarUrl || '').replace(/'/g, "''")}',
    '${photosJson}'::jsonb,
    '${(r.coverImage || '').replace(/'/g, "''")}'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;\n`;
}

// Menu Items
sql += `\n-- Chèn ${db.menuItems.length} Món ăn\n`;
for (const m of db.menuItems) {
  const tagsJson = JSON.stringify(m.tags || []).replace(/'/g, "''");
  sql += `INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    '${m.id}',
    '${m.restaurantId}',
    '${m.name.replace(/'/g, "''")}',
    ${Number(m.price) || 0},
    '${(m.rawPriceText || '').replace(/'/g, "''")}',
    '${(m.category || '').replace(/'/g, "''")}',
    '${tagsJson}'::jsonb,
    '${(m.imageUrl || '').replace(/'/g, "''")}',
    '${m.status || 'approved'}'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;\n`;
}

// Specialties
sql += `\n-- Chèn ${db.specialties.length} Tứ đại đặc sản\n`;
for (const s of db.specialties) {
  const photosJson = JSON.stringify(s.photos || []).replace(/'/g, "''");
  sql += `INSERT INTO public.specialties (id, name, classification, summary, description, reference_price_range, typical_restaurant, typical_restaurant_id, suggested_query, photos, cover_image) VALUES (
    '${s.id}',
    '${s.name.replace(/'/g, "''")}',
    '${(s.classification || '').replace(/'/g, "''")}',
    '${(s.summary || '').replace(/'/g, "''")}',
    '${(s.description || '').replace(/'/g, "''")}',
    '${(s.referencePriceRange || '').replace(/'/g, "''")}',
    '${(s.typicalRestaurant || '').replace(/'/g, "''")}',
    '${(s.typicalRestaurantId || '').replace(/'/g, "''")}',
    '${(s.suggestedQuery || '').replace(/'/g, "''")}',
    '${photosJson}'::jsonb,
    '${(s.coverImage || '').replace(/'/g, "''")}'
) ON CONFLICT (id) DO NOTHING;\n`;
}

// Users default
if (Array.isArray(db.users)) {
  sql += `\n-- Chèn Người dùng mặc định\n`;
  for (const u of db.users) {
    sql += `INSERT INTO public.users (id, name, email, password_hash, role, restaurant_name, restaurant_address, restaurant_area, status) VALUES (
      '${u.id}',
      '${u.name.replace(/'/g, "''")}',
      '${u.email.replace(/'/g, "''")}',
      '${u.passwordHash || ''}',
      '${u.role || 'customer'}',
      '${(u.restaurantName || '').replace(/'/g, "''")}',
      '${(u.restaurantAddress || '').replace(/'/g, "''")}',
      '${(u.restaurantArea || '').replace(/'/g, "''")}',
      '${u.status || 'active'}'
    ) ON CONFLICT (id) DO NOTHING;\n`;
  }
}

const outPath = path.join(__dirname, '..', 'supabase_migration.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('✅ Đã tạo file SQL migration thành công tại:', outPath);

