/**
 * HỢP VỊ AI - FRONTEND APPLICATION CONTROLLER
 */

let appState = {
  overview: null,
  restaurants: [],
  specialties: [],
  currentAnalysis: null,
  scanDraftItems: [],
  adminData: null,
  currentUser: null
};

let leafletMap = null;
let leafletMarkers = [];
let originMarker = null;
let routePolyline = null;
let currentOriginCoords = { lat: 10.9508, lng: 106.8222, label: 'Công viên Biên Hùng (P. Trấn Biên)' };
let deferredPwaPrompt = null;
let showAllMobileRestaurants = false;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const nativeBox = document.getElementById('pwa-native-install-box');
  if (nativeBox) nativeBox.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  loadSavedUserSession();
  const urlView = new URLSearchParams(window.location.search).get('view');
  if (urlView) {
    switchView(urlView);
  }
  await refreshAllData();
  await runSampleMenuScan('sample_bun_thai');
});

function loadSavedUserSession() {
  try {
    const raw = localStorage.getItem('hop_vi_ai_user');
    if (raw) {
      appState.currentUser = JSON.parse(raw);
    }
  } catch (_) {}
  applyUserRolePermissions();
  const role = appState.currentUser?.role || 'customer';
  if (role === 'partner') {
    switchView('partner');
  } else if (role === 'admin') {
    switchView('admin-dashboard');
  } else {
    switchView('home');
  }
}

function onBrandClick() {
  const role = appState.currentUser?.role || 'customer';
  if (role === 'partner') switchView('partner');
  else if (role === 'admin') switchView('admin-dashboard');
  else switchView('home');
}

function applyUserRolePermissions() {
  const user = appState.currentUser;
  const activeRole = user?.role || 'customer';
  document.body.dataset.role = activeRole;
  setTimeout(() => { renderNotificationCenter(); updateWpSidebarUser(); }, 0);

  const iconEl = document.getElementById('user-account-avatar') || document.getElementById('user-account-icon');
  const labelEl = document.getElementById('user-account-label');
  const btnEl = document.getElementById('user-account-btn');
  const logoBox = document.getElementById('brand-logo-box');
  const titleText = document.getElementById('brand-title-text');
  const sloganText = document.getElementById('brand-slogan-text');

  // Ẩn/Hiện thanh menu Desktop và thanh menu Mobile tương ứng đúng với từng vai trò
  document.querySelectorAll('.role-nav').forEach(nav => {
    nav.style.display = nav.dataset.forRole === activeRole ? '' : 'none';
  });
  document.querySelectorAll('.role-mobile-nav').forEach(nav => {
    nav.style.display = nav.dataset.forRole === activeRole ? '' : 'none';
  });
  const topPillsBar = document.getElementById('mobile-top-pills-bar');
  if (topPillsBar) {
    topPillsBar.style.display = activeRole === 'customer' ? 'flex' : 'none';
  }

  // Đánh dấu thẻ tài khoản mẫu trong Modal
  ['customer', 'partner', 'admin'].forEach(r => {
    const card = document.getElementById(`sample-card-${r}`) || document.getElementById(`quick-role-btn-${r}`);
    if (card) card.classList.toggle('active-sample-card', user ? r === activeRole : false);
  });

  if (activeRole === 'partner') {
    if (logoBox) logoBox.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-store"/></svg>';
    if (titleText) titleText.textContent = 'HỢP VỊ AI • CHỦ QUÁN';
    if (sloganText) sloganText.textContent = 'Cổng Quản lý Thực đơn & Nhà hàng • Đồng Nai';
    if (iconEl) iconEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-store"/></svg>';
    if (labelEl) labelEl.textContent = user ? `Chủ quán: ${user.name.split(' ').slice(-2).join(' ')}` : 'Chủ quán';
    if (btnEl) {
      btnEl.style.background = '#eff6ff';
      btnEl.style.color = '#1d4ed8';
      btnEl.style.borderColor = '#bfdbfe';
      btnEl.title = `Chủ quán: ${user?.name || ''} - Nhấn để quản lý tài khoản hoặc đăng xuất`;
    }
    if (user?.restaurantName && document.getElementById('partner-name')) {
      document.getElementById('partner-name').value = user.restaurantName;
    }
    if (user?.restaurantAddress && document.getElementById('partner-address')) {
      document.getElementById('partner-address').value = user.restaurantAddress;
    }
    if (user?.restaurantArea && document.getElementById('partner-area')) {
      document.getElementById('partner-area').value = user.restaurantArea;
    }
  } else if (activeRole === 'admin') {
    if (logoBox) logoBox.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-shield"/></svg>';
    if (titleText) titleText.textContent = 'HỢP VỊ AI • ADMIN';
    if (sloganText) sloganText.textContent = 'Trung tâm Quản trị Toàn trang Web';
    if (iconEl) iconEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-shield"/></svg>';
    if (labelEl) labelEl.textContent = 'Admin Toàn quyền';
    if (btnEl) {
      btnEl.style.background = '#f3e8ff';
      btnEl.style.color = '#7e22ce';
      btnEl.style.borderColor = '#e9d5ff';
      btnEl.title = 'Admin Toàn quyền - Nhấn để quản lý tài khoản hoặc đăng xuất';
    }
  } else {
    if (logoBox) logoBox.innerHTML = '<img src="/icons/logo.png" alt="Hợp Vị AI" class="brand-logo-img" />';
    if (titleText) titleText.textContent = 'HỢP VỊ AI';
    if (sloganText) sloganText.textContent = 'Ẩm thực Đồng Nai';
    if (iconEl) iconEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-user"/></svg>';
    if (labelEl) {
      labelEl.textContent = user ? `Khách: ${user.name.split(' ').slice(-2).join(' ')}` : 'Đăng nhập';
    }
    if (btnEl) {
      btnEl.style.background = user ? '#f0fdf4' : 'var(--surface)';
      btnEl.style.color = user ? '#15803d' : 'var(--text)';
      btnEl.style.borderColor = user ? '#bbf7d0' : 'var(--border)';
      btnEl.title = user ? `Khách hàng: ${user.name} - Nhấn để đổi tài khoản hoặc đăng xuất` : 'Đăng nhập / Phân quyền tài khoản';
    }
  }

  const fbNameInput = document.getElementById('fb-user-name');
  if (fbNameInput && user) {
    fbNameInput.value = user.name;
  }

  // AI Trợ lý Tư vấn chỉ dành riêng cho Khách hàng (ẩn hoàn toàn với Chủ quán và Admin)
  const chatBtn = document.getElementById('floating-chat-btn');
  const chatPanel = document.getElementById('live-chat-panel');
  if (chatBtn) {
    chatBtn.style.display = activeRole === 'customer' ? 'flex' : 'none';
  }
  if (activeRole !== 'customer' && chatPanel) {
    chatPanel.classList.remove('open');
  }
}

async function refreshAllData() {
  try {
    const [ovRes, restRes, specRes, admRes] = await Promise.all([
      fetch('/api/v1/overview').then(r => r.json()),
      fetch('/api/v1/restaurants').then(r => r.json()),
      fetch('/api/v1/specialties').then(r => r.json()),
      fetch('/api/v1/admin/dashboard').then(r => r.json())
    ]);

    if (ovRes.success) appState.overview = ovRes.data;
    if (restRes.success) appState.restaurants = restRes.data;
    if (specRes.success) appState.specialties = specRes.data;
    if (admRes.success) appState.adminData = admRes.data;

    renderHeaderStats();
    renderHomeSpecialties();
    renderHomeRestaurants();
    renderRecommendRestaurants();
    initOrUpdateLeafletMap();
    renderExploreSpecialties();
    renderFeedbackSection();
    renderAdminDashboard();
    renderNotificationCenter();
  } catch (err) {
    console.error('Lỗi tải dữ liệu khởi tạo:', err);
  }
}

function autoResizeTextarea(el) {
  if (!el) return;
  // Đặt height tạm về 1px để trình duyệt tính đúng scrollHeight thực tế của nội dung văn bản
  el.style.height = '1px';
  const computed = window.getComputedStyle(el);
  const borderTop = parseFloat(computed.borderTopWidth) || 0;
  const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
  const minH = el.id === 'home-quick-input' ? 46 : 58;
  const targetH = Math.max(minH, el.scrollHeight + borderTop + borderBottom);
  el.style.height = `${targetH}px`;
  el.style.overflowY = 'hidden';
}

// Bắt sự kiện gõ phím / xóa / dán nội dung thời gian thực cho mọi ô nhập đa dòng
document.addEventListener('input', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('auto-expand-textarea')) {
    autoResizeTextarea(e.target);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('auto-expand-textarea')) {
    autoResizeTextarea(e.target);
  }
});

window.addEventListener('resize', () => {
  document.querySelectorAll('.auto-expand-textarea').forEach(el => autoResizeTextarea(el));
});

function switchView(viewName) {
  const activeUser = appState.currentUser;
  const activeRole = activeUser?.role || 'customer';

  // Chặn truy cập khu vực Chủ quán nếu chưa đăng nhập vai trò Chủ quán
  if (viewName.startsWith('partner')) {
    if (!activeUser || activeRole !== 'partner') {
      showToast('⚠️ Bạn cần đăng nhập tài khoản Chủ quán để truy cập khu vực này!', 'warning');
      openAuthModal('Vui lòng đăng nhập tài khoản Chủ quán (chuquan@hopviai.vn) để truy cập!');
      fillLoginForm('partner');
      return;
    }
  }

  // Chặn truy cập khu vực Admin nếu chưa đăng nhập vai trò Admin
  if (viewName.startsWith('admin')) {
    if (!activeUser || activeRole !== 'admin') {
      showToast('⚠️ Bạn cần đăng nhập tài khoản Quản trị viên để truy cập khu vực Quản trị!', 'warning');
      openAuthModal('Vui lòng đăng nhập tài khoản Quản trị viên (admin@hopviai.vn) để truy cập!');
      fillLoginForm('admin');
      return;
    }
  }

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.top-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.wp-menu-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
    if (btn.dataset.view === viewName) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  });
  if (typeof closeWpSidebar === 'function') closeWpSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    document.querySelectorAll('.auto-expand-textarea').forEach(el => autoResizeTextarea(el));
  }, 40);
  if ((viewName === 'map' || viewName === 'home') && leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 180);
  }
  if (viewName === 'recommend') {
    renderRecommendRestaurants();
  }

  // Điều phối hiển thị nút Chat AI: Chỉ hiện ở màn hình Khách hàng
  const chatBtn = document.getElementById('floating-chat-btn');
  const chatPanel = document.getElementById('live-chat-panel');
  const isCustView = !viewName.startsWith('partner') && !viewName.startsWith('admin');
  const role = appState.currentUser?.role || 'customer';
  if (chatBtn) {
    chatBtn.style.display = (isCustView && role === 'customer') ? 'flex' : 'none';
  }
  if (!isCustView && chatPanel) {
    chatPanel.classList.remove('open');
  }
}

function onHeroFilterChange(type) {
  const people = document.getElementById('hero-filter-people')?.value || '3';
  const budget = parseInt(document.getElementById('hero-filter-budget')?.value || '150000', 10);
  const area = document.getElementById('hero-filter-area')?.value || 'all';

  const lblPeople = document.getElementById('label-filter-people');
  const lblBudget = document.getElementById('label-filter-budget');
  const lblArea = document.getElementById('label-filter-area');

  if (lblPeople) lblPeople.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-users"/></svg> ${escapeHtml(people)} người ▾`;
  if (lblBudget) lblBudget.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-wallet"/></svg> ${budget >= 1000 ? (budget / 1000) + 'k' : budget + 'đ'} ▾`;
  if (lblArea) {
    const cleanArea = area === 'all' ? 'Khu vực' : (area.length > 9 ? area.replace(/^Phường\s+/, '') : area);
    lblArea.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(cleanArea)} ▾`;
  }

  const quickInput = document.getElementById('home-quick-input');
  if (quickInput) {
    const areaText = area === 'all' ? 'ở Trấn Biên' : `ở ${area}`;
    quickInput.placeholder = `Nhóm ${people} người ${areaText}, ngân sách ${budget.toLocaleString('vi-VN')}đ...`;
  }
}

function runHeroSuggestedPrompt() {
  const quickVal = document.getElementById('home-quick-input')?.value?.trim();
  if (quickVal) {
    triggerQuickRecommend();
    return;
  }
  const people = document.getElementById('hero-filter-people')?.value || '3';
  const budget = parseInt(document.getElementById('hero-filter-budget')?.value || '150000', 10);
  const area = document.getElementById('hero-filter-area')?.value || 'all';

  const areaStr = area === 'all' ? 'khu vực Trấn Biên hoặc lân cận' : `khu vực ${area}`;
  const prompt = `Nhóm mình có ${people} người muốn ăn tại ${areaStr}, tổng ngân sách ${budget.toLocaleString('vi-VN')} đồng. Gợi ý combo món ăn phù hợp tại cùng 1 quán.`;

  usePresetPrompt(prompt);
}

function scrollToRestaurants() {
  switchView('recommend');
}

function showNotificationToast(msg) {
  let toast = document.getElementById('global-toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast-msg';
    toast.className = 'global-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg || 'Hệ thống HỢP VỊ AI đã cập nhật 21 quán ăn & 122 hình ảnh thực tế!';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ==================== TRUNG TÂM THÔNG BÁO (CHUÔNG) ==================== */

const NOTIF_READ_KEY = 'hv_notif_read';
let notifItems = [];

function loadReadNotifications() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]')); } catch (_) { return new Set(); }
}
function saveReadNotifications(set) {
  try { localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(Array.from(set).slice(-200))); } catch (_) { /* chế độ riêng tư: bỏ qua */ }
}

/* Dựng danh sách thông báo từ dữ liệu thật, theo vai trò đang dùng.
   Id chứa số liệu (ví dụ số hồ sơ chờ duyệt) nên khi số liệu đổi, thông báo sẽ báo mới trở lại. */
function buildNotifications() {
  const role = document.body.dataset.role || 'customer';
  const rests = appState.restaurants || [];
  const subs = appState.adminData?.submissions || [];
  const fbs = appState.adminData?.feedbacks || [];
  const pending = subs.filter(s => s.status === 'pending');
  const unverifiedFb = fbs.filter(f => f.status !== 'verified');
  const photos = rests.reduce((sum, r) => sum + ((r.photos || []).length), 0);
  const list = [];

  if (role === 'admin') {
    if (pending.length) list.push({
      id: `adm-pending-${pending.length}`, icon: 'inbox', tone: 'warn',
      title: `${pending.length} hồ sơ thực đơn chờ duyệt`,
      text: 'Chủ quán đã gửi thực đơn mới, cần kiểm tra và công bố.',
      go: () => switchView('admin')
    });
    if (unverifiedFb.length) list.push({
      id: `adm-fb-${unverifiedFb.length}`, icon: 'message', tone: 'warn',
      title: `${unverifiedFb.length} phản hồi chờ kiểm duyệt`,
      text: 'Có đánh giá / báo giá mới từ thực khách chưa được xác minh.',
      go: () => switchView('admin-feedbacks')
    });
  } else if (role === 'partner') {
    if (pending.length) list.push({
      id: `par-pending-${pending.length}`, icon: 'clock', tone: 'warn',
      title: `${pending.length} hồ sơ đang chờ Admin duyệt`,
      text: 'Thực đơn bạn gửi sẽ hiển thị cho khách sau khi được công bố.',
      go: () => switchView('partner-menus')
    });
    subs.filter(s => s.status === 'approved' || s.status === 'rejected')
      .sort((a, b) => new Date(b.reviewedAt || b.submittedAt || 0) - new Date(a.reviewedAt || a.submittedAt || 0))
      .slice(0, 3)
      .forEach(s => list.push({
        id: `par-${s.id}-${s.status}`,
        icon: s.status === 'approved' ? 'check-circle' : 'x-circle',
        tone: s.status === 'approved' ? 'success' : 'danger',
        title: `Hồ sơ "${s.partnerName}" ${s.status === 'approved' ? 'đã được công bố' : 'bị từ chối'}`,
        text: s.status === 'approved' ? 'Thực đơn đã hiển thị trên hệ thống cho khách hàng.' : 'Hãy kiểm tra lại thông tin và gửi lại hồ sơ.',
        go: () => switchView('partner-menus')
      }));
    if (fbs.length) list.push({
      id: `par-fb-${fbs.length}`, icon: 'message', tone: 'info',
      title: `${fbs.length} phản hồi từ khách hàng`,
      text: 'Xem đánh giá và báo giá mới nhất về quán của bạn.',
      go: () => switchView('partner-reviews')
    });
  }

  if (rests.length) list.push({
    id: `sys-data-${rests.length}-${photos}`, icon: 'store', tone: 'info',
    title: 'Dữ liệu quán ăn đã được cập nhật',
    text: `${rests.length} quán đã xác minh${photos ? ` và ${photos} ảnh thực tế` : ''} từ khảo sát tại Đồng Nai.`,
    go: role === 'customer' ? () => switchView('recommend') : null
  });

  if (role === 'customer') {
    list.push({
      id: 'tip-chat', icon: 'sparkles', tone: 'info',
      title: 'Hỏi Hợp Vị AI về món và quán ăn',
      text: 'Bấm vào thẻ quán trong câu trả lời để xem ngay trên bản đồ.',
      go: () => { const p = document.getElementById('live-chat-panel'); if (p && !p.classList.contains('open')) toggleLiveChat(); }
    });
    list.push({
      id: 'tip-gps', icon: 'locate-fixed', tone: 'info',
      title: 'Xem đường đi từ vị trí của bạn',
      text: 'Vào Bản đồ và bấm "Định vị GPS" để đặt điểm xuất phát.',
      go: () => switchView('map')
    });
  }
  return list;
}

function renderNotificationCenter() {
  notifItems = buildNotifications();
  const read = loadReadNotifications();
  const unread = notifItems.filter(n => !read.has(n.id)).length;

  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  }
  const btn = document.getElementById('notif-btn');
  if (btn) btn.setAttribute('aria-label', unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo');

  const markAll = document.getElementById('notif-mark-all');
  if (markAll) markAll.disabled = unread === 0;

  const box = document.getElementById('notif-list');
  if (!box) return;
  if (notifItems.length === 0) {
    box.innerHTML = '<div class="notif-empty"><svg class="ic" aria-hidden="true"><use href="#i-bell"/></svg>Chưa có thông báo nào</div>';
    return;
  }
  box.innerHTML = notifItems.map((n, i) => `
    <button type="button" class="notif-item ${read.has(n.id) ? '' : 'unread'}" onclick="onNotificationClick(${i})">
      <span class="notif-item-icon tone-${n.tone}"><svg class="ic" aria-hidden="true"><use href="#i-${n.icon}"/></svg></span>
      <span class="notif-item-body">
        <span class="notif-item-title">${escapeHtml(n.title)}</span>
        <span class="notif-item-text">${escapeHtml(n.text)}</span>
      </span>
      ${read.has(n.id) ? '' : '<span class="notif-item-dot" aria-hidden="true"></span>'}
    </button>
  `).join('');
}

function setNotificationPanelOpen(open) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-btn');
  if (!panel || !btn) return;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) renderNotificationCenter();
}

function toggleNotificationPanel(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  setNotificationPanelOpen(panel.hidden);
}

function markAllNotificationsRead() {
  const read = loadReadNotifications();
  notifItems.forEach(n => read.add(n.id));
  saveReadNotifications(read);
  renderNotificationCenter();
}

function onNotificationClick(idx) {
  const n = notifItems[idx];
  if (!n) return;
  const read = loadReadNotifications();
  read.add(n.id);
  saveReadNotifications(read);
  setNotificationPanelOpen(false);
  renderNotificationCenter();
  if (typeof n.go === 'function') n.go();
}

// Bấm ra ngoài hoặc nhấn Esc để đóng hộp thông báo
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  if (!panel || panel.hidden) return;
  if (!e.target.closest('.notif-wrap')) setNotificationPanelOpen(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const panel = document.getElementById('notif-panel');
    if (panel && !panel.hidden) {
      setNotificationPanelOpen(false);
      document.getElementById('notif-btn')?.focus();
    }
  }
});

/* Thông báo nổi dùng ở luồng đăng nhập / phân quyền (trước đây được gọi nhưng chưa có hàm → đăng nhập xong không chuyển trang).
   Bỏ emoji đầu câu vì giao diện dùng icon SVG thay cho emoji. */
function showToast(msg) {
  showNotificationToast(String(msg || '').replace(/^(?:⚠️?|✅|❌|ℹ️?)\s*/u, ''));
}

function scrollToSection(elementId) {
  if (elementId === 'dongnai-map-anchor') {
    switchView('map');
    return;
  }
  switchView('home');
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (leafletMap) leafletMap.invalidateSize();
  }, 140);
}

function renderHeaderStats() {
  if (!appState.overview) return;
  const { stats, aiStatus } = appState.overview;

  const restEl = document.getElementById('stat-restaurants');
  const itemEl = document.getElementById('stat-items');
  const pendingEl = document.getElementById('pending-badge-count');
  if (restEl) restEl.textContent = stats.approvedRestaurants;
  if (itemEl) itemEl.textContent = stats.approvedMenuItems;
  if (pendingEl) pendingEl.textContent = stats.pendingSubmissions;

  const badgeBtn = document.getElementById('api-status-btn');
  const badgeText = document.getElementById('api-status-text');
  if (aiStatus.hasApiKey) {
    badgeBtn.className = 'api-status-badge online';
    badgeText.textContent = 'Live AI';
  } else {
    badgeBtn.className = 'api-status-badge fallback';
    badgeText.textContent = 'Cài Key';
  }
}

function getRestaurantVisualTheme(r) {
  const n = (r.name || '').toLowerCase();
  if (n.includes('bưởi')) {
    return {
      gradients: [
        'linear-gradient(135deg, #14532d 0%, #15803d 55%, #ca8a04 100%)',
        'linear-gradient(135deg, #365314 0%, #16a34a 55%, #eab308 100%)',
        'linear-gradient(135deg, #713f12 0%, #a16207 55%, #15803d 100%)',
        'linear-gradient(135deg, #064e3b 0%, #047857 55%, #d97706 100%)'
      ],
      icons: ['🍊🏡', '🥗🦐', '🍗🍊', '🍲🔥'],
      label: 'Đặc sản Làng Bưởi Tân Triều'
    };
  }
  if (n.includes('lẩu tôm') || n.includes('5 ri')) {
    return {
      gradients: [
        'linear-gradient(135deg, #7f1d1d 0%, #c2410c 60%, #ea580c 100%)',
        'linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #f59e0b 100%)',
        'linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #ea580c 100%)',
        'linear-gradient(135deg, #78350f 0%, #b45309 60%, #dc2626 100%)'
      ],
      icons: ['🦐🍲', '🍢🥬', '🐟🔥', '🦑🍋'],
      label: 'Lẩu Tôm & Hải Sản Tươi'
    };
  }
  if (n.includes('chay')) {
    return {
      gradients: [
        'linear-gradient(135deg, #064e3b 0%, #059669 60%, #10b981 100%)',
        'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #4ade80 100%)',
        'linear-gradient(135deg, #115e59 0%, #0d9488 60%, #2dd4bf 100%)',
        'linear-gradient(135deg, #3f6212 0%, #65a30d 60%, #a3e635 100%)'
      ],
      icons: ['🌱🍲', '🍄🥬', '🥟🌿', '🍵🪷'],
      label: 'Ẩm Thực Chay Thanh Tịnh'
    };
  }
  if (n.includes('bún thái') || n.includes('thành minh')) {
    return {
      gradients: [
        'linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #f59e0b 100%)',
        'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #fb923c 100%)',
        'linear-gradient(135deg, #78350f 0%, #d97706 55%, #facc15 100%)',
        'linear-gradient(135deg, #881337 0%, #e11d48 55%, #f97316 100%)'
      ],
      icons: ['🍜🌶️', '🦐🍜', '🍝🥩', '🥣🍋'],
      label: 'Bún Thái & Mì Trộn'
    };
  }
  if (n.includes('bún bò')) {
    return {
      gradients: [
        'linear-gradient(135deg, #7c2d12 0%, #b45309 60%, #d97706 100%)',
        'linear-gradient(135deg, #431407 0%, #9a3412 60%, #ea580c 100%)',
        'linear-gradient(135deg, #713f12 0%, #ca8a04 60%, #f59e0b 100%)',
        'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 60%, #f97316 100%)'
      ],
      icons: ['🍜🥩', '🍖🍲', '🎋🍜', '🌶️🥬'],
      label: 'Bún Bò Truyền Thống'
    };
  }
  if (n.includes('cơm gà') || n.includes('nhà túc') || n.includes('a sóc')) {
    return {
      gradients: [
        'linear-gradient(135deg, #78350f 0%, #b45309 55%, #f59e0b 100%)',
        'linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #fbbf24 100%)',
        'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #f59e0b 100%)',
        'linear-gradient(135deg, #713f12 0%, #ca8a04 55%, #fde047 100%)'
      ],
      icons: ['🍛🍗', '🍱🍣', '🍜🥚', '🥗🍹'],
      label: 'Cơm & Món Chiên Xào'
    };
  }
  if (n.includes('bún đậu') || n.includes('bún chả') || n.includes('bún 32')) {
    return {
      gradients: [
        'linear-gradient(135deg, #713f12 0%, #a16207 60%, #ca8a04 100%)',
        'linear-gradient(135deg, #78350f 0%, #d97706 60%, #fbbf24 100%)',
        'linear-gradient(135deg, #14532d 0%, #15803d 60%, #ca8a04 100%)',
        'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #f59e0b 100%)'
      ],
      icons: ['🥢🧆', '🥩🌿', '春卷🥬', '🍱🔥'],
      label: 'Bún Đậu • Bún Thịt Nướng'
    };
  }
  if (n.includes('chả lụi') || n.includes('sugar')) {
    return {
      gradients: [
        'linear-gradient(135deg, #881337 0%, #be123c 55%, #f43f5e 100%)',
        'linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #fb923c 100%)',
        'linear-gradient(135deg, #7c2d12 0%, #d97706 55%, #facc15 100%)',
        'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #f43f5e 100%)'
      ],
      icons: ['🍢🔥', '🍗🌶️', '🍝🧀', '🥗🍚'],
      label: 'Ăn Vặt & Combo Sinh Viên'
    };
  }
  return {
    gradients: [
      'linear-gradient(135deg, #0c4a6e 0%, #0284c7 60%, #38bdf8 100%)',
      'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #fb923c 100%)',
      'linear-gradient(135deg, #115e59 0%, #0d9488 60%, #2dd4bf 100%)',
      'linear-gradient(135deg, #78350f 0%, #b45309 60%, #f59e0b 100%)'
    ],
    icons: ['🐟🥣', '🍜🐚', '🍲🌿', '🥢🍋'],
    label: 'Đặc Sản Sông Nước Biên Hòa'
  };
}

function scrollGallery(trackId, dir) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const slideWidth = track.clientWidth || 320;
  const maxScroll = track.scrollWidth - slideWidth;
  let nextLeft = track.scrollLeft + dir * slideWidth;
  if (nextLeft > maxScroll + 10) nextLeft = 0;
  if (nextLeft < -10) nextLeft = maxScroll;
  track.scrollTo({ left: nextLeft, behavior: 'smooth' });
}

function buildRestaurantGalleryHtml(r, prefix = 'home') {
  const theme = getRestaurantVisualTheme(r);
  const trackId = `gal-${prefix}-${r.id}`;
  const dishes = r.menu || [];

  const slides = [];

  // 1. Ảnh nhận diện / Không gian quán
  const mainPhotoUrl = r.avatarUrl || (r.photos && r.photos[0] && r.photos[0].url) || '';
  slides.push({
    imageUrl: mainPhotoUrl,
    badge: 'Không gian & Nhận diện',
    tag: `P. ${r.area || ''}`,
    title: r.name,
    sub: `${r.openingHours || 'Đang mở cửa'} • ${r.address || ''}`,
    gradient: theme.gradients[0],
    icon: theme.icons[0]
  });

  // 2. Các món ăn có ảnh thực tế từ thực đơn khảo sát
  const seenUrls = new Set();
  if (mainPhotoUrl) seenUrls.add(mainPhotoUrl);

  for (const d of dishes) {
    if (d.imageUrl && !seenUrls.has(d.imageUrl)) {
      seenUrls.add(d.imageUrl);
      const idx = slides.length;
      slides.push({
        imageUrl: d.imageUrl,
        badge: `Món tiêu biểu`,
        tag: d.rawPriceText || `${(d.price || 0).toLocaleString('vi-VN')}đ`,
        title: d.name,
        sub: `Giá niêm yết: ${d.rawPriceText || `${(d.price || 0).toLocaleString('vi-VN')}đ`} • ${d.portionMin || 1} người`,
        gradient: theme.gradients[idx % theme.gradients.length],
        icon: theme.icons[idx % theme.icons.length]
      });
      if (slides.length >= 6) break;
    }
  }

  // 3. Nếu chưa đủ slides, lấy thêm từ r.photos (ảnh khảo sát chụp thêm)
  if (r.photos && r.photos.length > 0 && slides.length < 5) {
    for (const p of r.photos) {
      if (p.url && !seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        const idx = slides.length;
        const cleanTitle = p.title ? p.title.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : r.name;
        slides.push({
          imageUrl: p.url,
          badge: `Ảnh thực tế tại quán`,
          tag: theme.label,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          sub: `Xác minh thực tế tại ${r.name}`,
          gradient: theme.gradients[idx % theme.gradients.length],
          icon: theme.icons[idx % theme.icons.length]
        });
        if (slides.length >= 5) break;
      }
    }
  }

  // 4. Nếu vẫn ít hơn 3 slide, bổ sung các món khác trong menu với giao diện gradient/icon fallback
  if (slides.length < 3) {
    for (const d of dishes) {
      if (!slides.some(s => s.title === d.name)) {
        const idx = slides.length;
        slides.push({
          imageUrl: '',
          badge: `Thực đơn xác minh`,
          tag: d.rawPriceText || `${(d.price || 0).toLocaleString('vi-VN')}đ`,
          title: d.name,
          sub: `Giá niêm yết: ${d.rawPriceText || `${(d.price || 0).toLocaleString('vi-VN')}đ`}`,
          gradient: theme.gradients[idx % theme.gradients.length],
          icon: theme.icons[idx % theme.icons.length]
        });
        if (slides.length >= 3) break;
      }
    }
  }

  const total = slides.length;

  return `
    <div class="rest-gallery-wrapper">
      <button type="button" class="gallery-nav-btn prev" onclick="scrollGallery('${trackId}', -1)" title="Ảnh trước">‹</button>
      <button type="button" class="gallery-nav-btn next" onclick="scrollGallery('${trackId}', 1)" title="Ảnh tiếp theo">›</button>
      <div id="${trackId}" class="rest-gallery-track">
        ${slides.map((s, idx) => `
          <div class="rest-gallery-slide" style="background:${s.gradient};">
            ${safeImgSrc(s.imageUrl) ? `
              <img class="rest-slide-img" src="${safeImgSrc(s.imageUrl)}" alt="${escapeHtml(s.title)}" loading="lazy"
                onerror="this.style.display='none'; this.parentElement.querySelector('.rest-slide-center')?.classList.remove('hidden-for-img');" />
            ` : ''}
            <div class="rest-slide-top">
              <span class="rest-visual-tag"><svg class="ic" aria-hidden="true"><use href="#i-camera"/></svg> Ảnh ${idx + 1}/${total} • ${escapeHtml(s.badge)}</span>
              <span class="rest-visual-tag">${escapeHtml(s.tag || theme.label)}</span>
            </div>
            <div class="rest-slide-center ${safeImgSrc(s.imageUrl) ? 'hidden-for-img' : ''}"><svg class="ic" aria-hidden="true"><use href="#i-utensils"/></svg></div>
            <div class="rest-slide-bottom">
              <div>
                <div class="rest-slide-caption">${escapeHtml(s.title)}</div>
                <div class="rest-slide-sub">${escapeHtml(s.sub)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="gallery-hint-bar">
        <span><svg class="ic" aria-hidden="true"><use href="#i-arrows-h"/></svg> Cuộn ngang hoặc bấm nút ‹ › để xem ${total} ảnh quán & món ăn</span>
        <span>${total} ảnh thực tế</span>
      </div>
    </div>
  `;
}

function selectMapArea(areaName) {
  const select = document.getElementById('home-area-filter');
  if (select) {
    select.value = areaName;
    renderHomeRestaurants();
  }
  if (appState.restaurants.length > 0) {
    const filtered = areaName === 'all'
      ? appState.restaurants
      : appState.restaurants.filter(r => r.area.toLowerCase() === areaName.toLowerCase());
    if (filtered.length > 0) {
      if (areaName !== 'all') {
        const destSelect = document.getElementById('route-dest-select');
        if (destSelect) {
          destSelect.value = filtered[0].id;
          drawRouteToSelectedRestaurant();
          return;
        }
      } else if (leafletMap) {
        const bounds = filtered.map(r => [r.lat || 10.9502, r.lng || 106.8234]);
        leafletMap.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
      }
    }
  }
}

function initOrUpdateLeafletMap() {
  const destSelect = document.getElementById('route-dest-select');
  if (destSelect) {
    const prevVal = destSelect.value;
    destSelect.innerHTML = `<option value="">-- Chọn quán ăn để vẽ đường đi trực tiếp (${appState.restaurants.length} quán) --</option>` +
      appState.restaurants.map(r => `<option value="${r.id}">[${escapeHtml(r.area)}] ${escapeHtml(r.name)} (${escapeHtml(r.address)})</option>`).join('');
    if (prevVal) destSelect.value = prevVal;
  }

  const mapContainer = document.getElementById('leaflet-routing-map');
  if (!mapContainer || typeof L === 'undefined') return;

  if (!leafletMap) {
    leafletMap = L.map('leaflet-routing-map', {
      center: [10.9535, 106.8250],
      zoom: 13.5,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      scrollWheelZoom: false, // Tắt auto-zoom khi cuộn dọc để vuốt 2 ngón Lên/Xuống/Trái/Phải đều di chuyển bản đồ mượt mà
      dragging: true,
      tap: false,
      keyboard: true,
      keyboardPanDelta: 120,
      doubleClickZoom: true
    });
    if (leafletMap.dragging) {
      leafletMap.dragging.enable();
    }
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap • HỢP VỊ AI Đồng Nai'
    }).addTo(leafletMap);

    // Điều khiển chuẩn Touchpad & Chuột:
    // - Vuốt 2 ngón tay Lên/Xuống/Trái/Phải (hoặc lăn chuột): Di chuyển bản đồ theo cả 2 trục X (Trái/Phải) và Y (Lên/Xuống)
    // - Chụm/mở 2 ngón tay (Ctrl + Wheel): Zoom phóng to / thu nhỏ tại vị trí con trỏ
    mapContainer.addEventListener('wheel', e => {
      if (!leafletMap) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Chụm/mở 2 ngón trên Touchpad hoặc giữ Ctrl + lăn chuột -> Zoom
        const zoomStep = e.deltaY < 0 ? 0.45 : -0.45;
        const mouseLatLng = leafletMap.mouseEventToLatLng(e);
        leafletMap.setZoomAround(mouseLatLng, leafletMap.getZoom() + zoomStep, { animate: false });
      } else {
        // Vuốt Lên/Xuống (deltaY) và Trái/Phải (deltaX) -> Di chuyển bản đồ tự do cả 4 hướng
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
        leafletMap.panBy([dx * 1.15, dy * 1.15], { animate: false });
      }
    }, { passive: false });

    // Bổ sung bộ kéo giữ chuột trái 4 hướng trực tiếp (đảm bảo kéo Lên/Xuống/Trái/Phải trên mọi trình duyệt)
    let isPointerDown = false;
    let lastClientX = 0;
    let lastClientY = 0;
    mapContainer.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      if (e.target.closest('.map-pan-dpad') || e.target.closest('.leaflet-control') || e.target.closest('.leaflet-popup')) return;
      isPointerDown = true;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
    });
    window.addEventListener('pointermove', e => {
      if (!isPointerDown || !leafletMap) return;
      const moveX = lastClientX - e.clientX;
      const moveY = lastClientY - e.clientY;
      if (Math.abs(moveX) > 1 || Math.abs(moveY) > 1) {
        leafletMap.panBy([moveX, moveY], { animate: false });
        lastClientX = e.clientX;
        lastClientY = e.clientY;
      }
    });
    window.addEventListener('pointerup', () => {
      isPointerDown = false;
    });

    // Tự động đồng bộ kích thước khung bản đồ
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize({ pan: false });
    }, 200);
  }

  // Xóa marker cũ
  leafletMarkers.forEach(m => leafletMap.removeLayer(m));
  leafletMarkers = [];

  // Vẽ marker điểm xuất phát
  updateOriginMarkerOnMap();

  // Vẽ 18 ghim quán ăn
  appState.restaurants.forEach(r => {
    const lat = r.lat || 10.9502;
    const lng = r.lng || 106.8234;
    const marker = L.marker([lat, lng]).addTo(leafletMap);
    marker.on('click', () => {
      const sel = document.getElementById('route-dest-select');
      if (sel) sel.value = r.id;
      leafletMap.flyTo([lat, lng], Math.max(leafletMap.getZoom(), 15), {
        animate: true,
        duration: 0.45
      });
    });
    marker.bindPopup(`
      <div style="min-width:210px; font-family:'Segoe UI',sans-serif;">
        <div style="font-size:0.75rem; color:#15803d; font-weight:700;"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> Phường ${escapeHtml(r.area)}</div>
        <strong style="font-size:0.95rem;">${escapeHtml(r.name)}</strong>
        <div style="font-size:0.8rem; color:#57534e; margin:0.2rem 0;">${escapeHtml(r.address)}</div>
        <div style="font-size:0.78rem; margin-bottom:0.45rem;"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> ${escapeHtml(r.openingHours)} • ${(r.menu || []).length} món</div>
        <button
          onclick="routeToRestaurantById('${escapeAttr(r.id)}')"
          style="background:#15803d; color:#fff; border:none; border-radius:6px; padding:0.35rem 0.65rem; font-size:0.78rem; font-weight:700; cursor:pointer; width:100%;"
        >
          <svg class="ic" aria-hidden="true"><use href="#i-navigation"/></svg> Vẽ đường đi tới quán này
        </button>
      </div>
    `, { autoPanPadding: [40, 40] });
    leafletMarkers.push(marker);
  });
}

function panMapBy(dx, dy) {
  if (!leafletMap) return;
  leafletMap.panBy([dx, dy], { animate: true, duration: 0.25 });
}

function centerMapOnActiveTarget() {
  if (!leafletMap) return;
  leafletMap.invalidateSize({ pan: false });
  const destId = document.getElementById('route-dest-select')?.value;
  if (destId) {
    const rest = appState.restaurants.find(r => r.id === destId);
    if (rest) {
      leafletMap.flyTo([rest.lat, rest.lng], 16, { animate: true, duration: 0.5 });
      return;
    }
  }
  leafletMap.flyTo([currentOriginCoords.lat, currentOriginCoords.lng], 15, { animate: true, duration: 0.5 });
}

function toggleExpandMap() {
  const layout = document.querySelector('.map-layout');
  const mapEl = document.getElementById('leaflet-routing-map');
  if (!layout || !mapEl) return;
  layout.classList.toggle('map-expanded');
  const isExpanded = layout.classList.contains('map-expanded');
  mapEl.style.height = isExpanded ? '600px' : '480px';
  setTimeout(() => {
    if (leafletMap) leafletMap.invalidateSize({ animate: true });
  }, 150);
}

function updateOriginMarkerOnMap() {
  if (!leafletMap || typeof L === 'undefined') return;
  if (originMarker) leafletMap.removeLayer(originMarker);

  const originIcon = L.divIcon({
    className: 'custom-origin-pin',
    html: `<div style="background:#15803d; color:#fff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:999px; border:2px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.35); white-space:nowrap;"><svg class="ic" aria-hidden="true"><use href="#i-flag"/></svg> Điểm đi</div>`,
    iconSize: [75, 26],
    iconAnchor: [37, 13]
  });

  originMarker = L.marker([currentOriginCoords.lat, currentOriginCoords.lng], { icon: originIcon })
    .addTo(leafletMap)
    .bindPopup(`<strong><svg class="ic" aria-hidden="true"><use href="#i-flag"/></svg> Điểm xuất phát của bạn:</strong><br/>${escapeHtml(currentOriginCoords.label)}`);
}

function onOriginChange() {
  const sel = document.getElementById('route-origin-select');
  if (!sel || !sel.value) return;
  const [latStr, lngStr] = sel.value.split(',');
  const label = sel.options[sel.selectedIndex]?.text || 'Điểm xuất phát';
  currentOriginCoords = {
    lat: parseFloat(latStr),
    lng: parseFloat(lngStr),
    label
  };
  const isGpsOption = sel.options[sel.selectedIndex]?.dataset.gps === 'true';
  if (!isGpsOption && gpsAccuracyCircle && leafletMap) {
    leafletMap.removeLayer(gpsAccuracyCircle);
    gpsAccuracyCircle = null;
  }
  updateOriginMarkerOnMap();
  if (document.getElementById('route-dest-select')?.value) {
    drawRouteToSelectedRestaurant();
  }
}

/* ==================== ĐỊNH VỊ GPS ==================== */
let gpsAccuracyCircle = null;
let gpsRequestInFlight = false;
const BIEN_HOA_CENTER = { lat: 10.9508, lng: 106.8222 };

function setGpsButtonState(state) {
  const btn = document.getElementById('btn-gps-locate');
  if (!btn) return;
  btn.disabled = state === 'loading';
  btn.innerHTML = state === 'loading'
    ? '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> Đang định vị...'
    : `<svg class="ic" aria-hidden="true"><use href="#i-locate"/></svg> ${state === 'ok' ? 'Định vị lại GPS' : 'Định vị GPS'}`;
}

/* Bọc getCurrentPosition thành Promise, luôn có thời gian chờ để không bị treo vô hạn */
function requestGpsPosition(highAccuracy) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 10000 : 15000,
      // Lần chính xác cao luôn lấy vị trí mới (để "Định vị lại" phản ánh đúng chỗ đang đứng);
      // lần dự phòng bằng mạng chấp nhận vị trí đã lưu trong 1 phút cho nhanh
      maximumAge: highAccuracy ? 0 : 60000
    });
  });
}

function buildGpsErrorMessage(err) {
  const keepNote = `\n\nHệ thống tạm giữ điểm xuất phát hiện tại: ${currentOriginCoords.label}.`;
  switch (err?.code) {
    case 1: // PERMISSION_DENIED
      return 'Bạn chưa cho phép trang web truy cập vị trí.\n\n' +
        '• Máy tính: bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Vị trí → Cho phép, rồi bấm "Định vị GPS" lại.\n' +
        '• Điện thoại: bật Dịch vụ vị trí (GPS) và cấp quyền Vị trí cho trình duyệt trong Cài đặt.' + keepNote;
    case 2: // POSITION_UNAVAILABLE
      return 'Thiết bị chưa xác định được vị trí. Hãy bật GPS / Wi-Fi rồi thử lại.' + keepNote;
    case 3: // TIMEOUT
      return 'Hết thời gian chờ tín hiệu định vị. Hãy thử lại ở nơi thoáng hoặc bật Wi-Fi để định vị nhanh hơn.' + keepNote;
    default:
      return `Không lấy được vị trí GPS${err?.message ? ` (${err.message})` : ''}.` + keepNote;
  }
}

/* Kiểm tra trình duyệt có thể định vị không (cần HTTPS hoặc localhost); báo lý do nếu không */
function ensureGeolocationAvailable() {
  if (!window.isSecureContext) {
    alert('Định vị GPS chỉ hoạt động khi trang chạy bằng HTTPS (hoặc localhost).\n\n' +
      `Bạn đang mở trang qua địa chỉ không bảo mật (${location.origin}). Hãy dùng bản đã deploy (https://...) hoặc mở bằng http://localhost trên máy chạy server.`);
    return false;
  }
  if (!('geolocation' in navigator)) {
    alert('Trình duyệt này không hỗ trợ định vị GPS. Bạn có thể chọn điểm xuất phát có sẵn trong ô "Điểm đi".');
    return false;
  }
  return true;
}

/* Lấy vị trí: ưu tiên GPS chính xác cao, hết giờ / không khả dụng thì thử lại bằng định vị mạng (Wi-Fi, IP) */
async function getBestGpsPosition() {
  try {
    return await requestGpsPosition(true);
  } catch (err) {
    if (err?.code === 1) throw err;
    return await requestGpsPosition(false);
  }
}

/* Đưa toạ độ GPS vào ô "Điểm đi", vẽ chấm vị trí + vòng sai số và vẽ lại lộ trình nếu đã chọn quán */
function applyGpsPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  currentOriginCoords = {
    lat,
    lng,
    label: `Vị trí GPS hiện tại của bạn (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  };

  const sel = document.getElementById('route-origin-select');
  if (sel) {
    const customVal = `${lat},${lng}`;
    let opt = Array.from(sel.options).find(o => o.dataset.gps === 'true');
    if (!opt) {
      opt = document.createElement('option');
      opt.dataset.gps = 'true';
      sel.prepend(opt);
    }
    opt.value = customVal;
    opt.textContent = `Vị trí GPS của tôi (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    sel.value = customVal;
  }

  updateOriginMarkerOnMap();
  if (leafletMap && typeof L !== 'undefined') {
    if (gpsAccuracyCircle) leafletMap.removeLayer(gpsAccuracyCircle);
    gpsAccuracyCircle = L.circle([lat, lng], {
      radius: Math.min(Math.max(accuracy || 0, 25), 3000),
      color: '#2563eb',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.12
    }).addTo(leafletMap);
    leafletMap.invalidateSize();
    leafletMap.setView([lat, lng], 15);
  }

  if (document.getElementById('route-dest-select')?.value) {
    drawRouteToSelectedRestaurant();
  }

  const distFromCenter = haversineKm(lat, lng, BIEN_HOA_CENTER.lat, BIEN_HOA_CENTER.lng);
  const accText = accuracy ? ` (sai số ~${Math.round(accuracy)} m)` : '';
  showNotificationToast(distFromCenter > 40
    ? `Đã định vị${accText}. Bạn đang cách Biên Hòa khoảng ${Math.round(distFromCenter)} km nên lộ trình sẽ khá dài.`
    : `Đã định vị vị trí của bạn${accText}.`);
}

async function useMyGpsLocation() {
  if (gpsRequestInFlight) return;

  if (!ensureGeolocationAvailable()) return;

  gpsRequestInFlight = true;
  setGpsButtonState('loading');
  try {
    const pos = await getBestGpsPosition();
    applyGpsPosition(pos);
    setGpsButtonState('ok');
  } catch (err) {
    console.warn('Lỗi định vị GPS:', err);
    setGpsButtonState('idle');
    alert(buildGpsErrorMessage(err));
  } finally {
    gpsRequestInFlight = false;
  }
}

/* Nút góc dưới phải bản đồ: đưa bản đồ về vị trí hiện tại của người dùng
   (khác nút tâm ngắm góc dưới trái là về quán đang chọn). Không đổi "Điểm đi" hay lộ trình đang vẽ. */
let userLocationDot = null;
let userLocationRing = null;
let myLocationInFlight = false;

function setMyLocationBtnLoading(loading) {
  const btn = document.getElementById('btn-map-my-location');
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = `<svg class="ic${loading ? ' ic-spin' : ''}" aria-hidden="true"><use href="#i-${loading ? 'loader' : 'locate-fixed'}"/></svg>`;
}

async function centerMapOnMyLocation() {
  if (myLocationInFlight || !leafletMap || typeof L === 'undefined') return;
  if (!ensureGeolocationAvailable()) return;

  myLocationInFlight = true;
  setMyLocationBtnLoading(true);
  try {
    const pos = await getBestGpsPosition();
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;

    if (userLocationDot) leafletMap.removeLayer(userLocationDot);
    if (userLocationRing) leafletMap.removeLayer(userLocationRing);
    userLocationRing = L.circle([lat, lng], {
      radius: Math.min(Math.max(accuracy || 0, 20), 3000),
      color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.14, interactive: false
    }).addTo(leafletMap);
    userLocationDot = L.circleMarker([lat, lng], {
      radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1
    }).addTo(leafletMap).bindPopup('<strong>Bạn đang ở đây</strong>' + (accuracy ? `<br/>Sai số ~${Math.round(accuracy)} m` : ''));

    leafletMap.invalidateSize({ pan: false });
    leafletMap.flyTo([lat, lng], 16, { animate: true, duration: 0.6 });

    const distFromCenter = haversineKm(lat, lng, BIEN_HOA_CENTER.lat, BIEN_HOA_CENTER.lng);
    if (distFromCenter > 40) {
      showNotificationToast(`Bạn đang cách Biên Hòa khoảng ${Math.round(distFromCenter)} km nên các quán sẽ nằm ngoài khung nhìn.`);
    }
  } catch (err) {
    console.warn('Lỗi lấy vị trí hiện tại:', err);
    alert(buildGpsErrorMessage(err));
  } finally {
    myLocationInFlight = false;
    setMyLocationBtnLoading(false);
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function drawRouteToSelectedRestaurant() {
  const destSelect = document.getElementById('route-dest-select');
  let destId = destSelect?.value;

  // Nếu người dùng bấm "Vẽ đường đi" khi chưa chọn quán trong dropdown, tự động chọn quán đầu tiên (hoặc quán nổi bật tại Trấn Biên)
  if (!destId && appState.restaurants.length > 0) {
    const defaultRest = appState.restaurants.find(r => r.id === 'REST_07') || appState.restaurants[0];
    destId = defaultRest.id;
    if (destSelect) destSelect.value = destId;
  }
  if (!destId) return;

  const rest = appState.restaurants.find(r => r.id === destId);
  if (!rest) return;

  const start = currentOriginCoords;
  const end = { lat: rest.lat || 10.9502, lng: rest.lng || 106.8234 };

  if (routePolyline && leafletMap) {
    leafletMap.removeLayer(routePolyline);
    routePolyline = null;
  }

  // Bước 1: Tính lộ trình cơ sở và vẽ NGAY LẬP TỨC (0ms) để người dùng luôn thấy đường dẫn tức thì
  let distanceKm = haversineKm(start.lat, start.lng, end.lat, end.lng) * 1.28;
  let durationMin = Math.max(2, Math.round((distanceKm / 28) * 60));
  const midLat = (start.lat + end.lat) / 2 + (start.lng - end.lng) * 0.08;
  const midLng = (start.lng + end.lng) / 2 + (end.lat - start.lat) * 0.08;
  let routeCoords = [
    [start.lat, start.lng],
    [midLat, midLng],
    [end.lat, end.lng]
  ];

  const renderRouteOnMapAndBanner = (coords, dist, dur, isExactStreet) => {
    if (leafletMap && typeof L !== 'undefined') {
      if (routePolyline) leafletMap.removeLayer(routePolyline);
      routePolyline = L.polyline(coords, {
        color: '#15803d',
        weight: 6,
        opacity: 0.92,
        dashArray: isExactStreet ? null : '10, 8'
      }).addTo(leafletMap);
      leafletMap.fitBounds(routePolyline.getBounds(), { padding: [55, 55], maxZoom: 16 });
    }

    const summaryBox = document.getElementById('route-summary-box');
    if (summaryBox) {
      summaryBox.classList.add('active');
      summaryBox.innerHTML = `
        <div>
          <strong><svg class="ic" aria-hidden="true"><use href="#i-route"/></svg> Lộ trình dẫn đường:</strong> Từ <em>${escapeHtml(start.label)}</em> → <strong>${escapeHtml(rest.name)}</strong> (${escapeHtml(rest.address)})
          <div style="margin-top:0.2rem; color:#1d4ed8;">
            <svg class="ic" aria-hidden="true"><use href="#i-route"/></svg> Quãng đường: <strong>${dist.toFixed(1)} km</strong> • <svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> Thời gian di chuyển dự kiến: <strong>~${dur} phút</strong> • <svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> Giờ mở cửa quán: ${escapeHtml(rest.openingHours)}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openExternalGoogleMapsDir()">
          <svg class="ic" aria-hidden="true"><use href="#i-navigation"/></svg> Bật dẫn đường giọng nói (Google Maps)
        </button>
      `;
    }
  };

  // Vẽ ngay lập tức không chờ đợi mạng
  renderRouteOnMapAndBanner(routeCoords, distanceKm, durationMin, false);

  // Bước 2: Gọi OSRM với giới hạn timeout 2.5 giây để cập nhật chi tiết từng khúc cua đường phố nếu mạng thông suốt
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, { signal: controller.signal }).then(r => r.json());
    clearTimeout(timer);
    if (res.code === 'Ok' && res.routes && res.routes.length > 0) {
      const route = res.routes[0];
      distanceKm = route.distance / 1000;
      durationMin = Math.max(2, Math.round(route.duration / 60));
      routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      renderRouteOnMapAndBanner(routeCoords, distanceKm, durationMin, true);
    }
  } catch (_) {
    // Giữ nguyên đường dẫn cơ sở đã vẽ ở Bước 1
  }
}

function routeToRestaurantById(restId) {
  switchView('map');
  const destSelect = document.getElementById('route-dest-select');
  if (destSelect) {
    destSelect.value = restId;
  }
  setTimeout(() => {
    if (leafletMap) leafletMap.invalidateSize();
    drawRouteToSelectedRestaurant();
  }, 220);
}

function openExternalGoogleMapsDir() {
  const destId = document.getElementById('route-dest-select')?.value;
  const rest = appState.restaurants.find(r => r.id === destId) || appState.restaurants[0];
  if (!rest) return;
  const originParam = `${currentOriginCoords.lat},${currentOriginCoords.lng}`;
  const destParam = encodeURIComponent(`${rest.name}, ${rest.address}`);
  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=two-wheeler`,
    '_blank',
    'noopener'
  );
}

function openMapLocation(name, address, restId = '') {
  if (restId) {
    routeToRestaurantById(restId);
    return;
  }
  const matched = appState.restaurants.find(r => r.name === name);
  if (matched) {
    routeToRestaurantById(matched.id);
    return;
  }
  const query = encodeURIComponent(`${name}, ${address}`);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=two-wheeler`, '_blank', 'noopener');
}

function renderHomeSpecialties() {
  const box = document.getElementById('home-specialties-grid');
  if (!box) return;
  const fallbackGradients = [
    'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #eab308 100%)',
    'linear-gradient(135deg, #713f12 0%, #ca8a04 60%, #15803d 100%)',
    'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #f97316 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #ea580c 60%, #f59e0b 100%)'
  ];

  box.innerHTML = appState.specialties.slice(0, 4).map((sp, idx) => {
    const slides = [];
    if (sp.photos && sp.photos.length > 0) {
      sp.photos.forEach((p, pIdx) => {
        slides.push({
          url: p.url,
          title: p.title || sp.name,
          sub: p.sub || sp.summary,
          g: fallbackGradients[(idx + pIdx) % fallbackGradients.length],
          icon: idx === 0 ? '🍊🥗' : idx === 1 ? '🍗🍊' : idx === 2 ? '🦐🍲' : '🍢🔥'
        });
      });
    } else if (sp.imageUrl) {
      slides.push({
        url: sp.imageUrl,
        title: sp.name,
        sub: sp.summary,
        g: fallbackGradients[idx % fallbackGradients.length],
        icon: idx === 0 ? '🍊🥗' : idx === 1 ? '🍗🍊' : idx === 2 ? '🦐🍲' : '🍢🔥'
      });
    }

    if (slides.length === 0) {
      slides.push({
        url: '',
        title: sp.name,
        sub: sp.originArea,
        g: fallbackGradients[idx % fallbackGradients.length],
        icon: '🍲'
      });
    }

    const trackId = `spec-gal-${idx}`;
    return `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:0.85rem;">
      <div>
        <div class="rest-gallery-wrapper">
          <button type="button" class="gallery-nav-btn prev" onclick="scrollGallery('${trackId}', -1)" title="Ảnh trước">‹</button>
          <button type="button" class="gallery-nav-btn next" onclick="scrollGallery('${trackId}', 1)" title="Ảnh tiếp theo">›</button>
          <div id="${trackId}" class="rest-gallery-track">
            ${slides.map((s, sIdx) => `
              <div class="rest-gallery-slide" style="background:${s.g};">
                ${safeImgSrc(s.url) ? `
                  <img class="rest-slide-img" src="${safeImgSrc(s.url)}" alt="${escapeHtml(s.title)}" loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.querySelector('.rest-slide-center')?.classList.remove('hidden-for-img');" />
                ` : ''}
                <div class="rest-slide-top">
                  <span class="rest-visual-tag"><svg class="ic" aria-hidden="true"><use href="#i-camera"/></svg> Ảnh ${sIdx + 1}/${slides.length} • Đặc sản</span>
                  <span class="rest-visual-tag"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(sp.originArea)}</span>
                </div>
                <div class="rest-slide-center ${safeImgSrc(s.url) ? 'hidden-for-img' : ''}"><svg class="ic" aria-hidden="true"><use href="#i-utensils"/></svg></div>
                <div class="rest-slide-bottom">
                  <div>
                    <div class="rest-slide-caption">${escapeHtml(s.title)}</div>
                    <div class="rest-slide-sub">${escapeHtml(s.sub)}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="gallery-hint-bar">
            <span><svg class="ic" aria-hidden="true"><use href="#i-arrows-h"/></svg> Lướt ngang hoặc bấm ‹ › để xem bộ ảnh thực tế</span>
            <span>${slides.length} ảnh thực tế</span>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.4rem;">
          <span class="badge badge-area">${escapeHtml(sp.classification)}</span>
          <span class="badge badge-verified">Có ảnh & tư liệu xác minh</span>
        </div>
        <h3 style="margin-bottom:0.35rem; color:var(--primary);">${escapeHtml(sp.name)}</h3>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:0.5rem;">${escapeHtml(sp.summary)}</p>
        <div style="font-size:0.82rem;">
          <strong>Giá tham khảo:</strong> ${escapeHtml(sp.referencePriceRange)}
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="useSpecialtyPrompt('${escapeAttr(sp.suggestedQuery)}')">
          <svg class="ic" aria-hidden="true"><use href="#i-sparkles"/></svg> AI Gợi ý quán thưởng thức món này
        </button>
        <button class="btn btn-secondary btn-sm" onclick="switchView('explore')">
          <svg class="ic" aria-hidden="true"><use href="#i-book"/></svg> Xem nguồn gốc & quán bán
        </button>
      </div>
    </div>
  `;
  }).join('');
}

function renderHomeRestaurants() {
  const box = document.getElementById('home-restaurants-grid');
  const moreWrap = document.getElementById('home-restaurants-more-wrap');
  if (!box) return;
  const filterVal = (document.getElementById('home-area-filter')?.value || 'all').toLowerCase();
  const fullList = filterVal === 'all'
    ? appState.restaurants
    : appState.restaurants.filter(r => r.area.toLowerCase() === filterVal);

  const isMobile = window.innerWidth <= 768;
  const shouldLimit = isMobile && !showAllMobileRestaurants && filterVal === 'all' && fullList.length > 4;
  const list = shouldLimit ? fullList.slice(0, 4) : fullList;

  box.innerHTML = list.map(r => {
    const sampleDishes = (r.menu || []).slice(0, 3);
    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          ${buildRestaurantGalleryHtml(r, 'home')}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span class="badge badge-area"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> P. ${escapeHtml(r.area)}</span>
            <span class="badge badge-verified"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> Đã xác minh</span>
          </div>
          <h3 style="font-size:1.05rem; margin-bottom:0.2rem;">${escapeHtml(r.name)}</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.25rem;"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg> ${escapeHtml(r.address)}</p>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.55rem;"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> ${escapeHtml(r.openingHours)}</p>
          <div style="border-top:1px solid var(--border); padding-top:0.45rem;">
            <div style="font-size:0.78rem; font-weight:700; margin-bottom:0.25rem;">Món tiêu biểu (${(r.menu || []).length} món):</div>
            ${sampleDishes.map(d => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:0.22rem 0; gap:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.45rem; overflow:hidden; min-width:0;">
                  ${safeImgSrc(d.imageUrl) ? `<img src="${safeImgSrc(d.imageUrl)}" alt="${escapeHtml(d.name)}" class="dish-mini-thumb" loading="lazy" onerror="this.style.display='none'" />` : '<span style="color:var(--text-muted);">•</span>'}
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(d.name)}</span>
                </div>
                <strong style="color:var(--primary); white-space:nowrap; flex-shrink:0;">${escapeHtml(d.rawPriceText)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card-action-pair">
          <button class="btn btn-secondary btn-sm" onclick="routeToRestaurantById('${escapeAttr(r.id)}')">
            <svg class="ic" aria-hidden="true"><use href="#i-navigation"/></svg> Dẫn đường
          </button>
          <button class="btn btn-primary btn-sm" onclick="usePresetPrompt('Nhóm 2 người muốn ăn tại khu vực ${escapeAttr(r.area)} với ngân sách 130.000 đồng')">
            <svg class="ic" aria-hidden="true"><use href="#i-sparkles"/></svg> Gợi ý tại đây
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (moreWrap) {
    if (shouldLimit) {
      moreWrap.innerHTML = `
        <button class="btn btn-secondary" style="width:100%; max-width:420px; border:2px solid var(--primary); color:var(--primary);" onclick="toggleMobileRestaurantsList(true)">
          <svg class="ic" aria-hidden="true"><use href="#i-chevron-down"/></svg> Xem thêm toàn bộ ${fullList.length} quán ăn đã xác minh (+${fullList.length - 4} quán)
        </button>
      `;
    } else if (isMobile && showAllMobileRestaurants && filterVal === 'all' && fullList.length > 4) {
      moreWrap.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="toggleMobileRestaurantsList(false)">
          <svg class="ic" aria-hidden="true"><use href="#i-chevron-up"/></svg> Thu gọn danh sách quán (Chỉ hiện 4 quán nổi bật)
        </button>
      `;
    } else {
      moreWrap.innerHTML = '';
    }
  }
}

function toggleMobileRestaurantsList(expand) {
  showAllMobileRestaurants = expand;
  renderHomeRestaurants();
  if (!expand) {
    document.getElementById('restaurants-section-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

let showAllRecommendRestaurants = false;

function renderRecommendRestaurants() {
  const box = document.getElementById('recommend-restaurants-grid');
  const moreWrap = document.getElementById('recommend-restaurants-more-wrap');
  if (!box || !Array.isArray(appState.restaurants)) return;
  const filterVal = (document.getElementById('recommend-area-filter')?.value || 'all').toLowerCase();
  const fullList = filterVal === 'all'
    ? appState.restaurants
    : appState.restaurants.filter(r => r.area.toLowerCase() === filterVal);

  const isMobile = window.innerWidth <= 768;
  const shouldLimit = isMobile && !showAllRecommendRestaurants && filterVal === 'all' && fullList.length > 4;
  const list = shouldLimit ? fullList.slice(0, 4) : fullList;

  box.innerHTML = list.map(r => {
    const sampleDishes = (r.menu || []).slice(0, 3);
    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          ${buildRestaurantGalleryHtml(r, 'rec')}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span class="badge badge-area"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> P. ${escapeHtml(r.area)}</span>
            <span class="badge badge-verified"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> Đã xác minh</span>
          </div>
          <h3 style="font-size:1.05rem; margin-bottom:0.2rem;">${escapeHtml(r.name)}</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.25rem;"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg> ${escapeHtml(r.address)}</p>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.55rem;"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> ${escapeHtml(r.openingHours || 'Đang mở cửa')}</p>
          <div style="border-top:1px solid var(--border); padding-top:0.45rem;">
            <div style="font-size:0.78rem; font-weight:700; margin-bottom:0.25rem;">Món tiêu biểu (${(r.menu || []).length} món):</div>
            ${sampleDishes.map(d => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:0.22rem 0; gap:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.45rem; overflow:hidden; min-width:0;">
                  ${safeImgSrc(d.imageUrl) ? `<img src="${safeImgSrc(d.imageUrl)}" alt="${escapeHtml(d.name)}" class="dish-mini-thumb" loading="lazy" onerror="this.style.display='none'" />` : '<span style="color:var(--text-muted);">•</span>'}
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(d.name)}</span>
                </div>
                <strong style="color:var(--primary); white-space:nowrap; flex-shrink:0;">${escapeHtml(d.rawPriceText || (d.price ? d.price.toLocaleString('vi-VN') + 'đ' : ''))}</strong>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card-action-pair">
          <button class="btn btn-secondary btn-sm" onclick="routeToRestaurantById('${escapeAttr(r.id)}')">
            <svg class="ic" aria-hidden="true"><use href="#i-navigation"/></svg> Dẫn đường
          </button>
          <button class="btn btn-primary btn-sm" onclick="usePresetPrompt('Tìm combo món ngon nhóm 2-3 người tại quán ${escapeAttr(r.name)} ở ${escapeAttr(r.area)} với ngân sách 150.000đ')">
            <svg class="ic" aria-hidden="true"><use href="#i-sparkles"/></svg> Gợi ý tại đây
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (moreWrap) {
    if (shouldLimit) {
      moreWrap.innerHTML = `
        <button class="btn btn-secondary" style="width:100%; max-width:420px; border:2px solid var(--primary); color:var(--primary);" onclick="toggleRecommendRestaurantsList(true)">
          <svg class="ic" aria-hidden="true"><use href="#i-chevron-down"/></svg> Xem thêm toàn bộ ${fullList.length} quán ăn đã xác minh (+${fullList.length - 4} quán)
        </button>
      `;
    } else if (isMobile && showAllRecommendRestaurants && filterVal === 'all' && fullList.length > 4) {
      moreWrap.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="toggleRecommendRestaurantsList(false)">
          <svg class="ic" aria-hidden="true"><use href="#i-chevron-up"/></svg> Thu gọn danh sách quán (Chỉ hiện 4 quán nổi bật)
        </button>
      `;
    } else {
      moreWrap.innerHTML = '';
    }
  }
}

function toggleRecommendRestaurantsList(expand) {
  showAllRecommendRestaurants = expand;
  renderRecommendRestaurants();
  if (!expand) {
    document.getElementById('recommend-restaurants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ==================== LUỒNG AI GỢI Ý MÓN ĂN (2 BƯỚC) ==================== */

function triggerQuickRecommend() {
  const val = document.getElementById('home-quick-input')?.value?.trim();
  // Ô tìm kiếm trống → dựng câu yêu cầu hoàn toàn từ 3 bộ lọc
  if (!val) {
    runHeroSuggestedPrompt();
    return;
  }

  // Ô tìm kiếm có nội dung → ưu tiên nội dung người dùng gõ, chỉ bổ sung phần còn thiếu từ 3 bộ lọc
  const { prompt, added } = buildMergedQuickPrompt(val);
  if (added.length > 0) {
    showNotificationToast(`Đã bổ sung từ bộ lọc: ${added.join(' • ')}`);
  }
  usePresetPrompt(prompt);
}

/* Bỏ dấu tiếng Việt để nhận diện được cả câu gõ không dấu ("3 nguoi", "tran bien") */
function stripVietnamese(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/* Kiểm tra câu người dùng gõ đã nêu Số người / Ngân sách / Khu vực hay chưa */
function detectPromptSlots(text) {
  const t = stripVietnamese(text);
  const num = '(?:\\d+|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)';

  const people =
    new RegExp(`(?:^|[^\\w])${num}\\s*(?:nguoi|ng|ban|dua|thanh vien|khach|member)(?![a-z])`).test(t) ||
    /(?:^|[^\w])(?:mot minh|1 minh|di minh|an minh|minh toi|cap doi|vo chong|ca nha|gia dinh)(?![a-z])/.test(t) ||
    /nhom\s*\d+/.test(t);

  const budget =
    /\d+(?:[.,]\d+)?\s*(?:k|ka|nghin|ngan|tr|trieu|cu|d|dong|vnd)(?![a-z])/.test(t) ||
    /\d{1,3}(?:[.,]\d{3})+/.test(t) ||
    new RegExp(`${num}\\s*tram(?![a-z])`).test(t);

  const areaNames = new Set();
  document.querySelectorAll('#hero-filter-area option').forEach(o => {
    if (o.value && o.value !== 'all') areaNames.add(o.value);
  });
  (appState.restaurants || []).forEach(r => { if (r.area) areaNames.add(r.area); });
  const area = Array.from(areaNames).some(a => {
    const key = stripVietnamese(a).replace(/^phuong\s+/, '').trim();
    return key.length > 2 && t.includes(key);
  });

  return { people, budget, area };
}

/* Gộp câu người dùng gõ với giá trị 3 bộ lọc (chỉ thêm phần còn thiếu) */
function buildMergedQuickPrompt(userText) {
  const people = document.getElementById('hero-filter-people')?.value || '3';
  const budget = parseInt(document.getElementById('hero-filter-budget')?.value || '150000', 10);
  const area = document.getElementById('hero-filter-area')?.value || 'all';

  const slots = detectPromptSlots(userText);
  const extras = [];
  const added = [];

  if (!slots.people) {
    extras.push(people === '1' ? 'đi 1 người' : `nhóm ${people} người`);
    added.push(`${people} người`);
  }
  if (!slots.budget && budget > 0) {
    extras.push(`tổng ngân sách ${budget.toLocaleString('vi-VN')} đồng`);
    added.push(budget >= 1000 ? `${budget / 1000}k` : `${budget}đ`);
  }
  if (!slots.area && area !== 'all') {
    extras.push(`ở khu vực ${area}`);
    added.push(area);
  }

  if (extras.length === 0) return { prompt: userText, added };
  const base = userText.replace(/[\s.,;]+$/, '');
  return { prompt: `${base}, ${extras.join(', ')}.`, added };
}

function usePresetPrompt(promptText) {
  switchView('recommend');
  const input = document.getElementById('ai-prompt-input');
  if (input) {
    input.value = promptText;
    requestAnimationFrame(() => autoResizeTextarea(input));
  }
  runStep1Analyze();
}

function useSpecialtyPrompt(promptText) {
  usePresetPrompt(promptText);
}

function fillAndAnalyze(promptText) {
  const input = document.getElementById('ai-prompt-input');
  if (input) {
    input.value = promptText;
    autoResizeTextarea(input);
  }
  runStep1Analyze();
}

async function runStep1Analyze() {
  const prompt = document.getElementById('ai-prompt-input')?.value?.trim();
  if (!prompt) {
    alert('Vui lòng nhập yêu cầu ăn uống bằng tiếng Việt.');
    return;
  }

  const btn = document.getElementById('btn-analyze-prompt');
  const origText = btn.innerHTML;
  btn.innerHTML = '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> AI đang phân tích câu yêu cầu...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/v1/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }).then(r => r.json());

    if (!res.success) {
      alert(res.error?.message || 'Lỗi phân tích câu yêu cầu');
      return;
    }

    appState.currentAnalysis = res.data;
    renderConfirmationPanel(res.data);
    // Tự động chạy luôn Bước 2 để người dùng thấy kết quả ngay, nhưng vẫn giữ hộp Xác nhận ở trên để họ tinh chỉnh nếu muốn!
    await runStep2Solve();
    await refreshAllData();
  } catch (err) {
    console.error(err);
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

function renderConfirmationPanel(analysis) {
  const panel = document.getElementById('confirmation-panel');
  if (panel) panel.style.display = 'none';

  document.getElementById('ai-provider-meta').textContent =
    `Mô hình: ${analysis.aiMeta?.provider || 'AI'} (${analysis.aiMeta?.latencyMs || 0}ms)`;

  document.getElementById('conf-party-size').value = analysis.partySize || 1;
  document.getElementById('conf-max-budget').value = analysis.maxBudget || 0;

  const areaSelect = document.getElementById('conf-area');
  const knownAreas = Array.from(areaSelect.options).map(o => o.value);
  if (knownAreas.includes(analysis.area)) {
    areaSelect.value = analysis.area;
  } else {
    areaSelect.value = 'Tất cả khu vực đã xác minh';
  }

  // Hiển thị thông báo làm rõ (nếu câu nhập mơ hồ như "tầm 100k" hoặc thiếu ngân sách)
  const alertsBox = document.getElementById('clarification-alerts');
  if (analysis.clarifications && analysis.clarifications.length > 0) {
    alertsBox.innerHTML = analysis.clarifications.map(c => `
      <div style="background:var(--warning-light); color:var(--warning); padding:0.5rem 0.75rem; border-radius:9px; font-size:0.82rem; margin-bottom:0.35rem; border:1px solid #fde68a;">
        <svg class="ic" aria-hidden="true"><use href="#i-bulb"/></svg> <strong>Lưu ý:</strong> ${escapeHtml(c)}
      </div>
    `).join('');
  } else {
    alertsBox.innerHTML = '';
  }

  renderMemberEditors(analysis.members || []);
  updateConfSummaryText();

  // Mặc định đóng ngăn kéo chi tiết để Kết quả Phương án #1 hiển thị ngay trước mắt người dùng
  const drawer = document.getElementById('conf-details-drawer');
  const toggleBtn = document.getElementById('btn-toggle-conf-drawer');
  if (drawer) drawer.style.display = 'none';
  if (toggleBtn) toggleBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-sliders"/></svg> Tinh chỉnh ▾';
}

function toggleConfirmationDrawer() {
  const drawer = document.getElementById('conf-details-drawer');
  const toggleBtn = document.getElementById('btn-toggle-conf-drawer');
  if (!drawer) return;
  const isHidden = drawer.style.display === 'none';
  drawer.style.display = isHidden ? 'block' : 'none';
  if (toggleBtn) {
    toggleBtn.innerHTML = isHidden ? '<svg class="ic" aria-hidden="true"><use href="#i-chevron-up"/></svg> Thu gọn' : '<svg class="ic" aria-hidden="true"><use href="#i-sliders"/></svg> Tinh chỉnh ▾';
  }
}

function updateConfSummaryText() {
  const partySize = parseInt(document.getElementById('conf-party-size')?.value, 10) || 1;
  const maxBudget = parseInt(document.getElementById('conf-max-budget')?.value, 10) || 0;
  const area = document.getElementById('conf-area')?.value || 'Biên Hòa';
  const shortArea = area === 'Tất cả khu vực đã xác minh' ? 'Toàn Biên Hòa' : `P. ${area}`;
  const summaryEl = document.getElementById('conf-compact-summary-text');
  if (summaryEl) {
    summaryEl.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-users"/></svg> ${partySize} người • <svg class="ic" aria-hidden="true"><use href="#i-wallet"/></svg> Tối đa ${maxBudget.toLocaleString('vi-VN')}đ • <svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(shortArea)}`;
  }
}

function rebuildMemberEditors() {
  const count = Math.max(1, Math.min(6, parseInt(document.getElementById('conf-party-size').value, 10) || 1));
  const current = collectMembersFromDom();
  while (current.length < count) {
    current.push({
      label: `Người ${current.length + 1}`,
      preferredType: 'any',
      flavor: 'any',
      keywords: []
    });
  }
  renderMemberEditors(current.slice(0, count));
}

function renderMemberEditors(members) {
  const box = document.getElementById('conf-members-list');
  box.innerHTML = members.map((m, idx) => `
    <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px; border:1px solid var(--border);">
      <div style="font-weight:700; font-size:0.88rem; margin-bottom:0.45rem; color:var(--primary);">
        <svg class="ic" aria-hidden="true"><use href="#i-user"/></svg> Thành viên #${idx + 1} (${escapeHtml(m.label || `Người ${idx + 1}`)})
      </div>
      <div class="form-group" style="margin-bottom:0.5rem;">
        <label style="font-size:0.78rem;">Loại món ưu tiên:</label>
        <select class="form-control member-type-select" data-idx="${idx}" style="padding:0.4rem 0.6rem; font-size:0.84rem;">
          <option value="any" ${m.preferredType === 'any' ? 'selected' : ''}>Linh hoạt mọi loại món</option>
          <option value="mon_nuoc" ${m.preferredType === 'mon_nuoc' ? 'selected' : ''}>Món nước (Bún, Mì nước, Cháo, Soup)</option>
          <option value="mon_kho" ${m.preferredType === 'mon_kho' ? 'selected' : ''}>Món khô / Trộn / Xào / Bánh hỏi</option>
          <option value="com" ${m.preferredType === 'com' ? 'selected' : ''}>Cơm (Cơm gà, Cơm chiên, Cơm Nhật...)</option>
          <option value="lau" ${m.preferredType === 'lau' ? 'selected' : ''}>Món Lẩu</option>
          <option value="goi" ${m.preferredType === 'goi' ? 'selected' : ''}>Món Gỏi / Đặc sản</option>
          <option value="an_vat" ${m.preferredType === 'an_vat' ? 'selected' : ''}>Ăn vặt (Chả lụi, Nem, Combo gà...)</option>
          <option value="chay" ${m.preferredType === 'chay' ? 'selected' : ''}>Ăn chay (Ràng buộc bắt buộc)</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0.5rem;">
        <label style="font-size:0.78rem;">Khẩu vị:</label>
        <select class="form-control member-flavor-select" data-idx="${idx}" style="padding:0.4rem 0.6rem; font-size:0.84rem;">
          <option value="any" ${m.flavor === 'any' ? 'selected' : ''}>Bình thường / Linh hoạt</option>
          <option value="vi_cay" ${m.flavor === 'vi_cay' ? 'selected' : ''}>Thích vị cay / Đậm đà</option>
          <option value="vi_thanh" ${m.flavor === 'vi_thanh' ? 'selected' : ''}>Thích vị thanh nhẹ / Không cay</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.78rem;">Từ khóa món cụ thể (cách nhau dấu phẩy):</label>
        <input
          type="text"
          class="form-control member-kw-input"
          data-idx="${idx}"
          style="padding:0.4rem 0.6rem; font-size:0.84rem;"
          value="${escapeAttr((m.keywords || []).join(', '))}"
          placeholder="VD: bún thái, cơm gà, bưởi..."
        />
      </div>
    </div>
  `).join('');
}

function collectMembersFromDom() {
  const typeSelects = document.querySelectorAll('.member-type-select');
  const flavorSelects = document.querySelectorAll('.member-flavor-select');
  const kwInputs = document.querySelectorAll('.member-kw-input');

  const members = [];
  for (let i = 0; i < typeSelects.length; i++) {
    const preferredType = typeSelects[i].value;
    const flavor = flavorSelects[i].value;
    const kwStr = kwInputs[i].value || '';
    const keywords = kwStr.split(',').map(s => s.trim()).filter(Boolean);
    members.push({
      label: `Người ${i + 1}`,
      preferredType,
      flavor,
      isVegetarian: preferredType === 'chay',
      keywords
    });
  }
  return members;
}

async function runStep2Solve(fromManualUpdate = false) {
  const partySize = Math.max(1, Math.min(6, parseInt(document.getElementById('conf-party-size').value, 10) || 1));
  const maxBudget = Math.max(0, parseInt(document.getElementById('conf-max-budget').value, 10) || 0);
  const area = document.getElementById('conf-area').value;
  const members = collectMembersFromDom();
  updateConfSummaryText();

  if (fromManualUpdate) {
    const drawer = document.getElementById('conf-details-drawer');
    const toggleBtn = document.getElementById('btn-toggle-conf-drawer');
    if (drawer) drawer.style.display = 'none';
    if (toggleBtn) toggleBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-sliders"/></svg> Tinh chỉnh ▾';
  }

  const requirements = {
    partySize,
    maxBudget,
    area: area === 'Tất cả khu vực đã xác minh' ? '' : area,
    sameRestaurant: true,
    members
  };

  const res = await fetch('/api/v1/ai/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements })
  }).then(r => r.json());

  if (res.success) {
    renderSolverResults(res.data, requirements);
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        document.getElementById('solver-results-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

function applyRelaxedBudget(suggestedBudget) {
  document.getElementById('conf-max-budget').value = suggestedBudget;
  runStep2Solve();
}

/* Gom các dòng món của một phương án để hiển thị:
   - Món dùng chung (lẩu/combo cả nhóm) → 1 dòng "Cả nhóm (N người)" thay vì lặp lại cho từng người
   - Lý do phù hợp: bỏ trùng, hiện tối đa 3 ý (đủ ý xem khi rê chuột) */
function groupPlanAssignments(plan) {
  const list = plan.assignments || [];
  const fmtPrice = a => (a.displayPrice ? a.displayPrice : `${(a.price || 0).toLocaleString('vi-VN')}đ`);
  const shortReasons = reasons => {
    const uniq = Array.from(new Set((reasons || []).map(r => String(r).trim()).filter(Boolean)));
    return { reasons: uniq.slice(0, 3), allReasons: uniq.join(', ') };
  };

  if (plan.planType === 'shared_combo') {
    const byDish = new Map();
    list.forEach(a => {
      if (!byDish.has(a.dishId)) byDish.set(a.dishId, []);
      byDish.get(a.dishId).push(a);
    });
    return Array.from(byDish.values()).map(group => {
      const main = group.find(a => a.price > 0) || group[0];
      return {
        who: group.length > 1 ? `Cả nhóm (${group.length} người)` : main.memberLabel,
        score: Math.min(...group.map(a => Number(a.score) || 0)),
        dishName: main.dishName,
        imageUrl: main.imageUrl,
        price: fmtPrice(main),
        ...shortReasons(group.flatMap(a => a.reasons || []))
      };
    });
  }

  return list.map(a => ({
    who: a.memberLabel,
    score: a.score,
    dishName: a.dishName,
    imageUrl: a.imageUrl,
    price: fmtPrice(a),
    ...shortReasons(a.reasons)
  }));
}

function renderSolverResults(result, requirements) {
  const container = document.getElementById('solver-results-container');

  // Trường hợp 1: Thành công (Có phương án hợp lệ) -> Hiển thị ngay danh sách kết quả bên dưới
  if (result.status === 'success' && result.plans.length > 0) {
    container.innerHTML = `
      <div class="grid-3">
        ${result.plans.map((plan, idx) => {
          const fullRest = appState.restaurants.find(r => r.id === plan.restaurant.id) || plan.restaurant;
          return `
          <div class="plan-card ${idx === 0 ? 'rank-1' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span class="plan-rank-ribbon" style="margin-bottom:0;">
                ${idx === 0 ? '<svg class="ic" aria-hidden="true"><use href="#i-trophy"/></svg> Phương án #1 (Tối ưu nhất)' : `<svg class="ic ic-star" aria-hidden="true"><use href="#i-star"/></svg> Phương án #${idx + 1}`}
              </span>
              <span class="badge badge-area"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(plan.restaurant.area)}</span>
            </div>

            ${buildRestaurantGalleryHtml(fullRest, 'plan-' + idx)}

            <h3 style="font-size:1.15rem; margin-bottom:0.2rem;">${escapeHtml(plan.restaurant.name)}</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.2rem;"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg> ${escapeHtml(plan.restaurant.address)}</p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.8rem;"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> ${escapeHtml(plan.restaurant.openingHours)}</p>

            <!-- Chỉ số công bằng nhóm Maximin -->
            <div style="background:var(--surface-alt); padding:0.65rem 0.8rem; border-radius:10px; margin-bottom:0.85rem; font-size:0.82rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;">
                <span>Điểm thành viên thấp nhất (Min Score):</span>
                <strong style="color:var(--primary);">${plan.minMemberScore}/100</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Tổng điểm phù hợp cả nhóm:</span>
                <strong>${plan.totalGroupScore} điểm (TB: ${plan.averageScore}/100)</strong>
              </div>
              <div class="score-bar-wrap">
                <div class="score-bar-fill" style="width:${plan.minMemberScore}%;"></div>
              </div>
            </div>

            <!-- Danh sách món cho từng thành viên (xếp dọc, vừa thẻ hẹp; món dùng chung chỉ hiện 1 dòng) -->
            <div class="plan-dish-list">
              ${groupPlanAssignments(plan).map(g => `
                <div class="plan-dish-row">
                  ${safeImgSrc(g.imageUrl)
                    ? `<img src="${safeImgSrc(g.imageUrl)}" alt="${escapeHtml(g.dishName)}" class="plan-dish-thumb" loading="lazy" onerror="this.style.visibility='hidden'" />`
                    : '<span class="plan-dish-thumb plan-dish-thumb-empty"><svg class="ic" aria-hidden="true"><use href="#i-utensils"/></svg></span>'}
                  <div class="plan-dish-body">
                    <div class="plan-dish-top">
                      <span class="plan-dish-who">${escapeHtml(g.who)}</span>
                      <span class="plan-dish-score">Độ hợp ${g.score}/100</span>
                    </div>
                    <div class="plan-dish-name">${escapeHtml(g.dishName)}</div>
                    ${g.reasons.length ? `<div class="plan-dish-reasons" title="${escapeAttr(g.allReasons)}">${g.reasons.map(r => `<span>${escapeHtml(r)}</span>`).join('')}</div>` : ''}
                  </div>
                  <div class="plan-dish-price">${escapeHtml(g.price)}</div>
                </div>
              `).join('')}
            </div>

            <!-- Tổng chi phí & số tiền còn dư -->
            <div style="background:#fff7ed; border:1px solid #fed7aa; padding:0.75rem; border-radius:10px; margin-bottom:0.75rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                <strong>Tổng chi phí tổ hợp:</strong>
                <strong style="color:var(--primary); font-size:1.08rem;">${plan.totalCost.toLocaleString('vi-VN')} đồng</strong>
              </div>
              ${plan.remainingBudget !== null ? `
                <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:var(--accent); margin-top:0.2rem;">
                  <span>Số tiền còn dư so với ngân sách (${requirements.maxBudget.toLocaleString('vi-VN')}đ):</span>
                  <strong>+${plan.remainingBudget.toLocaleString('vi-VN')} đồng</strong>
                </div>
              ` : ''}
            </div>

            <!-- Nút dẫn đường trên Map nổi bật dưới bảng thông tin -->
            <div style="margin-bottom:0.85rem;">
              <button class="btn btn-primary plan-route-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.55rem; font-size:0.95rem; font-weight:700; padding:0.75rem 1rem; border-radius:12px; box-shadow:0 4px 14px rgba(21, 128, 61, 0.28); cursor:pointer;" onclick="routeToRestaurantById('${escapeAttr(plan.restaurant.id)}')">
                <svg class="ic" style="width:18px; height:18px;" aria-hidden="true"><use href="#i-navigation"/></svg>
                <span>Dẫn đường đến quán trên Bản đồ (Xem lộ trình) →</span>
              </button>
            </div>

            <!-- Nguồn xác minh -->
            <div style="font-size:0.76rem; color:var(--text-muted); border-top:1px dashed var(--border); padding-top:0.5rem;">
              <svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> <strong>Nguồn dữ liệu:</strong> ${escapeHtml(plan.restaurant.verificationSource)} • Cập nhật: ${escapeHtml(plan.restaurant.verifiedAt)}
              <br/>* Giá hiển thị là giá tham khảo theo thực đơn đã ghi nhận, chưa bao gồm phụ phí ngoài thực đơn.
            </div>
          </div>
        `;
        }).join('')}
      </div>
    `;
    return;
  }

  // Trường hợp 2: Chưa đủ dữ liệu tại khu vực yêu cầu (Mục 4.3.5 - Phân biệt thiếu dữ liệu)
  if (result.status === 'insufficient_data') {
    container.innerHTML = `
      <div class="card" style="border:2px solid #f59e0b; background:var(--warning-light);">
        <span class="badge badge-warning" style="margin-bottom:0.5rem;"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> Chưa đủ dữ liệu xác minh tại khu vực yêu cầu</span>
        <h3 style="margin-bottom:0.4rem;">${escapeHtml(result.summary)}</h3>
        <p style="font-size:0.9rem; margin-bottom:0.9rem;">
          Theo nguyên tắc độ tin cậy (Mục 6.6), HỢP VỊ AI tuyệt đối không tự suy đoán hay tự bịa tên quán ngoài cơ sở dữ liệu đã kiểm duyệt.
        </p>
        <button class="btn btn-primary" onclick="document.getElementById('conf-area').value='Tất cả khu vực đã xác minh'; runStep2Solve();">
          <svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg> Chuyển sang tìm kiếm trên toàn bộ 18 quán đã xác minh tại Biên Hòa
        </button>
      </div>
    `;
    return;
  }

  // Trường hợp 3: Vượt ngân sách -> Đề xuất kịch bản điều chỉnh ngân sách tối thiểu (Mục 4.3.5)
  if (result.status === 'no_valid_solution_budget' && result.alternativeScenario) {
    const alt = result.alternativeScenario;
    const altPlan = alt.plan;
    container.innerHTML = `
      <div class="card" style="border:2px solid #dc2626; background:#fef2f2; margin-bottom:1.25rem;">
        <span class="badge badge-danger" style="margin-bottom:0.5rem;"><svg class="ic" aria-hidden="true"><use href="#i-x-circle"/></svg> Không có phương án hợp lệ trong giới hạn ngân sách hiện tại</span>
        <h3 style="margin-bottom:0.4rem; color:#991b1b;">${escapeHtml(result.summary)}</h3>
        <p style="font-size:0.92rem; color:#7f1d1d; margin-bottom:0.85rem;">
          <svg class="ic" aria-hidden="true"><use href="#i-bulb"/></svg> <strong>Phân tích nguyên nhân & Kịch bản điều chỉnh (Mục 4.3.5):</strong><br/>
          ${escapeHtml(alt.message)}
        </p>

        <div class="card" style="background:#fff; border:1px solid #fca5a5;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.6rem;">
            <div>
              <span class="badge badge-warning">Phương án điều chỉnh gần nhất (Chưa áp dụng nếu bạn chưa đồng ý)</span>
              <h4 style="margin-top:0.35rem;">${escapeHtml(altPlan.restaurant.name)} (${escapeHtml(altPlan.restaurant.area)})</h4>
            </div>
            <button class="btn btn-primary" onclick="applyRelaxedBudget(${alt.suggestedBudget})">
              <svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> Đồng ý nâng ngân sách lên ${alt.suggestedBudget.toLocaleString('vi-VN')}đ (+${alt.extraAmountNeeded.toLocaleString('vi-VN')}đ)
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr><th>Thành viên</th><th>Món đáp ứng đúng sở thích</th><th>Giá</th></tr>
            </thead>
            <tbody>
              ${altPlan.assignments.map(a => `
                <tr>
                  <td><strong>${escapeHtml(a.memberLabel)}</strong></td>
                  <td>${escapeHtml(a.dishName)}</td>
                  <td><strong>${a.price.toLocaleString('vi-VN')}đ</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return;
  }

  // Trường hợp 4: Xung đột ràng buộc cứng khác
  container.innerHTML = `
    <div class="card" style="border:2px solid var(--warning);">
      <span class="badge badge-warning" style="margin-bottom:0.5rem;"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> Không tìm thấy tổ hợp thỏa mãn đồng thời mọi ràng buộc tại cùng 1 quán</span>
      <h3 style="margin-bottom:0.4rem;">${escapeHtml(result.summary)}</h3>
      <p style="font-size:0.9rem; color:var(--text-muted);">
        ${escapeHtml(result.alternativeScenario?.message || 'Hãy thử nới lỏng từ khóa món ăn hoặc mở rộng khu vực tìm kiếm.')}
      </p>
    </div>
  `;
}

/* ==================== KHÁM PHÁ ẨM THỰC ĐỒNG NAI ==================== */

function renderExploreSpecialties() {
  const box = document.getElementById('explore-specialties-list');
  if (!box) return;
  const fallbackGradients = [
    'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #eab308 100%)',
    'linear-gradient(135deg, #713f12 0%, #ca8a04 60%, #15803d 100%)',
    'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #f97316 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #ea580c 60%, #f59e0b 100%)'
  ];

  box.innerHTML = appState.specialties.map((sp, idx) => {
    const trackId = `exp-spec-gal-${idx}`;
    const slides = (sp.photos || []).map((p, pIdx) => ({
      url: p.url,
      title: p.title || sp.name,
      sub: p.sub || sp.summary,
      g: fallbackGradients[(idx + pIdx) % fallbackGradients.length],
      icon: idx === 0 ? '🍊🥗' : idx === 1 ? '🍗🍊' : idx === 2 ? '🦐🍲' : '🍢🔥'
    }));

    return `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:1rem;">
      <div>
        ${slides.length > 0 ? `
          <div class="rest-gallery-wrapper">
            <button type="button" class="gallery-nav-btn prev" onclick="scrollGallery('${trackId}', -1)" title="Ảnh trước">‹</button>
            <button type="button" class="gallery-nav-btn next" onclick="scrollGallery('${trackId}', 1)" title="Ảnh tiếp theo">›</button>
            <div id="${trackId}" class="rest-gallery-track">
              ${slides.map((s, sIdx) => `
                <div class="rest-gallery-slide" style="background:${s.g};">
                  ${safeImgSrc(s.url) ? `
                    <img class="rest-slide-img" src="${safeImgSrc(s.url)}" alt="${escapeHtml(s.title)}" loading="lazy"
                      onerror="this.style.display='none'; this.parentElement.querySelector('.rest-slide-center')?.classList.remove('hidden-for-img');" />
                  ` : ''}
                  <div class="rest-slide-top">
                    <span class="rest-visual-tag"><svg class="ic" aria-hidden="true"><use href="#i-camera"/></svg> Ảnh ${sIdx + 1}/${slides.length} • Đặc sản Đồng Nai</span>
                    <span class="rest-visual-tag"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(sp.originArea)}</span>
                  </div>
                  <div class="rest-slide-center ${safeImgSrc(s.url) ? 'hidden-for-img' : ''}"><svg class="ic" aria-hidden="true"><use href="#i-utensils"/></svg></div>
                  <div class="rest-slide-bottom">
                    <div>
                      <div class="rest-slide-caption">${escapeHtml(s.title)}</div>
                      <div class="rest-slide-sub">${escapeHtml(s.sub)}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="gallery-hint-bar">
              <span><svg class="ic" aria-hidden="true"><use href="#i-arrows-h"/></svg> Lướt ngang hoặc bấm ‹ › để xem ảnh thực tế đặc sản</span>
              <span>${slides.length} ảnh thực tế</span>
            </div>
          </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.5rem;">
          <span class="badge badge-area">${escapeHtml(sp.classification)}</span>
          <span class="badge badge-verified"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(sp.originArea)}</span>
        </div>
        <h3 style="font-size:1.25rem; color:var(--primary); margin-bottom:0.4rem;">${escapeHtml(sp.name)}</h3>
        <p style="font-size:0.92rem; margin-bottom:0.65rem;">${escapeHtml(sp.summary)}</p>

        <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px; font-size:0.85rem; margin-bottom:0.75rem;">
          <div style="margin-bottom:0.4rem;"><strong><svg class="ic" aria-hidden="true"><use href="#i-book"/></svg> Câu chuyện & Nguồn gốc địa phương:</strong> ${escapeHtml(sp.culturalStory)}</div>
          <div style="margin-bottom:0.3rem;"><strong><svg class="ic" aria-hidden="true"><use href="#i-leaf"/></svg> Nguyên liệu đặc trưng:</strong> ${escapeHtml((sp.ingredients || []).join(', '))}</div>
          <div style="margin-bottom:0.3rem;"><strong><svg class="ic" aria-hidden="true"><use href="#i-flame"/></svg> Hương vị:</strong> ${escapeHtml(sp.flavorProfile)}</div>
          <div><strong><svg class="ic" aria-hidden="true"><use href="#i-wallet"/></svg> Giá tham khảo:</strong> ${escapeHtml(sp.referencePriceRange)}</div>
        </div>

        <div style="margin-bottom:0.75rem;">
          <div style="font-weight:700; font-size:0.86rem; margin-bottom:0.4rem;"><svg class="ic" aria-hidden="true"><use href="#i-store"/></svg> Địa điểm thưởng thức đã xác minh trong hệ thống:</div>
          ${(sp.linkedRestaurants || []).map(r => `
            <div style="border:1px solid var(--border); border-radius:9px; padding:0.6rem 0.75rem; margin-bottom:0.45rem; font-size:0.83rem;">
              <div style="display:flex; justify-content:space-between;">
                <strong>${escapeHtml(r.name)}</strong>
                <span class="badge badge-verified">Đã xác minh (${escapeHtml(r.verifiedAt)})</span>
              </div>
              <div style="color:var(--text-muted);"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(r.address)} • <svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> ${escapeHtml(r.openingHours)}</div>
            </div>
          `).join('')}
        </div>

        <div style="font-size:0.76rem; color:var(--text-muted);">
          <strong><svg class="ic" aria-hidden="true"><use href="#i-book"/></svg> Nguồn tư liệu & đối chiếu:</strong>
          <ul style="padding-left:1.1rem; margin-top:0.2rem;">
            ${(sp.sources || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
          <div style="margin-top:0.3rem; font-style:italic;">
            * Lưu ý: Thông tin thực đơn được ghi nhận tại thời điểm khảo sát, không đồng nghĩa quán đang mở cửa hoặc chắc chắn còn món tại mọi thời điểm truy cập.
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="useSpecialtyPrompt('${escapeAttr(sp.suggestedQuery)}')">
        <svg class="ic" aria-hidden="true"><use href="#i-sparkles"/></svg> Gợi ý quán để thưởng thức món này (Chuyển sang bộ giải AI)
      </button>
    </div>
  `;
  }).join('');
}

/* ==================== ĐÁNH GIÁ & GÓP Ý ==================== */

function renderFeedbackSection() {
  const select = document.getElementById('fb-restaurant');
  if (select) {
    select.innerHTML = `<option value="Chung toàn hệ thống">Chung toàn hệ thống HỢP VỊ AI</option>` +
      appState.restaurants.map(r => `<option value="${escapeAttr(r.name)}">${escapeHtml(r.name)} (${escapeHtml(r.area)})</option>`).join('');
  }

  const listBox = document.getElementById('feedback-list-box');
  const partnerFbBox = document.getElementById('partner-feedback-list-box');
  if (appState.adminData) {
    const fbs = appState.adminData.feedbacks || [];
    const html = fbs.map(fb => `
      <div style="border-bottom:1px solid var(--border); padding:0.75rem 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
          <strong>${escapeHtml(fb.userName)}</strong>
          <span class="badge ${fb.status === 'verified' ? 'badge-verified' : 'badge-warning'}">
            ${fb.status === 'verified' ? '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> Đã xác minh' : '<svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> Mới tiếp nhận'}
          </span>
        </div>
        <div style="font-size:0.8rem; color:var(--primary); font-weight:600; margin-bottom:0.25rem;">
          <svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(fb.restaurantName)} • ${'<svg class="ic ic-star" aria-hidden="true"><use href="#i-star"/></svg>'.repeat(fb.rating || 5)}
        </div>
        <p style="font-size:0.86rem;">${escapeHtml(fb.comment)}</p>
      </div>
    `).join('');
    if (listBox) listBox.innerHTML = html;
    if (partnerFbBox) partnerFbBox.innerHTML = html;
  }
}

async function submitUserFeedback() {
  const userName = document.getElementById('fb-user-name').value.trim();
  const type = document.getElementById('fb-type').value;
  const restaurantName = document.getElementById('fb-restaurant').value;
  const rating = parseInt(document.getElementById('fb-rating').value, 10) || 5;
  const comment = document.getElementById('fb-comment').value.trim();
  const msgEl = document.getElementById('fb-status-msg');

  if (!comment) {
    msgEl.style.color = 'var(--danger)';
    msgEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> Vui lòng nhập nội dung nhận xét hoặc báo cáo.';
    return;
  }

  const res = await fetch('/api/v1/feedbacks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, type, restaurantName, rating, comment })
  }).then(r => r.json());

  if (res.success) {
    document.getElementById('fb-comment').value = '';
    msgEl.style.color = 'var(--accent)';
    msgEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> Cảm ơn bạn! Phản hồi đã được ghi nhận và chuyển đến Admin xác minh.';
    await refreshAllData();
  }
}

/* ==================== ĐỐI TÁC & AI SCAN MENU ==================== */

async function runSampleMenuScan(sampleKey) {
  const presetInfo = {
    sample_bun_thai: {
      name: 'Bún Thái & Mì Trộn Thành Minh (Chi nhánh Mới)',
      address: '129 Hưng Đạo Vương, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      svgTitle: 'BẢNG GIÁ THỰC ĐƠN - THÀNH MINH (TRẤN BIÊN)'
    },
    sample_com_ga: {
      name: 'Cơm Gà & Bún Bò Trấn Biên S88',
      address: '49/5A Võ Thị Sáu, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      svgTitle: 'THỰC ĐƠN CƠM GÀ & MÓN NƯỚC'
    },
    sample_tan_trieu: {
      name: 'Nhà Hàng Vườn Bưởi Tân Triều',
      address: 'Hương Lộ 9, Phường Tân Triều, Đồng Nai',
      area: 'Tân Triều',
      svgTitle: 'ĐẶC SẢN LÀNG BƯỞI TÂN TRIỀU - BẢNG GIÁ'
    }
  }[sampleKey] || {};

  if (appState.scanBusy) {
    showNotificationToast('AI đang quét thực đơn, vui lòng đợi trong giây lát...');
    return;
  }

  if (presetInfo.name) {
    document.getElementById('partner-name').value = presetInfo.name;
    document.getElementById('partner-address').value = presetInfo.address;
    document.getElementById('partner-area').value = presetInfo.area;
  }

  const metaBox = document.getElementById('scan-ai-meta');
  const prevItems = appState.scanDraftItems.slice();
  const startedAt = Date.now();

  try {
    appState.scanBusy = true;
    if (metaBox) metaBox.innerHTML = '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> <strong>AI Vision đang nhận diện và bóc tách thực đơn...</strong>';

    const res = await fetch('/api/v1/partner/scan-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleKey })
    }).then(r => r.json());

    if (!res.success) throw new Error(res.error?.message || 'Không thể quét thực đơn mẫu.');

    const items = res.data.items || [];
    // Hiện ảnh thực đơn mẫu dưới lớp quét AI, giữ hiệu ứng tối thiểu để người dùng thấy quá trình nhận diện
    startScanEffect(buildSampleMenuPaperHtml(presetInfo.svgTitle || 'ẢNH CHỤP THỰC ĐƠN MẪU', items));
    await waitScanMinimum(startedAt, 2200);

    appState.scanDraftItems = items;
    finishScanEffect(items.length);
    if (metaBox) {
      metaBox.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> <strong>Đã trích xuất ${items.length} món</strong> • ${escapeHtml(res.data.aiMeta?.provider || 'AI')} (${res.data.aiMeta?.latencyMs || 0}ms)`;
    }
    renderScanDraftTable({ animate: true });
    revealScanDraftTable();
  } catch (err) {
    console.error('Lỗi quét thực đơn mẫu:', err);
    failScanEffect();
    appState.scanDraftItems = prevItems;
    renderScanDraftTable();
    if (metaBox) {
      metaBox.innerHTML = `<span style="color:var(--danger); font-weight:700;"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> ${escapeHtml(err.message)}</span>`;
    }
  } finally {
    appState.scanBusy = false;
  }
}

/* ==================== HIỆU ỨNG AI ĐANG QUÉT ẢNH THỰC ĐƠN ==================== */

const SCAN_STATUS_STEPS = [
  'Đang phát hiện vùng chữ trên ảnh...',
  'Đang đọc tên từng món ăn...',
  'Đang ghép giá bán với từng món...',
  'Đang phân loại món & kiểm tra độ tin cậy...'
];
let scanStatusTimer = null;

function waitScanMinimum(startedAt, minMs) {
  const remain = minMs - (Date.now() - startedAt);
  return remain > 0 ? new Promise(r => setTimeout(r, remain)) : Promise.resolve();
}

/* Bọc nội dung ảnh trong "sân khấu" quét: lưới, tia quét, khung góc, ô nhận diện chữ và nhãn trạng thái */
function startScanEffect(mediaHtml, captionHtml = '') {
  const box = document.getElementById('menu-source-preview');
  if (!box) return;

  const detectBoxes = Array.from({ length: 7 }, (_, i) => {
    const top = 10 + i * 11.5 + Math.random() * 4;
    const left = 6 + Math.random() * 18;
    const width = 38 + Math.random() * 40;
    return `<span class="ai-scan-box" style="top:${top.toFixed(1)}%; left:${left.toFixed(1)}%; width:${width.toFixed(1)}%; animation-delay:${(i * 0.32).toFixed(2)}s;"></span>`;
  }).join('');

  box.innerHTML = `
    <div class="ai-scan-stage is-scanning">
      <div class="ai-scan-media">${mediaHtml}</div>
      <div class="ai-scan-overlay" aria-hidden="true">
        <div class="ai-scan-grid"></div>
        ${detectBoxes}
        <div class="ai-scan-line"></div>
        <span class="ai-scan-corner tl"></span><span class="ai-scan-corner tr"></span>
        <span class="ai-scan-corner bl"></span><span class="ai-scan-corner br"></span>
      </div>
      <div class="ai-scan-status" role="status" aria-live="polite">
        <svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg>
        <span class="ai-scan-status-text">${SCAN_STATUS_STEPS[0]}</span>
      </div>
    </div>
    ${captionHtml}
  `;

  let step = 0;
  clearInterval(scanStatusTimer);
  scanStatusTimer = setInterval(() => {
    step = (step + 1) % SCAN_STATUS_STEPS.length;
    const el = box.querySelector('.ai-scan-status-text');
    if (el) el.textContent = SCAN_STATUS_STEPS[step];
  }, 1100);

  renderScanDraftSkeleton();
}

function finishScanEffect(count) {
  clearInterval(scanStatusTimer);
  const stage = document.querySelector('#menu-source-preview .ai-scan-stage');
  if (!stage) return;
  stage.classList.remove('is-scanning');
  stage.classList.add('is-done');
  const status = stage.querySelector('.ai-scan-status');
  if (status) {
    status.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> <span>Đã nhận diện ${count} món ăn</span>`;
    setTimeout(() => status.classList.add('fade-out'), 2600);
  }
}

function failScanEffect() {
  clearInterval(scanStatusTimer);
  const stage = document.querySelector('#menu-source-preview .ai-scan-stage');
  if (!stage) return;
  stage.classList.remove('is-scanning');
  stage.classList.add('is-failed');
  const status = stage.querySelector('.ai-scan-status');
  if (status) status.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> <span>Không nhận diện được thực đơn</span>';
}

/* Bảng món: hàng chờ dạng khung xương trong lúc AI đang đọc ảnh */
function renderScanDraftSkeleton() {
  const tbody = document.getElementById('scan-draft-tbody');
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: 4 }, (_, i) => `
    <tr class="scan-skeleton-row" style="animation-delay:${i * 0.12}s;">
      <td><span class="skeleton-bar" style="width:${70 + (i % 2) * 20}%;"></span></td>
      <td><span class="skeleton-bar" style="width:70%;"></span></td>
      <td><span class="skeleton-bar" style="width:80%;"></span></td>
      <td><span class="skeleton-bar" style="width:55%;"></span></td>
      <td><span class="skeleton-bar" style="width:28px;"></span></td>
    </tr>
  `).join('');
}

/* Sau khi quét xong: đưa danh sách món vào tầm nhìn (đặc biệt trên điện thoại khi bảng nằm bên dưới ảnh) */
function revealScanDraftTable() {
  const wrap = document.querySelector('#view-partner .scan-table-wrap');
  if (!wrap) return;
  const card = wrap.closest('.card') || wrap;
  card.classList.remove('scan-list-updated');
  void card.offsetWidth; // khởi động lại animation
  card.classList.add('scan-list-updated');
  const rect = card.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.6 || rect.bottom < 0) {
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
  }
}

function triggerMenuFileInput() {
  const input = document.getElementById('menu-file-input');
  if (input) {
    input.value = ''; // Cho phép chọn lại cùng 1 file
    input.click();
  }
}

function compressAndResizeImage(file, maxDimension = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh từ thiết bị.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng ảnh không được trình duyệt hỗ trợ. Vui lòng thử ảnh JPEG, PNG hoặc WebP.'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ dataUrl: reader.result, mimeType: file.type || 'image/jpeg' });
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            dataUrl: compressedDataUrl,
            mimeType: 'image/jpeg',
            width,
            height
          });
        } catch (canvasErr) {
          resolve({ dataUrl: reader.result, mimeType: file.type || 'image/jpeg' });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleMenuImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (appState.scanBusy) {
    showNotificationToast('AI đang quét thực đơn, vui lòng đợi trong giây lát...');
    if (event.target) event.target.value = '';
    return;
  }

  const metaBox = document.getElementById('scan-ai-meta');
  const prevItems = appState.scanDraftItems.slice();
  appState.scanBusy = true;

  if (metaBox) {
    metaBox.innerHTML = '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> <em>Đang nén & tối ưu hóa ảnh thực đơn...</em>';
  }

  try {
    const { dataUrl, mimeType } = await compressAndResizeImage(file, 1600, 0.85);
    const startedAt = Date.now();

    // Hiện ảnh vừa tải lên dưới lớp hiệu ứng AI đang quét
    startScanEffect(
      `<img src="${dataUrl}" alt="Ảnh thực đơn tải lên" class="ai-scan-img" />`,
      `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.45rem; text-align:center;"><svg class="ic" aria-hidden="true"><use href="#i-upload"/></svg> Ảnh thực tế từ thiết bị của quán (${(file.size / 1024).toFixed(0)} KB gốc <svg class="ic" aria-hidden="true"><use href="#i-arrow-right"/></svg> nén nhẹ tối ưu OCR)</div>`
    );

    if (metaBox) {
      metaBox.innerHTML = '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> <strong>AI Vision đang nhận diện và bóc tách thực đơn...</strong>';
    }

    const response = await fetch('/api/v1/partner/scan-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: dataUrl,
        mimeType: mimeType
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson = {};
      try { errJson = JSON.parse(errText); } catch (e) {}
      throw new Error(errJson.error?.message || `Lỗi máy chủ (${response.status})`);
    }

    const res = await response.json();

    if (res.success && res.data) {
      await waitScanMinimum(startedAt, 1600);
      appState.scanDraftItems = res.data.items || [];
      if (res.data.detectedRestaurantName) {
        const partnerNameInput = document.getElementById('partner-name');
        if (partnerNameInput) partnerNameInput.value = res.data.detectedRestaurantName;
      }
      finishScanEffect(appState.scanDraftItems.length);
      if (metaBox) {
        const providerName = res.data.aiMeta?.provider || 'Gemini Vision';
        const latency = res.data.aiMeta?.latencyMs || 0;
        metaBox.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> <strong>Đã trích xuất ${appState.scanDraftItems.length} món</strong> • ${escapeHtml(providerName)} (${latency}ms)`;
      }
      renderScanDraftTable({ animate: true });
      revealScanDraftTable();
      showNotificationToast(`Đã nhận diện thành công ${appState.scanDraftItems.length} món ăn và cập nhật vào danh sách!`);
      refreshAllData();
    } else {
      throw new Error(res.error?.message || 'Không thể trích xuất món ăn từ hình ảnh.');
    }
  } catch (err) {
    console.error('Lỗi quét ảnh thực đơn:', err);
    failScanEffect();
    appState.scanDraftItems = prevItems;
    renderScanDraftTable();
    if (metaBox) {
      metaBox.innerHTML = `<span style="color:var(--danger); font-weight:700;"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> ${escapeHtml(err.message)}</span>`;
    }
    alert('Không thể quét ảnh thực đơn: ' + (err.message || 'Lỗi không xác định'));
  } finally {
    appState.scanBusy = false;
    if (event.target) event.target.value = '';
  }
}

function renderSampleMenuImagePreview(title, items) {
  const box = document.getElementById('menu-source-preview');
  if (box) box.innerHTML = buildSampleMenuPaperHtml(title, items);
}

function buildSampleMenuPaperHtml(title, items) {
  return `
    <div style="background:#fffbeb; border:2px solid #d97706; border-radius:10px; padding:1.1rem; font-family:'Courier New', monospace;">
      <div style="text-align:center; border-bottom:2px dashed #b45309; padding-bottom:0.5rem; margin-bottom:0.75rem;">
        <div style="font-weight:800; font-size:1rem; color:#15803d;">${escapeHtml(title)}</div>
        <div style="font-size:0.76rem; color:#166534;">(Ảnh thực đơn nguồn dùng để đối chiếu trực tiếp với bảng trích xuất bên phải)</div>
      </div>
      ${items.map((it, i) => `
        <div style="display:flex; justify-content:space-between; padding:0.35rem 0; border-bottom:1px dotted #d6d3d1; font-size:0.88rem;">
          <span>${i + 1}. ${escapeHtml(it.name)}</span>
          <strong style="color:#15803d;">${escapeHtml(it.rawPriceText)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderScanDraftTable(opts = {}) {
  const tbody = document.getElementById('scan-draft-tbody');
  if (!tbody) return;

  if (appState.scanDraftItems.length === 0) {
    tbody.innerHTML = `
      <tr class="scan-empty-row">
        <td colspan="5">
          <svg class="ic" aria-hidden="true"><use href="#i-scan"/></svg>
          Chưa có món nào. Tải ảnh thực đơn hoặc chọn mẫu thử để AI tự động điền danh sách.
        </td>
      </tr>`;
    return;
  }

  const enterCls = opts.animate ? 'scan-row-enter' : '';
  tbody.innerHTML = appState.scanDraftItems.map((it, idx) => `
    <tr class="scan-draft-row ${it.needsReview ? 'row-needs-review' : ''} ${enterCls}" style="${opts.animate ? `animation-delay:${Math.min(idx, 12) * 0.08}s;` : ''}">
      <td class="scan-td-name">
        <input
          type="text"
          class="form-control"
          style="padding:0.4rem 0.55rem; font-size:0.88rem; font-weight:600;"
          value="${escapeAttr(it.name)}"
          onchange="updateDraftItem(${idx}, 'name', this.value)"
        />
      </td>
      <td class="scan-td-price">
        <input
          type="number"
          class="form-control"
          style="padding:0.4rem 0.55rem; font-size:0.88rem;"
          value="${it.price}"
          step="1000"
          onchange="updateDraftItem(${idx}, 'price', this.value)"
        />
      </td>
      <td class="scan-td-cat">
        <select
          class="form-control"
          style="padding:0.4rem 0.5rem; font-size:0.84rem;"
          onchange="updateDraftItem(${idx}, 'category', this.value)"
        >
          <option value="mon_nuoc" ${it.category === 'mon_nuoc' ? 'selected' : ''}>Món nước</option>
          <option value="mon_kho" ${it.category === 'mon_kho' ? 'selected' : ''}>Món khô/trộn</option>
          <option value="com" ${it.category === 'com' ? 'selected' : ''}>Cơm</option>
          <option value="lau" ${it.category === 'lau' ? 'selected' : ''}>Lẩu</option>
          <option value="goi" ${it.category === 'goi' ? 'selected' : ''}>Gỏi/Đặc sản</option>
          <option value="an_vat" ${it.category === 'an_vat' ? 'selected' : ''}>Ăn vặt</option>
        </select>
      </td>
      <td class="scan-td-conf" style="font-size:0.78rem;">
        <span class="badge ${it.needsReview ? 'badge-warning' : 'badge-verified'}">
          ${Math.round((it.confidence || 0.95) * 100)}%
        </span>
        ${it.needsReview ? `<span style="color:var(--warning); margin-left:0.25rem;"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> ${escapeHtml(it.reviewReason || 'Cần kiểm tra')}</span>` : '<span style="color:var(--accent); margin-left:0.25rem;">Khớp rõ</span>'}
      </td>
      <td class="scan-td-del">
        <button class="btn btn-danger btn-sm" onclick="removeDraftItem(${idx})" title="Xóa món này"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>
      </td>
    </tr>
  `).join('');
}

function updateDraftItem(idx, field, val) {
  if (!appState.scanDraftItems[idx]) return;
  if (field === 'price') {
    const num = parseInt(val, 10) || 0;
    appState.scanDraftItems[idx].price = num;
    appState.scanDraftItems[idx].rawPriceText = `${num.toLocaleString('vi-VN')}đ`;
    appState.scanDraftItems[idx].needsReview = false;
  } else {
    appState.scanDraftItems[idx][field] = val;
  }
  renderScanDraftTable();
}

function removeDraftItem(idx) {
  appState.scanDraftItems.splice(idx, 1);
  renderScanDraftTable();
}

function addManualDraftRow() {
  appState.scanDraftItems.push({
    tempId: `MANUAL_${Date.now()}`,
    name: 'Món mới nhập bổ sung',
    price: 35000,
    rawPriceText: '35.000đ',
    unit: 'phần',
    category: 'mon_nuoc',
    confidence: 1.0,
    needsReview: false,
    reviewReason: ''
  });
  renderScanDraftTable();
}

async function submitPartnerMenuDraft() {
  const partnerName = document.getElementById('partner-name').value.trim();
  const address = document.getElementById('partner-address').value.trim();
  const area = document.getElementById('partner-area').value;
  const openingHours = document.getElementById('partner-hours').value.trim();
  const msgEl = document.getElementById('partner-submit-msg');

  if (!partnerName || !address || appState.scanDraftItems.length === 0) {
    msgEl.style.color = 'var(--danger)';
    msgEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> Vui lòng nhập tên quán, địa chỉ và có ít nhất 1 món ăn.';
    return;
  }

  const res = await fetch('/api/v1/partner/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partnerName,
      address,
      area,
      openingHours,
      items: appState.scanDraftItems
    })
  }).then(r => r.json());

  if (res.success) {
    msgEl.style.color = 'var(--accent)';
    msgEl.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg> ${escapeHtml(res.message)}`;
    await refreshAllData();
  }
}

/* ==================== KHU VỰC QUẢN TRỊ (ADMIN DASHBOARD) ==================== */

/* ==================== TRANG QUẢN TRỊ KIỂU WORDPRESS ==================== */

const wpIc = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const ADMIN_ROLE_LABEL = { admin: 'Quản trị viên', partner: 'Chủ quán', customer: 'Khách hàng' };

// Trạng thái lọc (tab "Tất cả | Chờ duyệt | ..." và ô tìm kiếm) của từng danh sách
const adminFilters = {
  subs: { tab: 'all', q: '' },
  rests: { tab: 'all', q: '' },
  users: { tab: 'all', q: '' },
  fbs: { tab: 'all', q: '' }
};
const adminRowBuilders = {};

function adminMatch(q, ...fields) {
  const needle = stripVietnamese(q).trim();
  if (!needle) return true;
  return fields.some(f => stripVietnamese(f || '').includes(needle));
}

function adminInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

function adminFormatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function setAdminTab(key, tab) {
  adminFilters[key].tab = tab;
  renderAdminDashboard();
}

function setAdminSearch(key, val) {
  adminFilters[key].q = val;
  const slot = document.getElementById(`wp-slot-${key}`);
  if (slot && adminRowBuilders[key]) slot.innerHTML = adminRowBuilders[key]();
}

/* Khung danh sách: hàng tab lọc + ô tìm kiếm + vùng bảng. Trả về vùng bảng để đổ dữ liệu vào. */
function adminListShell(boxId, key, tabs, placeholder) {
  const box = document.getElementById(boxId);
  if (!box) return null;
  const f = adminFilters[key];
  const searchFocused = document.activeElement?.dataset?.adminSearch === key;
  box.innerHTML = `
    <div class="wp-tablenav">
      <ul class="wp-subsubsub">
        ${tabs.map(t => `<li><a href="#" class="${f.tab === t.id ? 'current' : ''}" onclick="event.preventDefault(); setAdminTab('${key}', '${t.id}')">${t.label} <span class="count">(${t.count})</span></a></li>`).join('')}
      </ul>
      <label class="wp-search-box">
        ${wpIc('search')}
        <input type="search" data-admin-search="${key}" placeholder="${placeholder}" aria-label="${placeholder}" value="${escapeAttr(f.q)}" oninput="setAdminSearch('${key}', this.value)" />
      </label>
    </div>
    <div class="wp-table-slot" id="wp-slot-${key}"></div>`;
  if (searchFocused) {
    const inp = box.querySelector('input[data-admin-search]');
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
  return document.getElementById(`wp-slot-${key}`);
}

function adminEmpty(text) {
  return `<div class="wp-empty">${wpIc('inbox')}<span>${text}</span></div>`;
}

function adminStatusPill(kind, text) {
  return `<span class="wp-status ${kind}"><i></i>${text}</span>`;
}

function renderWpAdminLists(d) {
  const { submissions = [], feedbacks = [], users = [], restaurants = [] } = d;

  // ---------- Hồ sơ thực đơn ----------
  const subCount = s => submissions.filter(x => x.status === s).length;
  const subSlot = adminListShell('admin-submissions-list', 'subs', [
    { id: 'all', label: 'Tất cả', count: submissions.length },
    { id: 'pending', label: 'Chờ duyệt', count: subCount('pending') },
    { id: 'approved', label: 'Đã công bố', count: subCount('approved') },
    { id: 'rejected', label: 'Đã từ chối', count: subCount('rejected') }
  ], 'Tìm hồ sơ...');
  adminRowBuilders.subs = () => {
    const f = adminFilters.subs;
    const rows = submissions.filter(s => (f.tab === 'all' || s.status === f.tab) && adminMatch(f.q, s.partnerName, s.address, s.area));
    if (!rows.length) return adminEmpty('Không có hồ sơ nào phù hợp.');
    return rows.map(s => `
      <div class="wp-submission ${s.status}">
        <div class="wp-submission-head">
          <div>
            <strong>${escapeHtml(s.partnerName)}</strong>
            <div class="wp-meta">${wpIc('pin')} ${escapeHtml(s.address)} (${escapeHtml(s.area)}) • ${wpIc('clock')} ${escapeHtml(s.openingHours)}${s.submittedAt ? ` • Gửi lúc ${adminFormatDate(s.submittedAt)}` : ''}</div>
          </div>
          ${s.status === 'approved' ? adminStatusPill('ok', 'Đã công bố') : s.status === 'rejected' ? adminStatusPill('bad', 'Đã từ chối') : adminStatusPill('warn', 'Chờ duyệt')}
        </div>
        <div class="wp-submission-items">
          ${(s.items || []).map(it => `
            <div class="wp-submission-item">
              <span>${escapeHtml(it.name)} ${it.needsReview ? '<em class="wp-flag">Cần kiểm tra giá</em>' : ''}</span>
              <strong>${Number(it.price).toLocaleString('vi-VN')}đ</strong>
            </div>`).join('') || '<div class="wp-meta">Hồ sơ chưa có món nào.</div>'}
        </div>
        ${s.status === 'pending' ? `
          <div class="wp-submission-actions">
            <button class="wp-btn primary" onclick="adminReviewSubmission('${escapeAttr(s.id)}', 'approve')">${wpIc('check')} Phê duyệt & Công bố</button>
            <button class="wp-btn danger" onclick="adminReviewSubmission('${escapeAttr(s.id)}', 'reject')">${wpIc('x')} Từ chối</button>
          </div>` : ''}
      </div>`).join('');
  };
  if (subSlot) subSlot.innerHTML = adminRowBuilders.subs();

  // ---------- Quán ăn ----------
  const restCount = s => restaurants.filter(r => r.status === s).length;
  const restSlot = adminListShell('admin-restaurants-list', 'rests', [
    { id: 'all', label: 'Tất cả', count: restaurants.length },
    { id: 'approved', label: 'Đang hiển thị', count: restCount('approved') },
    { id: 'hidden', label: 'Tạm ẩn', count: restaurants.length - restCount('approved') }
  ], 'Tìm quán, khu vực...');
  adminRowBuilders.rests = () => {
    const f = adminFilters.rests;
    const rows = restaurants.filter(r => {
      const tabOk = f.tab === 'all' || (f.tab === 'approved' ? r.status === 'approved' : r.status !== 'approved');
      return tabOk && adminMatch(f.q, r.name, r.area, r.address);
    });
    if (!rows.length) return adminEmpty('Không tìm thấy quán nào.');
    return `<div class="wp-table-wrap"><table class="wp-list-table">
      <thead><tr><th>Tên quán</th><th>Khu vực</th><th>Món</th><th>Giờ mở cửa</th><th>Trạng thái</th></tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td data-label="Tên quán">
            <div class="wp-title-cell">
              ${safeImgSrc(r.avatarUrl) ? `<img class="wp-thumb" src="${safeImgSrc(r.avatarUrl)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />` : `<span class="wp-thumb wp-thumb-empty">${wpIc('store')}</span>`}
              <div>
                <strong>${escapeHtml(r.name)}</strong>
                <div class="wp-meta">${escapeHtml(r.address || '')}</div>
                <div class="row-actions">
                  <button class="wp-link" onclick="adminToggleRestaurantStatus('${escapeAttr(r.id)}')">${r.status === 'approved' ? 'Tạm ẩn' : 'Hiển thị'}</button>
                </div>
              </div>
            </div>
          </td>
          <td data-label="Khu vực">P. ${escapeHtml(r.area || '')}</td>
          <td data-label="Món">${r.dishCount || 0}</td>
          <td data-label="Giờ mở cửa">${escapeHtml(r.openingHours || '')}</td>
          <td data-label="Trạng thái">${r.status === 'approved' ? adminStatusPill('ok', 'Đang hiển thị') : adminStatusPill('muted', 'Tạm ẩn')}</td>
        </tr>`).join('')}</tbody></table></div>`;
  };
  if (restSlot) restSlot.innerHTML = adminRowBuilders.rests();

  // ---------- Người dùng ----------
  const roleCount = r => users.filter(u => u.role === r).length;
  const userSlot = adminListShell('admin-users-list', 'users', [
    { id: 'all', label: 'Tất cả', count: users.length },
    { id: 'admin', label: 'Quản trị viên', count: roleCount('admin') },
    { id: 'partner', label: 'Chủ quán', count: roleCount('partner') },
    { id: 'customer', label: 'Khách hàng', count: roleCount('customer') }
  ], 'Tìm người dùng...');
  adminRowBuilders.users = () => {
    const f = adminFilters.users;
    const rows = users.filter(u => (f.tab === 'all' || u.role === f.tab) && adminMatch(f.q, u.name, u.email, u.restaurantName));
    if (!rows.length) return adminEmpty('Không tìm thấy người dùng nào.');
    return `<div class="wp-table-wrap"><table class="wp-list-table">
      <thead><tr><th>Tên người dùng</th><th>Vai trò</th><th>Quán</th><th>Trạng thái</th></tr></thead>
      <tbody>${rows.map(u => `
        <tr>
          <td data-label="Tên người dùng">
            <div class="wp-title-cell">
              <span class="wp-avatar role-${escapeAttr(u.role)}">${escapeHtml(adminInitials(u.name))}</span>
              <div>
                <strong>${escapeHtml(u.name)}</strong>
                <div class="wp-meta">${wpIc('mail')} ${escapeHtml(u.email)}</div>
                ${u.role !== 'admin' ? `<div class="row-actions"><button class="wp-link ${u.status === 'locked' ? '' : 'danger'}" onclick="adminToggleUserStatus('${escapeAttr(u.id)}')">${u.status === 'locked' ? 'Mở khóa' : 'Khóa tài khoản'}</button></div>` : ''}
              </div>
            </div>
          </td>
          <td data-label="Vai trò">${ADMIN_ROLE_LABEL[u.role] || escapeHtml(u.role)}</td>
          <td data-label="Quán">${u.restaurantName ? escapeHtml(u.restaurantName) : '<span class="wp-muted">—</span>'}</td>
          <td data-label="Trạng thái">${u.status === 'locked' ? adminStatusPill('bad', 'Đã khóa') : adminStatusPill('ok', 'Hoạt động')}</td>
        </tr>`).join('')}</tbody></table></div>`;
  };
  if (userSlot) userSlot.innerHTML = adminRowBuilders.users();

  // ---------- Phản hồi ----------
  const fbVerified = feedbacks.filter(f => f.status === 'verified').length;
  const fbSlot = adminListShell('admin-feedbacks-manage-list', 'fbs', [
    { id: 'all', label: 'Tất cả', count: feedbacks.length },
    { id: 'pending', label: 'Chờ duyệt', count: feedbacks.length - fbVerified },
    { id: 'verified', label: 'Đã duyệt', count: fbVerified }
  ], 'Tìm phản hồi...');
  adminRowBuilders.fbs = () => {
    const f = adminFilters.fbs;
    const rows = feedbacks.filter(fb => {
      const tabOk = f.tab === 'all' || (f.tab === 'verified' ? fb.status === 'verified' : fb.status !== 'verified');
      return tabOk && adminMatch(f.q, fb.userName, fb.restaurantName, fb.comment);
    });
    if (!rows.length) return adminEmpty('Chưa có phản hồi nào.');
    return `<div class="wp-table-wrap"><table class="wp-list-table">
      <thead><tr><th>Tác giả</th><th>Phản hồi</th><th>Trạng thái</th></tr></thead>
      <tbody>${rows.map(fb => `
        <tr class="${fb.status === 'verified' ? '' : 'wp-row-pending'}">
          <td data-label="Tác giả">
            <div class="wp-title-cell">
              <span class="wp-avatar role-customer">${escapeHtml(adminInitials(fb.userName))}</span>
              <div><strong>${escapeHtml(fb.userName)}</strong><div class="wp-meta">${fb.createdAt ? adminFormatDate(fb.createdAt) : ''}</div></div>
            </div>
          </td>
          <td data-label="Phản hồi">
            <div class="wp-meta">Gửi tới <strong>${escapeHtml(fb.restaurantName || 'Chung toàn hệ thống')}</strong>${fb.rating ? ` • <span class="wp-stars">${'★'.repeat(Math.max(0, Math.min(5, fb.rating)))}</span>` : ''}</div>
            <p class="wp-comment">${escapeHtml(fb.comment)}</p>
            <div class="row-actions">
              ${fb.status !== 'verified' ? `<button class="wp-link" onclick="adminManageFeedback('${escapeAttr(fb.id)}', 'verify')">Duyệt</button><span class="sep">|</span>` : ''}
              <button class="wp-link danger" onclick="adminManageFeedback('${escapeAttr(fb.id)}', 'delete')">Xóa</button>
            </div>
          </td>
          <td data-label="Trạng thái">${fb.status === 'verified' ? adminStatusPill('ok', 'Đã duyệt') : adminStatusPill('warn', 'Chờ duyệt')}</td>
        </tr>`).join('')}</tbody></table></div>`;
  };
  if (fbSlot) fbSlot.innerHTML = adminRowBuilders.fbs();
}

/* ---------- Bảng tin (Dashboard) ---------- */
function renderWpDashboardWidgets(d) {
  const { submissions = [], feedbacks = [], users = [], restaurants = [], auditLogs = [], costStats = null } = d;
  const stats = appState.overview?.stats || {};
  const ai = appState.overview?.aiStatus || {};
  const pending = submissions.filter(s => s.status === 'pending');
  const fbPending = feedbacks.filter(f => f.status !== 'verified');
  const shown = restaurants.filter(r => r.status === 'approved').length;

  const tiles = document.getElementById('wp-dash-stats');
  if (tiles) {
    const tile = (view, icon, tone, value, label, sub) => `
      <button type="button" class="wp-stat tone-${tone}" onclick="switchView('${view}')">
        <span class="wp-stat-icon">${wpIc(icon)}</span>
        <span class="wp-stat-body"><span class="wp-stat-value">${value}</span><span class="wp-stat-label">${label}</span>${sub ? `<span class="wp-stat-sub">${sub}</span>` : ''}</span>
      </button>`;
    tiles.innerHTML = [
      tile('admin-restaurants', 'store', 'green', shown, 'Quán đang hiển thị', `Tổng ${restaurants.length} quán`),
      tile('admin-restaurants', 'utensils', 'blue', stats.approvedMenuItems ?? '—', 'Món ăn đã duyệt', 'Thực đơn xác minh'),
      tile('admin', 'inbox', pending.length ? 'amber' : 'gray', pending.length, 'Hồ sơ chờ duyệt', pending.length ? 'Cần xem xét' : 'Không tồn đọng'),
      tile('admin-feedbacks', 'message', fbPending.length ? 'amber' : 'gray', fbPending.length, 'Phản hồi chờ duyệt', `Tổng ${feedbacks.length} phản hồi`)
    ].join('');
  }

  const todo = document.getElementById('wp-dash-todo');
  if (todo) {
    const items = [
      ...pending.slice(0, 4).map(s => `
        <li>
          <span class="wp-todo-icon amber">${wpIc('inbox')}</span>
          <div class="wp-todo-text"><strong>${escapeHtml(s.partnerName)}</strong><span>Hồ sơ thực đơn • ${(s.items || []).length} món</span></div>
          <button class="wp-btn small" onclick="switchView('admin')">Xem xét</button>
        </li>`),
      ...fbPending.slice(0, 3).map(fb => `
        <li>
          <span class="wp-todo-icon blue">${wpIc('message')}</span>
          <div class="wp-todo-text"><strong>${escapeHtml(fb.userName)}${fb.restaurantName ? ` → ${escapeHtml(fb.restaurantName)}` : ''}</strong><span>${escapeHtml(String(fb.comment || '').slice(0, 80))}</span></div>
          <button class="wp-btn small" onclick="adminManageFeedback('${escapeAttr(fb.id)}', 'verify')">Duyệt</button>
        </li>`)
    ];
    todo.innerHTML = items.length
      ? `<ul class="wp-todo">${items.join('')}</ul>`
      : `<div class="wp-empty ok">${wpIc('check-circle')}<span>Mọi thứ đã xử lý xong. Không có việc nào đang chờ.</span></div>`;
  }

  const act = document.getElementById('wp-dash-activity');
  if (act) {
    const logs = auditLogs.slice(0, 6);
    act.innerHTML = logs.length
      ? `<ul class="wp-activity">${logs.map(l => `
          <li>
            <span class="wp-activity-time">${adminFormatDate(l.timestamp)}</span>
            <span><strong>${escapeHtml(l.actor)}</strong> • ${escapeHtml(l.detail)}</span>
          </li>`).join('')}</ul>`
      : adminEmpty('Chưa có hoạt động nào được ghi nhận.');
  }

  const sys = document.getElementById('wp-dash-system');
  if (sys) {
    const used = costStats?.totalCostUsd || 0;
    const limit = costStats?.budgetLimitUsd || 0;
    const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    sys.innerHTML = `
      <ul class="wp-glance">
        <li><span>Mô hình AI</span><strong>${ai.hasApiKey ? adminStatusPill('ok', 'Trực tuyến') : adminStatusPill('warn', 'Chế độ dự phòng')}</strong></li>
        <li><span>Lượt gọi AI</span><strong>${costStats ? costStats.totalCalls : '—'}</strong></li>
        <li><span>Tài khoản</span><strong>${users.length}</strong></li>
        <li><span>Đặc sản Đồng Nai</span><strong>${stats.specialtiesCount ?? '—'}</strong></li>
        <li><span>Khu vực có dữ liệu</span><strong>${(stats.areas || []).length || '—'}</strong></li>
      </ul>
      ${costStats ? `
        <div class="wp-budget">
          <div class="wp-budget-row"><span>Chi phí API ước tính</span><strong>$${used.toFixed(4)} / $${limit.toFixed(2)}</strong></div>
          <div class="wp-progress"><span style="width:${pct}%"></span></div>
        </div>` : ''}
      ${ai.hasApiKey ? '' : `<div class="wp-notice">${wpIc('alert')}<span>Chưa cấu hình API key nên AI đang trả lời bằng dữ liệu có sẵn.</span></div>`}
      <button class="wp-btn" style="margin-top:0.75rem;" onclick="openApiKeyModal()">${wpIc('key')} Cấu hình khóa AI</button>`;
  }

  const quick = document.getElementById('wp-dash-quick');
  if (quick) {
    const q = (view, icon, label) => `<button class="wp-quick" onclick="switchView('${view}')">${wpIc(icon)}<span>${label}</span></button>`;
    quick.innerHTML = `<div class="wp-quick-grid">
      ${q('admin', 'inbox', 'Duyệt thực đơn')}
      ${q('admin-restaurants', 'store', 'Quản lý quán ăn')}
      ${q('admin-feedbacks', 'message', 'Kiểm duyệt phản hồi')}
      ${q('admin-users', 'users', 'Quản lý người dùng')}
      ${q('admin-system', 'sliders', 'Hệ thống & AI')}
    </div>`;
  }

  // Số đếm trên thanh bên
  const setBadge = (id, n) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = !(n > 0);
  };
  setBadge('wp-badge-pending', pending.length);
  setBadge('wp-badge-fb', fbPending.length);
  const rc = document.getElementById('wp-count-rests');
  if (rc) rc.textContent = restaurants.length;
}

/* ---------- Thanh bên & thanh trên cùng ---------- */
function updateWpSidebarUser() {
  const u = appState.currentUser;
  const nameEl = document.getElementById('wp-user-name');
  const mailEl = document.getElementById('wp-user-email');
  const avEl = document.getElementById('wp-user-avatar');
  if (nameEl) nameEl.textContent = u?.name || 'Quản trị viên';
  if (mailEl) mailEl.textContent = u?.email || '';
  if (avEl) avEl.textContent = adminInitials(u?.name || 'Admin');
}

function openWpSidebar() { document.body.classList.add('wp-sidebar-open'); }
function closeWpSidebar() { document.body.classList.remove('wp-sidebar-open'); }
function toggleWpSidebar() { document.body.classList.toggle('wp-sidebar-open'); }

function toggleWpSidebarCollapse() {
  const collapsed = document.body.classList.toggle('wp-collapsed');
  try { localStorage.setItem('hv_wp_collapsed', collapsed ? '1' : '0'); } catch (_) {}
}

(function restoreWpSidebarState() {
  try {
    if (localStorage.getItem('hv_wp_collapsed') === '1') document.body.classList.add('wp-collapsed');
  } catch (_) {}
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWpSidebar(); });
})();

function renderAdminDashboard() {
  if (!appState.adminData) return;
  const d = appState.adminData;
  const { submissions, users, restaurants, auditLogs, costStats } = d;

  const costBox = document.getElementById('admin-llm-cost-panel');
  if (costBox && costStats) {
    const stat = (icon, tone, value, label, sub) => `
      <div class="wp-stat static tone-${tone}">
        <span class="wp-stat-icon">${wpIc(icon)}</span>
        <span class="wp-stat-body"><span class="wp-stat-value">${value}</span><span class="wp-stat-label">${label}</span><span class="wp-stat-sub">${sub}</span></span>
      </div>`;
    costBox.innerHTML = [
      stat('zap', 'green', `${costStats.totalCalls}`, 'Tổng lượt gọi AI', `Trực tuyến: ${costStats.geminiLiveCalls} • Dự phòng: ${costStats.fallbackCalls}`),
      stat('file', 'blue', (costStats.totalInputTokens + costStats.totalOutputTokens).toLocaleString('vi-VN'), 'Tổng token đã dùng', `Vào: ${costStats.totalInputTokens} • Ra: ${costStats.totalOutputTokens}`),
      stat('wallet', 'amber', `$${costStats.totalCostUsd.toFixed(5)}`, 'Chi phí API ước tính', `Hạn mức an toàn: $${costStats.budgetLimitUsd.toFixed(2)}`),
      stat('shield', 'purple', '3 vai trò', 'Phân quyền hệ thống', 'Khách • Chủ quán • Admin')
    ].join('');
  }

  renderWpAdminLists(d);
  renderWpDashboardWidgets(d);

  // Lịch sử hồ sơ bên trang Chủ quán
  const partnerMySubBox = document.getElementById('partner-my-submissions-list');
  if (partnerMySubBox && submissions) {
    partnerMySubBox.innerHTML = submissions.map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; padding:0.65rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
        <div>
          <strong>${escapeHtml(s.partnerName)}</strong> (${(s.items || []).length} món)
          <div style="font-size:0.76rem; color:var(--text-muted);"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${escapeHtml(s.address)} • Gửi lúc: ${new Date(s.submittedAt).toLocaleString('vi-VN')}</div>
        </div>
        <span class="badge ${s.status === 'approved' ? 'badge-verified' : s.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
          ${s.status === 'approved' ? '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> Đã được Admin công bố' : s.status === 'rejected' ? '<svg class="ic" aria-hidden="true"><use href="#i-x"/></svg> Bị từ chối' : '<svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg> Đang chờ Admin duyệt'}
        </span>
      </div>
    `).join('');
  }

  // Các bộ đếm cũ (giữ để tương thích)
  const usersCountEl = document.getElementById('admin-users-count');
  if (usersCountEl && users) usersCountEl.textContent = users.length;
  const restsCountEl = document.getElementById('admin-rests-count');
  const restsCountTopEl = document.getElementById('admin-rests-count-top');
  if (restsCountEl && restaurants) restsCountEl.textContent = restaurants.length;
  if (restsCountTopEl && restaurants) restsCountTopEl.textContent = restaurants.length;

  // Nhật ký kiểm toán (trang Hệ thống & AI)
  const logBox = document.getElementById('admin-audit-logs');
  if (logBox && auditLogs) {
    logBox.innerHTML = auditLogs.length
      ? `<ul class="wp-activity">${auditLogs.map(l => `
          <li>
            <span class="wp-activity-time">${adminFormatDate(l.timestamp)}</span>
            <span><span class="wp-tag">${escapeHtml(l.action)}</span> <strong>${escapeHtml(l.actor)}</strong> • ${escapeHtml(l.detail)}</span>
          </li>`).join('')}</ul>`
      : adminEmpty('Chưa có nhật ký nào.');
  }
}

async function adminToggleUserStatus(userId) {
  const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/toggle-status`, {
    method: 'POST'
  }).then(r => r.json());
  if (res.success) {
    await refreshAllData();
  } else {
    alert(res.error?.message || 'Không thể thay đổi trạng thái tài khoản.');
  }
}

async function adminToggleRestaurantStatus(restId) {
  const res = await fetch(`/api/v1/admin/restaurants/${encodeURIComponent(restId)}/toggle-status`, {
    method: 'POST'
  }).then(r => r.json());
  if (res.success) {
    await refreshAllData();
  } else {
    alert(res.error?.message || 'Không thể thay đổi trạng thái quán ăn.');
  }
}

async function adminManageFeedback(fbId, action) {
  const res = await fetch(`/api/v1/admin/feedbacks/${encodeURIComponent(fbId)}/${action}`, {
    method: 'POST'
  }).then(r => r.json());
  if (res.success) {
    await refreshAllData();
  }
}

async function adminReviewSubmission(subId, action) {
  const res = await fetch(`/api/v1/admin/submissions/${encodeURIComponent(subId)}/${action}`, {
    method: 'POST'
  }).then(r => r.json());

  if (res.success) {
    await refreshAllData();
  } else {
    alert(res.error?.message || 'Lỗi thao tác Admin');
  }
}

/* ==================== MODAL API KEY & QR CODE ==================== */

function openApiKeyModal() {
  document.getElementById('api-key-modal').classList.add('open');
}

function closeApiKeyModal() {
  document.getElementById('api-key-modal').classList.remove('open');
}

async function saveApiKeyFromModal() {
  const key = document.getElementById('modal-api-key-input').value.trim();
  const res = await fetch('/api/v1/config/api-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: key })
  }).then(r => r.json());

  if (res.success) {
    closeApiKeyModal();
    await refreshAllData();
    alert(res.data.message);
  }
}

function openQrModal() {
  const input = document.getElementById('qr-url-input');
  if (input && !input.value) {
    input.value = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'https://hop-vi-ai.vercel.app'
      : window.location.origin;
  }
  updateQrImage();
  document.getElementById('qr-modal').classList.add('open');
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.remove('open');
}

function triggerPwaInstall() {
  if (deferredPwaPrompt) {
    confirmNativePwaInstall();
    return;
  }
  document.getElementById('pwa-install-modal')?.classList.add('open');
}

async function confirmNativePwaInstall() {
  if (!deferredPwaPrompt) {
    document.getElementById('pwa-install-modal')?.classList.add('open');
    return;
  }
  deferredPwaPrompt.prompt();
  await deferredPwaPrompt.userChoice;
  deferredPwaPrompt = null;
  const nativeBox = document.getElementById('pwa-native-install-box');
  if (nativeBox) nativeBox.style.display = 'none';
  closePwaModal();
}

function closePwaModal() {
  document.getElementById('pwa-install-modal')?.classList.remove('open');
}

/* ==================== HỆ THỐNG ĐĂNG NHẬP & ĐĂNG KÝ PHÂN QUYỀN (RBAC) ==================== */

let selectedRegisterRole = 'customer';

function openAuthModal(promptMessage = '') {
  const errEl = document.getElementById('auth-error-msg');
  if (errEl) {
    errEl.style.color = 'var(--primary)';
    errEl.textContent = promptMessage || '';
  }
  renderAuthCurrentBanner();
  document.getElementById('auth-modal')?.classList.add('open');
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('open');
}

function renderAuthCurrentBanner() {
  const banner = document.getElementById('auth-current-user-banner');
  if (!banner) return;
  const u = appState.currentUser;
  if (!u) {
    banner.innerHTML = `
      <div><svg class="ic" aria-hidden="true"><use href="#i-info"/></svg> Bạn đang truy cập ở chế độ <strong>Khách vãng lai</strong>. Hãy đăng nhập hoặc đăng ký tài khoản theo tư cách <strong>Khách hàng</strong> hoặc <strong>Chủ quán</strong>!</div>
    `;
    return;
  }
  const roleLabel = u.role === 'admin' ? '<svg class="ic" aria-hidden="true"><use href="#i-shield"/></svg> Quản trị viên Toàn quyền (Admin)' : u.role === 'partner' ? '<svg class="ic" aria-hidden="true"><use href="#i-store"/></svg> Chủ quán / Đối tác' : '<svg class="ic" aria-hidden="true"><use href="#i-user"/></svg> Khách hàng';
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
      <div>
        <div>Đang đăng nhập: <strong>${escapeHtml(u.name)}</strong> (${escapeHtml(u.email)})</div>
        <div style="color:var(--primary); font-weight:700; font-size:0.8rem;">Vai trò: ${roleLabel}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="logoutUser()"><svg class="ic" aria-hidden="true"><use href="#i-logout"/></svg> Đăng xuất</button>
    </div>
  `;
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-tab-login')?.classList.toggle('active', isLogin);
  document.getElementById('auth-tab-register')?.classList.toggle('active', !isLogin);
  const loginForm = document.getElementById('auth-form-login');
  const regForm = document.getElementById('auth-form-register');
  if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
  if (regForm) regForm.style.display = isLogin ? 'none' : 'block';
  const errEl = document.getElementById('auth-error-msg');
  if (errEl) errEl.textContent = '';
}

function selectRegisterRole(role) {
  selectedRegisterRole = role;
  const custCard = document.getElementById('reg-role-customer-card');
  const partCard = document.getElementById('reg-role-partner-card');
  const extraFields = document.getElementById('reg-partner-extra-fields');
  if (custCard) {
    custCard.style.borderColor = role === 'customer' ? 'var(--primary)' : 'var(--border)';
    custCard.style.background = role === 'customer' ? '#fff7ed' : 'var(--surface)';
  }
  if (partCard) {
    partCard.style.borderColor = role === 'partner' ? '#1d4ed8' : 'var(--border)';
    partCard.style.background = role === 'partner' ? '#eff6ff' : 'var(--surface)';
  }
  if (extraFields) {
    extraFields.style.display = role === 'partner' ? 'block' : 'none';
  }
}

async function submitLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value?.trim();
  const errEl = document.getElementById('auth-error-msg');

  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json());

  if (!res.success) {
    if (errEl) {
      errEl.style.color = 'var(--danger)';
      errEl.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> ${escapeHtml(res.error?.message || 'Đăng nhập thất bại')}`;
    }
    return;
  }

  handleAuthSuccess(res.data.user, res.data.token);
}

async function submitRegister() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value?.trim();
  const restaurantName = document.getElementById('reg-rest-name')?.value?.trim();
  const restaurantAddress = document.getElementById('reg-rest-address')?.value?.trim();
  const restaurantArea = document.getElementById('reg-rest-area')?.value;
  const errEl = document.getElementById('auth-error-msg');

  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      role: selectedRegisterRole,
      restaurantName,
      restaurantAddress,
      restaurantArea
    })
  }).then(r => r.json());

  if (!res.success) {
    if (errEl) {
      errEl.style.color = 'var(--danger)';
      errEl.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg> ${escapeHtml(res.error?.message || 'Đăng ký thất bại')}`;
    }
    return;
  }

  handleAuthSuccess(res.data.user, res.data.token);
}

function fillLoginForm(role) {
  switchAuthTab('login');
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const errEl = document.getElementById('auth-error-msg');
  if (errEl) errEl.textContent = '';

  ['customer', 'partner', 'admin'].forEach(r => {
    const card = document.getElementById(`sample-card-${r}`);
    if (card) card.classList.toggle('active-sample-card', r === role);
  });

  if (role === 'admin') {
    if (emailInput) emailInput.value = 'admin@hopviai.vn';
    if (passInput) passInput.value = 'admin123';
  } else if (role === 'partner') {
    if (emailInput) emailInput.value = 'chuquan@hopviai.vn';
    if (passInput) passInput.value = '123456';
  } else {
    if (emailInput) emailInput.value = 'khachhang@hopviai.vn';
    if (passInput) passInput.value = '123456';
  }
  showToast(`Đã điền tài khoản mẫu [${role === 'admin' ? 'ADMIN' : role === 'partner' ? 'CHỦ QUÁN' : 'KHÁCH HÀNG'}]. Nhấn "Đăng nhập" để truy cập!`);
  passInput?.focus();
}

async function quickDemoLogin(demoRole) {
  fillLoginForm(demoRole);
}

async function handleAuthSuccess(user, token) {
  appState.currentUser = user;
  try {
    localStorage.setItem('hop_vi_ai_user', JSON.stringify(user));
    localStorage.setItem('hop_vi_ai_token', token || '');
  } catch (_) {}

  applyUserRolePermissions();
  await refreshAllData();
  closeAuthModal();

  const roleName = user.role === 'admin' ? 'Quản trị viên (Admin)' : user.role === 'partner' ? 'Chủ quán / Đối tác' : 'Khách hàng';
  showToast(`✅ Đăng nhập thành công với vai trò: ${roleName}`);

  if (user.role === 'admin') {
    switchView('admin-dashboard');
  } else if (user.role === 'partner') {
    switchView('partner');
  } else {
    switchView('home');
  }
}

function logoutUser() {
  const prevUser = appState.currentUser;
  appState.currentUser = null;
  try {
    localStorage.removeItem('hop_vi_ai_user');
    localStorage.removeItem('hop_vi_ai_token');
  } catch (_) {}
  applyUserRolePermissions();
  renderAuthCurrentBanner();
  showToast(`Đã đăng xuất tài khoản ${prevUser?.name || ''}. Quay về giao diện Khách vãng lai.`);
  switchView('home');
}

function updateQrImage() {
  const urlVal = document.getElementById('qr-url-input')?.value?.trim() || window.location.origin;
  const qrBox = document.getElementById('qr-image-container');
  const encoded = encodeURIComponent(urlVal);
  qrBox.innerHTML = `
    <div style="padding:1rem; background:#fff; border:2px solid var(--border); border-radius:14px;">
      <img
        src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}"
        alt="QR Code"
        width="220"
        height="220"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
      />
      <div style="display:none; font-size:0.85rem; color:var(--text-muted); padding:1.5rem;">
        URL Trực tiếp: <strong>${escapeHtml(urlVal)}</strong>
      </div>
      <div style="margin-top:0.5rem; font-size:0.8rem; font-weight:700; color:var(--primary);">${escapeHtml(urlVal)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Chỉ cho phép đường dẫn ảnh an toàn (http/https, đường dẫn nội bộ, data:image) rồi escape để chèn vào thuộc tính src.
   Đường dẫn không hợp lệ trả về chuỗi rỗng → giao diện tự hiển thị ảnh dự phòng. */
function safeImgSrc(url) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (/^(https?:\/\/|\/(?!\/))/i.test(u) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(u)) {
    return escapeAttr(u);
  }
  return '';
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

// ==================== LIVE CHAT VỚI GEMINI ====================
let liveChatHistory = [];
let isChatSending = false;

function toggleLiveChat() {
  const panel = document.getElementById('live-chat-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    const box = document.getElementById('chat-messages-box');
    if (box && box.children.length === 0) {
      appendChatMessage('model', `Xin chào bạn! Mình là **Hợp Vị AI** – trợ lý ẩm thực Đồng Nai được tích hợp trí tuệ nhân tạo Google Gemini 2.5/3.8 Flash.\n\nMình nắm rõ thực đơn, giá tiền chính xác của 21 quán ăn nổi tiếng và đặc sản Biên Hòa (Bưởi Tân Triều, Gỏi cá Biên Hòa, Lẩu tôm Năm Ri, Chả lụi...). Bạn đang muốn tìm món gì hay đi ăn nhóm mấy người nè?`);
    }
    const input = document.getElementById('live-chat-input');
    if (input) {
      setTimeout(() => input.focus(), 150);
    }
  }
}

function clearLiveChatHistory() {
  liveChatHistory = [];
  const box = document.getElementById('chat-messages-box');
  if (box) box.innerHTML = '';
  appendChatMessage('model', `Đã xóa lịch sử trò chuyện. Bạn muốn hỏi gì tiếp theo về ẩm thực Biên Hòa - Đồng Nai nè?`);
}

function sendQuickChatSuggestion(text) {
  const panel = document.getElementById('live-chat-panel');
  if (panel && !panel.classList.contains('open')) {
    toggleLiveChat();
  }
  sendLiveChatMessage(text);
}

function formatChatMarkdown(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  // Headings
  safe = safe.replace(/^###\s+(.*)$/gm, '<h5 style="margin:0.45rem 0 0.15rem; color:#15803d; font-size:0.92rem; font-weight:700;">$1</h5>');
  safe = safe.replace(/^##\s+(.*)$/gm, '<h4 style="margin:0.55rem 0 0.2rem; color:#15803d; font-size:0.98rem; font-weight:800;">$1</h4>');
  // Bold **text**
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  safe = safe.replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/g, '<em>$1</em>');

  const rawLines = safe.split('\n');
  let html = '';
  let inList = false;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    const listMatch = line.match(/^[•\-\*]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul style="margin:0.3rem 0; padding-left:1.15rem; list-style-type:disc;">';
        inList = true;
      }
      html += `<li style="margin-bottom:0.2rem;">${listMatch[1]}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (line.startsWith('<h4') || line.startsWith('<h5')) {
        html += line;
      } else {
        html += `<p style="margin:0.3rem 0;">${line}</p>`;
      }
    }
  }
  if (inList) html += '</ul>';
  return html || safe;
}

function appendChatMessage(role, text, places) {
  const box = document.getElementById('chat-messages-box');
  if (!box) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';
  if (role === 'user') {
    bubbleDiv.textContent = text;
  } else {
    bubbleDiv.innerHTML = formatChatMarkdown(text);
  }

  if (role === 'model' && places && places.length > 0) {
    msgDiv.classList.add('has-places');
    attachInlinePlaceButtons(bubbleDiv, places);
  }
  msgDiv.appendChild(bubbleDiv);

  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
}

/* ==================== THẺ ĐỊA ĐIỂM TRONG CHAT ==================== */

/* Chuẩn hóa để so khớp tên quán: bỏ dấu, chữ thường, ký tự lạ → khoảng trắng */
function normalizeForMatch(str) {
  return ' ' + stripVietnamese(str).replace(/&/g, ' va ').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

const CHAT_NUMBER_WORDS = { 1: 'mot', 2: 'hai', 3: 'ba', 4: 'bon', 5: 'nam', 6: 'sau', 7: 'bay', 8: 'tam', 9: 'chin' };

/* Các cách người ta có thể gõ tên một quán: tên đầy đủ, từng vế tách bởi " - ", số ↔ chữ ("5 Ri" ↔ "Năm Ri"), bỏ chữ "và" */
function buildRestaurantMatchKeys(name) {
  const keys = new Set();
  const parts = [name, ...String(name).split(/\s[-–—]\s/)];
  parts.forEach(part => {
    const base = normalizeForMatch(part).trim();
    if (base.split(' ').length < 2) return; // tránh khớp nhầm tên 1 từ quá chung chung
    const variants = new Set([base, base.replace(/ va /g, ' ')]);
    variants.forEach(v => {
      keys.add(` ${v} `);
      keys.add(` ${v.replace(/\b([1-9])\b/g, d => CHAT_NUMBER_WORDS[d])} `);
    });
  });
  return Array.from(keys);
}

/* Tìm các quán được nhắc trong câu trả lời của AI, theo thứ tự xuất hiện (tối đa `limit` quán) */
function findRestaurantsMentioned(text, limit = 5) {
  const haystack = normalizeForMatch(text);
  const found = [];
  (appState.restaurants || []).forEach(r => {
    let firstIdx = -1;
    buildRestaurantMatchKeys(r.name).forEach(k => {
      const i = haystack.indexOf(k);
      if (i >= 0 && (firstIdx < 0 || i < firstIdx)) firstIdx = i;
    });
    if (firstIdx >= 0) found.push({ r, idx: firstIdx });
  });
  return found.sort((a, b) => a.idx - b.idx).slice(0, limit).map(x => x.r);
}

/* Khối nút vị trí gắn ngay dưới dòng nhắc tên quán: địa chỉ + giờ mở cửa + "Dẫn đường" + "Google Maps" */
function buildInlinePlaceHtml(r) {
  const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  return `
    <div class="chat-place-inline-meta">${ic('pin')} ${escapeHtml(r.address || r.name)}${r.openingHours ? ` • ${ic('clock')} ${escapeHtml(r.openingHours)}` : ''}</div>
    <div class="chat-place-actions">
      <button type="button" class="chat-place-btn primary" onclick="openPlaceOnMapFromChat('${escapeAttr(r.id)}')" aria-label="Dẫn đường tới ${escapeAttr(r.name)}">${ic('navigation')} Dẫn đường</button>
      <button type="button" class="chat-place-btn" onclick="openPlaceInGoogleMaps('${escapeAttr(r.id)}')" aria-label="Mở ${escapeAttr(r.name)} trên Google Maps">${ic('map')} Google Maps</button>
    </div>
  `;
}

/* Gắn nút vị trí ngay sau đoạn / tiêu đề / dòng danh sách đầu tiên nhắc tới từng quán.
   Không tìm được chỗ phù hợp thì đặt cuối bong bóng để người dùng vẫn có nút bấm. */
function attachInlinePlaceButtons(bubbleDiv, places) {
  const blocks = Array.from(bubbleDiv.querySelectorAll('h4, h5, p, li'));
  const lastRowAfter = new Map(); // giữ đúng thứ tự khi một đoạn nhắc nhiều quán
  places.forEach(r => {
    const keys = buildRestaurantMatchKeys(r.name);
    const target = blocks.find(b => {
      const hay = normalizeForMatch(b.textContent);
      return keys.some(k => hay.includes(k));
    });
    const row = document.createElement('div');
    row.className = 'chat-place-inline';
    row.innerHTML = buildInlinePlaceHtml(r);
    if (!target) {
      bubbleDiv.appendChild(row);
    } else if (target.tagName === 'LI') {
      target.appendChild(row);
    } else {
      (lastRowAfter.get(target) || target).insertAdjacentElement('afterend', row);
      lastRowAfter.set(target, row);
    }
  });
}

function closeLiveChat() {
  document.getElementById('live-chat-panel')?.classList.remove('open');
}

/* Đóng khung chat, mở tab Bản đồ, chọn sẵn quán và vẽ đường tới quán đó */
function openPlaceOnMapFromChat(restId) {
  closeLiveChat();
  routeToRestaurantById(restId);
}

/* Mở Google Maps tại đúng quán (dùng tên + địa chỉ để hiện thẻ địa điểm, có đủ ảnh/đánh giá/dẫn đường) */
function openPlaceInGoogleMaps(restId) {
  const rest = (appState.restaurants || []).find(r => r.id === restId);
  if (!rest) return;
  const query = encodeURIComponent(`${rest.name}, ${rest.address || ''}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
}

async function sendLiveChatMessage(presetText) {
  if (isChatSending) return;
  const input = document.getElementById('live-chat-input');
  const text = (presetText || (input ? input.value : '')).trim();
  if (!text) return;

  if (input) input.value = '';
  appendChatMessage('user', text);

  // Thêm typing indicator
  const box = document.getElementById('chat-messages-box');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg model typing-indicator';
  typingDiv.id = 'chat-typing-indicator';
  typingDiv.innerHTML = '<div class="chat-bubble" style="color:var(--text-muted); font-style:italic;"><svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> Hợp Vị AI đang suy nghĩ...</div>';
  if (box) {
    box.appendChild(typingDiv);
    box.scrollTop = box.scrollHeight;
  }

  isChatSending = true;
  const sendBtn = document.getElementById('live-chat-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/v1/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: liveChatHistory.slice(-10)
      })
    });
    const result = await res.json();

    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();

    if (result.success && result.data && result.data.reply) {
      appendChatMessage('model', result.data.reply, findRestaurantsMentioned(result.data.reply));
      liveChatHistory.push(
        { role: 'user', content: text },
        { role: 'model', content: result.data.reply }
      );
    } else {
      const errMsg = (result.error && result.error.message) || 'Xin lỗi bạn, máy chủ AI đang bận một chút. Bạn thử gửi lại nhé!';
      appendChatMessage('model', errMsg);
    }
  } catch (err) {
    console.error('Chat error:', err);
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();
    appendChatMessage('model', 'Đã xảy ra lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền và thử lại nhé!');
  } finally {
    isChatSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}


