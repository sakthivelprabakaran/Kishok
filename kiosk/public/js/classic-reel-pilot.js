(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    if (params.get('previewReel') === 'off') return;

    const card = document.querySelector('.product-card[data-type="keychain"]');
    const wrap = card && card.querySelector('.card-img-wrap');
    if (!card || !wrap) return;

    const reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const canAnimate = !reduceMotion && !saveData && 'IntersectionObserver' in window;
    const coordinator = window.__kootzyReelCoordinator || (window.__kootzyReelCoordinator = {
        activeStop: null,
        claim(stop) {
            if (this.activeStop && this.activeStop !== stop) this.activeStop();
            this.activeStop = stop;
        },
        release(stop) {
            if (this.activeStop === stop) this.activeStop = null;
        },
    });

    function preload(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(url);
            image.onerror = reject;
            image.src = url;
        });
    }

    function assetUrl(manifest, url) {
        const revision = String(manifest.sourceHash || manifest.generatedAt || 'pilot2').slice(0, 16);
        const separator = String(url).includes('?') ? '&' : '?';
        return `${url}${separator}v=${encodeURIComponent(revision)}`;
    }

    function buildStage(manifest) {
        const stage = document.createElement('div');
        stage.className = 'classic-reel-stage';
        stage.setAttribute('role', 'img');
        stage.setAttribute('aria-label', 'Exact 3D Classic Keychain preview changing through available filament colours');

        const picture = document.createElement('picture');
        picture.className = 'classic-reel-poster';
        const source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = assetUrl(manifest, manifest.poster);
        const fallback = document.createElement('img');
        fallback.src = assetUrl(manifest, manifest.fallbackPoster);
        fallback.alt = '';
        fallback.decoding = 'async';
        picture.append(source, fallback);

        const layerA = document.createElement('div');
        const layerB = document.createElement('div');
        layerA.className = 'classic-reel-layer';
        layerB.className = 'classic-reel-layer';
        stage.append(picture, layerA, layerB);
        return { stage, picture, layers: [layerA, layerB] };
    }

    async function mount() {
        let manifest;
        try {
            const response = await fetch('/assets/classic-reel/manifest.json', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
            manifest = await response.json();
            if (!Array.isArray(manifest.variants) || manifest.variants.length !== 3) {
                throw new Error('Manifest does not contain three Classic variants');
            }
        } catch (error) {
            console.warn('Classic render reel pilot unavailable:', error);
            return;
        }

        const ui = buildStage(manifest);
        wrap.classList.add('classic-reel-wrap');
        wrap.replaceChildren(ui.stage);
        card.classList.add('classic-reel-card');

        if (!canAnimate) return;

        let running = false;
        let cycleTimer = 0;
        let variantIndex = 0;
        let activeLayer = -1;
        let generation = 0;

        function stop() {
            running = false;
            generation += 1;
            clearTimeout(cycleTimer);
            coordinator.release(stop);
            ui.layers.forEach((layer) => {
                layer.classList.remove('classic-reel-playing');
                layer.style.animationPlayState = 'paused';
            });
        }

        async function showVariant(index, token) {
            const variant = manifest.variants[index];
            try {
                await preload(assetUrl(manifest, variant.sprite));
            } catch (error) {
                console.warn('Classic reel frame failed to load:', error);
                return;
            }
            if (!running || token !== generation) return;

            const nextLayer = activeLayer === 0 ? 1 : 0;
            const incoming = ui.layers[nextLayer];
            const outgoing = activeLayer >= 0 ? ui.layers[activeLayer] : null;
            incoming.style.backgroundImage = `url("${assetUrl(manifest, variant.sprite)}")`;
            incoming.style.animationPlayState = 'running';
            incoming.classList.remove('classic-reel-playing');
            void incoming.offsetWidth;
            incoming.classList.add('classic-reel-visible', 'classic-reel-playing');
            if (outgoing) outgoing.classList.remove('classic-reel-visible', 'classic-reel-playing');
            ui.picture.classList.add('classic-reel-poster-hidden');
            activeLayer = nextLayer;

            cycleTimer = window.setTimeout(() => {
                if (!running || token !== generation) return;
                variantIndex = (variantIndex + 1) % manifest.variants.length;
                showVariant(variantIndex, token);
            }, 3900);
        }

        function start() {
            coordinator.claim(stop);
            if (running) {
                ui.layers.forEach((layer) => { layer.style.animationPlayState = 'running'; });
                return;
            }
            running = true;
            const token = ++generation;
            showVariant(variantIndex, token);
        }

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting) start();
            else stop();
        }, {
            rootMargin: '250px 0px',
            threshold: 0.08,
        });
        observer.observe(card);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else if (card.getBoundingClientRect().bottom >= -250
                && card.getBoundingClientRect().top <= window.innerHeight + 250) start();
        });
    }

    mount();
})();
