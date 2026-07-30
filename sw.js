// Service worker — LOTUS GROUP STOCK (network-first; HTML ดึงสดเสมอ, cache shell ไว้ใช้ตอนออฟไลน์)
const CACHE = 'lg-stock-v3';
const SHELL = ['/', '/index.html', '/s.html', '/guide.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // ปล่อยให้คำขอข้ามโดเมน (Supabase ฯลฯ) วิ่งตรงไปเน็ตเวิร์กตามปกติ
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // HTML/หน้าเว็บ = ดึงสดเสมอ (bypass cache) เพื่อให้ได้โค้ดใหม่ทันทีหลัง deploy
  const freshHtml = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  e.respondWith((async () => {
    try {
      const net = await fetch(e.request, freshHtml ? { cache: 'no-store' } : {});
      if (net.ok) {
        const c = await caches.open(CACHE);
        // HTML เก็บด้วย pathname (ตัด ?t=... ทิ้ง) — /s.html?t=X ทุกตัวอัปเดต entry เดียวกัน ไม่งอกไม่จำกัด
        c.put(freshHtml ? url.pathname : e.request, net.clone());
      }
      return net;
    } catch {
      const cached = await caches.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      // ต้อง fallback ตาม path: เสิร์ฟ index.html ที่ URL /s.html?t=... จะเจอสคริปต์ redirect ของ index แล้ววนลูป
      if (freshHtml) {
        const page = url.pathname.startsWith('/s.html') ? '/s.html' : '/index.html';
        return (await caches.match(page)) || Response.error();
      }
      return Response.error();
    }
  })());
});
