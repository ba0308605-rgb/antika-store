// Maps provider runtime helper (Google Maps with safe fallback to Leaflet).
(function () {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : '/api';

    let configPromise = null;
    let googleLoaderPromise = null;

    function fallbackConfig() {
        return {
            provider: 'leaflet',
            googleMapsEnabled: false,
            googleMapsApiKey: ''
        };
    }

    async function getConfig() {
        if (!configPromise) {
            configPromise = fetch(`${API_BASE}/maps/config?t=${Date.now()}`, { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : fallbackConfig()))
                .catch(() => fallbackConfig());
        }
        return configPromise;
    }

    async function loadGoogleMapsApi(apiKey) {
        if (window.google && window.google.maps) return window.google;

        if (!apiKey) {
            throw new Error('Google Maps API key is missing');
        }

        if (!googleLoaderPromise) {
            googleLoaderPromise = new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-google-maps-loader="1"]');
                if (existing) {
                    existing.addEventListener('load', () => resolve(window.google));
                    existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
                    return;
                }

                const callbackName = `__googleMapsReady_${Date.now()}`;
                window[callbackName] = function () {
                    try { delete window[callbackName]; } catch (e) {}
                    resolve(window.google);
                };

                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=ar&region=SA&callback=${callbackName}`;
                script.async = true;
                script.defer = true;
                script.dataset.googleMapsLoader = '1';
                script.onerror = function () {
                    try { delete window[callbackName]; } catch (e) {}
                    reject(new Error('Failed to load Google Maps API'));
                };
                document.head.appendChild(script);
            });
        }

        return googleLoaderPromise;
    }

    window.MapsProvider = {
        getConfig,
        loadGoogleMapsApi
    };
})();
