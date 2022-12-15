const dyCache = 'dy-pwa-assets-830';
// const cacheName = 'pwa-assets-937';
const toCache = [
    'http://localhost:3000/',
    'http://localhost:3000/home',
    'http://localhost:3000/recipes',
    'http://localhost:3000/saved',
    'http://localhost:3000/mealPlan',
    'http://localhost:3000/recommend',
    // 'grocery.ejs',
    // 'index.ejs',
    // 'userHome.ejs',
    'http://localhost:3000/public/css/style.css',
    'http://localhost:3000/public/js/script.js',
    'http://localhost:3000/public/js/main.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
    'http://localhost:3000/images/loader.gif',
    'https://fonts.gstatic.com/s/rubik/v21/iJWKBXyIfDnIV7nBrXyw023e.woff2',
    'http://localhost:3000/public/js/manifest.json',
    'https://unpkg.com/swiper@8/swiper-bundle.min.css',
    'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/webfonts/fa-regular-400.woff2',
    'http://localhost:3000/images/logo/logo-for-nav.png',
    'http://localhost:3000/images/hero/home-img-1.png',
    'http://localhost:3000/images/hero/home-img-2.png',
    'http://localhost:3000/images/hero/home-img-3.png',
    'http://localhost:3000/images/hero/home-img-4.png',
    'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600&display=swap'
];

//limiting cache size
const limitCache = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if(keys.length > size){
                cache.delete(keys[0]).then(limitCache(name, size))
            }
        })
    })
}


// ------------------------------------------------------ install

self.addEventListener('install', e => {
    console.log('sw installed...');
    // e.waitUntil(
    //     caches.open(cacheName).then((cache) => {
           
    //         cache.addAll(toCache);
    //     })
    // );

});

// -------------------------------------------------- activate
const deleteCache = async (key) => {
    await caches.delete(key);
  };
  
const deleteOldCaches = async () => {
    const cacheKeepList = dyCache;
    // const dyCacheKeepList = dyCache;      || !dyCacheKeepList.includes(key)
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
    await Promise.all(cachesToDelete.map(deleteCache));
};
  
self.addEventListener("activate", (event) => {
    event.waitUntil(deleteOldCaches());
});


// -------------------------------------------------------------------- fetch
self.addEventListener('fetch', (event) => {
        // console.log('fetch', event);
    if (event.request.method !== "GET") {
        return;
    }
    else{
              // Open the cache
      event.respondWith(caches.open(dyCache).then((cache) => {
        // Go to the network first
        return fetch(event.request).then((fetchedResponse) => {
            if(toCache.includes(event.request.url)){
                cache.put(event.request, fetchedResponse.clone());
                return fetchedResponse;
            }
            else{
                return fetchedResponse;
            }
        }).catch(() => {
          // If the network is unavailable, get
          return cache.match(event.request.url);
        });
      }));
    }
  });
