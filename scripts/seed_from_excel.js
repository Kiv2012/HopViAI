const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '..', 'data', 'raw_excel.json');
const outPath = path.join(__dirname, '..', 'data', 'database.json');

let rawText = fs.readFileSync(rawPath, 'utf8');
if (rawText.charCodeAt(0) === 0xFEFF) {
  rawText = rawText.slice(1);
}
const rawRows = JSON.parse(rawText);

function detectArea(address) {
  const lower = address.toLowerCase();
  if (lower.includes('trấn biên')) return 'Trấn Biên';
  if (lower.includes('tam hiệp')) return 'Tam Hiệp';
  if (lower.includes('tân triều')) return 'Tân Triều';
  if (lower.includes('bửu long')) return 'Bửu Long';
  if (lower.includes('thanh bình')) return 'Thanh Bình';
  if (lower.includes('thống nhất')) return 'Thống Nhất';
  return 'Biên Hòa';
}

function parsePriceInfo(priceStr, dishName) {
  const clean = (priceStr || '').replace(/\s+/g, ' ').trim();
  const numbers = [];
  const regex = /(\d{1,3}(?:\.\d{3})+)/g;
  let m;
  while ((m = regex.exec(clean)) !== null) {
    numbers.push(parseInt(m[1].replace(/\./g, ''), 10));
  }

  let price = numbers.length > 0 ? numbers[0] : 0;
  let priceMax = numbers.length > 1 ? numbers[numbers.length - 1] : price;
  let priceVariants = numbers.length > 1 ? numbers : [price];

  let unit = 'phần';
  const lower = clean.toLowerCase();
  if (lower.includes('/1 cây') || lower.includes('/cây')) unit = 'cây';
  else if (lower.includes('/1 con') || lower.includes('/con') || lower.includes('/ 1 con')) unit = 'con';
  else if (lower.includes('/1 cái') || lower.includes('/cái')) unit = 'cái';
  else if (lower.includes('/1 đĩa') || lower.includes('/đĩa')) unit = 'đĩa';
  else if (lower.includes('/1kg') || lower.includes('/1 kg') || lower.includes('/kg')) unit = 'kg';
  else if (lower.includes('/1 người') || lower.includes('/người')) unit = 'người';

  // Portion size detection
  let portionMin = 1;
  let portionMax = 1;
  let isSharedCombo = false;
  const dLower = dishName.toLowerCase();

  if (dLower.includes('2-3 người')) {
    portionMin = 2; portionMax = 3; isSharedCombo = true;
  } else if (dLower.includes('3-5 người')) {
    portionMin = 3; portionMax = 5; isSharedCombo = true;
  } else if (dLower.includes('3-4 người')) {
    portionMin = 3; portionMax = 4; isSharedCombo = true;
  } else if (dLower.includes('2 người')) {
    portionMin = 2; portionMax = 2; isSharedCombo = true;
  } else if (dLower.includes('3 người')) {
    portionMin = 3; portionMax = 3; isSharedCombo = true;
  } else if (dLower.includes('combo size s')) {
    portionMin = 2; portionMax = 2; isSharedCombo = true;
  } else if (dLower.includes('combo size m')) {
    portionMin = 3; portionMax = 3; isSharedCombo = true;
  } else if (dLower.includes('combo size l')) {
    portionMin = 4; portionMax = 5; isSharedCombo = true;
  } else if (dLower.includes('lẩu') && !dLower.includes('lẩu chay') && !dLower.includes('phá lấu')) {
    portionMin = 2; portionMax = 4; isSharedCombo = true;
  } else if (unit === 'kg' || unit === 'con' && price >= 150000) {
    portionMin = 2; portionMax = 4; isSharedCombo = true;
  }

  const hasVariablePrice = numbers.length > 1 || unit === 'kg';

  return {
    price,
    priceMax,
    priceVariants,
    rawPriceText: clean,
    unit,
    portionMin,
    portionMax,
    isSharedCombo,
    priceStatus: hasVariablePrice ? 'verified_range' : 'verified_exact',
    priceNote: hasVariablePrice
      ? 'Giá thay đổi theo cỡ (Nhỏ/Vừa/Lớn) hoặc trọng lượng thực tế tại quán'
      : 'Giá niêm yết theo thực đơn khảo sát'
  };
}

function classifyDish(dishName, restaurantName) {
  const d = dishName.toLowerCase();
  const r = restaurantName.toLowerCase();
  const tags = new Set();

  // Primary type: mon_nuoc, mon_kho, com, lau, an_vat, goi, chao
  let category = 'mon_kho';

  if (
    d.includes('bún bò') ||
    d.includes('bún thái') ||
    d.includes('bún ốc') ||
    d.includes('mì nước') ||
    d.includes('mì lá dứa') ||
    d.includes('mì hoành thánh') ||
    d.includes('hủ tiếu mì') ||
    (d.includes('bún gạo') && !d.includes('xào')) ||
    d.includes('udon') ||
    d.includes('soup') ||
    d.includes('mì cay') ||
    d.includes('canh chua') ||
    d.includes('nấu mẻ')
  ) {
    category = 'mon_nuoc';
    tags.add('mon_nuoc');
  }

  if (d.includes('cháo')) {
    category = 'mon_nuoc';
    tags.add('mon_nuoc');
    tags.add('chao');
  }

  if (d.includes('lẩu') && !d.includes('phá lấu')) {
    category = 'lau';
    tags.add('mon_nuoc');
    tags.add('lau');
  }

  if (d.includes('cơm')) {
    category = 'com';
    tags.add('com');
    if (!d.includes('soup')) tags.add('mon_kho');
  }

  if (
    d.includes('mì trộn') ||
    d.includes('hủ tiếu khô') ||
    d.includes('mì xào') ||
    d.includes('miến xào') ||
    d.includes('bún gạo xào') ||
    d.includes('mì tươi tóp mỡ') ||
    d.includes('mì giòn') ||
    d.includes('spaghetti') ||
    d.includes('bún thịt nướng') ||
    d.includes('bún đậu') ||
    d.includes('bún chả') ||
    d.includes('bánh hỏi') ||
    d.includes('chả lụi') ||
    d.includes('xôi')
  ) {
    if (category !== 'com') category = 'mon_kho';
    tags.add('mon_kho');
  }

  if (d.includes('gỏi')) {
    category = 'goi';
    tags.add('mon_kho');
    tags.add('goi');
  }

  // Specific noodle/grain tags
  if (d.includes('bún')) tags.add('bun');
  if (d.includes('mì') || d.includes('udon') || d.includes('spaghetti')) tags.add('mi');
  if (d.includes('hủ tiếu')) tags.add('hu_tieu');
  if (d.includes('xôi')) tags.add('xoi');
  if (d.includes('bánh hỏi')) tags.add('banh_hoi');

  // Flavor & Ingredient tags
  if (
    d.includes('cay') ||
    d.includes('thái') ||
    d.includes('sa tế') ||
    d.includes('sate') ||
    d.includes('ớt hiểm') ||
    d.includes('muối ớt') ||
    d.includes('kim chi')
  ) {
    tags.add('vi_cay');
  } else {
    tags.add('vi_thanh');
  }

  if (d.includes('chay') || r.includes('chay')) {
    tags.add('chay');
  } else {
    tags.add('man');
  }

  if (d.includes('hải sản') || d.includes('tôm') || d.includes('mực') || d.includes('hàu') || d.includes('nghêu') || d.includes('sò') || d.includes('ốc') || d.includes('hến') || d.includes('cá') || d.includes('lươn') || d.includes('cua') || d.includes('bào ngư')) {
    tags.add('hai_san');
  }
  if (d.includes('bò')) tags.add('bo');
  if (d.includes('gà') || d.includes('bồ câu') || d.includes('vịt')) tags.add('ga');
  if (d.includes('heo') || d.includes('sườn') || d.includes('thịt nướng') || d.includes('chả') || d.includes('nem')) tags.add('heo');

  if (
    d.includes('bưởi') ||
    d.includes('chả lụi') ||
    (d.includes('lẩu tôm') && r.includes('5 ri')) ||
    (d.includes('gỏi cá') && r.includes('kim yến')) ||
    d.includes('cháo hến')
  ) {
    tags.add('dac_san_dong_nai');
  }

  if (d.includes('ăn vặt') || d.includes('chả lụi') || d.includes('nem cua bể') || d.includes('tokbokki')) {
    tags.add('an_vat');
  }

  return {
    category,
    tags: Array.from(tags)
  };
}

const RESTAURANT_COORDS = {
  REST_01: { lat: 10.9648, lng: 106.8032 }, // Chả Lụi Cô Yến - Huỳnh Văn Nghệ, Bửu Long
  REST_02: { lat: 10.9532, lng: 106.8465 }, // Tiệm Ăn Nhà Túc - Dương Tử Giang, Tam Hiệp
  REST_03: { lat: 10.9478, lng: 106.8172 }, // Tiệm Mì Vĩnh Vĩnh - 55 Đường 30/4, Thanh Bình
  REST_04: { lat: 10.9515, lng: 106.8358 }, // Tiệm Gà Sugar - Đường D4, Thống Nhất
  REST_05: { lat: 10.9565, lng: 106.8492 }, // Bún Đậu Ngọc Thanh Tâm - Trương Định, Tam Hiệp
  REST_06: { lat: 10.9535, lng: 106.8145 }, // Mì Bún Ốc Hến - 58 Hồ Văn Đại, Trấn Biên
  REST_07: { lat: 10.9488, lng: 106.8195 }, // Bún Thái & Mì Trộn Thành Minh - 129 Hưng Đạo Vương
  REST_08: { lat: 10.9502, lng: 106.8234 }, // Bún 32 Chợ Đêm Biên Hùng - 140 Đường 30/4
  REST_09: { lat: 10.9548, lng: 106.8156 }, // Bún Bò ViNaTex - 2 Nguyễn Văn Nghĩa, Trấn Biên
  REST_10: { lat: 10.9455, lng: 106.8210 }, // A Sóc Cơm Chiên - 93 Hà Huy Giáp, Trấn Biên
  REST_11: { lat: 10.9522, lng: 106.8098 }, // Lẩu Tôm 5 Ri - CMT8, Trấn Biên
  REST_12: { lat: 10.9595, lng: 106.8540 }, // Lẩu Chay Thiện Duyên 2 - Đồng Khởi, Tam Hiệp
  REST_13: { lat: 10.9512, lng: 106.8565 }, // Bún Chả Hà Nội Phú Hoàng - KP3, Tam Hiệp
  REST_14: { lat: 10.9468, lng: 106.8385 }, // Cơm Gà Phú Yên S88 - Võ Thị Sáu, Trấn Biên
  REST_15: { lat: 10.9735, lng: 106.8390 }, // Cháo Hến Cô Tươi - Nguyễn Ái Quốc, Tân Triều
  REST_16: { lat: 10.9542, lng: 106.8615 }, // Gỏi cá Kim Yến - Huỳnh Văn Hớn, Tam Hiệp
  REST_17: { lat: 10.9852, lng: 106.7845 }, // Vườn Bưởi Tân Triều Tư Trung - Tân Triều
  REST_18: { lat: 10.9885, lng: 106.7812 }  // Làng bưởi Năm Huệ Tân Triều - Hương Lộ 9
};

const restaurants = [];
const menuItems = [];
let currentRestaurant = null;
let restCounter = 1;
let itemCounter = 1;

for (const row of rawRows) {
  if (row.A && row.A.trim() !== '') {
    const rId = `REST_${String(restCounter++).padStart(2, '0')}`;
    const name = row.A.trim();
    const address = (row.B || 'Biên Hòa, Đồng Nai').trim();
    const openingHours = (row.C || '08:00 - 21:00').replace(/\s+/g, ' ').trim();
    const area = detectArea(address);
    const coords = RESTAURANT_COORDS[rId] || { lat: 10.9502, lng: 106.8234 };

    currentRestaurant = {
      id: rId,
      name,
      address,
      area,
      lat: coords.lat,
      lng: coords.lng,
      openingHours,
      status: 'approved',
      verificationStatus: 'verified',
      verificationSource: 'Khảo sát thực đơn thực tế (Hợp vị AI.xlsx)',
      verifiedAt: '2026-11-10',
      isSpecialtySpot: ['Tân Triều', 'Bửu Long'].includes(area) || name.includes('5 Ri') || name.includes('Kim Yến')
    };
    restaurants.push(currentRestaurant);
  }

  if (currentRestaurant && row.D && row.D.trim() !== '') {
    const dishName = row.D.replace(/\s+/g, ' ').trim();
    const priceInfo = parsePriceInfo(row.E, dishName);
    const { category, tags } = classifyDish(dishName, currentRestaurant.name);

    const mId = `DISH_${String(itemCounter++).padStart(3, '0')}`;
    menuItems.push({
      id: mId,
      restaurantId: currentRestaurant.id,
      restaurantName: currentRestaurant.name,
      area: currentRestaurant.area,
      name: dishName,
      category,
      tags,
      ...priceInfo,
      status: 'approved',
      verificationSource: 'Hợp vị AI.xlsx (Dòng ' + row.row + ')',
      verifiedAt: '2026-11-10'
    });
  }
}

const specialties = [
  {
    id: 'SPEC_01',
    name: 'Gỏi Bưởi Tân Triều',
    classification: 'Đặc sản gắn với địa danh Đồng Nai (Làng bưởi Tân Triều)',
    originArea: 'Phường Tân Triều, TP. Biên Hòa / Vĩnh Cửu, Đồng Nai',
    summary: 'Món gỏi trứ danh xứ cù lao Tân Triều kết hợp tép bưởi đường lá cam mọng nước, vị thanh ngọt pha chua dịu cùng tôm sông Đồng Nai, thịt ba chỉ, rau răm và đậu phộng.',
    culturalStory: 'Làng bưởi Tân Triều hình thành từ thế kỷ XIX trên vùng đất phù sa cù lao ven sông Đồng Nai. Người dân địa phương sử dụng giống bưởi đường lá cam có tép ráo, vị ngọt thanh không đắng để trộn gỏi cùng tôm sông và thịt heo luộc, tạo nên món khai vị đặc trưng trong các dịp lễ Tết và đãi khách phương xa.',
    ingredients: ['Tép bưởi đường lá cam Tân Triều', 'Tôm sông Đồng Nai', 'Thịt ba chỉ luộc thái chỉ', 'Nước mắm chua ngọt, hành phi, đậu phộng, rau răm'],
    flavorProfile: 'Chua dịu, ngọt thanh tự nhiên, giòn mát, không ngấy',
    referencePriceRange: '170.000đ – 320.000đ / đĩa (dùng cho 2–4 người)',
    sources: [
      'Cổng thông tin điện tử tỉnh Đồng Nai – Chuyên mục Văn hóa & Du lịch sinh thái Tân Triều',
      'Khảo sát thực đơn thực tế tại Làng bưởi Năm Huệ Tân Triều (133/17 Hương Lộ 9)'
    ],
    linkedRestaurantIds: restaurants
      .filter(r => r.name.toLowerCase().includes('bưởi'))
      .map(r => r.id),
    suggestedQuery: 'Nhóm 3 người muốn thưởng thức đặc sản Gỏi bưởi Tân Triều và món gà tại Tân Triều với ngân sách 500.000 đồng'
  },
  {
    id: 'SPEC_02',
    name: 'Gà Hấp Trái Bưởi Tân Triều',
    classification: 'Đặc sản gắn với địa danh Đồng Nai (Làng bưởi Tân Triều)',
    originArea: 'Phường Tân Triều, Đồng Nai',
    summary: 'Gà ta hoặc gà tre thả vườn được ướp gia vị, đặt nguyên trong vỏ trái bưởi Tân Triều khoét rỗng và đem hấp cách thủy, giúp thịt gà thấm tinh dầu vỏ bưởi thơm dịu và ngọt mềm.',
    culturalStory: 'Bên cạnh gỏi bưởi và rượu bưởi, người dân Tân Triều tận dụng chính lớp vỏ bưởi giàu tinh dầu thơm để làm nồi hấp tự nhiên cho thịt gà ta thả vườn. Khi hấp chín, hương bưởi quyện vào từng thớ thịt gà vàng ươm, ăn kèm muối tiêu chanh hoặc lá bưởi non.',
    ingredients: ['Gà ta / Gà tre thả vườn', 'Trái bưởi Tân Triều nguyên vỏ', 'Lá bưởi non, sả, hành tím, gia vị truyền thống'],
    flavorProfile: 'Thơm nồng tinh dầu bưởi, thịt gà mềm ngọt đậm đà',
    referencePriceRange: '250.000đ – 330.000đ / con hoặc phần',
    sources: [
      'Cẩm nang Du lịch Đồng Nai – Ẩm thực cù lao Tân Triều',
      'Khảo sát thực đơn thực tế tại Vườn Bưởi Tân Triều Tư Trung (26/4 KP Tân Triều) & Làng bưởi Năm Huệ'
    ],
    linkedRestaurantIds: restaurants
      .filter(r => r.name.toLowerCase().includes('bưởi'))
      .map(r => r.id),
    suggestedQuery: 'Nhóm 3 người muốn ăn Gà hấp trái bưởi ở khu vực Tân Triều với ngân sách 350.000 đồng'
  },
  {
    id: 'SPEC_03',
    name: 'Lẩu Tôm Sông & Chạo Tôm Biên Hòa',
    classification: 'Món ẩm thực tiêu biểu gắn với vùng sông nước Đồng Nai',
    originArea: 'Phường Trấn Biên, TP. Biên Hòa, Đồng Nai',
    summary: 'Nước lẩu chua thanh nấu cùng tôm tươi chắc thịt, ăn kèm bún, rau đồng nội và món chạo tôm nướng mía thơm lừng cuốn bánh hỏi.',
    culturalStory: 'Nhờ lợi thế dòng sông Đồng Nai chảy qua trung tâm Biên Hòa, các món chế biến từ tôm sông và thủy sản nước ngọt đã trở thành nét văn hóa ẩm thực quen thuộc của người dân địa phương và du khách khi ghé thăm Trấn Biên.',
    ingredients: ['Tôm tươi', 'Chạo tôm quết nướng mía', 'Nước dùng chua thanh, cà chua, thơm, bạc hà, bông súng, rau sống'],
    flavorProfile: 'Chua cay thanh mát, đậm vị ngọt tự nhiên từ tôm',
    referencePriceRange: 'Chạo tôm 27.000đ/cây; Lẩu tôm 300.000đ – 500.000đ/nồi (3–5 người)',
    sources: [
      'Khảo sát thực đơn thực tế tại quán Lẩu Tôm 5 Ri (487/20/3B Cách Mạng Tháng 8, Trấn Biên, Đồng Nai)'
    ],
    linkedRestaurantIds: restaurants
      .filter(r => r.name.toLowerCase().includes('5 ri'))
      .map(r => r.id),
    suggestedQuery: 'Nhóm 4 người ở Trấn Biên muốn ăn Lẩu tôm và Chạo tôm với ngân sách 450.000 đồng'
  },
  {
    id: 'SPEC_04',
    name: 'Chả Lụi Bửu Long & Gỏi Cá Tân Mai',
    classification: 'Món ăn địa phương phổ biến tại Biên Hòa – Đồng Nai',
    originArea: 'Phường Bửu Long & Phường Tam Hiệp, TP. Biên Hòa, Đồng Nai',
    summary: 'Những món ăn gắn liền với đời sống học sinh, sinh viên và gia đình tại Biên Hòa: từ chả lụi nướng than hồng giá bình dân 20.000đ ở Bửu Long đến món gỏi cá truyền thống khu vực Tân Mai – Tam Hiệp.',
    culturalStory: 'Ẩm thực Biên Hòa là nơi giao thoa của nhiều vùng miền. Các hàng chả lụi ven đường Huỳnh Văn Nghệ (khu danh thắng Bửu Long) hay các quán gỏi cá lâu năm tại Tân Mai – Tam Hiệp phản ánh sinh động nhịp sống ẩm thực từ bình dân cho sinh viên đến sum họp gia đình.',
    ingredients: ['Bánh tráng cuốn tôm thịt nướng than (Chả lụi)', 'Cá tươi trộn thính riềng sả (Gỏi cá)', 'Rau sống, xoài xanh, nước chấm đậu phộng cay ngọt'],
    flavorProfile: 'Giòn rụm, béo bùi của nước chấm đậu phộng và thơm nồng gia vị',
    referencePriceRange: '20.000đ/phần (Chả lụi) – 200.000đ/phần (Gỏi cá)',
    sources: [
      'Khảo sát thực đơn thực tế tại Chả Lụi Cô Yến (9/8 Huỳnh Văn Nghệ, Bửu Long) và Gỏi cá Kim Yến (180 Huỳnh Văn Hớn, Tam Hiệp)'
    ],
    linkedRestaurantIds: restaurants
      .filter(r => r.name.toLowerCase().includes('cô yến') || r.name.toLowerCase().includes('kim yến'))
      .map(r => r.id),
    suggestedQuery: 'Nhóm 3 sinh viên có 80.000 đồng muốn ăn vặt Chả lụi ở Bửu Long'
  }
];

const database = {
  metadata: {
    projectName: 'HỢP VỊ AI',
    slogan: 'Hiểu đúng vị – Gợi đúng món',
    targetRegion: 'Tỉnh Đồng Nai (Trọng tâm: Phường Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long - TP. Biên Hòa)',
    lastUpdated: '2026-11-10T14:20:00+07:00',
    totalRestaurants: restaurants.length,
    totalMenuItems: menuItems.length,
    totalSpecialties: specialties.length
  },
  restaurants,
  menuItems,
  specialties,
  partnerSubmissions: [
    {
      id: 'SUB_DEMO_01',
      partnerName: 'Quán Bún Riêu & Cơm Tấm Sinh Viên Trấn Biên (Demo Chờ Duyệt)',
      address: '82 Nguyễn Ái Quốc, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      openingHours: '06:30 - 20:30',
      contactPhone: '0908.123.456',
      submissionType: 'ai_scan_menu',
      status: 'pending',
      submittedAt: '2026-11-10T10:15:00+07:00',
      sourceNote: 'Ảnh chụp bảng giá thực đơn tại quán (AI Scan Menu trích xuất)',
      items: [
        {
          tempId: 'TMP_01',
          name: 'Bún Riêu Cua Đồng Đặc Biệt',
          price: 35000,
          rawPriceText: '35.000đ',
          unit: 'tô',
          category: 'mon_nuoc',
          tags: ['mon_nuoc', 'bun', 'vi_thanh', 'man'],
          confidence: 0.98,
          needsReview: false,
          reviewReason: ''
        },
        {
          tempId: 'TMP_02',
          name: 'Cơm Tấm Sườn Bì Chả',
          price: 40000,
          rawPriceText: '40.000đ',
          unit: 'đĩa',
          category: 'com',
          tags: ['com', 'mon_kho', 'heo', 'vi_thanh', 'man'],
          confidence: 0.96,
          needsReview: false,
          reviewReason: ''
        },
        {
          tempId: 'TMP_03',
          name: 'Canh Bún Thập Cẩm (Size Nhỏ / Lớn)',
          price: 30000,
          rawPriceText: '30k / 40k',
          unit: 'tô',
          category: 'mon_nuoc',
          tags: ['mon_nuoc', 'bun', 'vi_thanh', 'man'],
          confidence: 0.78,
          needsReview: true,
          reviewReason: 'Thực đơn gốc ghi 2 mức giá (30k/40k), cần xác nhận giá mặc định'
        }
      ]
    }
  ],
  feedbacks: [
    {
      id: 'FB_01',
      userName: 'Bạn Minh Khoa (Sinh viên ĐH Lạc Hồng)',
      type: 'experience',
      rating: 5,
      restaurantName: 'Bún Thái & Mì Trộn Thành Minh',
      comment: 'Nhóm mình 3 người có 150k, 2 bạn thích món nước chua cay, 1 bạn thích mì khô. Hệ thống gợi ý Bún Thái và Mì Trộn ở cùng quán Thành Minh (Trấn Biên) hết 136k vừa khít ngân sách!',
      status: 'verified',
      createdAt: '2026-11-10T09:30:00+07:00'
    }
  ],
  auditLogs: [
    {
      id: 'LOG_01',
      action: 'IMPORT_VERIFIED_DATASET',
      actor: 'Admin Hệ Thống',
      detail: `Khởi tạo cơ sở dữ liệu đã xác minh từ Hợp vị AI.xlsx gồm ${restaurants.length} quán ăn và ${menuItems.length} món ăn tại Đồng Nai.`,
      timestamp: '2026-11-10T11:33:00+07:00'
    }
  ]
};

fs.writeFileSync(outPath, JSON.stringify(database, null, 2), 'utf8');
console.log(`Successfully generated database.json: ${restaurants.length} restaurants, ${menuItems.length} menu items, ${specialties.length} specialties.`);

