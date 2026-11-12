-- ==============================================================================
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

-- BƠM DỮ LIỆU BAN ĐẦU (SEED DATA)
INSERT INTO public.system_metadata (key, value) VALUES ('project_meta', '{"projectName":"HỢP VỊ AI","slogan":"Hiểu đúng vị – Gợi đúng món","targetRegion":"Tỉnh Đồng Nai (Trọng tâm: Phường Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long - TP. Biên Hòa)","lastUpdated":"2026-11-11T08:21:41.857Z","totalRestaurants":21,"totalMenuItems":146,"totalSpecialties":4}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Chèn 21 Quán ăn
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_01',
    'Chả Lụi Cô Yến',
    '9/8 Huỳnh Văn Nghệ, P. Bửu Long, TP. Biên Hòa (đối diện UBND phường Bửu Long)',
    'Bửu Long',
    10.9648,
    106.8032,
    '14:00 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_01/quan_cha_lui_co_yen.jpg',
    '[{"title":"Không gian & Chả Lụi Cô Yến","cleanName":"quan_cha_lui_co_yen.jpg","url":"/images/restaurants/REST_01/quan_cha_lui_co_yen.jpg"},{"title":"chả lụi.jpg","cleanName":"cha_lui.jpg","url":"/images/restaurants/REST_01/cha_lui.jpg"}]'::jsonb,
    '/images/restaurants/REST_01/quan_cha_lui_co_yen.jpg'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_02',
    'Tiệm Ăn Nhà Túc',
    '18 Đ. Dương Tử Giang, Tam Hiệp, Đồng Nai 810000',
    'Tam Hiệp',
    10.9532,
    106.8465,
    '8:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_02/combo_1.jpg',
    '[{"title":"Combo 1","cleanName":"combo_1.jpg","url":"/images/restaurants/REST_02/combo_1.jpg"},{"title":"Combo 2","cleanName":"combo_2.jpg","url":"/images/restaurants/REST_02/combo_2.jpg"},{"title":"Combo 3","cleanName":"combo_3.jpg","url":"/images/restaurants/REST_02/combo_3.jpg"},{"title":"Combo 4","cleanName":"combo_4.jpg","url":"/images/restaurants/REST_02/combo_4.jpg"},{"title":"Combo Heo/Gà + Trà Tắc/Mơ Ngâm","cleanName":"combo_heo_ga_tra_tac_mo_ngam.jpg","url":"/images/restaurants/REST_02/combo_heo_ga_tra_tac_mo_ngam.jpg"},{"title":"Cơm Cari Nhật (Heo/Gà)","cleanName":"com_cari_nhat_heo_ga.jpg","url":"/images/restaurants/REST_02/com_cari_nhat_heo_ga.jpg"},{"title":"Cơm Cá Hồi Sống","cleanName":"com_ca_hoi_song.jpg","url":"/images/restaurants/REST_02/com_ca_hoi_song.jpg"},{"title":"Cơm gà chiên giòn","cleanName":"com_ga_chien_gion.jpg","url":"/images/restaurants/REST_02/com_ga_chien_gion.jpg"},{"title":"Cơm heo Chiên Xù","cleanName":"com_heo_chien_xu.jpg","url":"/images/restaurants/REST_02/com_heo_chien_xu.jpg"},{"title":"Cơm Lươn","cleanName":"com_luon.jpg","url":"/images/restaurants/REST_02/com_luon.jpg"},{"title":"Cơm Lươn + Trà Tắc/Mơ Ngâm","cleanName":"com_luon_tra_tac_mo_ngam.jpg","url":"/images/restaurants/REST_02/com_luon_tra_tac_mo_ngam.jpg"},{"title":"Kim Ch Cơm Trắng","cleanName":"kim_ch_com_trang.jpg","url":"/images/restaurants/REST_02/kim_ch_com_trang.jpg"},{"title":"Miến Xào Sốt Bò XO","cleanName":"mien_xao_sot_bo_xo.jpg","url":"/images/restaurants/REST_02/mien_xao_sot_bo_xo.jpg"},{"title":"rong biển cơm trắng","cleanName":"rong_bien_com_trang.jpg","url":"/images/restaurants/REST_02/rong_bien_com_trang.jpg"},{"title":"Soup Bào Ngư","cleanName":"soup_bao_ngu.jpg","url":"/images/restaurants/REST_02/soup_bao_ngu.jpg"},{"title":"Soup Sò Điệp","cleanName":"soup_so_diep.jpg","url":"/images/restaurants/REST_02/soup_so_diep.jpg"},{"title":"Udon Bò Trứng","cleanName":"udon_bo_trung.jpg","url":"/images/restaurants/REST_02/udon_bo_trung.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_03',
    'Tiệm Mì Vĩnh Vĩnh',
    '55 Đường 30 Tháng 4, Thanh Bình, Biên Hòa',
    'Thanh Bình',
    10.9478,
    106.8172,
    '16:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_03/bun_gao.jpg',
    '[{"title":"Bún gạo","cleanName":"bun_gao.jpg","url":"/images/restaurants/REST_03/bun_gao.jpg"},{"title":"Hoành Thánh","cleanName":"hoanh_thanh.jpg","url":"/images/restaurants/REST_03/hoanh_thanh.jpg"},{"title":"Hủ tiếu khô","cleanName":"hu_tieu_kho.jpg","url":"/images/restaurants/REST_03/hu_tieu_kho.jpg"},{"title":"Hủ tiếu mì","cleanName":"hu_tieu_mi.jpg","url":"/images/restaurants/REST_03/hu_tieu_mi.jpg"},{"title":"Mì Lá Dứa","cleanName":"mi_la_dua.jpg","url":"/images/restaurants/REST_03/mi_la_dua.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_04',
    'Tiệm Gà Sugar',
    'R16 Đường D4,KP7, phường Thống Nhất, Biên Hòa',
    'Thống Nhất',
    10.9515,
    106.8358,
    '10:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_04/comb_size_m.jpg',
    '[{"title":"Comb size M","cleanName":"comb_size_m.jpg","url":"/images/restaurants/REST_04/comb_size_m.jpg"},{"title":"Combo mini","cleanName":"combo_mini.jpg","url":"/images/restaurants/REST_04/combo_mini.jpg"},{"title":"Combo size L","cleanName":"combo_size_l.jpg","url":"/images/restaurants/REST_04/combo_size_l.jpg"},{"title":"Combo size S","cleanName":"combo_size_s.jpg","url":"/images/restaurants/REST_04/combo_size_s.jpg"},{"title":"Mì Cay Bò/Tôm","cleanName":"mi_cay_bo_tom.jpg","url":"/images/restaurants/REST_04/mi_cay_bo_tom.jpg"},{"title":"Mì Spaghetti size M","cleanName":"mi_spaghetti_size_m.jpg","url":"/images/restaurants/REST_04/mi_spaghetti_size_m.jpg"},{"title":"Mì spaghetti size S","cleanName":"mi_spaghetti_size_s.jpg","url":"/images/restaurants/REST_04/mi_spaghetti_size_s.jpg"},{"title":"Mì Thập Cẩm","cleanName":"mi_thap_cam.jpg","url":"/images/restaurants/REST_04/mi_thap_cam.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_05',
    'Bún Đậu Ngọc Thanh Tâm',
    '199 Đường Trương Định, P. Tam Hiệp, TP. Biên Hòa',
    'Tam Hiệp',
    10.9565,
    106.8492,
    '09:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_05/bun_dau_dac_biet_1_nguoi.jpg',
    '[{"title":"Bún Đậu Đặc Biệt 1 người","cleanName":"bun_dau_dac_biet_1_nguoi.jpg","url":"/images/restaurants/REST_05/bun_dau_dac_biet_1_nguoi.jpg"},{"title":"Bún đậu chả cốm","cleanName":"bun_dau_cha_com.jpg","url":"/images/restaurants/REST_05/bun_dau_cha_com.jpg"},{"title":"Bún đậu nem chua rán","cleanName":"bun_dau_nem_chua_ran.jpg","url":"/images/restaurants/REST_05/bun_dau_nem_chua_ran.jpg"},{"title":"Bún đậu thịt luộc","cleanName":"bun_dau_thit_luoc.jpg","url":"/images/restaurants/REST_05/bun_dau_thit_luoc.jpg"},{"title":"Tá lả 2 người trở lên","cleanName":"ta_la_2_nguoi_tro_len.jpg","url":"/images/restaurants/REST_05/ta_la_2_nguoi_tro_len.jpg"},{"title":"Đặc Biệt 2 người","cleanName":"dac_biet_2_nguoi.jpg","url":"/images/restaurants/REST_05/dac_biet_2_nguoi.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_06',
    'Mì Bún Ốc Hến',
    '58 Hồ Văn Đại, Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9535,
    106.8145,
    '07:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_06/thap_cam.jpg',
    '[{"title":"thập cẩm","cleanName":"thap_cam.jpg","url":"/images/restaurants/REST_06/thap_cam.jpg"},{"title":"đặc biệt","cleanName":"dac_biet.jpg","url":"/images/restaurants/REST_06/dac_biet.jpg"},{"title":"ốc hến thường","cleanName":"oc_hen_thuong.jpg","url":"/images/restaurants/REST_06/oc_hen_thuong.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_07',
    'Bún Thái & Mì Trộn Thành Minh',
    '129 Hưng Đạo Vương, Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9488,
    106.8195,
    '10:00 - 14:00 16:00 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_07/bun_thai_bo_trung.jpg',
    '[{"title":"Bún Thái Bò Trứng","cleanName":"bun_thai_bo_trung.jpg","url":"/images/restaurants/REST_07/bun_thai_bo_trung.jpg"},{"title":"Bún Thái Hải Sản","cleanName":"bun_thai_hai_san.jpg","url":"/images/restaurants/REST_07/bun_thai_hai_san.jpg"},{"title":"Bún Thái Viên","cleanName":"bun_thai_vien.jpg","url":"/images/restaurants/REST_07/bun_thai_vien.jpg"},{"title":"Bún Thái Đặc Biệt","cleanName":"bun_thai_dac_biet.jpg","url":"/images/restaurants/REST_07/bun_thai_dac_biet.jpg"},{"title":"Mì trộn bò trứng","cleanName":"mi_tron_bo_trung.jpg","url":"/images/restaurants/REST_07/mi_tron_bo_trung.jpg"},{"title":"Mì trộn cá viên","cleanName":"mi_tron_ca_vien.jpg","url":"/images/restaurants/REST_07/mi_tron_ca_vien.jpg"},{"title":"Mì trộn Hải Sản","cleanName":"mi_tron_hai_san.jpg","url":"/images/restaurants/REST_07/mi_tron_hai_san.jpg"},{"title":"Mì trộn đặc biệt","cleanName":"mi_tron_dac_biet.jpg","url":"/images/restaurants/REST_07/mi_tron_dac_biet.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_08',
    'Bún 32 Chợ Đêm Biên Hùng',
    '140 Ba Mươi Tháng Tư, Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9502,
    106.8234,
    '18:30 - 23:30',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_08/bo_la_lot_banh_hoi.jpg',
    '[{"title":"Bò Lá Lốt Bánh hỏi","cleanName":"bo_la_lot_banh_hoi.jpg","url":"/images/restaurants/REST_08/bo_la_lot_banh_hoi.jpg"},{"title":"Bò mở chài bánh hỏi","cleanName":"bo_mo_chai_banh_hoi.jpg","url":"/images/restaurants/REST_08/bo_mo_chai_banh_hoi.jpg"},{"title":"Bún Thịt Nướng","cleanName":"bun_thit_nuong.jpg","url":"/images/restaurants/REST_08/bun_thit_nuong.jpg"},{"title":"Nem nướng bánh hỏi","cleanName":"nem_nuong_banh_hoi.jpg","url":"/images/restaurants/REST_08/nem_nuong_banh_hoi.jpg"},{"title":"Thập cẩm 2người","cleanName":"thap_cam_2nguoi.jpg","url":"/images/restaurants/REST_08/thap_cam_2nguoi.jpg"},{"title":"Thập Cẩm 3 người","cleanName":"thap_cam_3_nguoi.jpg","url":"/images/restaurants/REST_08/thap_cam_3_nguoi.jpg"},{"title":"Thịt Nướng Bánh Hỏi","cleanName":"thit_nuong_banh_hoi.jpg","url":"/images/restaurants/REST_08/thit_nuong_banh_hoi.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_09',
    'Bún Bò ViNaTex',
    '2 Nguyễn Văn Nghĩa, Trấn Biên, Đồng Nai 76000',
    'Trấn Biên',
    10.9548,
    106.8156,
    '6:00 - 11:00 16:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_09/mang_bap_hoa.jpg',
    '[{"title":"măng bắp hoa","cleanName":"mang_bap_hoa.jpg","url":"/images/restaurants/REST_09/mang_bap_hoa.jpg"},{"title":"thường","cleanName":"thuong.jpg","url":"/images/restaurants/REST_09/thuong.jpg"},{"title":"tái/ giò heo","cleanName":"tai_gio_heo.jpg","url":"/images/restaurants/REST_09/tai_gio_heo.jpg"},{"title":"đặc biệt","cleanName":"dac_biet.jpg","url":"/images/restaurants/REST_09/dac_biet.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_10',
    'A Sóc Cơm Chiên - Mì Xào Giòn',
    '93 Đ. Hà Huy Giáp, Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9455,
    106.821,
    '15:00 - 23:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_10/com_chien_duong_chau.jpg',
    '[{"title":"Cơm chiên dương châu","cleanName":"com_chien_duong_chau.jpg","url":"/images/restaurants/REST_10/com_chien_duong_chau.jpg"},{"title":"Cơm chiên hải sản","cleanName":"com_chien_hai_san.jpg","url":"/images/restaurants/REST_10/com_chien_hai_san.jpg"},{"title":"Cơm chiên lúc lắc bò","cleanName":"com_chien_luc_lac_bo.jpg","url":"/images/restaurants/REST_10/com_chien_luc_lac_bo.jpg"},{"title":"Cơm chiên tỏi","cleanName":"com_chien_toi.jpg","url":"/images/restaurants/REST_10/com_chien_toi.jpg"},{"title":"Hủ tiếu xào hải sản","cleanName":"hu_tieu_xao_hai_san.jpg","url":"/images/restaurants/REST_10/hu_tieu_xao_hai_san.jpg"},{"title":"Mì Xào Bò","cleanName":"mi_xao_bo.jpg","url":"/images/restaurants/REST_10/mi_xao_bo.jpg"},{"title":"Mì xào Hải Sản","cleanName":"mi_xao_hai_san.jpg","url":"/images/restaurants/REST_10/mi_xao_hai_san.jpg"},{"title":"Mì Xào Thập Cẩm","cleanName":"mi_xao_thap_cam.jpg","url":"/images/restaurants/REST_10/mi_xao_thap_cam.jpg"},{"title":"Nui Xào Bò","cleanName":"nui_xao_bo.jpg","url":"/images/restaurants/REST_10/nui_xao_bo.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_11',
    'Lẩu Tôm 5 Ri',
    '487/20/3B Cách Mạng Tháng 8, Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9522,
    106.8098,
    '9:00 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_11/chao_tom.jpg',
    '[{"title":"Chạo tôm","cleanName":"chao_tom.jpg","url":"/images/restaurants/REST_11/chao_tom.jpg"},{"title":"Cá bông lau kho tộ","cleanName":"ca_bong_lau_kho_to.jpg","url":"/images/restaurants/REST_11/ca_bong_lau_kho_to.jpg"},{"title":"Cá Lóc Hấp","cleanName":"ca_loc_hap.jpg","url":"/images/restaurants/REST_11/ca_loc_hap.jpg"},{"title":"Cá Tai tượng chiên xù","cleanName":"ca_tai_tuong_chien_xu.jpg","url":"/images/restaurants/REST_11/ca_tai_tuong_chien_xu.jpg"},{"title":"gỏi bò rau mầm","cleanName":"goi_bo_rau_mam.jpg","url":"/images/restaurants/REST_11/goi_bo_rau_mam.jpg"},{"title":"Hàu nướng","cleanName":"hau_nuong.jpg","url":"/images/restaurants/REST_11/hau_nuong.jpg"},{"title":"Lẩu Cua đồng hải sản","cleanName":"lau_cua_dong_hai_san.jpg","url":"/images/restaurants/REST_11/lau_cua_dong_hai_san.jpg"},{"title":"Lẩu Tôm","cleanName":"lau_tom.jpg","url":"/images/restaurants/REST_11/lau_tom.jpg"},{"title":"Mực nướng sa tế","cleanName":"muc_nuong_sa_te.jpg","url":"/images/restaurants/REST_11/muc_nuong_sa_te.jpg"},{"title":"nghêu hấp","cleanName":"ngheu_hap.jpg","url":"/images/restaurants/REST_11/ngheu_hap.jpg"},{"title":"Rau luộc kho quẹt","cleanName":"rau_luoc_kho_quet.jpg","url":"/images/restaurants/REST_11/rau_luoc_kho_quet.jpg"},{"title":"Sò huyết cháy tỏi","cleanName":"so_huyet_chay_toi.jpg","url":"/images/restaurants/REST_11/so_huyet_chay_toi.jpg"},{"title":"Ốc len xào dừa","cleanName":"oc_len_xao_dua.jpg","url":"/images/restaurants/REST_11/oc_len_xao_dua.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_12',
    'Lẩu Chay Thiện Duyên 2',
    '66/88 Đ. Đồng Khởi, Tam Hiệp, Đồng Nai 812610',
    'Tam Hiệp',
    10.9595,
    106.854,
    '10:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_12/lau_1_2ng.jpg',
    '[{"title":"Lẩu 1-2ng","cleanName":"lau_1_2ng.jpg","url":"/images/restaurants/REST_12/lau_1_2ng.jpg"},{"title":"Lẩu 3 người trở lên","cleanName":"lau_3_nguoi_tro_len.jpg","url":"/images/restaurants/REST_12/lau_3_nguoi_tro_len.jpg"},{"title":"Đồ ăn vặt chay","cleanName":"do_an_vat_chay.jpg","url":"/images/restaurants/REST_12/do_an_vat_chay.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_13',
    'Bún Chả Hà Nội Phú Hoàng',
    'Kp3, Tam Hiệp, Đồng Nai',
    'Tam Hiệp',
    10.9512,
    106.8565,
    '08:00 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_13/bun_cha_phu_khang.webp',
    '[{"title":"Bún Chả Hà Nội Phú Khang","cleanName":"bun_cha_phu_khang.webp","url":"/images/restaurants/REST_13/bun_cha_phu_khang.webp"},{"title":"Bún chả","cleanName":"bun_cha.jpg","url":"/images/restaurants/REST_13/bun_cha.jpg"},{"title":"Nem Cua Bể","cleanName":"nem_cua_be.jpg","url":"/images/restaurants/REST_13/nem_cua_be.jpg"}]'::jsonb,
    '/images/restaurants/REST_13/bun_cha_phu_khang.webp'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_14',
    'Cơm Gà Phú Yên S88',
    '49/5a, Đ. Võ Thị Sáu, Trấn Biên, Đồng Nai 810000',
    'Trấn Biên',
    10.9468,
    106.8385,
    '9:00 - 19:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    false,
    '/images/restaurants/REST_14/com_ga_xe_s88.webp',
    '[{"title":"Cơm Gà Xé Phú Yên S88","cleanName":"com_ga_xe_s88.webp","url":"/images/restaurants/REST_14/com_ga_xe_s88.webp"},{"title":"Cơm gà xé","cleanName":"com_ga_xe.jpg","url":"/images/restaurants/REST_14/com_ga_xe.jpg"},{"title":"Cơm đùi gà chiên mắm","cleanName":"com_dui_ga_chien_mam.jpg","url":"/images/restaurants/REST_14/com_dui_ga_chien_mam.jpg"}]'::jsonb,
    '/images/restaurants/REST_14/com_ga_xe_s88.webp'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_15',
    'Cháo Hến Cô Tươi',
    '60 Hẻm 1506 Nguyễn Ái Quốc, Tân Triều, Đồng Nai',
    'Tân Triều',
    10.9735,
    106.839,
    '15:00 - 22:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_15/chao_hen_co_tuoi.jpg',
    '[{"title":"Cháo Hến Cô Tươi","cleanName":"chao_hen_co_tuoi.jpg","url":"/images/restaurants/REST_15/chao_hen_co_tuoi.jpg"},{"title":"Cháo hến","cleanName":"chao_hen.jpg","url":"/images/restaurants/REST_15/chao_hen.jpg"},{"title":"Cháo thêm hến","cleanName":"chao_them_hen.jpg","url":"/images/restaurants/REST_15/chao_them_hen.jpg"}]'::jsonb,
    '/images/restaurants/REST_15/chao_hen_co_tuoi.jpg'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_16',
    'Gỏi cá Kim Yến - Tân Mai',
    '180 Đ. Huỳnh Văn Hớn, Tam Hiệp, Đồng Nai',
    'Tam Hiệp',
    10.9542,
    106.8615,
    '9:00 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_16/goi_ca_kim_yen_tan_mai.jpg',
    '[{"title":"Gỏi Cá Kim Yến Tân Mai","cleanName":"goi_ca_kim_yen_tan_mai.jpg","url":"/images/restaurants/REST_16/goi_ca_kim_yen_tan_mai.jpg"},{"title":"Bò Bóp Thấu","cleanName":"bo_bop_thau.jpg","url":"/images/restaurants/REST_16/bo_bop_thau.jpg"},{"title":"Bò Nhúng Giấm","cleanName":"bo_nhung_giam.jpg","url":"/images/restaurants/REST_16/bo_nhung_giam.jpg"},{"title":"Cháo cá","cleanName":"chao_ca.jpg","url":"/images/restaurants/REST_16/chao_ca.jpg"},{"title":"Cháo lươn","cleanName":"chao_luon.jpg","url":"/images/restaurants/REST_16/chao_luon.jpg"},{"title":"Cá Nấu Mẻ","cleanName":"ca_nau_me.jpg","url":"/images/restaurants/REST_16/ca_nau_me.jpg"},{"title":"Gỏi cá","cleanName":"goi_ca.jpg","url":"/images/restaurants/REST_16/goi_ca.jpg"},{"title":"lươn xào lăn","cleanName":"luon_xao_lan.jpg","url":"/images/restaurants/REST_16/luon_xao_lan.jpg"},{"title":"mực né","cleanName":"muc_ne.jpg","url":"/images/restaurants/REST_16/muc_ne.jpg"}]'::jsonb,
    '/images/restaurants/REST_16/goi_ca_kim_yen_tan_mai.jpg'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_17',
    'VƯỜN BƯỞI TÂN TRIỀU TƯ TRUNG',
    '26/4 Khu Phố Tân Triều, Phường, Tân Triều, Đồng Nai',
    'Tân Triều',
    10.9852,
    106.7845,
    '8:00 - 00:00',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    '[{"title":"Bồ Câu RôTi","cleanName":"bo_cau_roti.jpg","url":"/images/restaurants/REST_17/bo_cau_roti.jpg"},{"title":"Dồi Sụn","cleanName":"doi_sun.jpg","url":"/images/restaurants/REST_17/doi_sun.jpg"},{"title":"Trứng Non Xào Mướp","cleanName":"trung_non_xao_muop.jpg","url":"/images/restaurants/REST_17/trung_non_xao_muop.jpg"},{"title":"Xôi Bồ Câu","cleanName":"xoi_bo_cau.jpg","url":"/images/restaurants/REST_17/xoi_bo_cau.jpg"},{"title":"Đầu Cổ Vịt Phá Lấu","cleanName":"dau_co_vit_pha_lau.jpg","url":"/images/restaurants/REST_17/dau_co_vit_pha_lau.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_18',
    'Làng bưởi Năm Huệ Tân Triều',
    '133/17 Hương Lộ 9, Tân Triều, Đồng Nai',
    'Tân Triều',
    10.9885,
    106.7812,
    '6:00 - 18:30',
    'approved',
    'verified',
    'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
    '2026-11-10',
    true,
    '/images/restaurants/REST_18/ga_hap_la_buoi.jpg',
    '[{"title":"Gà Hấp Lá Bưởi","cleanName":"ga_hap_la_buoi.jpg","url":"/images/restaurants/REST_18/ga_hap_la_buoi.jpg"},{"title":"Gà Hấp Trái Bưởi + Cháo","cleanName":"ga_hap_trai_buoi_chao.jpg","url":"/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg"},{"title":"Gà Nướng Muối Ớt","cleanName":"ga_nuong_muoi_ot.jpg","url":"/images/restaurants/REST_18/ga_nuong_muoi_ot.jpg"},{"title":"Gà Nấu Tiềm Ớt Hiểm","cleanName":"ga_nau_tiem_ot_hiem.jpg","url":"/images/restaurants/REST_18/ga_nau_tiem_ot_hiem.jpg"},{"title":"Gà Ta Trộn Gỏi + Rượu Bưởi","cleanName":"ga_ta_tron_goi_ruou_buoi.jpg","url":"/images/restaurants/REST_18/ga_ta_tron_goi_ruou_buoi.jpg"},{"title":"Gỏi Bưởi","cleanName":"goi_buoi.jpg","url":"/images/restaurants/REST_18/goi_buoi.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_19',
    'Quán Ăn CÔ TƯƠI',
    '85 - 87 Cách Mạng Tháng 8, Phường Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9515,
    106.8188,
    '05:30 - 21:00',
    'approved',
    'verified',
    'Khảo sát thực tế Google Sheet 2026',
    '2026-11-11',
    false,
    '/images/restaurants/REST_19/bun_bo_hue_thuong.jpg',
    '[{"title":"bún bò huế thường","cleanName":"bun_bo_hue_thuong.jpg","url":"/images/restaurants/REST_19/bun_bo_hue_thuong.jpg"},{"title":"cơm sườn","cleanName":"com_suon.jpg","url":"/images/restaurants/REST_19/com_suon.jpg"},{"title":"cơm sườn trứng","cleanName":"com_suon_trung.jpg","url":"/images/restaurants/REST_19/com_suon_trung.jpg"},{"title":"phở tái nạm","cleanName":"pho_tai_nam.jpg","url":"/images/restaurants/REST_19/pho_tai_nam.jpg"},{"title":"phở đặc biệt","cleanName":"pho_dac_biet.jpg","url":"/images/restaurants/REST_19/pho_dac_biet.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_20',
    'Bánh cuốn Thiên Hương 6',
    '36/3 Đ. Võ Thị Sáu, Phường Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.9505,
    106.8322,
    '06:00 - 14:00',
    'approved',
    'verified',
    'Khảo sát thực tế Google Sheet 2026',
    '2026-11-11',
    false,
    '/images/restaurants/REST_20/banh_uot.jpg',
    '[{"title":"bánh ướt","cleanName":"banh_uot.jpg","url":"/images/restaurants/REST_20/banh_uot.jpg"},{"title":"bánh ướt trứng","cleanName":"banh_uot_trung.jpg","url":"/images/restaurants/REST_20/banh_uot_trung.jpg"},{"title":"cuốn nhân thịt","cleanName":"cuon_nhan_thit.jpg","url":"/images/restaurants/REST_20/cuon_nhan_thit.jpg"},{"title":"cuốn tôm thịt","cleanName":"cuon_tom_thit.jpg","url":"/images/restaurants/REST_20/cuon_tom_thit.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;
INSERT INTO public.restaurants (id, name, address, area, lat, lng, opening_hours, status, verification_status, verification_source, verified_at, is_specialty_spot, avatar_url, photos, cover_image) VALUES (
    'REST_21',
    'Bánh mì chảo Khang',
    '88 Huỳnh Văn Lũy, Phường Trấn Biên, Đồng Nai',
    'Trấn Biên',
    10.954,
    106.8275,
    '06:00 - 11:00',
    'approved',
    'verified',
    'Khảo sát thực tế Google Sheet 2026',
    '2026-11-11',
    false,
    '/images/restaurants/REST_21/full_topping.jpg',
    '[{"title":"full topping","cleanName":"full_topping.jpg","url":"/images/restaurants/REST_21/full_topping.jpg"},{"title":"không bò","cleanName":"khong_bo.jpg","url":"/images/restaurants/REST_21/khong_bo.jpg"},{"title":"sốt tiêu đen","cleanName":"sot_tieu_den.jpg","url":"/images/restaurants/REST_21/sot_tieu_den.jpg"},{"title":"xíu mại","cleanName":"xiu_mai.jpg","url":"/images/restaurants/REST_21/xiu_mai.jpg"}]'::jsonb,
    ''
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    opening_hours = EXCLUDED.opening_hours,
    photos = EXCLUDED.photos,
    cover_image = EXCLUDED.cover_image;

-- Chèn 146 Món ăn
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_001',
    'REST_01',
    'Chả lụi',
    20000,
    '20.000 VNĐ',
    'mon_kho',
    '["mon_kho","vi_thanh","man","heo","dac_san_dong_nai","an_vat"]'::jsonb,
    '/images/restaurants/REST_01/quan_cha_lui_co_yen.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_002',
    'REST_02',
    'Cơm Heo Chiên Xù',
    65000,
    '65.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_02/com_heo_chien_xu.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_003',
    'REST_02',
    'Cơm Thị Gà chiên giòn',
    65000,
    '65.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_02/com_ga_chien_gion.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_004',
    'REST_02',
    'Cơm Cari Nhật (Heo / Gà Xù)',
    75000,
    '75.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga","heo"]'::jsonb,
    '/images/restaurants/REST_02/com_cari_nhat_heo_ga.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_005',
    'REST_02',
    'Cơm Cari Nhật Bánh Gà Phô Mai',
    75000,
    '75.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_02/com_cari_nhat_heo_ga.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_006',
    'REST_02',
    'Cơm Lươn',
    145000,
    '145.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_02/com_luon.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_007',
    'REST_02',
    'Cơm Cá Hồi Sống (Sốt Cay / Sốt Mayo Cay)',
    155000,
    '155.000 VNĐ',
    'com',
    '["com","mon_kho","vi_cay","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_02/com_ca_hoi_song.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_008',
    'REST_02',
    'Udon Bò Trứng',
    65000,
    '65.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_02/udon_bo_trung.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_009',
    'REST_02',
    'Soup Sò Điệp',
    79000,
    '79.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_02/soup_so_diep.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_010',
    'REST_02',
    'Soup Bào Ngư',
    125000,
    '125.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_02/soup_bao_ngu.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_011',
    'REST_02',
    'Soup Kim Chi & Cơm Trắng',
    79000,
    '79.000 VNĐ',
    'com',
    '["mon_nuoc","com","vi_cay","man"]'::jsonb,
    '/images/restaurants/REST_02/kim_ch_com_trang.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_012',
    'REST_02',
    'Soup Rong biển & Cơm trắng',
    79000,
    '79.000 VNĐ',
    'com',
    '["mon_nuoc","com","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_02/rong_bien_com_trang.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_013',
    'REST_02',
    'Miến Xào Sốt XO Bò',
    89000,
    '89.000 VNĐ',
    'mon_kho',
    '["mon_kho","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_02/mien_xao_sot_bo_xo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_014',
    'REST_02',
    'Combo (1 người) Cơm Heo / Gà Chiên Xù Tonkatsu + Trà Tắc Mật Ong/ Nước Mơ Ngâm',
    79000,
    '79.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga","heo"]'::jsonb,
    '/images/restaurants/REST_02/combo_1.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_015',
    'REST_02',
    'Combo (1 người) Cơm Lươn Nhật + Trà Tắc Mật Ong / Nước Mơ Ngâm',
    159000,
    '159.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_02/combo_1.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_016',
    'REST_02',
    'Combo 1 (2-3 người) Salad (Mè Rang/ Chanh Dây), Hoành Thánh Nhân Phô Mai,Cơm Phủ Trứng Ghẹ',
    170000,
    '170.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_02/combo_1.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_017',
    'REST_02',
    'Combo 2 (2-3 người) Cơm Dương Châu Phủ Trứng, Sụn Gà Cjieen Nước Mắm, Miến Xào Sốt XO Hải Sản',
    209000,
    '209.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san","ga"]'::jsonb,
    '/images/restaurants/REST_02/combo_2.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_018',
    'REST_02',
    'Combo 3 (3-5 người) Salad (Mè Rang/ Chanh Dây / Dầu Giấm), Soup Kim Chi + Cơm, Gà Viên Ba Loại Sốt, Chả Giò Tôm',
    249000,
    '249.000 VNĐ',
    'com',
    '["mon_nuoc","com","vi_cay","man","hai_san","ga","heo"]'::jsonb,
    '/images/restaurants/REST_02/combo_3.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_019',
    'REST_02',
    'Combo 4 (3-4 người) Salad (Mè Rang/ Chanh Dây / Dầu Giấm), Tokbokki Phô Mai, Gà Viên Ba Loại Sốt, Mì Kim Chi',
    249000,
    '249.000 VNĐ',
    'mon_kho',
    '["mi","vi_cay","man","ga","an_vat"]'::jsonb,
    '/images/restaurants/REST_02/combo_4.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_020',
    'REST_03',
    'Mì Lá Dứa',
    55000,
    '55.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_03/mi_la_dua.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_021',
    'REST_03',
    'Mì Hoành Thánh',
    55000,
    '55.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_03/hoanh_thanh.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_022',
    'REST_03',
    'Hủ Tiếu Mì',
    55000,
    '55.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","hu_tieu","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_03/hu_tieu_mi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_023',
    'REST_03',
    'Hủ Tiếu Khô',
    55000,
    '55.000 VNĐ',
    'mon_kho',
    '["mon_kho","hu_tieu","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_03/hu_tieu_kho.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_024',
    'REST_03',
    'Bún Gạo',
    55000,
    '55.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_03/bun_gao.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_025',
    'REST_04',
    'Mì Cay Bò/ Tôm',
    50000,
    '50.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","vi_cay","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_04/mi_cay_bo_tom.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_026',
    'REST_04',
    'Mì Cay Thập Cẩm',
    65000,
    '65.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","mi","vi_cay","man"]'::jsonb,
    '/images/restaurants/REST_04/mi_thap_cam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_027',
    'REST_04',
    'Mì SPAGHETTI size S Bò / Sate Tôm',
    35000,
    '35.000 VNĐ',
    'mon_kho',
    '["mon_kho","mi","vi_cay","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_04/mi_spaghetti_size_s.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_028',
    'REST_04',
    'Mì SPAGHETTI size L Bò / Sate Tôm',
    52000,
    '52.000 VNĐ',
    'mon_kho',
    '["mon_kho","mi","vi_cay","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_04/mi_spaghetti_size_m.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_029',
    'REST_04',
    'Combo mini Gà Rán 4 vị sốt (2miếng, Salad trộn, Cơm chiên rong biển',
    72000,
    '72.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_04/combo_mini.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_030',
    'REST_04',
    'Combo size S Gà Rán 4 vị sốt (4miếng), Salad trộn, Cơm chiên rong biển',
    125000,
    '125.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_04/combo_size_s.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_031',
    'REST_04',
    'Combo size M Gà Rán 4 vị sốt (6 miếng), Salad trộn, Cơm chiên rong biển',
    181000,
    '181.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_04/combo_size_l.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_032',
    'REST_04',
    'Combo size L Gà Rán 4 vị sốt (8 miếng), Salad trộn, Cơm chiên rong biển',
    245000,
    '245.000 VNĐ',
    'com',
    '["com","mon_kho","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_04/combo_size_l.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_033',
    'REST_05',
    'Bún Đậu Đặc Biệt 1 người',
    65000,
    '65.000 VND/ 1 phân',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_05/bun_dau_dac_biet_1_nguoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_034',
    'REST_05',
    'Bún Đậu Đặc Biệt 2 người',
    60000,
    '60.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_05/dac_biet_2_nguoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_035',
    'REST_05',
    'Bún Đậu Tá Lả 2 người',
    90000,
    '90.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_05/bun_dau_dac_biet_1_nguoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_036',
    'REST_05',
    'Bún Đậu Thịt',
    45000,
    '45.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_05/bun_dau_thit_luoc.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_037',
    'REST_05',
    'Bún Đậu Nem Chua',
    45000,
    '45.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_05/bun_dau_nem_chua_ran.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_038',
    'REST_05',
    'Bún Đậu Chả Cốm',
    45000,
    '45.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_05/bun_dau_cha_com.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_039',
    'REST_06',
    'Mì Nước / Khô / Bún Ốc Hến',
    38000,
    '38.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","mi","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_06/oc_hen_thuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_040',
    'REST_06',
    'Mì Nước / Khô / Bún Thập Cẩm',
    55000,
    '55.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_06/thap_cam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_041',
    'REST_06',
    'Mì Nước / Khô / Bún Đặc Biệt',
    65000,
    '65.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_06/dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_042',
    'REST_07',
    'Bún Thái Viên',
    39000,
    '39.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_cay","man"]'::jsonb,
    '/images/restaurants/REST_07/bun_thai_vien.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_043',
    'REST_07',
    'Bún Thái Bò Trứng / Thập Cẩm',
    55000,
    '55.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_cay","man","bo"]'::jsonb,
    '/images/restaurants/REST_07/bun_thai_bo_trung.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_044',
    'REST_07',
    'Bún Thái Hải Sản',
    60000,
    '60.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_cay","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_07/bun_thai_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_045',
    'REST_07',
    'Bún Thái Đặc Biệt',
    65000,
    '65.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_cay","man"]'::jsonb,
    '/images/restaurants/REST_07/bun_thai_dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_046',
    'REST_07',
    'Mì Trộn Viên',
    42000,
    '42.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_07/mi_tron_ca_vien.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_047',
    'REST_07',
    'Mì Trộn Bò Trứng / Thập Cẩm',
    58000,
    '58.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_07/mi_tron_bo_trung.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_048',
    'REST_07',
    'Mì Trộn Hải Sản',
    63000,
    '63.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_07/mi_tron_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_049',
    'REST_07',
    'Mì Trộn Đặc Biệt',
    68000,
    '68.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_07/mi_tron_dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_050',
    'REST_08',
    'Bún Thịt Nướng',
    35000,
    '35.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_08/bun_thit_nuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_051',
    'REST_08',
    'Bò Lá Lốt Bánh Hỏi',
    50000,
    '50.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","banh_hoi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_08/bo_la_lot_banh_hoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_052',
    'REST_08',
    'Bò Mỡ Chài Bánh Hỏi',
    50000,
    '50.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","banh_hoi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_08/bo_mo_chai_banh_hoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_053',
    'REST_08',
    'Nem Nướng Bánh Hỏi',
    45000,
    '45.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","banh_hoi","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_08/nem_nuong_banh_hoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_054',
    'REST_08',
    'Thịt Nướng Bánh Hỏi',
    45000,
    '45.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","banh_hoi","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_08/thit_nuong_banh_hoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_055',
    'REST_08',
    'Thập Cẩm 2 người',
    170000,
    '170.000 VND/1 phần',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_08/thap_cam_2nguoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_056',
    'REST_08',
    'Thập Cẩm 3 người',
    190000,
    '190.000 VND/1 phần',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_08/thap_cam_3_nguoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_057',
    'REST_09',
    'Bún Bò Trẻ Em',
    30000,
    '30.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_09/mang_bap_hoa.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_058',
    'REST_09',
    'Bún Bò Thường',
    35000,
    '35.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_09/thuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_059',
    'REST_09',
    'Bún Bò Tái / Giò Heo',
    45000,
    '45.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo","heo"]'::jsonb,
    '/images/restaurants/REST_09/tai_gio_heo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_060',
    'REST_09',
    'Bún Bò Đặc Biệt',
    55000,
    '55.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_09/dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_061',
    'REST_09',
    'Bún Bò Măng Bắp Hoa',
    55000,
    '55.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_09/mang_bap_hoa.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_062',
    'REST_09',
    'Bún Bò Măng Đặc Biệt',
    65000,
    '65.000 VND',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_09/dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_063',
    'REST_10',
    'Cơm Chiên Tỏi',
    40000,
    '40.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_10/com_chien_toi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_064',
    'REST_10',
    'Cơm Chiên Dương Châu',
    45000,
    '45.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_10/com_chien_duong_chau.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_065',
    'REST_10',
    'Cơm Chiên Cá Mặn / Hải Sản',
    55000,
    '55.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_10/com_chien_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_066',
    'REST_10',
    'Cơm Chiên Lúc Lắc / Bò',
    75000,
    '75.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_10/com_chien_luc_lac_bo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_067',
    'REST_10',
    'Mì Giòn / Gói / Mềm Thập Cẩm',
    75000,
    '75.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_10/mi_xao_thap_cam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_068',
    'REST_10',
    'Mì Giòn / Gói / Mềm Hải Sản',
    75000,
    '75.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_10/mi_xao_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_069',
    'REST_10',
    'Mì Giòn / Gói / Mềm Xào Bò',
    75000,
    '75.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_10/mi_xao_bo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_070',
    'REST_10',
    'Hủ Tiếu Thập Cẩm / Hải Sản / Bò',
    75000,
    '75.000 VND',
    'mon_kho',
    '["hu_tieu","vi_thanh","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_10/hu_tieu_xao_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_071',
    'REST_10',
    'Nui Hải Sản / Thập Cẩm / Bò',
    75000,
    '75.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_10/nui_xao_bo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_072',
    'REST_10',
    'Cơm Xào Rau Thập Cẩm / Hải Sản / Bò',
    75000,
    '75.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san","bo"]'::jsonb,
    '/images/restaurants/REST_10/com_chien_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_073',
    'REST_11',
    'Chạo Tôm (Bánh hỏi + Rau Sống + Nước Mắm)',
    27000,
    '27.000 VND/1 cây',
    'mon_kho',
    '["mon_kho","banh_hoi","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/chao_tom.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_074',
    'REST_11',
    'Lẩu Tôm',
    300000,
    '300.000 - 400.000 - 500.000 VND',
    'lau',
    '["mon_nuoc","lau","vi_thanh","man","hai_san","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_11/lau_tom.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_075',
    'REST_11',
    'Lẩu Hải Sản',
    300000,
    '300.000 - 400.000 - 500.000 VND',
    'lau',
    '["mon_nuoc","lau","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/lau_cua_dong_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_076',
    'REST_11',
    'Lẩu Cua Đồng Hải Sản',
    300000,
    '300.000 - 400.000 - 500.000 VND',
    'lau',
    '["mon_nuoc","lau","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/lau_cua_dong_hai_san.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_077',
    'REST_11',
    'Lẩu Cá Thác Lác Nấu Khổ Qua',
    300000,
    '300.000 - 400.000 - 500.000 VND',
    'lau',
    '["mon_nuoc","lau","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_bong_lau_kho_to.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_078',
    'REST_11',
    'Cá Thác Lác Chiên / Hấp',
    200000,
    '200.000 - 250.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_loc_hap.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_079',
    'REST_11',
    'Gỏi Bò Rau Mầm',
    200000,
    '200.000 - 250.000 - 300.000 VND',
    'goi',
    '["mon_kho","goi","vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_11/goi_bo_rau_mam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_080',
    'REST_11',
    'Hàu Nướng Mọi / Mỡ Hành / Phô Mai',
    35000,
    '35.000/1 con',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/hau_nuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_081',
    'REST_11',
    'Nghêu Hấp Thái / Xả / Xào Tỏi',
    200000,
    '200.000 - 250.000 VND',
    'mon_kho',
    '["vi_cay","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ngheu_hap.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_082',
    'REST_11',
    'Sò Huyết Cháy Tỏi / Rang Me /Hấp Gừng / Rang Muối / Nướng',
    200000,
    '200.000 - 250.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/so_huyet_chay_toi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_083',
    'REST_11',
    'Ốc Len Xào Dừa',
    200000,
    '200.000 - 250.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/oc_len_xao_dua.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_084',
    'REST_11',
    'Cá Bông Lau Kho Tộ',
    200000,
    '200.000 - 250.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_bong_lau_kho_to.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_085',
    'REST_11',
    'Cá Tai Tượng Chiên Xù',
    320000,
    '320.000 VND/1 con',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_tai_tuong_chien_xu.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_086',
    'REST_11',
    'Cá Tai Tượng Sốt Cà Chua',
    370000,
    '370.000 VND/1 con',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_tai_tuong_chien_xu.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_087',
    'REST_11',
    'Cá Kèo Chiên/ Nướng / Kho',
    200000,
    '200.000 - 250.000 - 300.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_bong_lau_kho_to.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_088',
    'REST_11',
    'Cá Lóc Hấp/ Quay/ Nướng',
    330000,
    '330.000/ con',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/ca_loc_hap.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_089',
    'REST_11',
    'Rau Luộc Kho Quẹt',
    80000,
    '80.000 VND',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_11/rau_luoc_kho_quet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_090',
    'REST_11',
    'Rau Muống Xào Tỏi',
    60000,
    '60.000 VND',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_11/goi_bo_rau_mam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_091',
    'REST_11',
    'Mực Xào Chua Ngọt/ Nướng Sa Tế/ Hấp Gừng',
    300000,
    '300.000 - 400.000 - 500.000 VND',
    'mon_kho',
    '["vi_cay","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_11/muc_nuong_sa_te.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_092',
    'REST_12',
    'Lẩu chay 1-2 người',
    45000,
    '45.000 VND/1 người',
    'lau',
    '["mon_nuoc","lau","vi_thanh","chay"]'::jsonb,
    '/images/restaurants/REST_12/lau_3_nguoi_tro_len.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_093',
    'REST_12',
    'Lẩu chay 3 người trở lên',
    40000,
    '40.000 VND/1 người',
    'lau',
    '["mon_nuoc","lau","vi_thanh","chay"]'::jsonb,
    '/images/restaurants/REST_12/lau_3_nguoi_tro_len.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_094',
    'REST_12',
    'Đồ Ăn Vặt (Cá Viên/ Bò Viên/ Xúc Xích/ Đậu Hủ Nấm/ Chả Giò)',
    20000,
    '20.000 VND/1 phần',
    'mon_kho',
    '["vi_thanh","chay","hai_san","bo","heo","an_vat"]'::jsonb,
    '/images/restaurants/REST_12/do_an_vat_chay.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_095',
    'REST_13',
    'Bún Chả',
    35000,
    '35.000 VND/1 phần',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man","heo"]'::jsonb,
    '/images/restaurants/REST_13/bun_cha_phu_khang.webp',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_096',
    'REST_13',
    'Nem Cua Bể',
    12000,
    '12.000/1 cái',
    'mon_kho',
    '["vi_thanh","man","hai_san","heo","an_vat"]'::jsonb,
    '/images/restaurants/REST_13/nem_cua_be.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_097',
    'REST_14',
    'Cơm Gà Xé / Cánh Gà',
    40000,
    '40.000 VND',
    'com',
    '["com","mon_kho","vi_thanh","man","hai_san","ga"]'::jsonb,
    '/images/restaurants/REST_14/com_ga_xe_s88.webp',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_098',
    'REST_14',
    'Cơm Đùi Gà Chiên Mắm/ Sốt Thái (Đùi Tỏi, Má Đùi, Cánh)',
    45000,
    '45.000 VND',
    'com',
    '["com","mon_kho","vi_cay","man","hai_san","ga"]'::jsonb,
    '/images/restaurants/REST_14/com_dui_ga_chien_mam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_099',
    'REST_15',
    'Cháo Hến',
    30000,
    '30.000 VND',
    'mon_nuoc',
    '["mon_nuoc","chao","vi_thanh","man","hai_san","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_15/chao_hen_co_tuoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_100',
    'REST_15',
    'Cháo Thêm Hến',
    40000,
    '40.000 VND',
    'mon_nuoc',
    '["mon_nuoc","chao","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_15/chao_them_hen.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_101',
    'REST_16',
    'Gỏi Cá',
    200000,
    '200.000 VND',
    'goi',
    '["mon_kho","goi","vi_thanh","man","hai_san","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_16/goi_ca_kim_yen_tan_mai.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_102',
    'REST_16',
    'Cháo Cá',
    110000,
    '110.000 VND',
    'mon_nuoc',
    '["mon_nuoc","chao","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_16/chao_ca.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_103',
    'REST_16',
    'Cá Nấu Mẻ/ Nấu Canh Chua',
    200000,
    '200.000 VND',
    'mon_nuoc',
    '["mon_nuoc","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_16/ca_nau_me.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_104',
    'REST_16',
    'Lươn Xào Lăn/ Chiên Giòn',
    120000,
    '120.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_16/luon_xao_lan.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_105',
    'REST_16',
    'Cháo Lươn',
    110000,
    '110.000 VND',
    'mon_nuoc',
    '["mon_nuoc","chao","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_16/chao_luon.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_106',
    'REST_16',
    'Mực Né/ Hấp',
    150000,
    '150.000 VND',
    'mon_kho',
    '["vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_16/muc_ne.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_107',
    'REST_16',
    'Bò Né/ Nhúng Giấm',
    200000,
    '200.000 VND',
    'mon_kho',
    '["vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_16/bo_nhung_giam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_108',
    'REST_16',
    'Bò Bóp Thấu',
    150000,
    '150.000 VND',
    'mon_kho',
    '["vi_thanh","man","bo"]'::jsonb,
    '/images/restaurants/REST_16/bo_bop_thau.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_109',
    'REST_17',
    'Xôi Bồ Câu',
    130000,
    '130.000 VND',
    'mon_kho',
    '["mon_kho","xoi","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_17/xoi_bo_cau.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_110',
    'REST_17',
    'Dồi Sụn',
    130000,
    '130.000 VND',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_17/doi_sun.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_111',
    'REST_17',
    'Mì Tươi Tóp Mỡ Giòn',
    95000,
    '95.000 VND',
    'mon_kho',
    '["mon_kho","mi","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_112',
    'REST_17',
    'Bún Gạo Xào Hải Sản',
    115000,
    '115.000 VND',
    'mon_kho',
    '["mon_kho","bun","vi_thanh","man","hai_san"]'::jsonb,
    '/images/restaurants/REST_17/trung_non_xao_muop.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_113',
    'REST_17',
    'Bồ Câu Rôti/ Nướng Muối Ớt',
    150000,
    '150.000 VND/ 1 con',
    'mon_kho',
    '["vi_cay","man","ga"]'::jsonb,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_114',
    'REST_17',
    'Gà Hấp Trái Bưởi',
    250000,
    '250.000 VND/1 con',
    'mon_kho',
    '["vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_115',
    'REST_17',
    'Gà Tre Hấp Lá Chanh/ Hành',
    250000,
    '250.000 VND/1 con',
    'mon_kho',
    '["vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_116',
    'REST_17',
    'Gà Tre Luộc + Cháo + Gỏi',
    250000,
    '250.000 VND/1 con',
    'goi',
    '["mon_nuoc","chao","mon_kho","goi","vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_17/bo_cau_roti.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_117',
    'REST_17',
    'Ngọc Kê Xào Bông Hẹ',
    100000,
    '100.000 VND/1 phần',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_17/trung_non_xao_muop.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_118',
    'REST_17',
    'Đầu Cổ Vịt Phá Lấu',
    100000,
    '100.000 VND/1 phần',
    'mon_kho',
    '["vi_thanh","man","ga"]'::jsonb,
    '/images/restaurants/REST_17/dau_co_vit_pha_lau.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_119',
    'REST_17',
    'Trứng non xài mướp',
    100000,
    '100.000 VND/1 con',
    'mon_kho',
    '["vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_17/trung_non_xao_muop.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_120',
    'REST_18',
    'Gỏi Làng Bưởi',
    170000,
    '170.000 VND/1 đĩa',
    'goi',
    '["mon_kho","goi","vi_thanh","man","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/goi_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_121',
    'REST_18',
    'Gỏi Làng Bưởi Đặc Biệt',
    170000,
    '170.000 VND/1 đĩa',
    'goi',
    '["mon_kho","goi","vi_thanh","man","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/goi_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_122',
    'REST_18',
    'Gỏi Làng Bưởi Trong Trái Bưởi',
    320000,
    '320.000 VND/1 đĩa',
    'goi',
    '["mon_kho","goi","vi_thanh","man","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/goi_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_123',
    'REST_18',
    'Gà Nướng Muối Ớt/ Nồi Đất',
    300000,
    '1 món 300.000 VND/1kg 2 món 340.000 VND/1 kg',
    'mon_kho',
    '["vi_cay","man","ga"]'::jsonb,
    '/images/restaurants/REST_18/ga_nuong_muoi_ot.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_124',
    'REST_18',
    'Gà Hấp Lá Bưởi/ Lá Chanh/ Hành/ Tỏi/ Mắm Nhĩ',
    300000,
    '1 món 300.000 VND/1kg 2 món 340.000 VND/1 kg',
    'mon_kho',
    '["vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_hap_la_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_125',
    'REST_18',
    'Gà Ta Nấu Rượu Bưởi/ Tiềm Ớt Hiểm',
    340000,
    '340.000 VND/1 kg',
    'mon_kho',
    '["vi_cay","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_nau_tiem_ot_hiem.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_126',
    'REST_18',
    'Gà Ta Nướng/ Nấu Lẩu/ Trộn Gỏi + Rượu Bưởi',
    350000,
    '350.000 VND/1 kg',
    'goi',
    '["mon_nuoc","lau","mon_kho","goi","vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_ta_tron_goi_ruou_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_127',
    'REST_18',
    'Gà Ta Hấp Trái Bưởi + Trộn Gỏi',
    310000,
    '310.000 VND/1 kg',
    'goi',
    '["mon_kho","goi","vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_ta_tron_goi_ruou_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_128',
    'REST_18',
    'Gà Ta Hấp Trái Bưởi + Nấu Cháo',
    330000,
    '330.000 VND/1 kg',
    'mon_nuoc',
    '["mon_nuoc","chao","vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_129',
    'REST_18',
    'Gà Ta Hấp Trái Bưởi + Nấu Lẩu',
    400000,
    '400.000 VND/1kg',
    'lau',
    '["mon_nuoc","lau","vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_130',
    'REST_18',
    'Gà Ta Nướng + Gỏi Bưởi',
    360000,
    '360.000 VND/1kg',
    'goi',
    '["mon_kho","goi","vi_thanh","man","ga","dac_san_dong_nai"]'::jsonb,
    '/images/restaurants/REST_18/goi_buoi.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_131',
    'REST_19',
    'Bún Riêu Cua Đồng Đặc Biệt',
    35000,
    '35.000đ',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/pho_dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_132',
    'REST_19',
    'Cơm Tấm Sườn Bì Chả',
    40000,
    '40.000đ',
    'com',
    '["com","mon_kho","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/com_suon.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_133',
    'REST_19',
    'Canh Bún Thập Cẩm (Size Nhỏ / Lớn)',
    30000,
    '30k / 40k',
    'mon_nuoc',
    '["mon_nuoc","bun","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/bun_bo_hue_thuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_134',
    'REST_19',
    'Bún Bò Huế Thường',
    45000,
    '45.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","bun","bo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/bun_bo_hue_thuong.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_135',
    'REST_19',
    'Phở Tái Nạm',
    45000,
    '45.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","bo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/pho_tai_nam.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_136',
    'REST_19',
    'Phở Đặc Biệt',
    55000,
    '55.000 VNĐ',
    'mon_nuoc',
    '["mon_nuoc","bo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/pho_dac_biet.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_137',
    'REST_19',
    'Cơm Sườn',
    35000,
    '35.000 VNĐ',
    'com',
    '["com","mon_kho","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/com_suon.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_138',
    'REST_19',
    'Cơm Sườn Trứng',
    40000,
    '40.000 VNĐ',
    'com',
    '["com","mon_kho","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_19/com_suon_trung.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_139',
    'REST_20',
    'Bánh Cuốn Nhân Thịt',
    40000,
    '40.000 VNĐ',
    'mon_kho',
    '["mon_kho","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_20/cuon_nhan_thit.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_140',
    'REST_20',
    'Bánh Cuốn Nhân Tôm Thịt',
    50000,
    '50.000 VNĐ',
    'mon_kho',
    '["mon_kho","hai_san","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_20/cuon_nhan_thit.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_141',
    'REST_20',
    'Bánh Ướt',
    40000,
    '40.000 VNĐ',
    'mon_kho',
    '["mon_kho","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_20/banh_uot.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_142',
    'REST_20',
    'Bánh Ướt Trứng',
    45000,
    '45.000 VNĐ',
    'mon_kho',
    '["mon_kho","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_20/banh_uot_trung.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_143',
    'REST_21',
    'Chảo Không Bò',
    35000,
    '35.000 VNĐ',
    'mon_kho',
    '["mon_kho","an_vat","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_21/khong_bo.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_144',
    'REST_21',
    'Chảo Sốt Tiêu Đen',
    50000,
    '50.000 VNĐ',
    'mon_kho',
    '["mon_kho","bo","vi_cay","man"]'::jsonb,
    '/images/restaurants/REST_21/sot_tieu_den.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_145',
    'REST_21',
    'Chảo Full Topping',
    45000,
    '45.000 VNĐ',
    'mon_kho',
    '["mon_kho","bo","heo","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_21/full_topping.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (id, restaurant_id, name, price, raw_price_text, category, tags, image_url, status) VALUES (
    'DISH_146',
    'REST_21',
    'Xíu Mại',
    23000,
    '23.000 VNĐ',
    'mon_kho',
    '["mon_kho","heo","an_vat","vi_thanh","man"]'::jsonb,
    '/images/restaurants/REST_21/xiu_mai.jpg',
    'approved'
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    raw_price_text = EXCLUDED.raw_price_text,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    image_url = EXCLUDED.image_url;

-- Chèn 4 Tứ đại đặc sản
INSERT INTO public.specialties (id, name, classification, summary, description, reference_price_range, typical_restaurant, typical_restaurant_id, suggested_query, photos, cover_image) VALUES (
    'SPEC_01',
    'Gỏi Bưởi Tân Triều',
    'Đặc sản gắn với địa danh Đồng Nai (Làng bưởi Tân Triều)',
    'Món gỏi trứ danh xứ cù lao Tân Triều kết hợp tép bưởi đường lá cam mọng nước, vị thanh ngọt pha chua dịu cùng tôm sông Đồng Nai, thịt ba chỉ, rau răm và đậu phộng.',
    '',
    '170.000đ – 320.000đ / đĩa (dùng cho 2–4 người)',
    '',
    '',
    'Nhóm 3 người muốn thưởng thức đặc sản Gỏi bưởi Tân Triều và món gà tại Tân Triều với ngân sách 500.000 đồng',
    '[{"url":"/images/restaurants/REST_18/goi_buoi.jpg","title":"Gỏi Bưởi Tân Triều Chính Gốc","sub":"Tép bưởi đường lá cam trộn tôm sông"},{"url":"/images/restaurants/REST_18/ga_ta_tron_goi_ruou_buoi.jpg","title":"Gà Ta Trộn Gỏi Bưởi","sub":"Đặc sản phục vụ tại Làng Bưởi Năm Huệ"}]'::jsonb,
    ''
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.specialties (id, name, classification, summary, description, reference_price_range, typical_restaurant, typical_restaurant_id, suggested_query, photos, cover_image) VALUES (
    'SPEC_02',
    'Gà Hấp Trái Bưởi Tân Triều',
    'Đặc sản gắn với địa danh Đồng Nai (Làng bưởi Tân Triều)',
    'Gà ta hoặc gà tre thả vườn được ướp gia vị, đặt nguyên trong vỏ trái bưởi Tân Triều khoét rỗng và đem hấp cách thủy, giúp thịt gà thấm tinh dầu vỏ bưởi thơm dịu và ngọt mềm.',
    '',
    '250.000đ – 330.000đ / con hoặc phần',
    '',
    '',
    'Nhóm 3 người muốn ăn Gà hấp trái bưởi ở khu vực Tân Triều với ngân sách 350.000 đồng',
    '[{"url":"/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg","title":"Gà Hấp Trái Bưởi Tân Triều","sub":"Thịt gà thấm tinh dầu vỏ bưởi thơm ngọt tự nhiên"},{"url":"/images/restaurants/REST_18/ga_hap_la_buoi.jpg","title":"Gà Hấp Lá Bưởi Non","sub":"Hương vị đồng quê cù lao Tân Triều"}]'::jsonb,
    ''
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.specialties (id, name, classification, summary, description, reference_price_range, typical_restaurant, typical_restaurant_id, suggested_query, photos, cover_image) VALUES (
    'SPEC_03',
    'Lẩu Tôm Sông & Chạo Tôm Biên Hòa',
    'Món ẩm thực tiêu biểu gắn với vùng sông nước Đồng Nai',
    'Nước lẩu chua thanh nấu cùng tôm tươi chắc thịt, ăn kèm bún, rau đồng nội và món chạo tôm nướng mía thơm lừng cuốn bánh hỏi.',
    '',
    'Chạo tôm 27.000đ/cây; Lẩu tôm 300.000đ – 500.000đ/nồi (3–5 người)',
    '',
    '',
    'Nhóm 4 người ở Trấn Biên muốn ăn Lẩu tôm và Chạo tôm với ngân sách 450.000 đồng',
    '[{"url":"/images/restaurants/REST_11/lau_tom.jpg","title":"Lẩu Tôm Sông Biên Hòa (5 Ri)","sub":"Tôm sông ngọt lịm nấu cùng nước dùng chua thanh"},{"url":"/images/restaurants/REST_11/chao_tom.jpg","title":"Chạo Tôm Nướng Mía Bánh Hỏi","sub":"Chạo tôm quết nướng vàng thơm lừng"}]'::jsonb,
    ''
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.specialties (id, name, classification, summary, description, reference_price_range, typical_restaurant, typical_restaurant_id, suggested_query, photos, cover_image) VALUES (
    'SPEC_04',
    'Chả Lụi Bửu Long & Gỏi Cá Tân Mai',
    'Món ăn địa phương phổ biến tại Biên Hòa – Đồng Nai',
    'Những món ăn gắn liền với đời sống học sinh, sinh viên và gia đình tại Biên Hòa: từ chả lụi nướng than hồng giá bình dân 30.000đ ở Bửu Long đến món gỏi cá truyền thống khu vực Tân Mai – Tam Hiệp.',
    '',
    '30.000đ/phần (Chả lụi) – 200.000đ/phần (Gỏi cá)',
    '',
    '',
    'Nhóm 3 sinh viên có 90.000 đồng muốn ăn vặt Chả lụi ở Bửu Long',
    '[{"url":"/images/restaurants/REST_01/cha_lui.jpg","title":"Chả Lụi Nướng Than Cô Yến Bửu Long","sub":"Món ăn vặt trứ danh sinh viên Biên Hòa"},{"url":"/images/restaurants/REST_16/goi_ca.jpg","title":"Gỏi Cá Tân Mai Kim Yến","sub":"Đặc sản cá nước ngọt gia truyền lâu năm"}]'::jsonb,
    ''
) ON CONFLICT (id) DO NOTHING;

-- Chèn Người dùng mặc định
INSERT INTO public.users (id, name, email, password_hash, role, restaurant_name, restaurant_address, restaurant_area, status) VALUES (
      'USR_ADMIN_01',
      'Ban Quản Trị Hệ Thống',
      'admin@hopviai.vn',
      '899cb07686a95dfc6de776757344882864537b3758003e05f2da7e6d4480c302',
      'admin',
      '',
      '',
      '',
      'active'
    ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, name, email, password_hash, role, restaurant_name, restaurant_address, restaurant_area, status) VALUES (
      'USR_PARTNER_01',
      'Lê Quốc Huy (Chủ quán)',
      'chuquan@hopviai.vn',
      'd6ad98d80b902ab17c98435a760b518b8bcdbfeb47b3f616bddcde00480c0e94',
      'partner',
      'Bún Thái & Mì Trộn Thành Minh',
      '129 Hưng Đạo Vương, Phường Trấn Biên, Biên Hòa, Đồng Nai',
      'Trấn Biên',
      'active'
    ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, name, email, password_hash, role, restaurant_name, restaurant_address, restaurant_area, status) VALUES (
      'USR_CUSTOMER_01',
      'Nguyễn Minh Anh',
      'khachhang@hopviai.vn',
      'd6ad98d80b902ab17c98435a760b518b8bcdbfeb47b3f616bddcde00480c0e94',
      'customer',
      '',
      '',
      '',
      'active'
    ) ON CONFLICT (id) DO NOTHING;
