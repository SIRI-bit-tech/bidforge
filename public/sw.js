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
    (async () => {
      const allowlist = new Set([APP_CACHE, 'pages', 'assets', 'static'])
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !allowlist.has(k)).map((k) => caches.delete(k)))
    })()
  )
  self.clients.claim()
})

// Simple IndexedDB for GET /api responses and a background sync queue for non-GET
const DB_NAME = 'bidforge-idb'
const STORE = 'api-cache'
const QUEUE = 'api-queue'
let _idb = null
let _idbOpening = null
function idbOpen() {
  if (_idb) return Promise.resolve(_idb)
  if (_idbOpening) return _idbOpening
  _idbOpening = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { autoIncrement: true })
    }
    req.onsuccess = () => {
      _idb = req.result
      _idb.onversionchange = () => {
        try { _idb && _idb.close() } catch {}
        _idb = null
      }
      _idbOpening = null
      resolve(_idb)
    }
    req.onerror = () => {
      _idbOpening = null
      reject(req.error)
    }
  })
  return _idbOpening
}
function idbClose() {
  if (_idb) {
    try { _idb.close() } catch {}
    _idb = null
  }
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
async function idbPushQueue(value) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE, 'readwrite')
    tx.objectStore(QUEUE).add(value)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}
async function idbReadAllQueue() {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE, 'readonly')
    const store = tx.objectStore(QUEUE)
    const items = []
    const cursorReq = store.openCursor()
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        items.push({ id: cursor.key, value: cursor.value })
        cursor.continue()
      } else {
        resolve(items)
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
}
async function idbDeleteByKey(key) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE, 'readwrite')
    const req = tx.objectStore(QUEUE).delete(key)
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}
async function idbClearQueue() {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE, 'readwrite')
    const req = tx.objectStore(QUEUE).clear()
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  // Queue non-GET API requests for background sync on failure
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch (e) {
          try {
            const headers = {}
            request.headers.forEach((v, k) => (headers[k] = v))
            const body = await request.clone().text().catch(() => null)
            await idbPushQueue({ url: request.url, method: request.method, headers, body })
            if ('sync' in self.registration) {
              try { await self.registration.sync.register('api-queue') } catch {}
            }
          } catch {}
          throw e
        }
      })()
    )
    return
  }
  if (url.pathname.startsWith('/api/')) {
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
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 4000)
          const res = await fetch(request, { signal: controller.signal })
          clearTimeout(t)
          const cache = await caches.open('pages')
          cache.put(request, res.clone())
          return res
        } catch {
          const cached = (await caches.match(request)) || (await caches.match('/offline'))
          return cached || Response.error()
        }
      })()
    )
    return
  }
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open('assets')
        const cached = await cache.match(request)
        const fetcher = fetch(request)
          .then(async (res) => {
            if (res && res.ok) {
              await cache.put(request, res.clone())
            }
            return res
          })
          .catch(() => cached)
        return cached || fetcher
      })()
    )
    return
  }
  if (url.origin === self.location.origin && ['image', 'font', 'style', 'script'].includes(request.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open('static')
        const cached = await cache.match(request)
        if (cached) return cached
        const res = await fetch(request)
        if (res && res.ok) {
          await cache.put(request, res.clone())
        }
        return res
      })()
    )
    return
  }
})

// Background sync: replay queued API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'api-queue') {
    event.waitUntil(
      (async () => {
        try {
          const entries = await idbReadAllQueue()
          const items = entries || []
          if (!items || items.length === 0) return
          const failures = []
          // Process and delete each processed entry by key to avoid dropping concurrent enqueues
          for (const { id, value } of items) {
            try {
              await fetch(value.url, {
                method: value.method,
                headers: value.headers || {},
                body: value.body ?? undefined,
              })
              await idbDeleteByKey(id)
            } catch {
              // Delete processed item and re-enqueue for later retry
              await idbDeleteByKey(id)
              failures.push(value)
            }
          }
          // Re-enqueue failures
          for (const f of failures) await idbPushQueue(f)
          if (failures.length > 0 && 'sync' in self.registration) {
            try { await self.registration.sync.register('api-queue') } catch {}
          }
        } catch {
          // ignore
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
