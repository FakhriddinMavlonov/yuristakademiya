// Service worker — handles web push notifications.
// Plays a ringtone via the page when possible; falls back to OS notification sound.

const RING_TIMEOUT_MS = 30000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Bildirishnoma', body: event.data?.text() || '' }; }

  const title = data.title || 'Yurist Akademiya';
  const options = {
    body: data.body || '',
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: data.type === 'meeting:started',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: { url: data.url || '/', meetingId: data.meetingId, type: data.type },
    actions: data.type === 'meeting:started' ? [
      { action: 'accept', title: '✓ Qabul qilish' },
      { action: 'decline', title: '✕ Rad etish' },
    ] : [],
    vibrate: data.type === 'meeting:started' ? [400, 200, 400, 200, 400] : [200],
  };

  event.waitUntil((async () => {
    // 1. Show OS notification (works even when site is closed)
    await self.registration.showNotification(title, options);

    // 2. Tell open clients to start ringing (if any are open)
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'push', payload: data });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  if (event.action === 'decline') {
    return;
  }

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus();
        client.postMessage({ type: 'notification:click', payload: event.notification.data });
        if (url && url !== '/') client.navigate(url).catch(() => {});
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
