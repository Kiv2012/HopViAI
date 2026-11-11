const catalog = require('C:/Users/LECOO/.gemini/antigravity/brain/7058f4c8-151a-4ffc-aec1-2fe40c976c28/scratch/drive_catalog.json');
const db = require('../data/database.json');

function clean(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

console.log('--- MATCHING REPORT ---');
let matchedCount = 0;
let totalDishes = 0;

for (const r of db.restaurants) {
  const c = catalog.find(x => {
    const n1 = clean(x.name);
    const n2 = clean(r.name);
    return n1.includes(n2) || n2.includes(n1);
  });
  if (!c) {
    console.log(`[NO FOLDER] ${r.name}`);
    continue;
  }
  const dishes = db.menuItems.filter(m => m.restaurantId === r.id);
  totalDishes += dishes.length;
  console.log(`\n=== ${r.name} (${c.files.length} photos in Drive for ${dishes.length} dishes) ===`);
  for (const d of dishes) {
    const cd = clean(d.name);
    let match = c.files.find(f => {
      const cf = clean(f.title.replace(/\.[a-z0-9]+$/i, ''));
      return cf === cd || cf.includes(cd) || cd.includes(cf);
    });
    if (match) {
      matchedCount++;
      console.log(`  ✓ ${d.name} -> ${match.title}`);
    } else {
      console.log(`  ? ${d.name} -> (Drive titles: ${c.files.map(f => f.title).join(' | ')})`);
    }
  }
}
console.log(`\nTotal matched: ${matchedCount}/${totalDishes}`);
