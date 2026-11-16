
const CACHE_NAME = "portal-cibersistemas-v2";

const FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./portal.html",
    "./portal.css",
    "./portal.js",
    "./login.html",
    "./login.css",
    "./login.js",
    "./firebase.js",
    "./manifest.json",
    "./Favicon-Cibersistemas.png",
    "./SENAI-LOGO.png"
];


// ==========================================
// INSTALAÇÃO
// ==========================================

self.addEventListener("install", (event) => {

    event.waitUntil(

        caches
            .open(CACHE_NAME)
            .then((cache) => {

                return cache.addAll(FILES);

            })
            .then(() => {

                return self.skipWaiting();

            })

    );

});


// ==========================================
// ATIVAÇÃO
// ==========================================

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches
            .keys()
            .then((keys) => {

                return Promise.all(

                    keys
                        .filter(
                            (key) => key !== CACHE_NAME
                        )
                        .map(
                            (key) => caches.delete(key)
                        )

                );

            })
            .then(() => {

                return self.clients.claim();

            })

    );

});


// ==========================================
// REQUISIÇÕES
// ==========================================

self.addEventListener("fetch", (event) => {

    if (event.request.method !== "GET") {
        return;
    }


    event.respondWith(

        fetch(event.request)

            .then((response) => {

                if (
                    response.ok &&
                    new URL(event.request.url).origin ===
                        self.location.origin
                ) {

                    const copia =
                        response.clone();


                    caches
                        .open(CACHE_NAME)
                        .then((cache) => {

                            cache.put(
                                event.request,
                                copia
                            );

                        });

                }


                return response;

            })

            .catch(() => {

                return caches.match(
                    event.request
                );

            })

    );

});
