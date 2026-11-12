/**
 * HỢP VỊ AI - NGỮ CẢNH CHO TRỢ LÝ CHAT
 * - Dựng dữ liệu đầy đủ (toàn bộ thực đơn, nhãn khẩu vị, trạng thái mở cửa theo giờ Việt Nam)
 * - Chạy trước bộ giải tối ưu ngân sách để AI dùng con số chính xác thay vì tự cộng
 * - Trả lời dự phòng dựa trên dữ liệu thật khi không có API key
 */
const { solveMealRecommendations } = require('./solver');

const TAG_LABELS = {
  vi_cay: 'cay',
  chay: 'chay',
  // Không đưa nhãn "vi_thanh": dữ liệu gắn cho ~87% món nên không giúp phân biệt
  dac_san_dong_nai: 'đặc sản Đồng Nai',
  hai_san: 'hải sản',
  an_vat: 'ăn vặt'
};
const CATEGORY_LABELS = {
  mon_nuoc: 'món nước',
  mon_kho: 'món khô/trộn',
  com: 'cơm',
  lau: 'lẩu',
  goi: 'gỏi',
  an_vat: 'ăn vặt',
  do_uong: 'đồ uống'
};

function stripVi(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function vnd(n) {
  return `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
}

/* ---------- Giờ Việt Nam & trạng thái mở cửa ---------- */

function getVietnamNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t)?.value;
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const weekdayMap = { Mon: 'Thứ Hai', Tue: 'Thứ Ba', Wed: 'Thứ Tư', Thu: 'Thứ Năm', Fri: 'Thứ Sáu', Sat: 'Thứ Bảy', Sun: 'Chủ Nhật' };
  return {
    minutes: hour * 60 + minute,
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${weekdayMap[get('weekday')] || ''}`.trim()
  };
}

/* Đọc chuỗi giờ như "10:00 - 14:00 16:00 - 21:00", "18:30 - 23:30", "6h - 11h" */
function parseOpeningRanges(hoursStr) {
  const ranges = [];
  const re = /(\d{1,2})\s*[:hH]\s*(\d{2})?\s*[-–—~]\s*(\d{1,2})\s*[:hH]?\s*(\d{2})?/g;
  let m;
  while ((m = re.exec(String(hoursStr || ''))) !== null) {
    const start = Number(m[1]) * 60 + Number(m[2] || 0);
    let end = Number(m[3]) * 60 + Number(m[4] || 0);
    if (end === 0) end = 24 * 60;
    if (start < 24 * 60 && end <= 24 * 60) ranges.push({ start, end });
  }
  return ranges;
}

function fmtMinutes(min) {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/* Trả về { open: true|false|null, note } — null khi không đọc được giờ mở cửa */
function getOpenStatus(hoursStr, nowMinutes) {
  const ranges = parseOpeningRanges(hoursStr);
  if (ranges.length === 0) return { open: null, note: 'chưa rõ giờ' };
  const isIn = r => (r.end > r.start
    ? nowMinutes >= r.start && nowMinutes < r.end
    : nowMinutes >= r.start || nowMinutes < r.end); // ca qua đêm
  const current = ranges.find(isIn);
  if (current) return { open: true, note: `đang mở, đóng lúc ${fmtMinutes(current.end)}` };
  const later = ranges.filter(r => r.start > nowMinutes).sort((a, b) => a.start - b.start)[0];
  return { open: false, note: `đang đóng, mở lại lúc ${fmtMinutes((later || ranges[0]).start)}` };
}

/* ---------- Dữ liệu đầy đủ cho AI ---------- */

function describeDish(d) {
  const price = d.priceStatus === 'verified_range' || (d.priceMax && d.priceMax > d.price)
    ? (d.rawPriceText || `${vnd(d.price)} - ${vnd(d.priceMax)}`)
    : vnd(d.price);
  const labels = [CATEGORY_LABELS[d.category], ...(d.tags || []).map(t => TAG_LABELS[t])]
    .filter((v, i, a) => v && a.indexOf(v) === i);
  const portion = (d.portionMax || 1) > 1 ? ` • ${d.portionMin || 1}-${d.portionMax} người` : '';
  return `- ${d.name}: ${price}${d.unit ? `/${d.unit}` : ''}${portion}${labels.length ? ` [${labels.join(', ')}]` : ''}`;
}

function buildChatKnowledge(db, now = getVietnamNow()) {
  if (!db) return '';
  const items = (db.menuItems || []).filter(m => m.status === 'approved');
  const rests = (db.restaurants || []).filter(r => r.status === 'approved').map(r => {
    const dishes = items.filter(m => m.restaurantId === r.id);
    const st = getOpenStatus(r.openingHours, now.minutes);
    return [
      `### ${r.name}`,
      `P. ${r.area} • ${r.address} • Giờ: ${r.openingHours || 'chưa rõ'} • Hiện tại: ${st.note.toUpperCase()}`,
      ...(dishes.length ? dishes.map(describeDish) : ['- (Chưa có thực đơn chi tiết)'])
    ].join('\n');
  }).join('\n\n');

  const specs = (db.specialties || [])
    .map(s => `- ${s.name}: ${s.description || ''}${s.referencePriceRange ? ` (giá tham khảo ${s.referencePriceRange})` : ''}`)
    .join('\n');

  return `--- DỮ LIỆU ĐÃ XÁC MINH (CHỈ DÙNG DỮ LIỆU NÀY) ---
Giờ hiện tại ở Biên Hòa: ${now.label}

${rests}

ĐẶC SẢN ĐỒNG NAI:
${specs}
--- HẾT DỮ LIỆU ---`;
}

/* ---------- Hiểu yêu cầu qua nhiều lượt chat & chạy bộ giải ---------- */

function mentionsPeople(text) {
  const t = stripVi(text);
  return /(?:^|[^\w])(?:\d+|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s*(?:nguoi|ng|ban|dua|thanh vien|khach)(?![a-z])/.test(t)
    || /(?:mot minh|1 minh|di minh|an minh|cap doi|vo chong|ca nha|gia dinh|nhom\s*\d+)/.test(t);
}

/**
 * Gộp yêu cầu: tin nhắn mới nhất được ưu tiên; số người / ngân sách / khu vực còn thiếu
 * thì lấy từ các tin nhắn trước của người dùng (ví dụ "đi 3 người" rồi "150k thì sao?").
 */
function resolveRequirement(message, history, analyzeFn) {
  const current = analyzeFn(message);
  const prevUserTexts = (Array.isArray(history) ? history : [])
    .filter(h => h && (h.role === 'user'))
    .map(h => String(h.text || h.message || h.content || ''))
    .slice(-3);
  const prev = prevUserTexts.length ? analyzeFn(prevUserTexts.join('. ')) : null;

  const req = { ...current };
  if (prev) {
    if (!(current.maxBudget > 0) && prev.maxBudget > 0) req.maxBudget = prev.maxBudget;
    if (!mentionsPeople(message) && prevUserTexts.some(mentionsPeople)) {
      req.partySize = prev.partySize;
      req.members = prev.members;
    }
    const noArea = a => !a || /tat ca/.test(stripVi(a));
    if (noArea(current.area) && !noArea(prev.area)) req.area = prev.area;

    // Giữ khẩu vị / ăn chay đã nói ở tin trước (ví dụ "muốn ăn cay" rồi "đi 2 người 200k")
    const prevFlavor = (prev.members || []).map(m => m.flavor).find(f => f && f !== 'any');
    const prevVeg = (prev.members || []).some(m => m.isVegetarian);
    const curHasFlavor = (req.members || []).some(m => m.flavor && m.flavor !== 'any');
    const curHasVeg = (req.members || []).some(m => m.isVegetarian);
    if ((prevFlavor && !curHasFlavor) || (prevVeg && !curHasVeg)) {
      req.members = (req.members || []).map(m => ({
        ...m,
        flavor: !curHasFlavor && prevFlavor ? prevFlavor : m.flavor,
        isVegetarian: m.isVegetarian || (!curHasVeg && prevVeg)
      }));
    }
  }
  if (!req.area || /tat ca/.test(stripVi(req.area))) req.area = '';
  return req;
}

/* Ưu tiên mỗi phương án một quán khác nhau để người dùng có nhiều lựa chọn; thiếu thì bù bằng phương án còn lại */
function pickDistinctPlans(plans, limit) {
  const picked = [];
  const seenRest = new Set();
  (plans || []).forEach(p => {
    const rid = p.restaurant?.id;
    if (picked.length < limit && !seenRest.has(rid)) { picked.push(p); seenRest.add(rid); }
  });
  (plans || []).forEach(p => { if (picked.length < limit && !picked.includes(p)) picked.push(p); });
  return picked;
}

/* Dòng món của một phương án: món chia sẻ ghi "Cả nhóm" (không lặp), món riêng ghi rõ của ai */
function planDishLines(plan) {
  const seen = new Set();
  return (plan.assignments || []).filter(a => {
    if (plan.planType !== 'shared_combo') return true;
    if (seen.has(a.dishId)) return false;
    seen.add(a.dishId);
    return true;
  }).map(a => {
    const who = plan.planType === 'shared_combo' ? 'Cả nhóm' : a.memberLabel;
    return { who, name: a.dishName, price: a.displayPrice || vnd(a.price), note: a.priceStatus === 'verified_range' ? a.priceNote : '' };
  });
}

function summarizePlan(plan, idx, maxBudget) {
  const r = plan.restaurant || {};
  const lines = planDishLines(plan).map(l => `  - ${l.who}: ${l.name} — ${l.price}${l.note ? ` (lưu ý: ${l.note})` : ''}`);
  return `Phương án ${idx + 1}: ${r.name} (P. ${r.area}) — TỔNG ${vnd(plan.totalCost)}${maxBudget ? ` / ngân sách ${vnd(maxBudget)}, còn dư ${vnd(plan.remainingBudget)}` : ''}
${lines.join('\n')}`;
}

/**
 * Nếu người dùng đã nêu ngân sách, chạy bộ giải để có tổ hợp món + tổng tiền chính xác.
 * Trả về { text, result, requirement } hoặc null khi chưa đủ thông tin.
 */
function buildSolverContext(message, history, db, analyzeFn) {
  if (!db || typeof analyzeFn !== 'function') return null;
  let req;
  try {
    req = resolveRequirement(message, history, analyzeFn);
  } catch (_) {
    return null;
  }
  if (!(req.maxBudget > 0)) return null;

  let result;
  try {
    result = solveMealRecommendations(db, req);
  } catch (_) {
    return null;
  }

  const flavor = (req.members || []).map(m => m.flavor).filter(f => f && f !== 'any');
  const header = `Yêu cầu đã hiểu: ${req.partySize} người • ngân sách tối đa ${vnd(req.maxBudget)} • khu vực: ${req.area || 'tất cả'}${flavor.length ? ` • khẩu vị: ${flavor.includes('vi_cay') ? 'cay' : 'thanh nhẹ'}` : ''}`;
  let body;
  if (result.status === 'success' && result.plans?.length) {
    body = pickDistinctPlans(result.plans, 3).map((p, i) => summarizePlan(p, i, req.maxBudget)).join('\n');
  } else {
    body = `Không có tổ hợp hợp lệ: ${result.summary || ''}${result.alternativeScenario?.suggestedBudget ? ` Ngân sách tối thiểu khả thi: ${vnd(result.alternativeScenario.suggestedBudget)}.` : ''}`;
  }

  return {
    requirement: req,
    result,
    text: `--- KẾT QUẢ BỘ GIẢI TỐI ƯU (ĐÃ TÍNH CHÍNH XÁC, DÙNG ĐÚNG CÁC CON SỐ NÀY) ---
${header}
${body}
--- HẾT KẾT QUẢ BỘ GIẢI ---`
  };
}

/* ---------- Trả lời dự phòng dựa trên dữ liệu thật (khi không gọi được AI) ---------- */

// Viết có dấu: khi người dùng gõ có dấu sẽ so khớp nguyên dấu để tránh nhầm
// "chào"/"cháo", "lâu"/"lẩu", "cây"/"cay", "chạy"/"chay", "gọi"/"gỏi"
const FLAVOR_HINTS = [
  { words: ['cay', 'cay nóng', 'mì cay'], tag: 'vi_cay' },
  { words: ['chay', 'ăn chay'], tag: 'chay' },
  { words: ['đặc sản'], tag: 'dac_san_dong_nai' },
  { words: ['hải sản', 'tôm', 'cá', 'mực'], tag: 'hai_san' }
];
const CATEGORY_HINTS = [
  { words: ['lẩu'], cat: 'lau' },
  { words: ['cơm'], cat: 'com' },
  { words: ['bún', 'phở', 'hủ tiếu', 'mì nước', 'cháo', 'món nước'], cat: 'mon_nuoc' },
  { words: ['gỏi'], cat: 'goi' },
  { words: ['ăn vặt', 'chả lụi', 'nem'], cat: 'an_vat' }
];
const VI_MARKS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function generateSmartFallbackReply(message, db, solverCtx) {
  const now = getVietnamNow();
  const rests = (db?.restaurants || []).filter(r => r.status === 'approved');
  const items = (db?.menuItems || []).filter(m => m.status === 'approved');

  // 1. Có ngân sách → trình bày kết quả bộ giải
  if (solverCtx?.result) {
    const { result, requirement: req } = solverCtx;
    if (result.status === 'success' && result.plans?.length) {
      const blocks = pickDistinctPlans(result.plans, 2).map((p, i) => {
        const r = p.restaurant;
        const st = getOpenStatus(r.openingHours, now.minutes);
        const multi = p.planType !== 'shared_combo' && (p.assignments || []).length > 1;
        const dishes = planDishLines(p)
          .map(l => `- ${multi ? `${l.who}: ` : ''}${l.name}: ${l.price}`).join('\n');
        return `### ${i + 1}. ${r.name} (P. ${r.area})\n${dishes}\n- **Tổng: ${vnd(p.totalCost)} / ${vnd(req.maxBudget)}** • Quán ${st.note}`;
      }).join('\n\n');
      return `Với **${req.partySize} người, ngân sách ${vnd(req.maxBudget)}**${req.area ? ` ở ${req.area}` : ''}, mình tính sẵn cho bạn:\n\n${blocks}\n\nBạn muốn mình chỉ đường tới quán nào không?`;
    }
    const sug = result.alternativeScenario?.suggestedBudget;
    return `Với **${req.partySize} người, ngân sách ${vnd(req.maxBudget)}** thì mình chưa tìm được tổ hợp món hợp lệ ở cùng một quán.${sug ? ` Nếu nâng lên khoảng **${vnd(sug)}** là có lựa chọn ngon ngay.` : ''} Bạn có muốn điều chỉnh ngân sách hoặc khu vực không?`;
  }

  // 2. Không có ngân sách → tìm món theo khẩu vị / loại món
  const accented = VI_MARKS.test(message);
  const norm = s => (accented ? String(s || '').normalize('NFC').toLowerCase() : stripVi(s))
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const t = ` ${norm(message)} `;
  const has = w => t.includes(` ${norm(w)} `);
  const wantTags = FLAVOR_HINTS.filter(h => h.words.some(has)).map(h => h.tag);
  const wantCats = CATEGORY_HINTS.filter(h => h.words.some(has)).map(h => h.cat);
  const STOP = new Set(['muốn', 'mình', 'tôi', 'bạn', 'quán', 'nào', 'ngon', 'không', 'muon', 'minh', 'toi', 'ban', 'quan', 'nao', 'khong', 'xin', 'chào']);
  const words = t.trim().split(' ').filter(w => w.length >= 3 && !STOP.has(w));

  // Lời chào ngắn ("xin chao", "hello") không phải là hỏi món cháo
  // Kiểm tra bằng tập từ (không dùng regex lặp lồng nhau để tránh backtracking — ReDoS)
  const GREETING_WORDS = new Set(['xin', 'chao', 'hello', 'hi', 'alo', 'hey', 'ban', 'ai', 'hop', 'vi', 'nhe', 'nha']);
  const greetTokens = stripVi(message).slice(0, 200).replace(/[^a-z ]+/g, ' ').split(' ').filter(Boolean);
  const isGreeting = greetTokens.length > 0 && greetTokens.length <= 6
    && ['chao', 'hello', 'hi', 'alo', 'hey'].includes(greetTokens.find(w => w !== 'xin'))
    && greetTokens.every(w => GREETING_WORDS.has(w));

  const scored = isGreeting ? [] : items.map(d => {
    let score = 0;
    wantTags.forEach(tag => { if ((d.tags || []).includes(tag)) score += 3; });
    wantCats.forEach(cat => { if (d.category === cat) score += 2; });
    const nm = ` ${norm(d.name)} `;
    words.forEach(w => { if (nm.includes(` ${w} `)) score += 1; });
    return { d, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length) {
    const byRest = new Map();
    scored.forEach(({ d }) => {
      if (!byRest.has(d.restaurantId)) byRest.set(d.restaurantId, []);
      const list = byRest.get(d.restaurantId);
      if (list.length < 2) list.push(d);
    });
    // Giữ thứ tự độ phù hợp, nhưng đưa quán đang mở lên trước quán đang đóng
    const ranked = Array.from(byRest.entries())
      .map(([rid, ds], order) => ({ rid, ds, order, open: getOpenStatus((rests.find(x => x.id === rid) || {}).openingHours, now.minutes).open === true }))
      .sort((a, b) => (b.open - a.open) || (a.order - b.order));
    const blocks = ranked.slice(0, 3).map(({ rid, ds }, i) => {
      const r = rests.find(x => x.id === rid) || {};
      const st = getOpenStatus(r.openingHours, now.minutes);
      return `### ${i + 1}. ${r.name} (P. ${r.area})\n${ds.map(d => `- ${d.name}: ${d.rawPriceText || vnd(d.price)}`).join('\n')}\n- Quán ${st.note}`;
    }).join('\n\n');
    return `Mình tìm được mấy quán hợp ý bạn:\n\n${blocks}\n\nBạn đi mấy người và ngân sách khoảng bao nhiêu? Mình sẽ tính combo vừa túi tiền cho bạn.`;
  }

  // 3. Câu chung chung → giới thiệu bằng số liệu thật
  const openNow = rests.filter(r => getOpenStatus(r.openingHours, now.minutes).open).slice(0, 3).map(r => `**${r.name}**`);
  return `Chào bạn! Mình là **Hợp Vị AI**, nắm thực đơn và giá đã xác minh của **${rests.length} quán** tại Đồng Nai.${openNow.length ? `\n\nBây giờ (${now.label}) đang mở cửa: ${openNow.join(', ')}...` : ''}\n\nBạn cho mình biết **số người, ngân sách và món muốn ăn** (ví dụ: "3 người 150k, thích món nước"), mình sẽ gợi ý combo vừa túi tiền nhé!`;
}

module.exports = {
  buildChatKnowledge,
  buildSolverContext,
  generateSmartFallbackReply,
  getVietnamNow,
  getOpenStatus,
  parseOpeningRanges
};
