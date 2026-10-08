// Cache hors-ligne : l'application fonctionne sans réseau une fois ouverte.
// Aucune donnée de bilan ne transite par ce fichier.
const CACHE = 'bilans-v12';
const FILES = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/report.js',
  'js/schema.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

// Toujours la dernière version du serveur (jamais une copie périmée du navigateur),
// pour ne pas mélanger anciens et nouveaux fichiers.
const fresh = (req) => fetch(req, { cache: 'no-cache' });

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(FILES.map((f) => fresh(f).then((res) => c.put(f, res)))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fresh(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
