function normalizeStr(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function getWords(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 2);
}

function findBestPhotoForDish(dishName, photos) {
  if (!photos || photos.length === 0) return null;
  const dNorm = normalizeStr(dishName);

  // 1. Exact match
  let exact = photos.find(p => {
    const pNorm = normalizeStr(p.title.replace(/\.[a-z0-9]+$/i, ''));
    return pNorm === dNorm;
  });
  if (exact) return exact;

  // 2. Substring match
  let substrMatch = photos.find(p => {
    const pNorm = normalizeStr(p.title.replace(/\.[a-z0-9]+$/i, ''));
    return dNorm.includes(pNorm) || pNorm.includes(dNorm);
  });
  if (substrMatch) return substrMatch;

  // 3. Smart word similarity
  const dWords = getWords(dishName);
  let best = photos[0];
  let bestScore = -1;

  for (const p of photos) {
    const pWords = getWords(p.title.replace(/\.[a-z0-9]+$/i, ''));
    let common = 0;
    for (const w of dWords) {
      if (pWords.includes(w)) common++;
    }
    // Dice coefficient: 2 * |A ∩ B| / (|A| + |B|)
    const score = (2 * common) / (dWords.length + pWords.length);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return bestScore > 0 ? best : photos[0];
}

module.exports = { findBestPhotoForDish, normalizeStr, getWords };
