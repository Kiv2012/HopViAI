const fs = require('fs');
const path = require('path');

const catalog = require('C:/Users/LECOO/.gemini/antigravity/brain/7058f4c8-151a-4ffc-aec1-2fe40c976c28/scratch/drive_catalog.json');
const baseDir = path.join(__dirname, '..', 'public', 'images', 'restaurants');

function sanitizeFilename(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '.jpg';
}

async function downloadWithRetry(url, dest, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buf));
      return true;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function main() {
  fs.mkdirSync(baseDir, { recursive: true });

  const tasks = [];
  for (let rIdx = 0; rIdx < catalog.length; rIdx++) {
    const folder = catalog[rIdx];
    const rId = `REST_${String(rIdx + 1).padStart(2, '0')}`;
    const rFolder = path.join(baseDir, rId);
    fs.mkdirSync(rFolder, { recursive: true });

    for (const f of folder.files) {
      const cleanName = sanitizeFilename(f.title.replace(/\.[a-z0-9]+$/i, ''));
      const destPath = path.join(rFolder, cleanName);
      tasks.push({
        rId,
        rName: folder.name,
        title: f.title,
        cleanName,
        url: f.directUrl,
        destPath,
        localUrl: `/images/restaurants/${rId}/${cleanName}`
      });
    }
  }

  console.log(`Starting download of ${tasks.length} photos...`);
  const concurrency = 6;
  let completed = 0;
  let failed = 0;

  async function worker(queue) {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        if (!fs.existsSync(item.destPath) || fs.statSync(item.destPath).size < 1000) {
          await downloadWithRetry(item.url, item.destPath);
        }
        completed++;
        if (completed % 10 === 0 || completed === tasks.length) {
          console.log(`[${completed}/${tasks.length}] Downloaded ${item.rId}: ${item.cleanName}`);
        }
      } catch (err) {
        failed++;
        console.error(`FAILED ${item.rId} ${item.title}:`, err.message);
      }
    }
  }

  const queue = [...tasks];
  const workers = Array(concurrency).fill(null).map(() => worker(queue));
  await Promise.all(workers);

  console.log(`Finished: ${completed} succeeded, ${failed} failed.`);

  // Save metadata
  const metaPath = path.join(__dirname, '..', 'data', 'photos_meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(tasks, null, 2), 'utf8');
}

main().catch(console.error);

