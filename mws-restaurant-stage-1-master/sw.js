var staticCache = 'rr-static-v8';
var contentImgsCache = "rr-content-imgs";

var allCaches = [
  staticCache,
  contentImgsCache
];

self.addEventListener('install', function (event) {// e.waitUntil Delays the event until the Promise is resolved
  event.waitUntil(// Open the cache
    caches.open(staticCache).then(function (cache) {// Add all the default files to the cache
      return cache.addAll([
        '/',
        'index.html',
        'restaurant.html',
        'js/main_bundle.js',
        'js/restaurant_info_bundle.js',
        'css/common.css',
        'css/main.css',
        'css/restaurant.css',
        'css/normalize.min.css',
        'icons/favi.ico',
      ]).catch((error) => console.log("SW install error: ", error));
    })
  ); // end event.waitUntil

});


self.addEventListener('activate', function (event) {

  event.waitUntil(// Get all the cache keys (cacheName)

    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName.startsWith('rr-') &&
            !allCaches.includes(cacheName);
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  ); // end event.waitUntil
});

self.addEventListener('fetch', function (event) {

  var requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/restaurants/') || requestUrl.pathname.startsWith('/reviews/') || requestUrl.pathname.startsWith('/reviews/?restaurant_id=')
  ) {
    return;
  }

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(serveImg(event.request));
      return;
    }
  }

  event.respondWith(
    caches.open(staticCache).then(function (cache) {
      return cache.match(event.request).then(function (response) {
        return response || fetch(event.request).then(function (response) {
          cache.put(event.request, response.clone());
          return response;
        }).catch(function (error) {
          console.error(error);
          return new Response('No internet or error 500');
        });
      });
    })
  );

});

function serveImg(request) {

  var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

  return caches.open(contentImgsCache).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) return response;

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });

}



