/**
 * HỢP VỊ AI - BACKEND SERVER (REST API & STATIC WEB HOST)
 * Áp dụng chuẩn thiết kế từ `.agent/skills/api-design`, `backend-patterns` và `security-review`.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const AUTH_SECRET = process.env.AUTH_SECRET || 'hop-vi-ai-dong-nai-secret-2026';

function hashPassword(password) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(String(password)).digest('hex');
}

function createAuthToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantName: user.restaurantName || '',
    restaurantAddress: user.restaurantAddress || '',
    restaurantArea: user.restaurantArea || 'Trấn Biên',
    iat: Date.now()
  };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function sanitizeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

function ensureDefaultUsers(db) {
  if (!Array.isArray(db.users) || db.users.length === 0) {
    db.users = [
      {
        id: 'USR_ADMIN_01',
        name: 'Quản trị viên Hệ thống',
        email: 'admin@hopviai.vn',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        status: 'active',
        createdAt: '2026-11-01T08:00:00.000Z'
      },
      {
        id: 'USR_PARTNER_01',
        name: 'Chủ quán Bún Thái Thành Minh',
        email: 'chuquan@hopviai.vn',
        passwordHash: hashPassword('123456'),
        role: 'partner',
        restaurantName: 'Bún Thái & Mì Trộn Thành Minh',
        restaurantAddress: '129 Hưng Đạo Vương, Phường Trấn Biên, Đồng Nai',
        restaurantArea: 'Trấn Biên',
        status: 'active',
        createdAt: '2026-11-02T09:00:00.000Z'
      },
      {
        id: 'USR_CUSTOMER_01',
        name: 'Nguyễn Minh Anh',
        email: 'khachhang@hopviai.vn',
        passwordHash: hashPassword('123456'),
        role: 'customer',
        status: 'active',
        createdAt: '2026-11-03T10:00:00.000Z'
      }
    ];
  }
  return db;
}

function loadDatabase() {
  if (memoryDbCache) {
    return ensureDefaultUsers(memoryDbCache);
  }
  try {
    if (process.env.VERCEL && fs.existsSync(TMP_DB_PATH)) {
      memoryDbCache = JSON.parse(fs.readFileSync(TMP_DB_PATH, 'utf8'));
      return ensureDefaultUsers(memoryDbCache);
    }
  } catch (_) {}

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    memoryDbCache = JSON.parse(raw);
    return ensureDefaultUsers(memoryDbCache);
  } catch (_) {
    memoryDbCache = JSON.parse(JSON.stringify(BUNDLED_DB));
    return ensureDefaultUsers(memoryDbCache);
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
      const dishCountByRest = {};
      for (const m of db.menuItems) {
        dishCountByRest[m.restaurantId] = (dishCountByRest[m.restaurantId] || 0) + 1;
      }
      return sendJson(res, 200, {
        success: true,
        data: {
          submissions: db.partnerSubmissions,
          feedbacks: db.feedbacks,
          users: (db.users || []).map(sanitizeUser),
          restaurants: db.restaurants.map(r => ({
            ...r,
            dishCount: dishCountByRest[r.id] || 0
          })),
          auditLogs: db.auditLogs.slice(0, 30),
          costStats: getCostStats(),
          hasApiKey: Boolean(getActiveApiKey())
        }
      });
    }

    // 8b. POST /api/v1/auth/register (Đăng ký tài khoản Khách hàng hoặc Chủ quán)
    if (method === 'POST' && pathname === '/api/v1/auth/register') {
      const body = await parseJsonBody(req);
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const role = (body.role || 'customer').trim();

      if (role === 'admin') {
        return sendJson(res, 403, {
          success: false,
          error: { code: 'forbidden_role', message: 'Tài khoản Admin là duy nhất để quản trị toàn trang web, không cho phép tự đăng ký công khai.' }
        });
      }
      if (!['customer', 'partner'].includes(role)) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'invalid_role', message: 'Tư cách đăng ký chỉ được phép là Khách hàng (customer) hoặc Chủ quán (partner).' }
        });
      }
      if (!name || !email || password.length < 4) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'validation_error', message: 'Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu (tối thiểu 4 ký tự).' }
        });
      }

      const db = loadDatabase();
      if (db.users.some(u => u.email.toLowerCase() === email)) {
        return sendJson(res, 409, {
          success: false,
          error: { code: 'email_exists', message: 'Email này đã được đăng ký trên hệ thống. Vui lòng chuyển sang tab Đăng nhập.' }
        });
      }

      const newUser = {
        id: `USR_${Date.now()}`,
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        restaurantName: role === 'partner' ? (body.restaurantName || `Quán của ${name}`).trim() : '',
        restaurantAddress: role === 'partner' ? (body.restaurantAddress || 'Biên Hòa, Đồng Nai').trim() : '',
        restaurantArea: role === 'partner' ? (body.restaurantArea || 'Trấn Biên').trim() : '',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: role === 'partner' ? 'PARTNER_REGISTER' : 'CUSTOMER_REGISTER',
        actor: `${name} (${email})`,
        detail: `Đăng ký tài khoản mới với tư cách ${role === 'partner' ? `Chủ quán (${newUser.restaurantName})` : 'Khách hàng'}.`,
        timestamp: new Date().toISOString()
      });
      saveDatabase(db);

      const safeUser = sanitizeUser(newUser);
      return sendJson(res, 201, {
        success: true,
        data: {
          user: safeUser,
          token: createAuthToken(safeUser)
        }
      });
    }

    // 8c. POST /api/v1/auth/login (Đăng nhập bằng Email/Mật khẩu hoặc Chuyển nhanh Demo 3 vai trò)
    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await parseJsonBody(req);
      const db = loadDatabase();
      let matchedUser = null;

      if (body.demoRole && ['customer', 'partner', 'admin'].includes(body.demoRole)) {
        matchedUser = db.users.find(u => u.role === body.demoRole && u.status === 'active') || db.users.find(u => u.role === body.demoRole);
      } else {
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();
        const pwHash = hashPassword(password);
        matchedUser = db.users.find(u => u.email.toLowerCase() === email && u.passwordHash === pwHash);
      }

      if (!matchedUser) {
        return sendJson(res, 401, {
          success: false,
          error: { code: 'invalid_credentials', message: 'Email hoặc mật khẩu không chính xác.' }
        });
      }

      if (matchedUser.status === 'locked') {
        return sendJson(res, 403, {
          success: false,
          error: { code: 'account_locked', message: 'Tài khoản này đang bị Quản trị viên (Admin) tạm khóa.' }
        });
      }

      const safeUser = sanitizeUser(matchedUser);
      return sendJson(res, 200, {
        success: true,
        data: {
          user: safeUser,
          token: createAuthToken(safeUser)
        }
      });
    }

    // 8d. POST /api/v1/admin/users/:id/toggle-status (Admin khóa/mở khóa tài khoản Khách hàng & Chủ quán)
    const adminUserToggleMatch = pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)\/toggle-status$/);
    if (method === 'POST' && adminUserToggleMatch) {
      const userId = adminUserToggleMatch[1];
      const db = loadDatabase();
      const targetUser = db.users.find(u => u.id === userId);
      if (!targetUser) {
        return sendJson(res, 404, { success: false, error: { code: 'not_found', message: 'Không tìm thấy tài khoản.' } });
      }
      if (targetUser.role === 'admin') {
        return sendJson(res, 400, { success: false, error: { code: 'cannot_lock_admin', message: 'Không thể khóa tài khoản Quản trị viên (Admin) duy nhất của hệ thống.' } });
      }
      targetUser.status = targetUser.status === 'locked' ? 'active' : 'locked';
      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: 'ADMIN_USER_STATUS',
        actor: 'Admin Toàn Quyền',
        detail: `${targetUser.status === 'locked' ? 'Tạm khóa' : 'Mở khóa'} tài khoản "${targetUser.name}" (${targetUser.email} - ${targetUser.role}).`,
        timestamp: new Date().toISOString()
      });
      saveDatabase(db);
      return sendJson(res, 200, { success: true, data: sanitizeUser(targetUser) });
    }

    // 8e. POST /api/v1/admin/restaurants/:id/toggle-status (Admin ẩn/hiện bất kỳ quán ăn nào trên toàn trang web)
    const adminRestToggleMatch = pathname.match(/^\/api\/v1\/admin\/restaurants\/([^/]+)\/toggle-status$/);
    if (method === 'POST' && adminRestToggleMatch) {
      const restId = adminRestToggleMatch[1];
      const db = loadDatabase();
      const rest = db.restaurants.find(r => r.id === restId);
      if (!rest) {
        return sendJson(res, 404, { success: false, error: { code: 'not_found', message: 'Không tìm thấy quán ăn.' } });
      }
      rest.status = rest.status === 'approved' ? 'hidden' : 'approved';
      for (const m of db.menuItems) {
        if (m.restaurantId === restId) {
          m.status = rest.status;
        }
      }
      db.auditLogs.unshift({
        id: `LOG_${Date.now()}`,
        action: 'ADMIN_RESTAURANT_STATUS',
        actor: 'Admin Toàn Quyền',
        detail: `${rest.status === 'approved' ? 'Công bố hiển thị lại' : 'Tạm ẩn'} quán "${rest.name}" (${rest.area}) trên toàn trang web.`,
        timestamp: new Date().toISOString()
      });
      saveDatabase(db);
      return sendJson(res, 200, { success: true, data: rest });
    }

    // 8f. POST /api/v1/admin/feedbacks/:id/:action (Admin xác minh hoặc xóa đánh giá của khách hàng)
    const adminFbMatch = pathname.match(/^\/api\/v1\/admin\/feedbacks\/([^/]+)\/(verify|delete)$/);
    if (method === 'POST' && adminFbMatch) {
      const fbId = adminFbMatch[1];
      const action = adminFbMatch[2];
      const db = loadDatabase();
      const idx = db.feedbacks.findIndex(f => f.id === fbId);
      if (idx === -1) {
        return sendJson(res, 404, { success: false, error: { code: 'not_found', message: 'Không tìm thấy phản hồi.' } });
      }
      if (action === 'delete') {
        const removed = db.feedbacks.splice(idx, 1)[0];
        db.auditLogs.unshift({
          id: `LOG_${Date.now()}`,
          action: 'ADMIN_DELETE_FEEDBACK',
          actor: 'Admin Toàn Quyền',
          detail: `Xóa phản hồi của "${removed.userName}" về "${removed.restaurantName}".`,
          timestamp: new Date().toISOString()
        });
      } else {
        db.feedbacks[idx].status = 'verified';
        db.auditLogs.unshift({
          id: `LOG_${Date.now()}`,
          action: 'ADMIN_VERIFY_FEEDBACK',
          actor: 'Admin Toàn Quyền',
          detail: `Đã xác minh phản hồi của "${db.feedbacks[idx].userName}" về "${db.feedbacks[idx].restaurantName}".`,
          timestamp: new Date().toISOString()
        });
      }
      saveDatabase(db);
      return sendJson(res, 200, { success: true });
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
