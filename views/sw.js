// const dyCache = 'dy-pwa-assets';
// const cacheName = 'pwa-assets';
// const toStore = [
//     '/',
//     '/home',
//     '/grocery-list',
//     'grocery.ejs',
//     'index.ejs',
//     'userHome.ejs',
//     // '/public/css/style.css',
//     '/public/js/script.js',
//     '/public/js/main.js',
//     'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
//     '/images/loader.gif',
//     'https://fonts.gstatic.com/s/rubik/v21/iJWKBXyIfDnIV7nBrXyw023e.woff2',
//     '/public/js/manifest.json',
//     'https://unpkg.com/swiper@8/swiper-bundle.min.css',
//     'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600&display=swap',
//     'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js',
//     'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css',
//     'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/webfonts/fa-solid-900.woff2',
//     'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/webfonts/fa-regular-400.woff2'
    
// ];

// //limiting cache size
// const limitCache = (name, size) => {
//     caches.open(name).then(cache => {
//         cache.keys().then(keys => {
//             if(keys.length > size){
//                 cache.delete(keys[0]).then(limitCache(name, size))
//             }
//         })
//     })
// }



// //install
// self.addEventListener('install', e => {
//     // console.log('sw installed');
//     e.waitUntil(
//         caches.open(cacheName).then(cache => {
//             cache.addAll(toStore);
//         })
//     );

// })

// //activate
// self.addEventListener('activate', e => {
//     console.log('activate');
//     e.waitUntil(caches.keys().then(keys => {
//         // console.log(keys);
//         return Promise.all(keys
//         .filter(key => key !== cacheName)
//         .map(key => caches.delete(key)))
//     }))
// })

// //fetch
// self.addEventListener('fetch', e => {
//     console.log('fetch', e);
//     e.respondWith(
//         caches.match(e.request).then((cacheRes) => {
//             return cacheRes || fetch(e.request).then(fetchRes => {
//                 return caches.open(dyCache).then(cache => {
//                     cache.put(e.request.url, fetchRes.clone())
//                     limitCache(dyCache, 20);
//                     return fetchRes;
//                 })
//             })
//         })
//         // .catch(() => {
//         //     if(e.request.url.indexOf('.ejs') > -1){
//         //         return caches.match()
//         //     } if maglalagay ng default page in case
//         // })
//     );

// })