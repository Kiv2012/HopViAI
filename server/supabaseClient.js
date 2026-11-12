/**
 * HỢP VỊ AI - SUPABASE CLOUD ADAPTER (ĐỒNG NAI)
 * Kết nối Realtime 2 chiều với Supabase PostgreSQL qua REST API (không phụ thuộc thư viện nặng).
 * Đảm bảo Zero-Downtime: Luôn ưu tiên dữ liệu mới nhất từ Supabase Cloud,
 * tự động lưu dự phòng và fallback nếu rớt mạng.
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vsmozipgdsjqromgbycm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_YrbTTzFo2dfEVA92N7561w_HU-05KQu';

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function requestSupabase(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('Supabase chưa được cấu hình URL hoặc Anon Key'));
    }

    try {
      const url = new URL(path, SUPABASE_URL);
      const dataString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': method === 'POST' ? 'return=representation' : 'count=exact'
        },
        timeout: 6000
      };

      if (dataString) {
        options.headers['Content-Length'] = Buffer.byteLength(dataString);
      }

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch (_) {
            parsed = raw;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, status: res.statusCode, data: parsed });
          } else {
            resolve({ success: false, status: res.statusCode, error: parsed });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: new Error('Supabase request timeout (6s)') });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err });
      });

      if (dataString) {
        req.write(dataString);
      }
      req.end();
    } catch (e) {
      resolve({ success: false, error: e });
    }
  });
}

// Chuyển đổi từ định dạng SQL snake_case sang camelCase chuẩn của ứng dụng Hợp Vị AI
function mapRestaurantFromSql(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    area: row.area,
    lat: Number(row.lat),
    lng: Number(row.lng),
    openingHours: row.opening_hours || row.openingHours || '',
    status: row.status || 'approved',
    verificationStatus: row.verification_status || row.verificationStatus || 'verified',
    verificationSource: row.verification_source || row.verificationSource || '',
    verifiedAt: row.verified_at || row.verifiedAt || '',
    isSpecialtySpot: Boolean(row.is_specialty_spot !== undefined ? row.is_specialty_spot : row.isSpecialtySpot),
    avatarUrl: row.avatar_url || row.avatarUrl || '',
    photos: Array.isArray(row.photos) ? row.photos : [],
    coverImage: row.cover_image || row.coverImage || ''
  };
}

function mapMenuItemFromSql(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id || row.restaurantId,
    name: row.name,
    price: Number(row.price || 0),
    rawPriceText: row.raw_price_text || row.rawPriceText || `${Number(row.price || 0).toLocaleString('vi-VN')}đ`,
    category: row.category || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    imageUrl: row.image_url || row.imageUrl || '',
    status: row.status || 'approved'
  };
}

function mapSpecialtyFromSql(row) {
  return {
    id: row.id,
    name: row.name,
    classification: row.classification || '',
    summary: row.summary || '',
    description: row.description || '',
    referencePriceRange: row.reference_price_range || row.referencePriceRange || '',
    typicalRestaurant: row.typical_restaurant || row.typicalRestaurant || '',
    typicalRestaurantId: row.typical_restaurant_id || row.typicalRestaurantId || '',
    suggestedQuery: row.suggested_query || row.suggestedQuery || '',
    photos: Array.isArray(row.photos) ? row.photos : [],
    coverImage: row.cover_image || row.coverImage || ''
  };
}

function mapFeedbackFromSql(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id || row.restaurantId,
    userName: row.user_name || row.userName,
    userRole: row.user_role || row.userRole || 'customer',
    rating: Number(row.rating || 5),
    comment: row.comment,
    status: row.status || 'approved',
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

/**
 * Tải danh sách nhà hàng thời gian thực từ Supabase
 */
async function fetchLiveRestaurants() {
  const res = await requestSupabase('/rest/v1/restaurants?select=*&order=id.asc');
  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    return res.data.map(mapRestaurantFromSql);
  }
  return null;
}

/**
 * Tải danh sách món ăn thời gian thực từ Supabase
 */
async function fetchLiveMenuItems() {
  const res = await requestSupabase('/rest/v1/menu_items?select=*&order=id.asc');
  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    return res.data.map(mapMenuItemFromSql);
  }
  return null;
}

/**
 * Tải đặc sản thời gian thực từ Supabase
 */
async function fetchLiveSpecialties() {
  const res = await requestSupabase('/rest/v1/specialties?select=*&order=id.asc');
  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    return res.data.map(mapSpecialtyFromSql);
  }
  return null;
}

/**
 * Tải phản hồi thực khách từ Supabase
 */
async function fetchLiveFeedbacks() {
  const res = await requestSupabase('/rest/v1/feedbacks?select=*&order=created_at.desc');
  if (res.success && Array.isArray(res.data)) {
    return res.data.map(mapFeedbackFromSql);
  }
  return null;
}

/**
 * Lưu phản hồi mới của thực khách vào Supabase
 */
async function insertFeedbackToSupabase(fb) {
  const row = {
    id: fb.id,
    restaurant_id: fb.restaurantId || fb.restaurant_id || 'REST_01',
    user_name: fb.userName || fb.user_name || 'Khách hàng',
    user_role: fb.userRole || fb.user_role || 'customer',
    rating: Number(fb.rating || 5),
    comment: fb.comment || '',
    status: fb.status || 'approved',
    created_at: fb.createdAt || new Date().toISOString()
  };
  return requestSupabase('/rest/v1/feedbacks', 'POST', row);
}

/**
 * Lưu hồ sơ thực đơn quét AI của Chủ quán vào Supabase
 */
async function insertPartnerSubmissionToSupabase(sub) {
  const row = {
    id: sub.id,
    partner_id: sub.partnerId || sub.partner_id || '',
    partner_name: sub.partnerName || sub.partner_name || '',
    restaurant_name: sub.restaurantName || sub.restaurant_name || '',
    restaurant_address: sub.restaurantAddress || sub.restaurant_address || '',
    restaurant_area: sub.restaurantArea || sub.restaurant_area || 'Trấn Biên',
    phone: sub.phone || '',
    menu_text: sub.menuText || sub.menu_text || '',
    image_url: sub.imageUrl || sub.image_url || '',
    extracted_items: Array.isArray(sub.extractedItems) ? sub.extractedItems : [],
    status: sub.status || 'pending',
    created_at: sub.createdAt || new Date().toISOString()
  };
  return requestSupabase('/rest/v1/partner_submissions', 'POST', row);
}

/**
 * Đồng bộ dữ liệu Live từ Supabase vào bộ nhớ máy chủ (Hybrid Sync)
 */
async function syncDatabaseWithSupabase(localDb) {
  try {
    const [restaurants, menuItems, specialties, feedbacks] = await Promise.all([
      fetchLiveRestaurants(),
      fetchLiveMenuItems(),
      fetchLiveSpecialties(),
      fetchLiveFeedbacks()
    ]);

    let updated = false;
    if (restaurants && restaurants.length > 0) {
      localDb.restaurants = restaurants;
      updated = true;
    }
    if (menuItems && menuItems.length > 0) {
      localDb.menuItems = menuItems;
      updated = true;
    }
    if (specialties && specialties.length > 0) {
      localDb.specialties = specialties;
      updated = true;
    }
    if (feedbacks && feedbacks.length > 0) {
      // Gộp feedback từ Supabase, tránh trùng id
      const existingIds = new Set(localDb.feedbacks.map(f => f.id));
      for (const fb of feedbacks) {
        if (!existingIds.has(fb.id)) {
          localDb.feedbacks.unshift(fb);
          existingIds.add(fb.id);
        }
      }
      updated = true;
    }

    if (updated) {
      localDb.metadata = localDb.metadata || {};
      localDb.metadata.lastSupabaseSync = new Date().toISOString();
      localDb.metadata.source = 'supabase_cloud_live';
    }
    return { success: true, updated, source: updated ? 'supabase' : 'local_json' };
  } catch (err) {
    return { success: false, updated: false, error: err.message, source: 'local_json' };
  }
}

module.exports = {
  isConfigured,
  requestSupabase,
  fetchLiveRestaurants,
  fetchLiveMenuItems,
  fetchLiveSpecialties,
  fetchLiveFeedbacks,
  insertFeedbackToSupabase,
  insertPartnerSubmissionToSupabase,
  syncDatabaseWithSupabase
};
