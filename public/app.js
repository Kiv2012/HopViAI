/**
 * HỢP VỊ AI - FRONTEND APPLICATION CONTROLLER
 */

let appState = {
  overview: null,
  restaurants: [],
  specialties: [],
  currentAnalysis: null,
  scanDraftItems: [],
  adminData: null
};

let leafletMap = null;
let leafletMarkers = [];
let originMarker = null;
let routePolyline = null;
let currentOriginCoords = { lat: 10.9508, lng: 106.8222, label: 'Công viên Biên Hùng (P. Trấn Biên)' };

document.addEventListener('DOMContentLoaded', async () => {
  await refreshAllData();
  await runSampleMenuScan('sample_bun_thai');
});

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
    initOrUpdateLeafletMap();
    renderExploreSpecialties();
    renderFeedbackSection();
    renderAdminDashboard();
  } catch (err) {
    console.error('Lỗi tải dữ liệu khởi tạo:', err);
  }
}

function switchView(viewName) {
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    badgeText.textContent = 'Live (2.5 Flash)';
  } else {
    badgeBtn.className = 'api-status-badge fallback';
    badgeText.textContent = 'Semantic Mode (Cài Key)';
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

  const slides = [
    {
      gradient: theme.gradients[0],
      icon: theme.icons[0],
      badge: `📸 Ảnh 1/4 • Không gian & Nhận diện`,
      title: r.name,
      sub: `📍 ${r.area} • Giờ mở cửa: ${r.openingHours}`
    },
    ...dishes.slice(0, 3).map((d, i) => ({
      gradient: theme.gradients[(i + 1) % theme.gradients.length],
      icon: theme.icons[(i + 1) % theme.icons.length],
      badge: `📸 Ảnh ${i + 2}/4 • Món tiêu biểu #${i + 1}`,
      title: d.name,
      sub: `💰 Giá niêm yết: ${d.rawPriceText}`
    }))
  ];

  while (slides.length < 4) {
    const idx = slides.length;
    slides.push({
      gradient: theme.gradients[idx % theme.gradients.length],
      icon: theme.icons[idx % theme.icons.length],
      badge: `📸 Ảnh ${idx + 1}/4 • Thực đơn xác minh`,
      title: theme.label,
      sub: `✓ Đã đối chiếu từ Hợp vị AI.xlsx (${r.verifiedAt})`
    });
  }

  return `
    <div class="rest-gallery-wrapper">
      <button type="button" class="gallery-nav-btn prev" onclick="scrollGallery('${trackId}', -1)" title="Ảnh trước">‹</button>
      <button type="button" class="gallery-nav-btn next" onclick="scrollGallery('${trackId}', 1)" title="Ảnh tiếp theo">›</button>
      <div id="${trackId}" class="rest-gallery-track">
        ${slides.map(s => `
          <div class="rest-gallery-slide" style="background:${s.gradient};">
            <div class="rest-slide-top">
              <span class="rest-visual-tag">${escapeHtml(s.badge)}</span>
              <span class="rest-visual-tag">${escapeHtml(theme.label)}</span>
            </div>
            <div class="rest-slide-center">${s.icon}</div>
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
        <span>↔️ Cuộn ngang hoặc bấm nút ‹ › để xem 4 ảnh quán & món ăn</span>
        <span>4 ảnh</span>
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
      appState.restaurants.map(r => `<option value="${r.id}">📍 [${escapeHtml(r.area)}] ${escapeHtml(r.name)} (${escapeHtml(r.address)})</option>`).join('');
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
        <div style="font-size:0.75rem; color:#c2410c; font-weight:700;">📍 Phường ${escapeHtml(r.area)}</div>
        <strong style="font-size:0.95rem;">${escapeHtml(r.name)}</strong>
        <div style="font-size:0.8rem; color:#57534e; margin:0.2rem 0;">${escapeHtml(r.address)}</div>
        <div style="font-size:0.78rem; margin-bottom:0.45rem;">🕒 ${escapeHtml(r.openingHours)} • ${(r.menu || []).length} món</div>
        <button
          onclick="routeToRestaurantById('${escapeAttr(r.id)}')"
          style="background:#c2410c; color:#fff; border:none; border-radius:6px; padding:0.35rem 0.65rem; font-size:0.78rem; font-weight:700; cursor:pointer; width:100%;"
        >
          🧭 Vẽ đường đi tới quán này
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
    html: `<div style="background:#15803d; color:#fff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:999px; border:2px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.35); white-space:nowrap;">🚩 Điểm đi</div>`,
    iconSize: [75, 26],
    iconAnchor: [37, 13]
  });

  originMarker = L.marker([currentOriginCoords.lat, currentOriginCoords.lng], { icon: originIcon })
    .addTo(leafletMap)
    .bindPopup(`<strong>🚩 Điểm xuất phát của bạn:</strong><br/>${escapeHtml(currentOriginCoords.label)}`);
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
  updateOriginMarkerOnMap();
  if (document.getElementById('route-dest-select')?.value) {
    drawRouteToSelectedRestaurant();
  }
}

function useMyGpsLocation() {
  if (!navigator.geolocation) {
    alert('Trình duyệt không hỗ trợ định vị GPS.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      currentOriginCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: `Vị trí GPS hiện tại của bạn (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
      };
      const sel = document.getElementById('route-origin-select');
      if (sel) {
        const customVal = `${currentOriginCoords.lat},${currentOriginCoords.lng}`;
        let opt = Array.from(sel.options).find(o => o.dataset.gps === 'true');
        if (!opt) {
          opt = document.createElement('option');
          opt.dataset.gps = 'true';
          sel.prepend(opt);
        }
        opt.value = customVal;
        opt.textContent = `📍 Vị trí GPS của tôi (${currentOriginCoords.lat.toFixed(4)}, ${currentOriginCoords.lng.toFixed(4)})`;
        sel.value = customVal;
      }
      updateOriginMarkerOnMap();
      if (leafletMap) leafletMap.setView([currentOriginCoords.lat, currentOriginCoords.lng], 14);
      if (document.getElementById('route-dest-select')?.value) {
        drawRouteToSelectedRestaurant();
      }
    },
    () => {
      alert('Không lấy được quyền truy cập GPS. Hệ thống giữ điểm xuất phát mặc định tại Trung tâm Biên Hòa.');
    }
  );
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
        color: '#c2410c',
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
          <strong>🛵 Lộ trình dẫn đường:</strong> Từ <em>${escapeHtml(start.label)}</em> → <strong>${escapeHtml(rest.name)}</strong> (${escapeHtml(rest.address)})
          <div style="margin-top:0.2rem; color:#1d4ed8;">
            📏 Quãng đường: <strong>${dist.toFixed(1)} km</strong> • ⏱️ Thời gian di chuyển dự kiến: <strong>~${dur} phút</strong> • 🕒 Giờ mở cửa quán: ${escapeHtml(rest.openingHours)}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openExternalGoogleMapsDir()">
          🚀 Bật dẫn đường giọng nói (Google Maps)
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
  switchView('home');
  const destSelect = document.getElementById('route-dest-select');
  if (destSelect) {
    destSelect.value = restId;
  }
  document.getElementById('dongnai-map-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const specGalList = [
    [
      { g: 'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #eab308 100%)', icon: '🍊🥗', title: 'Gỏi Bưởi Tân Triều Chính Gốc', sub: 'Tép bưởi đường lá cam trộn tôm sông Đồng Nai' },
      { g: 'linear-gradient(135deg, #365314 0%, #65a30d 60%, #facc15 100%)', icon: '🦐🌿', title: 'Gỏi Bưởi Trong Trái Bưởi', sub: 'Trình bày nghệ thuật trong vỏ bưởi tươi Tân Triều' },
      { g: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #10b981 100%)', icon: '🏡🌳', title: 'Không Gian Sinh Thái Cù Lao Tân Triều', sub: 'Làng bưởi Năm Huệ & Vườn Bưởi Tư Trung' }
    ],
    [
      { g: 'linear-gradient(135deg, #713f12 0%, #ca8a04 60%, #15803d 100%)', icon: '🍗🍊', title: 'Gà Ta Hấp Trái Bưởi Tân Triều', sub: 'Thịt gà thấm tinh dầu vỏ bưởi thơm ngọt tự nhiên' },
      { g: 'linear-gradient(135deg, #78350f 0%, #d97706 60%, #f59e0b 100%)', icon: '🍲🔥', title: 'Gà Hấp Lá Bưởi & Rượu Bưởi', sub: 'Đặc sản trứ danh đãi khách quý tại Đồng Nai' },
      { g: 'linear-gradient(135deg, #14532d 0%, #15803d 60%, #ca8a04 100%)', icon: '🍋🌿', title: 'Nguyên Liệu Vườn Bưởi Địa Phương', sub: '250.000đ – 330.000đ / con hoặc phần' }
    ],
    [
      { g: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #f97316 100%)', icon: '🦐🍲', title: 'Lẩu Tôm Sông Biên Hòa (5 Ri)', sub: 'Vị chua thanh đậm đà tôm tươi vùng sông Đồng Nai' },
      { g: 'linear-gradient(135deg, #9a3412 0%, #ea580c 60%, #fbbf24 100%)', icon: '🍢🥬', title: 'Chạo Tôm Nướng Mía Bánh Hỏi', sub: '27.000đ / cây ăn kèm bánh hỏi rau sống' },
      { g: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 60%, #38bdf8 100%)', icon: '🐟🔥', title: 'Đặc Sản Thủy Sản Phường Trấn Biên', sub: 'Lẩu Tôm 5 Ri – Cách Mạng Tháng 8, Trấn Biên' }
    ],
    [
      { g: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 60%, #f59e0b 100%)', icon: '🍢🔥', title: 'Chả Lụi Nướng Than Bửu Long', sub: 'Món ăn vặt sinh viên 20.000đ/phần tại Huỳnh Văn Nghệ' },
      { g: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 60%, #38bdf8 100%)', icon: '🐟🥗', title: 'Gỏi Cá Tân Mai – Tam Hiệp', sub: 'Hương vị truyền thống lâu năm tại Biên Hòa' },
      { g: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #fbbf24 100%)', icon: '🥜🌶️', title: 'Nước Chấm Đậu Phộng & Rau Sống', sub: 'Khảo sát thực tế tại Cô Yến & Kim Yến' }
    ]
  ];
  box.innerHTML = appState.specialties.slice(0, 4).map((sp, idx) => {
    const slides = specGalList[idx % specGalList.length];
    const trackId = `spec-gal-${idx}`;
    return `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:0.85rem;">
      <div>
        <div class="rest-gallery-wrapper">
          <button type="button" class="gallery-nav-btn prev" onclick="scrollGallery('${trackId}', -1)">‹</button>
          <button type="button" class="gallery-nav-btn next" onclick="scrollGallery('${trackId}', 1)">›</button>
          <div id="${trackId}" class="rest-gallery-track">
            ${slides.map((s, sIdx) => `
              <div class="rest-gallery-slide" style="background:${s.g};">
                <div class="rest-slide-top">
                  <span class="rest-visual-tag">📸 Ảnh ${sIdx + 1}/${slides.length}</span>
                  <span class="rest-visual-tag">📍 ${escapeHtml(sp.originArea)}</span>
                </div>
                <div class="rest-slide-center">${s.icon}</div>
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
            <span>↔️ Lướt ngang hoặc bấm ‹ › để xem bộ ảnh đặc sản</span>
            <span>${slides.length} ảnh</span>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.4rem;">
          <span class="badge badge-area">${escapeHtml(sp.classification)}</span>
          <span class="badge badge-verified">Có tư liệu xác minh</span>
        </div>
        <h3 style="margin-bottom:0.35rem; color:var(--primary);">${escapeHtml(sp.name)}</h3>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:0.5rem;">${escapeHtml(sp.summary)}</p>
        <div style="font-size:0.82rem;">
          <strong>Giá tham khảo:</strong> ${escapeHtml(sp.referencePriceRange)}
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="useSpecialtyPrompt('${escapeAttr(sp.suggestedQuery)}')">
          🤖 AI Gợi ý quán thưởng thức món này
        </button>
        <button class="btn btn-secondary btn-sm" onclick="switchView('explore')">
          📖 Xem nguồn gốc & quán bán
        </button>
      </div>
    </div>
  `;
  }).join('');
}

function renderHomeRestaurants() {
  const box = document.getElementById('home-restaurants-grid');
  if (!box) return;
  const filterVal = (document.getElementById('home-area-filter')?.value || 'all').toLowerCase();
  const list = filterVal === 'all'
    ? appState.restaurants
    : appState.restaurants.filter(r => r.area.toLowerCase() === filterVal);

  box.innerHTML = list.map(r => {
    const sampleDishes = (r.menu || []).slice(0, 4);
    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          ${buildRestaurantGalleryHtml(r, 'home')}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
            <span class="badge badge-area">📍 P. ${escapeHtml(r.area)}</span>
            <span class="badge badge-verified">✓ Đã duyệt (${r.verifiedAt})</span>
          </div>
          <h3 style="font-size:1.05rem; margin-bottom:0.25rem;">${escapeHtml(r.name)}</h3>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.3rem;">🏠 ${escapeHtml(r.address)}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.65rem;">🕒 Giờ mở cửa: ${escapeHtml(r.openingHours)}</p>
          <div style="border-top:1px solid var(--border); padding-top:0.55rem;">
            <div style="font-size:0.8rem; font-weight:700; margin-bottom:0.35rem;">Thực đơn tiêu biểu (${(r.menu || []).length} món):</div>
            ${sampleDishes.map(d => `
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; padding:0.18rem 0;">
                <span>• ${escapeHtml(d.name)}</span>
                <strong style="color:var(--primary); white-space:nowrap; margin-left:0.5rem;">${escapeHtml(d.rawPriceText)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:0.8rem; padding-top:0.55rem; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="routeToRestaurantById('${escapeAttr(r.id)}')">
            🧭 Dẫn đường trực tiếp
          </button>
          <button class="btn btn-primary btn-sm" onclick="usePresetPrompt('Nhóm 2 người muốn ăn tại khu vực ${escapeAttr(r.area)} với ngân sách 130.000 đồng')">
            🤖 AI Gợi ý tại đây
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== LUỒNG AI GỢI Ý MÓN ĂN (2 BƯỚC) ==================== */

function triggerQuickRecommend() {
  const val = document.getElementById('home-quick-input')?.value?.trim();
  const prompt = val || 'Nhóm mình có 3 người ở Trấn Biên, tổng ngân sách 150.000 đồng. Hai người thích món nước, một người thích mì trộn khô. Cả nhóm muốn ăn cùng một quán.';
  usePresetPrompt(prompt);
}

function usePresetPrompt(promptText) {
  switchView('recommend');
  const input = document.getElementById('ai-prompt-input');
  if (input) input.value = promptText;
  runStep1Analyze();
}

function useSpecialtyPrompt(promptText) {
  usePresetPrompt(promptText);
}

function fillAndAnalyze(promptText) {
  const input = document.getElementById('ai-prompt-input');
  if (input) input.value = promptText;
  runStep1Analyze();
}

async function runStep1Analyze() {
  const prompt = document.getElementById('ai-prompt-input')?.value?.trim();
  if (!prompt) {
    alert('Vui lòng nhập yêu cầu ăn uống bằng tiếng Việt.');
    return;
  }

  const btn = document.getElementById('btn-analyze-prompt');
  const origText = btn.textContent;
  btn.textContent = '⏳ AI đang phân tích câu yêu cầu...';
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
    btn.textContent = origText;
    btn.disabled = false;
  }
}

function renderConfirmationPanel(analysis) {
  const panel = document.getElementById('confirmation-panel');
  panel.style.display = 'block';

  document.getElementById('ai-provider-meta').textContent =
    `Mô hình xử lý: ${analysis.aiMeta?.provider || 'AI'} (${analysis.aiMeta?.latencyMs || 0}ms)`;

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
      <div style="background:var(--warning-light); color:var(--warning); padding:0.6rem 0.9rem; border-radius:9px; font-size:0.86rem; margin-bottom:0.4rem; border:1px solid #fde68a;">
        💡 <strong>Điểm cần xác nhận:</strong> ${escapeHtml(c)}
      </div>
    `).join('');
  } else {
    alertsBox.innerHTML = '';
  }

  renderMemberEditors(analysis.members || []);
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
        👤 Thành viên #${idx + 1} (${escapeHtml(m.label || `Người ${idx + 1}`)})
      </div>
      <div class="form-group" style="margin-bottom:0.5rem;">
        <label style="font-size:0.78rem;">Loại món ưu tiên:</label>
        <select class="form-control member-type-select" data-idx="${idx}" style="padding:0.4rem 0.6rem; font-size:0.84rem;">
          <option value="any" ${m.preferredType === 'any' ? 'selected' : ''}>Linh hoạt mọi loại món</option>
          <option value="mon_nuoc" ${m.preferredType === 'mon_nuoc' ? 'selected' : ''}>🍜 Món nước (Bún, Mì nước, Cháo, Soup)</option>
          <option value="mon_kho" ${m.preferredType === 'mon_kho' ? 'selected' : ''}>🍝 Món khô / Trộn / Xào / Bánh hỏi</option>
          <option value="com" ${m.preferredType === 'com' ? 'selected' : ''}>🍚 Cơm (Cơm gà, Cơm chiên, Cơm Nhật...)</option>
          <option value="lau" ${m.preferredType === 'lau' ? 'selected' : ''}>🍲 Món Lẩu</option>
          <option value="goi" ${m.preferredType === 'goi' ? 'selected' : ''}>🥗 Món Gỏi / Đặc sản</option>
          <option value="an_vat" ${m.preferredType === 'an_vat' ? 'selected' : ''}>🍢 Ăn vặt (Chả lụi, Nem, Combo gà...)</option>
          <option value="chay" ${m.preferredType === 'chay' ? 'selected' : ''}>🌱 Ăn chay (Ràng buộc bắt buộc)</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0.5rem;">
        <label style="font-size:0.78rem;">Khẩu vị:</label>
        <select class="form-control member-flavor-select" data-idx="${idx}" style="padding:0.4rem 0.6rem; font-size:0.84rem;">
          <option value="any" ${m.flavor === 'any' ? 'selected' : ''}>Bình thường / Linh hoạt</option>
          <option value="vi_cay" ${m.flavor === 'vi_cay' ? 'selected' : ''}>🌶️ Thích vị cay / Đậm đà</option>
          <option value="vi_thanh" ${m.flavor === 'vi_thanh' ? 'selected' : ''}>🍃 Thích vị thanh nhẹ / Không cay</option>
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

async function runStep2Solve() {
  const partySize = Math.max(1, Math.min(6, parseInt(document.getElementById('conf-party-size').value, 10) || 1));
  const maxBudget = Math.max(0, parseInt(document.getElementById('conf-max-budget').value, 10) || 0);
  const area = document.getElementById('conf-area').value;
  const members = collectMembersFromDom();

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
  }
}

function applyRelaxedBudget(suggestedBudget) {
  document.getElementById('conf-max-budget').value = suggestedBudget;
  runStep2Solve();
}

function renderSolverResults(result, requirements) {
  const container = document.getElementById('solver-results-container');

  // Trường hợp 1: Thành công (Có phương án hợp lệ)
  if (result.status === 'success' && result.plans.length > 0) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:1.25rem; background:var(--accent-light); border-color:#86efac;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <strong style="color:var(--accent); font-size:1.02rem;">🎯 ${escapeHtml(result.summary)}</strong>
            <div style="font-size:0.83rem; color:#166534;">
              Xếp hạng theo nguyên tắc <strong>Maximin Fairness</strong>: Ưu tiên phương án có điểm thành viên thấp nhất cao nhất → Tổng điểm sở thích nhóm → Tổng chi phí tiết kiệm nhất.
            </div>
          </div>
          <span class="badge badge-verified">Thời gian giải tổ hợp: ${result.executionTimeMs}ms</span>
        </div>
      </div>

      <div class="grid-3">
        ${result.plans.map((plan, idx) => {
          const fullRest = appState.restaurants.find(r => r.id === plan.restaurant.id) || plan.restaurant;
          return `
          <div class="plan-card ${idx === 0 ? 'rank-1' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span class="plan-rank-ribbon" style="margin-bottom:0;">
                ${idx === 0 ? '🏆 Phương án #1 (Tối ưu nhất)' : `⭐ Phương án #${idx + 1}`}
              </span>
              <span class="badge badge-area">📍 ${escapeHtml(plan.restaurant.area)}</span>
            </div>

            ${buildRestaurantGalleryHtml(fullRest, 'plan-' + idx)}

            <h3 style="font-size:1.15rem; margin-bottom:0.2rem;">${escapeHtml(plan.restaurant.name)}</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.2rem;">🏠 ${escapeHtml(plan.restaurant.address)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
              <span style="font-size:0.8rem; color:var(--text-muted);">🕒 ${escapeHtml(plan.restaurant.openingHours)}</span>
              <button class="btn btn-secondary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.76rem;" onclick="routeToRestaurantById('${escapeAttr(plan.restaurant.id)}')">
                🧭 Dẫn đường trên Map
              </button>
            </div>

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

            <!-- Bảng phân bổ món cho từng thành viên -->
            <table class="data-table" style="margin-bottom:0.85rem;">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Món đề xuất</th>
                  <th>Giá</th>
                </tr>
              </thead>
              <tbody>
                ${plan.assignments.map(a => `
                  <tr>
                    <td>
                      <strong>${escapeHtml(a.memberLabel)}</strong>
                      <div style="font-size:0.73rem; color:var(--accent);">Độ hợp: ${a.score}/100</div>
                    </td>
                    <td>
                      <div style="font-weight:600;">${escapeHtml(a.dishName)}</div>
                      <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml((a.reasons || []).join(', '))}</div>
                    </td>
                    <td style="font-weight:700; white-space:nowrap;">
                      ${a.displayPrice ? escapeHtml(a.displayPrice) : `${a.price.toLocaleString('vi-VN')}đ`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

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

            <!-- Nguồn xác minh -->
            <div style="font-size:0.76rem; color:var(--text-muted); border-top:1px dashed var(--border); padding-top:0.5rem;">
              ✅ <strong>Nguồn dữ liệu:</strong> ${escapeHtml(plan.restaurant.verificationSource)} • Cập nhật: ${escapeHtml(plan.restaurant.verifiedAt)}
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
        <span class="badge badge-warning" style="margin-bottom:0.5rem;">⚠️ Chưa đủ dữ liệu xác minh tại khu vực yêu cầu</span>
        <h3 style="margin-bottom:0.4rem;">${escapeHtml(result.summary)}</h3>
        <p style="font-size:0.9rem; margin-bottom:0.9rem;">
          Theo nguyên tắc độ tin cậy (Mục 6.6), HỢP VỊ AI tuyệt đối không tự suy đoán hay tự bịa tên quán ngoài cơ sở dữ liệu đã kiểm duyệt.
        </p>
        <button class="btn btn-primary" onclick="document.getElementById('conf-area').value='Tất cả khu vực đã xác minh'; runStep2Solve();">
          🔄 Chuyển sang tìm kiếm trên toàn bộ 18 quán đã xác minh tại Biên Hòa
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
        <span class="badge badge-danger" style="margin-bottom:0.5rem;">❌ Không có phương án hợp lệ trong giới hạn ngân sách hiện tại</span>
        <h3 style="margin-bottom:0.4rem; color:#991b1b;">${escapeHtml(result.summary)}</h3>
        <p style="font-size:0.92rem; color:#7f1d1d; margin-bottom:0.85rem;">
          💡 <strong>Phân tích nguyên nhân & Kịch bản điều chỉnh (Mục 4.3.5):</strong><br/>
          ${escapeHtml(alt.message)}
        </p>

        <div class="card" style="background:#fff; border:1px solid #fca5a5;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.6rem;">
            <div>
              <span class="badge badge-warning">Phương án điều chỉnh gần nhất (Chưa áp dụng nếu bạn chưa đồng ý)</span>
              <h4 style="margin-top:0.35rem;">${escapeHtml(altPlan.restaurant.name)} (${escapeHtml(altPlan.restaurant.area)})</h4>
            </div>
            <button class="btn btn-primary" onclick="applyRelaxedBudget(${alt.suggestedBudget})">
              ✅ Đồng ý nâng ngân sách lên ${alt.suggestedBudget.toLocaleString('vi-VN')}đ (+${alt.extraAmountNeeded.toLocaleString('vi-VN')}đ)
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
      <span class="badge badge-warning" style="margin-bottom:0.5rem;">⚠️ Không tìm thấy tổ hợp thỏa mãn đồng thời mọi ràng buộc tại cùng 1 quán</span>
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
  box.innerHTML = appState.specialties.map(sp => `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:1rem;">
      <div>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.5rem;">
          <span class="badge badge-area">${escapeHtml(sp.classification)}</span>
          <span class="badge badge-verified">📍 ${escapeHtml(sp.originArea)}</span>
        </div>
        <h3 style="font-size:1.25rem; color:var(--primary); margin-bottom:0.4rem;">${escapeHtml(sp.name)}</h3>
        <p style="font-size:0.92rem; margin-bottom:0.65rem;">${escapeHtml(sp.summary)}</p>

        <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px; font-size:0.85rem; margin-bottom:0.75rem;">
          <div style="margin-bottom:0.4rem;"><strong>📖 Câu chuyện & Nguồn gốc địa phương:</strong> ${escapeHtml(sp.culturalStory)}</div>
          <div style="margin-bottom:0.3rem;"><strong>🥗 Nguyên liệu đặc trưng:</strong> ${escapeHtml((sp.ingredients || []).join(', '))}</div>
          <div style="margin-bottom:0.3rem;"><strong>👅 Hương vị:</strong> ${escapeHtml(sp.flavorProfile)}</div>
          <div><strong>💰 Giá tham khảo:</strong> ${escapeHtml(sp.referencePriceRange)}</div>
        </div>

        <div style="margin-bottom:0.75rem;">
          <div style="font-weight:700; font-size:0.86rem; margin-bottom:0.4rem;">🏪 Địa điểm thưởng thức đã xác minh trong hệ thống:</div>
          ${(sp.linkedRestaurants || []).map(r => `
            <div style="border:1px solid var(--border); border-radius:9px; padding:0.6rem 0.75rem; margin-bottom:0.45rem; font-size:0.83rem;">
              <div style="display:flex; justify-content:space-between;">
                <strong>${escapeHtml(r.name)}</strong>
                <span class="badge badge-verified">Đã xác minh (${escapeHtml(r.verifiedAt)})</span>
              </div>
              <div style="color:var(--text-muted);">📍 ${escapeHtml(r.address)} • 🕒 ${escapeHtml(r.openingHours)}</div>
            </div>
          `).join('')}
        </div>

        <div style="font-size:0.76rem; color:var(--text-muted);">
          <strong>📚 Nguồn tư liệu & đối chiếu:</strong>
          <ul style="padding-left:1.1rem; margin-top:0.2rem;">
            ${(sp.sources || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
          <div style="margin-top:0.3rem; font-style:italic;">
            * Lưu ý: Thông tin thực đơn được ghi nhận tại thời điểm khảo sát, không đồng nghĩa quán đang mở cửa hoặc chắc chắn còn món tại mọi thời điểm truy cập.
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="useSpecialtyPrompt('${escapeAttr(sp.suggestedQuery)}')">
        🤖 Gợi ý quán để thưởng thức món này (Chuyển sang bộ giải AI)
      </button>
    </div>
  `).join('');
}

/* ==================== ĐÁNH GIÁ & GÓP Ý ==================== */

function renderFeedbackSection() {
  const select = document.getElementById('fb-restaurant');
  if (select) {
    select.innerHTML = `<option value="Chung toàn hệ thống">Chung toàn hệ thống HỢP VỊ AI</option>` +
      appState.restaurants.map(r => `<option value="${escapeAttr(r.name)}">${escapeHtml(r.name)} (${escapeHtml(r.area)})</option>`).join('');
  }

  const listBox = document.getElementById('feedback-list-box');
  if (listBox && appState.adminData) {
    const fbs = appState.adminData.feedbacks || [];
    listBox.innerHTML = fbs.map(fb => `
      <div style="border-bottom:1px solid var(--border); padding:0.75rem 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
          <strong>${escapeHtml(fb.userName)}</strong>
          <span class="badge ${fb.status === 'verified' ? 'badge-verified' : 'badge-warning'}">
            ${fb.status === 'verified' ? '✓ Admin đã xác minh' : '⏳ Đã tiếp nhận – Chờ Admin kiểm tra'}
          </span>
        </div>
        <div style="font-size:0.8rem; color:var(--primary); font-weight:600; margin-bottom:0.25rem;">
          📍 ${escapeHtml(fb.restaurantName)} • ${'⭐'.repeat(fb.rating || 5)}
        </div>
        <p style="font-size:0.86rem;">${escapeHtml(fb.comment)}</p>
      </div>
    `).join('');
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
    msgEl.textContent = '⚠️ Vui lòng nhập nội dung nhận xét hoặc báo cáo.';
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
    msgEl.textContent = '✅ Cảm ơn bạn! Phản hồi đã được ghi nhận và chuyển đến Admin xác minh.';
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

  if (presetInfo.name) {
    document.getElementById('partner-name').value = presetInfo.name;
    document.getElementById('partner-address').value = presetInfo.address;
    document.getElementById('partner-area').value = presetInfo.area;
  }

  const res = await fetch('/api/v1/partner/scan-menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleKey })
  }).then(r => r.json());

  if (res.success) {
    appState.scanDraftItems = res.data.items || [];
    document.getElementById('scan-ai-meta').textContent =
      `Mô-đun: ${res.data.aiMeta?.provider} • Thời gian xử lý: ${res.data.aiMeta?.latencyMs}ms`;
    renderSampleMenuImagePreview(presetInfo.svgTitle || 'ẢNH CHỤP THỰC ĐƠN MẪU', appState.scanDraftItems);
    renderScanDraftTable();
  }
}

async function handleMenuImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('Ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const previewBox = document.getElementById('menu-source-preview');
    previewBox.innerHTML = `<img src="${dataUrl}" alt="Ảnh thực đơn tải lên" style="max-width:100%; max-height:380px; border-radius:10px; display:block; margin:0 auto;" />`;

    document.getElementById('scan-ai-meta').textContent = '⏳ Gemini 2.5 Flash Vision đang đọc ảnh thực đơn...';

    const res = await fetch('/api/v1/partner/scan-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: dataUrl,
        mimeType: file.type
      })
    }).then(r => r.json());

    if (res.success) {
      appState.scanDraftItems = res.data.items || [];
      if (res.data.detectedRestaurantName) {
        document.getElementById('partner-name').value = res.data.detectedRestaurantName;
      }
      document.getElementById('scan-ai-meta').textContent =
        `✅ Đã trích xuất ${appState.scanDraftItems.length} món • ${res.data.aiMeta?.provider} (${res.data.aiMeta?.latencyMs}ms)`;
      renderScanDraftTable();
      await refreshAllData();
    } else {
      alert(res.error?.message || 'Lỗi quét ảnh thực đơn');
    }
  };
  reader.readAsDataURL(file);
}

function renderSampleMenuImagePreview(title, items) {
  const box = document.getElementById('menu-source-preview');
  box.innerHTML = `
    <div style="background:#fffbeb; border:2px solid #d97706; border-radius:10px; padding:1.1rem; font-family:'Courier New', monospace;">
      <div style="text-align:center; border-bottom:2px dashed #b45309; padding-bottom:0.5rem; margin-bottom:0.75rem;">
        <div style="font-weight:800; font-size:1rem; color:#9a3412;">${escapeHtml(title)}</div>
        <div style="font-size:0.76rem; color:#78350f;">(Ảnh thực đơn nguồn dùng để đối chiếu trực tiếp với bảng trích xuất bên phải)</div>
      </div>
      ${items.map((it, i) => `
        <div style="display:flex; justify-content:space-between; padding:0.35rem 0; border-bottom:1px dotted #d6d3d1; font-size:0.88rem;">
          <span>${i + 1}. ${escapeHtml(it.name)}</span>
          <strong style="color:#9a3412;">${escapeHtml(it.rawPriceText)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderScanDraftTable() {
  const tbody = document.getElementById('scan-draft-tbody');
  if (!tbody) return;

  tbody.innerHTML = appState.scanDraftItems.map((it, idx) => `
    <tr class="${it.needsReview ? 'row-needs-review' : ''}">
      <td>
        <input
          type="text"
          class="form-control"
          style="padding:0.35rem 0.5rem; font-size:0.85rem;"
          value="${escapeAttr(it.name)}"
          onchange="updateDraftItem(${idx}, 'name', this.value)"
        />
      </td>
      <td>
        <input
          type="number"
          class="form-control"
          style="padding:0.35rem 0.5rem; font-size:0.85rem; width:105px;"
          value="${it.price}"
          step="1000"
          onchange="updateDraftItem(${idx}, 'price', this.value)"
        />
      </td>
      <td>
        <select
          class="form-control"
          style="padding:0.35rem 0.5rem; font-size:0.83rem;"
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
      <td style="font-size:0.78rem;">
        <span class="badge ${it.needsReview ? 'badge-warning' : 'badge-verified'}">
          ${Math.round((it.confidence || 0.95) * 100)}%
        </span>
        ${it.needsReview ? `<div style="color:var(--warning); margin-top:0.2rem;">⚠️ ${escapeHtml(it.reviewReason || 'Cần kiểm tra')}</div>` : '<div style="color:var(--accent);">Khớp rõ ràng</div>'}
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeDraftItem(${idx})">✕</button>
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
    msgEl.textContent = '⚠️ Vui lòng nhập tên quán, địa chỉ và có ít nhất 1 món ăn.';
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
    msgEl.textContent = `✅ ${res.message}`;
    await refreshAllData();
  }
}

/* ==================== KHU VỰC QUẢN TRỊ (ADMIN DASHBOARD) ==================== */

function renderAdminDashboard() {
  if (!appState.adminData) return;
  const { submissions, auditLogs, costStats } = appState.adminData;

  const costBox = document.getElementById('admin-llm-cost-panel');
  if (costBox && costStats) {
    costBox.innerHTML = `
      <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px;">
        <div style="font-size:0.78rem; color:var(--text-muted);">Tổng lượt gọi xử lý AI</div>
        <div style="font-size:1.35rem; font-weight:800; color:var(--primary);">${costStats.totalCalls} lượt</div>
        <div style="font-size:0.75rem;">Gemini Live: ${costStats.geminiLiveCalls} | Fallback: ${costStats.fallbackCalls}</div>
      </div>
      <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px;">
        <div style="font-size:0.78rem; color:var(--text-muted);">Tổng Token đã dùng</div>
        <div style="font-size:1.35rem; font-weight:800;">${(costStats.totalInputTokens + costStats.totalOutputTokens).toLocaleString('vi-VN')}</div>
        <div style="font-size:0.75rem;">In: ${costStats.totalInputTokens} • Out: ${costStats.totalOutputTokens}</div>
      </div>
      <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px;">
        <div style="font-size:0.78rem; color:var(--text-muted);">Chi phí API ước tính</div>
        <div style="font-size:1.35rem; font-weight:800; color:var(--accent);">$${costStats.totalCostUsd.toFixed(5)}</div>
        <div style="font-size:0.75rem;">Hạn mức an toàn: $${costStats.budgetLimitUsd.toFixed(2)}</div>
      </div>
      <div style="background:var(--surface-alt); padding:0.85rem; border-radius:10px;">
        <div style="font-size:0.78rem; color:var(--text-muted);">Cơ chế bảo vệ dữ liệu</div>
        <div style="font-size:1.1rem; font-weight:800; color:#7e22ce;">Kiểm duyệt 2 lớp</div>
        <div style="font-size:0.75rem;">Đối tác rà soát → Admin duyệt</div>
      </div>
    `;
  }

  const subBox = document.getElementById('admin-submissions-list');
  if (subBox) {
    if (!submissions || submissions.length === 0) {
      subBox.innerHTML = `<p style="color:var(--text-muted);">Chưa có hồ sơ đối tác nào.</p>`;
    } else {
      subBox.innerHTML = submissions.map(s => `
        <div style="border:1px solid var(--border); border-radius:12px; padding:1rem; margin-bottom:0.9rem; background:${s.status === 'pending' ? '#fffbeb' : 'var(--surface)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.4rem;">
            <strong>${escapeHtml(s.partnerName)}</strong>
            <span class="badge ${s.status === 'approved' ? 'badge-verified' : s.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
              ${s.status === 'approved' ? '✓ Đã phê duyệt & Công bố' : s.status === 'rejected' ? '✕ Đã từ chối' : '⏳ Đang chờ Admin xác minh'}
            </span>
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">
            📍 ${escapeHtml(s.address)} (${escapeHtml(s.area)}) • 🕒 ${escapeHtml(s.openingHours)}
          </div>
          <div style="font-size:0.82rem; margin-bottom:0.65rem;">
            ${(s.items || []).map(it => `
              <div style="display:flex; justify-content:space-between; padding:0.2rem 0; border-bottom:1px dashed var(--border);">
                <span>• ${escapeHtml(it.name)} ${it.needsReview ? '<strong style="color:var(--warning);">(Có cảnh báo giá)</strong>' : ''}</span>
                <strong>${Number(it.price).toLocaleString('vi-VN')}đ</strong>
              </div>
            `).join('')}
          </div>
          ${s.status === 'pending' ? `
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-success btn-sm" onclick="adminReviewSubmission('${escapeAttr(s.id)}', 'approve')">
                ✓ Phê duyệt & Đưa vào CSDL Gợi ý
              </button>
              <button class="btn btn-danger btn-sm" onclick="adminReviewSubmission('${escapeAttr(s.id)}', 'reject')">
                ✕ Từ chối
              </button>
            </div>
          ` : ''}
        </div>
      `).join('');
    }
  }

  const logBox = document.getElementById('admin-audit-logs');
  if (logBox && auditLogs) {
    logBox.innerHTML = auditLogs.map(l => `
      <div style="border-bottom:1px solid var(--border); padding:0.55rem 0; font-size:0.83rem;">
        <div style="display:flex; justify-content:space-between; color:var(--text-muted); font-size:0.75rem;">
          <strong>[${escapeHtml(l.action)}] • ${escapeHtml(l.actor)}</strong>
          <span>${new Date(l.timestamp).toLocaleString('vi-VN')}</span>
        </div>
        <div>${escapeHtml(l.detail)}</div>
      </div>
    `).join('');
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
    input.value = window.location.origin;
  }
  updateQrImage();
  document.getElementById('qr-modal').classList.add('open');
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.remove('open');
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

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

