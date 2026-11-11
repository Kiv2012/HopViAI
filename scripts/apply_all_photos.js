const fs = require('fs');
const path = require('path');
const photosByRest = require('../data/photos_by_rest.json');
const { findBestPhotoForDish } = require('./photo_matcher_helper.js');

const dbPath = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Update existing restaurants with their Drive photos
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

// 2. Update existing menu items with matched dish photos
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

// 3. Update specialties with actual Drive photos
const specPhotos = {
  SPEC_01: '/images/restaurants/REST_18/goi_buoi.jpg',
  SPEC_02: '/images/restaurants/REST_18/ga_hap_trai_buoi_chao.jpg',
  SPEC_03: '/images/restaurants/REST_11/lau_tom.jpg',
  SPEC_04: '/images/restaurants/REST_01/cha_lui.jpg'
};

for (const sp of db.specialties) {
  if (specPhotos[sp.id]) {
    sp.imageUrl = specPhotos[sp.id];
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully updated database.json with Drive photos!');

