importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js')

const APP_CACHE = 'bidforge-app-v1'
const APP_SHELL = ['/', '/offline', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

if (self.workbox) {
  workbox.setConfig({ debug: false })
  // Navigation: Network-first with offline fallback
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
      try {
        return await workbox.strategies.networkFirst({
          cacheName: 'pages',
          networkTimeoutSeconds: 4,
          plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 })],
        }).handle({ event })
      } catch {
        const cached = await caches.match('/offline')
        return cached || Response.error()
      }
    }
  )

  // Static assets: stale-while-revalidate
  workbox.routing.registerRoute(
    ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/_next/'),
    new workbox.strategies.StaleWhileRevalidate({ cacheName: 'assets' })
  )

  // Images/fonts: cache-first with expiration
  workbox.routing.registerRoute(
    ({ request, url }) =>
      url.origin === self.location.origin &&
      ['image', 'font', 'style', 'script'].includes(request.destination),
    new workbox.strategies.CacheFirst({
      cacheName: 'static',
      plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 3600 })],
    })
  )

  // Background sync for non-GET API calls
  const apiQueue = new workbox.backgroundSync.Queue('api-queue', { maxRetentionTime: 24 * 60 })
  workbox.routing.registerRoute(
    ({ url, request }) => url.pathname.startsWith('/api/') && request.method !== 'GET',
    new workbox.strategies.NetworkOnly({
      plugins: [
        {
          requestWillFetch: async ({ request }) => request,
          fetchDidFail: async ({ request }) => apiQueue.pushRequest({ request }),
        },
      ],
    }),
    'POST'
  )
}

// Simple IndexedDB for GET /api responses
const DB_NAME = 'bidforge-idb'
const STORE = 'api-cache'
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function idbPut(key, value) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}
async function idbGet(key) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method === 'GET' && new URL(request.url).pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request)
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const data = await res.clone().text()
            await idbPut(request.url, data)
          }
          return res
        } catch {
          const cached = await idbGet(request.url)
          if (cached) {
            return new Response(cached, { headers: { 'Content-Type': 'application/json' } })
          }
          throw new Error('Network and IDB failed')
        }
      })()
    )
  }
})

// Push notifications (payload JSON or text)
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() || 'Notification', body: '' }
  }
  const title = data.title || 'BidForge'
  const body = data.body || 'You have a new update.'
  const options = { body, icon: '/android-icon-192x192.png', badge: '/android-icon-192x192.png' }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const client = clientsArr.find((c) => 'focus' in c)
      if (client) return client.focus()
      return self.clients.openWindow('/')
    })
  )
})
