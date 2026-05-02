// Service worker — handles web push notifications.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Bildirishnoma', body: event.data?.text() || '' }; }

  const isMeeting = data.type === 'meeting:started';
  const title = data.title || 'Yurist Akademiya';
  const options = {
    body: data.body || '',
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: isMeeting,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: { url: data.url || '/', meetingId: data.meetingId, type: data.type },
    actions: isMeeting ? [
      { action: 'accept', title: '✓ Qabul qilish' },
      { action: 'decline', title: '✕ Rad etish' },
    ] : [],
    // Repeating vibration pattern: on-off-on-off-on-pause × repeat feels like a phone ring
    vibrate: isMeeting
      ? [500, 300, 500, 300, 500, 1000, 500, 300, 500, 300, 500, 1000, 500, 300, 500]
      : [200],
    silent: false,
  };

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);

    // Tell open clients to show in-app ring UI
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'push', payload: data });
    }

    // Re-notify every 8 s while the notification is unacknowledged (phone-ring effect)
    if (isMeeting) {
      let attempts = 0;
      const rering = async () => {
        attempts++;
        if (attempts >= 4) return; // give up after ~32s
        const existing = await self.registration.getNotifications({ tag: data.tag });
        if (!existing.length) return; // already dismissed
        await self.registration.showNotification(title, { ...options, renotify: true });
        setTimeout(rering, 8000);
      };
      setTimeout(rering, 8000);
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
