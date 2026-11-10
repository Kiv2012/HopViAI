/**
 * HỢP VỊ AI - BACKEND SERVER (REST API & STATIC WEB HOST)
 * Áp dụng chuẩn thiết kế từ `.agent/skills/api-design`, `backend-patterns` và `security-review`.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { solveMealRecommendations } = require('./solver');
const {
  analyzeUserRequirement,
  scanMenuFromImage,
  getCostStats,
  setRuntimeApiKey,
  getActiveApiKey
} = require('./geminiService');

const PORT = process.env.PORT || 3000;
const os = require('os');
const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');
const TMP_DB_PATH = path.join(os.tmpdir(), 'hop_vi_ai_database.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BUNDLED_DB = require('../data/database.json');

// Bộ nhớ đệm In-Memory giúp chạy mượt trên môi trường Serverless Read-Only (như Vercel Free)
let memoryDbCache = null;

// Load `.env` nếu tồn tại
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
  if (process.env.GEMINI_API_KEY) {
    setRuntimeApiKey(process.env.GEMINI_API_KEY);
  }
}

function loadDatabase() {
  if (memoryDbCache) {
    return memoryDbCache;
  }
  try {
    if (process.env.VERCEL && fs.existsSync(TMP_DB_PATH)) {
      memoryDbCache = JSON.parse(fs.readFileSync(TMP_DB_PATH, 'utf8'));
      return memoryDbCache;
    }
  } catch (_) {}

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    memoryDbCache = JSON.parse(raw);
    return memoryDbCache;
  } catch (_) {
    memoryDbCache = JSON.parse(JSON.stringify(BUNDLED_DB));
    return memoryDbCache;
  }
}

function saveDatabase(db) {
  db.metadata.lastUpdated = new Date().toISOString();
  db.metadata.totalRestaurants = db.restaurants.filter(r => r.status === 'approved').length;
  db.metadata.totalMenuItems = db.menuItems.filter(m => m.status === 'approved').length;
  memoryDbCache = db;

  const serialized = JSON.stringify(db, null, 2);
  try {
    if (!process.env.VERCEL) {
      fs.writeFileSync(DB_PATH, serialized, 'utf8');
      return;
    }
  } catch (_) {}

  // Fallback ghi vào /tmp cho Vercel Serverless
  try {
    fs.writeFileSync(TMP_DB_PATH, serialized, 'utf8');
  } catch (_) {}
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseJsonBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

async function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // 1. GET /api/v1/overview
    if (method === 'GET' && (pathname === '/api/v1/overview' || pathname === '/api/v1/health')) {
      const db = loadDatabase();
      const approvedRests = db.restaurants.filter(r => r.status === 'approved');
      const approvedItems = db.menuItems.filter(m => m.status === 'approved');
      return sendJson(res, 200, {
        success: true,
        data: {
          project: db.metadata,
          stats: {
            approvedRestaurants: approvedRests.length,
            approvedMenuItems: approvedItems.length,
            specialtiesCount: db.specialties.length,
            pendingSubmissions: db.partnerSubmissions.filter(s => s.status === 'pending').length,
            feedbacksCount: db.feedbacks.length,
            areas: Array.from(new Set(approvedRests.map(r => r.area)))
          },
          aiStatus: {
            hasApiKey: Boolean(getActiveApiKey()),
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            costStats: getCostStats()
          }
        }
      });
    }

    // 2. GET /api/v1/restaurants
    if (method === 'GET' && pathname === '/api/v1/restaurants') {
      const db = loadDatabase();
      const areaFilter = (parsedUrl.searchParams.get('area') || '').trim().toLowerCase();
      let restaurants = db.restaurants.filter(r => r.status === 'approved');
      if (areaFilter && areaFilter !== 'all') {
        restaurants = restaurants.filter(r => r.area.toLowerCase() === areaFilter);
      }
      const itemsByRest = {};
      for (const item of db.menuItems.filter(m => m.status === 'approved')) {
        if (!itemsByRest[item.restaurantId]) itemsByRest[item.restaurantId] = [];
        itemsByRest[item.restaurantId].push(item);
      }
      const result = restaurants.map(r => ({
        ...r,
        menu: itemsByRest[r.id] || []
      }));
      return sendJson(res, 200, { success: true, data: result });
    }

    // 3. GET /api/v1/specialties
    if (method === 'GET' && pathname === '/api/v1/specialties') {
      const db = loadDatabase();
      const approvedRests = db.restaurants.filter(r => r.status === 'approved');
      const approvedItems = db.menuItems.filter(m => m.status === 'approved');

      const enriched = db.specialties.map(sp => {
        const linkedRests = approvedRests
          .filter(r => sp.linkedRestaurantIds.includes(r.id))
          .map(r => ({
            ...r,
            sampleDishes: approvedItems.filter(m => m.restaurantId === r.id).slice(0, 5)
          }));
        return {
          ...sp,
          linkedRestaurants: linkedRests
        };
      });
      return sendJson(res, 200, { success: true, data: enriched });
    }

    // 4. POST /api/v1/ai/analyze (Bước 1: Phân tích câu yêu cầu ngôn ngữ tự nhiên)
    if (method === 'POST' && pathname === '/api/v1/ai/analyze') {
      const body = await parseJsonBody(req);
      const prompt = (body.prompt || '').trim();
      if (!prompt || prompt.length < 3) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'validation_error', message: 'Vui lòng nhập nhu cầu ăn uống của bạn (tối thiểu 3 ký tự).' }
        });
      }
      const analysis = await analyzeUserRequirement(prompt);
      return sendJson(res, 200, { success: true, data: analysis });
    }

    // 5. POST /api/v1/ai/solve (Bước 2: Giải bài toán tổ hợp món từ nhu cầu đã xác nhận)
    if (method === 'POST' && pathname === '/api/v1/ai/solve') {
      const body = await parseJsonBody(req);
      const requirements = body.requirements || body;
      const db = loadDatabase();
      const result = solveMealRecommendations(db, requirements);
      return sendJson(res, 200, { success: true, data: result });
    }

    // 6. POST /api/v1/partner/scan-menu (AI Scan Menu từ ảnh)
    if (method === 'POST' && pathname === '/api/v1/partner/scan-menu') {
      const body = await parseJsonBody(req);
      const { imageBase64, mimeType, sampleKey } = body;

      if (imageBase64) {
        const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
        if (mimeType && !allowedMime.includes(mimeType)) {
          return sendJson(res, 400, {
            success: false,
            error: { code: 'invalid_file_type', message: 'Chỉ chấp nhận ảnh thực đơn định dạng JPEG, PNG hoặc WEBP.' }
          });
        }
        // Kiểm tra dung lượng <= 5MB theo chuẩn security-review
        const approxBytes = (imageBase64.length * 3) / 4;
        if (approxBytes > 5 * 1024 * 1024) {
          return sendJson(res, 400, {
            success: false,
            error: { code: 'file_too_large', message: 'Kích thước ảnh vượt quá giới hạn 5MB.' }
          });
        }
      }

      const scanResult = await scanMenuFromImage({ imageBase64, mimeType, sampleKey });
      return sendJson(res, 200, { success: true, data: scanResult });
    }

    // 7. POST /api/v1/partner/submissions (Đối tác gửi hồ sơ quán & thực đơn chờ Admin duyệt)
    if (method === 'POST' && pathname === '/api/v1/partner/submissions') {
      const body = await parseJsonBody(req);
      const partnerName = (body.partnerName || '').trim();
      const address = (body.address || '').trim();
      const area = (body.area || 'Trấn Biên').trim();
      const openingHours = (body.openingHours || '07:00 - 21:00').trim();
      const contactPhone = (body.contactPhone || '').trim();
      const items = Array.isArray(body.items) ? body.items : [];

      if (!partnerName || !address || items.length === 0) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'validation_error', message: 'Vui lòng điền tên quán, địa chỉ và ít nhất 1 món ăn trong thực đơn.' }
        });
      }

      const db = loadDatabase();
      const newSub = {
        id: `SUB_${Date.now()}`,
        partnerName,
        address,
        area,
        openingHours,
        contactPhone,
        submissionType: body.submissionType || 'ai_scan_menu',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        sourceNote: body.sourceNote || 'Đối tác gửi qua cổng AI Scan Menu',
        items: items.map((it, idx) => ({
          tempId: `ITEM_${idx + 1}`,
          name: (it.name || '').trim(),
          price: Number(it.price) || 0,
          rawPriceText: it.rawPriceText || `${(Number(it.price) || 0).toLocaleString('vi-VN')}đ`,
          unit: it.unit || 'phần',
          category: it.category || 'mon_kho',
          tags: Array.isArray(it.tags) ? it.tags : [it.category || 'mon_kho', 'vi_thanh', 'man'],
          confidence: Number(it.confidence) || 1.0,
          needsReview: Boolean(it.needsReview),
          reviewReason: it.reviewReason || ''
        }))
      };

      db.partnerSubmissions.unshift(newSub);
      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: 'PARTNER_SUBMIT_MENU',
        actor: partnerName,
        detail: `Gửi hồ sơ quán "${partnerName}" (${area}) gồm ${newSub.items.length} món sang trạng thái Chờ Admin duyệt.`,
        timestamp: new Date().toISOString()
      });
      saveDatabase(db);

      return sendJson(res, 201, {
        success: true,
        data: newSub,
        message: 'Đã gửi hồ sơ quán và thực đơn sang trạng thái Chờ Admin xác minh. Dữ liệu chưa duyệt sẽ chưa xuất hiện trên công cụ gợi ý công khai.'
      });
    }

    // 8. GET /api/v1/admin/dashboard
    if (method === 'GET' && pathname === '/api/v1/admin/dashboard') {
      const db = loadDatabase();
      return sendJson(res, 200, {
        success: true,
        data: {
          submissions: db.partnerSubmissions,
          feedbacks: db.feedbacks,
          auditLogs: db.auditLogs.slice(0, 30),
          costStats: getCostStats(),
          hasApiKey: Boolean(getActiveApiKey())
        }
      });
    }

    // 9. POST /api/v1/admin/submissions/:id/approve hoặc reject
    const adminSubMatch = pathname.match(/^\/api\/v1\/admin\/submissions\/([^/]+)\/(approve|reject)$/);
    if (method === 'POST' && adminSubMatch) {
      const subId = adminSubMatch[1];
      const action = adminSubMatch[2];
      const db = loadDatabase();
      const sub = db.partnerSubmissions.find(s => s.id === subId);

      if (!sub) {
        return sendJson(res, 404, {
          success: false,
          error: { code: 'not_found', message: 'Không tìm thấy hồ sơ đối tác.' }
        });
      }

      if (action === 'reject') {
        sub.status = 'rejected';
        sub.reviewedAt = new Date().toISOString();
        db.auditLogs.unshift({
          id: `LOG_${Date.now()}`,
          action: 'ADMIN_REJECT_SUBMISSION',
          actor: 'Admin Xác Minh',
          detail: `Từ chối hồ sơ "${sub.partnerName}" (${sub.id}).`,
          timestamp: new Date().toISOString()
        });
        saveDatabase(db);
        return sendJson(res, 200, { success: true, data: sub });
      }

      // Approve: Tạo mới quán và thêm các món ăn vào dữ liệu chính thức đã xác minh
      sub.status = 'approved';
      sub.reviewedAt = new Date().toISOString();

      const newRestId = `REST_${String(db.restaurants.length + 1).padStart(2, '0')}`;
      const newRestaurant = {
        id: newRestId,
        name: sub.partnerName.replace(/\s*\(Demo Chờ Duyệt\)\s*/i, ''),
        address: sub.address,
        area: sub.area,
        openingHours: sub.openingHours || '07:00 - 21:00',
        status: 'approved',
        verificationStatus: 'verified',
        verificationSource: `Admin duyệt từ AI Scan Menu (${sub.id})`,
        verifiedAt: new Date().toISOString().slice(0, 10),
        isSpecialtySpot: false
      };
      db.restaurants.push(newRestaurant);

      for (const item of sub.items) {
        const newDishId = `DISH_${String(db.menuItems.length + 1).padStart(3, '0')}`;
        const tags = new Set(item.tags || []);
        if (item.category === 'mon_nuoc') tags.add('mon_nuoc');
        if (item.category === 'com') { tags.add('com'); tags.add('mon_kho'); }
        if (item.category === 'mon_kho') tags.add('mon_kho');
        tags.add('vi_thanh');
        tags.add('man');

        db.menuItems.push({
          id: newDishId,
          restaurantId: newRestId,
          restaurantName: newRestaurant.name,
          area: newRestaurant.area,
          name: item.name,
          category: item.category || 'mon_kho',
          tags: Array.from(tags),
          price: Number(item.price) || 35000,
          priceMax: Number(item.price) || 35000,
          priceVariants: [Number(item.price) || 35000],
          rawPriceText: item.rawPriceText || `${(Number(item.price) || 35000).toLocaleString('vi-VN')}đ`,
          unit: item.unit || 'phần',
          portionMin: 1,
          portionMax: 1,
          isSharedCombo: false,
          priceStatus: 'verified_exact',
          priceNote: 'Đã được Admin đối chiếu ảnh thực đơn gốc và phê duyệt',
          status: 'approved',
          verificationSource: `AI Scan Menu + Admin xác minh (${sub.id})`,
          verifiedAt: new Date().toISOString().slice(0, 10)
        });
      }

      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: 'ADMIN_APPROVE_SUBMISSION',
        actor: 'Admin Xác Minh',
        detail: `Phê duyệt quán "${newRestaurant.name}" và công bố ${sub.items.length} món ăn vào cơ sở dữ liệu gợi ý chính thức.`,
        timestamp: new Date().toISOString()
      });

      saveDatabase(db);
      return sendJson(res, 200, {
        success: true,
        data: { submission: sub, restaurant: newRestaurant }
      });
    }

    // 10. POST /api/v1/feedbacks (Người dùng gửi đánh giá / báo sai giá)
    if (method === 'POST' && pathname === '/api/v1/feedbacks') {
      const body = await parseJsonBody(req);
      const comment = (body.comment || '').trim();
      if (!comment) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'validation_error', message: 'Vui lòng nhập nội dung góp ý hoặc thông tin báo sai lệch.' }
        });
      }
      const db = loadDatabase();
      const newFb = {
        id: `FB_${Date.now()}`,
        userName: (body.userName || 'Người dùng ẩn danh').trim(),
        type: body.type || 'experience', // experience | price_discrepancy
        rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
        restaurantName: (body.restaurantName || 'Chung toàn hệ thống').trim(),
        comment,
        status: 'pending_review',
        createdAt: new Date().toISOString()
      };
      db.feedbacks.unshift(newFb);
      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: 'USER_FEEDBACK_RECEIVED',
        actor: newFb.userName,
        detail: `Gửi phản hồi (${newFb.type}) cho "${newFb.restaurantName}": ${comment.slice(0, 80)}`,
        timestamp: new Date().toISOString()
      });
      saveDatabase(db);
      return sendJson(res, 201, { success: true, data: newFb });
    }

    // 11. POST /api/v1/config/api-key (Cấu hình nhanh Gemini API Key phục vụ demo)
    if (method === 'POST' && pathname === '/api/v1/config/api-key') {
      const body = await parseJsonBody(req);
      const apiKey = (body.apiKey || '').trim();
      setRuntimeApiKey(apiKey);
      return sendJson(res, 200, {
        success: true,
        data: {
          hasApiKey: Boolean(getActiveApiKey()),
          message: apiKey
            ? 'Đã kích hoạt Google Gemini API Key (gemini-2.5-flash) cho phiên làm việc hiện tại.'
            : 'Đã xóa khóa API, hệ thống chuyển sang chế độ Semantic Fallback an toàn.'
        }
      });
    }

    return sendJson(res, 404, {
      success: false,
      error: { code: 'not_found', message: `Không tìm thấy API endpoint: ${method} ${pathname}` }
    });
  } catch (err) {
    const status = err.message === 'PAYLOAD_TOO_LARGE' ? 413 : err.message === 'INVALID_JSON' ? 400 : 500;
    return sendJson(res, status, {
      success: false,
      error: { code: err.message || 'internal_error', message: 'Lỗi xử lý yêu cầu phía máy chủ.' }
    });
  }
}

const requestListener = async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname || '/';

  if (pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, parsedUrl);
  }

  // Phục vụ file tĩnh trong thư mục public/
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, safePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback về index.html
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      fs.createReadStream(indexHtml).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  }
};

const server = http.createServer(requestListener);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 HỢP VỊ AI Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📍 Slogan: Hiểu đúng vị – Gợi đúng món (Đồng Nai Edition)`);
    console.log(`================================================================`);
  });
}

module.exports = requestListener;
module.exports.server = server;
