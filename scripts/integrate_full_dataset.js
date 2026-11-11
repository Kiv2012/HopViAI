const fs = require('fs');
const path = require('path');
const photosByRest = require('../data/photos_by_rest.json');
const { findBestPhotoForDish } = require('./photo_matcher_helper.js');

const dbPath = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Check if REST_19, REST_20, REST_21 already exist
const hasRest21 = db.restaurants.some(r => r.id === 'REST_21');

if (!hasRest21) {
  // Filter out any temporary admin test submissions if present
  db.restaurants = db.restaurants.filter(r => !r.id.startsWith('REST_') || parseInt(r.id.replace('REST_', ''), 10) <= 18);

  const newRests = [
    {
      id: 'REST_19',
      name: 'Quán Ăn CÔ TƯƠI',
      address: '85 - 87 Cách Mạng Tháng 8, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      lat: 10.9515,
      lng: 106.8188,
      openingHours: '05:30 - 21:00',
      status: 'approved',
      verificationStatus: 'verified',
      verificationSource: 'Khảo sát thực tế Google Sheet 2026',
      verifiedAt: '2026-11-11',
      isSpecialtySpot: false,
      dishes: [
        { name: 'Bún Bò Huế Thường', price: 45000, rawPriceText: '45.000 VNĐ', category: 'mon_nuoc', tags: ['mon_nuoc', 'bun', 'bo', 'vi_thanh', 'man'] },
        { name: 'Phở Tái Nạm', price: 45000, rawPriceText: '45.000 VNĐ', category: 'mon_nuoc', tags: ['mon_nuoc', 'bo', 'vi_thanh', 'man'] },
        { name: 'Phở Đặc Biệt', price: 55000, rawPriceText: '55.000 VNĐ', category: 'mon_nuoc', tags: ['mon_nuoc', 'bo', 'vi_thanh', 'man'] },
        { name: 'Cơm Sườn', price: 35000, rawPriceText: '35.000 VNĐ', category: 'com', tags: ['com', 'mon_kho', 'heo', 'vi_thanh', 'man'] },
        { name: 'Cơm Sườn Trứng', price: 40000, rawPriceText: '40.000 VNĐ', category: 'com', tags: ['com', 'mon_kho', 'heo', 'vi_thanh', 'man'] }
      ]
    },
    {
      id: 'REST_20',
      name: 'Bánh cuốn Thiên Hương 6',
      address: '36/3 Đ. Võ Thị Sáu, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      lat: 10.9505,
      lng: 106.8322,
      openingHours: '06:00 - 14:00',
      status: 'approved',
      verificationStatus: 'verified',
      verificationSource: 'Khảo sát thực tế Google Sheet 2026',
      verifiedAt: '2026-11-11',
      isSpecialtySpot: false,
      dishes: [
        { name: 'Bánh Cuốn Nhân Thịt', price: 40000, rawPriceText: '40.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'heo', 'vi_thanh', 'man'] },
        { name: 'Bánh Cuốn Nhân Tôm Thịt', price: 50000, rawPriceText: '50.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'hai_san', 'heo', 'vi_thanh', 'man'] },
        { name: 'Bánh Ướt', price: 40000, rawPriceText: '40.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'vi_thanh', 'man'] },
        { name: 'Bánh Ướt Trứng', price: 45000, rawPriceText: '45.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'vi_thanh', 'man'] }
      ]
    },
    {
      id: 'REST_21',
      name: 'Bánh mì chảo Khang',
      address: '88 Huỳnh Văn Lũy, Phường Trấn Biên, Đồng Nai',
      area: 'Trấn Biên',
      lat: 10.9540,
      lng: 106.8275,
      openingHours: '06:00 - 11:00',
      status: 'approved',
      verificationStatus: 'verified',
      verificationSource: 'Khảo sát thực tế Google Sheet 2026',
      verifiedAt: '2026-11-11',
      isSpecialtySpot: false,
      dishes: [
        { name: 'Chảo Không Bò', price: 35000, rawPriceText: '35.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'an_vat', 'vi_thanh', 'man'] },
        { name: 'Chảo Sốt Tiêu Đen', price: 50000, rawPriceText: '50.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'bo', 'vi_cay', 'man'] },
        { name: 'Chảo Full Topping', price: 45000, rawPriceText: '45.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'bo', 'heo', 'vi_thanh', 'man'] },
        { name: 'Xíu Mại', price: 23000, rawPriceText: '23.000 VNĐ', category: 'mon_kho', tags: ['mon_kho', 'heo', 'an_vat', 'vi_thanh', 'man'] }
      ]
    }
  ];

  let itemIdx = db.menuItems.length + 1;
  for (const nr of newRests) {
    const dishes = nr.dishes;
    delete nr.dishes;
    db.restaurants.push(nr);
    for (const d of dishes) {
      db.menuItems.push({
        id: `DISH_${String(itemIdx++).padStart(3, '0')}`,
        restaurantId: nr.id,
        restaurantName: nr.name,
        area: nr.area,
        name: d.name,
        category: d.category,
        tags: d.tags,
        price: d.price,
        priceMax: d.price,
        priceVariants: [d.price],
        rawPriceText: d.rawPriceText,
        unit: 'phần',
        portionMin: 1,
        portionMax: 1,
        isSharedCombo: false,
        priceStatus: 'verified_exact',
        priceNote: 'Giá niêm yết theo thực đơn khảo sát thực tế',
        status: 'approved',
        verificationSource: 'Google Sheet 2026',
        verifiedAt: '2026-11-11'
      });
    }
  }
}

// Attach photos to all restaurants & dishes
for (const r of db.restaurants) {
  const pData = photosByRest[r.id];
  if (pData && pData.photos.length > 0) {
    r.avatarUrl = pData.photos[0].localUrl;
    r.photos = pData.photos.map(p => ({
      title: p.title,
      cleanName: p.cleanName,
      url: p.localUrl
    }));
  }
}

for (const m of db.menuItems) {
  const pData = photosByRest[m.restaurantId];
  if (pData && pData.photos.length > 0) {
    const match = findBestPhotoForDish(m.name, pData.photos);
    if (match) {
      m.imageUrl = match.localUrl;
      m.imageTitle = match.title;
    }
  }
}

// Update specialties
db.specialties = [
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
    imageUrl: '/images/restaurants/REST_18/goi_buoi.jpg',
    photos: [
      { url: '/images/restaurants/REST_18/goi_buoi.jpg', title: 'Gỏi Bưởi Tân Triều Chính Gốc', sub: 'Tép bưởi đường lá cam trộn tôm sông' },
      { url: '/images/restaurants/REST_18/ga_ta_tron_goi_ruou_buoi.jpg', title: 'Gà Ta Trộn Gỏi Bưởi', sub: 'Đặc sản phục vụ tại Làng Bưởi Năm Huệ' }
    ],
    sources: [
      'Cổng thông tin điện tử tỉnh Đồng Nai – Chuyên mục Văn hóa & Du lịch sinh thái Tân Triều',
      'Khảo sát thực đơn thực tế tại Làng bưởi Năm Huệ Tân Triều (133/17 Hương Lộ 9)'
    ],
    linkedRestaurantIds: ['REST_17', 'REST_18'],
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
    imageUrl: '/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg',
    photos: [
      { url: '/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg', title: 'Gà Hấp Trái Bưởi Tân Triều', sub: 'Thịt gà thấm tinh dầu vỏ bưởi thơm ngọt tự nhiên' },
      { url: '/images/restaurants/REST_18/ga_hap_la_buoi.jpg', title: 'Gà Hấp Lá Bưởi Non', sub: 'Hương vị đồng quê cù lao Tân Triều' }
    ],
    sources: [
      'Cẩm nang Du lịch Đồng Nai – Ẩm thực cù lao Tân Triều',
      'Khảo sát thực đơn thực tế tại Vườn Bưởi Tân Triều Tư Trung & Làng bưởi Năm Huệ'
    ],
    linkedRestaurantIds: ['REST_17', 'REST_18'],
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
    imageUrl: '/images/restaurants/REST_11/lau_tom.jpg',
    photos: [
      { url: '/images/restaurants/REST_11/lau_tom.jpg', title: 'Lẩu Tôm Sông Biên Hòa (5 Ri)', sub: 'Tôm sông ngọt lịm nấu cùng nước dùng chua thanh' },
      { url: '/images/restaurants/REST_11/chao_tom.jpg', title: 'Chạo Tôm Nướng Mía Bánh Hỏi', sub: 'Chạo tôm quết nướng vàng thơm lừng' }
    ],
    sources: [
      'Khảo sát thực đơn thực tế tại quán Lẩu Tôm 5 Ri (487/20/3B Cách Mạng Tháng 8, Trấn Biên)'
    ],
    linkedRestaurantIds: ['REST_11'],
    suggestedQuery: 'Nhóm 4 người ở Trấn Biên muốn ăn Lẩu tôm và Chạo tôm với ngân sách 450.000 đồng'
  },
  {
    id: 'SPEC_04',
    name: 'Chả Lụi Bửu Long & Gỏi Cá Tân Mai',
    classification: 'Món ăn địa phương phổ biến tại Biên Hòa – Đồng Nai',
    originArea: 'Phường Bửu Long & Phường Tam Hiệp, TP. Biên Hòa, Đồng Nai',
    summary: 'Những món ăn gắn liền với đời sống học sinh, sinh viên và gia đình tại Biên Hòa: từ chả lụi nướng than hồng giá bình dân 30.000đ ở Bửu Long đến món gỏi cá truyền thống khu vực Tân Mai – Tam Hiệp.',
    culturalStory: 'Ẩm thực Biên Hòa là nơi giao thoa của nhiều vùng miền. Các hàng chả lụi ven đường Huỳnh Văn Nghệ (khu danh thắng Bửu Long) hay các quán gỏi cá lâu năm tại Tân Mai – Tam Hiệp phản ánh sinh động nhịp sống ẩm thực từ bình dân cho sinh viên đến sum họp gia đình.',
    ingredients: ['Bánh tráng cuốn tôm thịt nướng than (Chả lụi)', 'Cá tươi trộn thính riềng sả (Gỏi cá)', 'Rau sống, xoài xanh, nước chấm đậu phộng cay ngọt'],
    flavorProfile: 'Giòn rụm, béo bùi của nước chấm đậu phộng và thơm nồng gia vị',
    referencePriceRange: '30.000đ/phần (Chả lụi) – 200.000đ/phần (Gỏi cá)',
    imageUrl: '/images/restaurants/REST_01/cha_lui.jpg',
    photos: [
      { url: '/images/restaurants/REST_01/cha_lui.jpg', title: 'Chả Lụi Nướng Than Cô Yến Bửu Long', sub: 'Món ăn vặt trứ danh sinh viên Biên Hòa' },
      { url: '/images/restaurants/REST_16/goi_ca.jpg', title: 'Gỏi Cá Tân Mai Kim Yến', sub: 'Đặc sản cá nước ngọt gia truyền lâu năm' }
    ],
    sources: [
      'Khảo sát thực đơn thực tế tại Chả Lụi Cô Yến và Gỏi cá Kim Yến'
    ],
    linkedRestaurantIds: ['REST_01', 'REST_16'],
    suggestedQuery: 'Nhóm 3 sinh viên có 90.000 đồng muốn ăn vặt Chả lụi ở Bửu Long'
  }
];

db.metadata.totalRestaurants = db.restaurants.length;
db.metadata.totalMenuItems = db.menuItems.length;
db.metadata.lastUpdated = new Date().toISOString();

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database successfully updated: ${db.restaurants.length} restaurants, ${db.menuItems.length} dishes.`);
