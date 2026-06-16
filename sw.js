// Service worker — LOTUS GROUP STOCK (network-first; cache เฉพาะ shell ไว้ใช้ตอนออฟไลน์)
const CACHE = 'lg-stock-v1';
const SHELL = ['/', '/index.html', '/guide.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

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
  // network-first: ออนไลน์เห็นของใหม่เสมอ, ออฟไลน์ค่อยใช้แคช
  e.respondWith((async () => {
    try {
      const net = await fetch(e.request);
      const c = await caches.open(CACHE);
      c.put(e.request, net.clone());
      return net;
    } catch {
      return (await caches.match(e.request)) || caches.match('/index.html');
    }
  })());
});
