(function () {
    'use strict';

    if (new URLSearchParams(location.search).get('previewReel') === 'off') return;

    const productTypes = ['wordart', 'desk_organizer'];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const canAnimate = !reduceMotion && !saveData && 'IntersectionObserver' in window;
    const coordinator = window.__kootzyReelCoordinator || (window.__kootzyReelCoordinator = {
        activeStops: new Set(),
        claim(stop) {
            this.activeStops.add(stop);
        },
        release(stop) {
            this.activeStops.delete(stop);
        },
    });

    function assetUrl(manifest, url) {
        const revision = String(manifest.sourceHash || manifest.generatedAt || 'gate1').slice(0, 16);
        return `${url}${String(url).includes('?') ? '&' : '?'}v=${encodeURIComponent(revision)}`;
    }

    function preload(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = resolve;
            image.onerror = reject;
            image.src = url;
        });
    }

    function buildStage(manifest, label) {
        const stage = document.createElement('div');
        stage.className = 'classic-reel-stage';
        stage.setAttribute('role', 'img');
        stage.setAttribute('aria-label', `Exact 3D ${label} preview changing through available filament colours`);

        const picture = document.createElement('picture');
        picture.className = 'classic-reel-poster';
        const source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = assetUrl(manifest, manifest.poster);
        const image = document.createElement('img');
        image.src = assetUrl(manifest, manifest.fallbackPoster);
        image.alt = '';
        image.decoding = 'async';
        picture.append(source, image);

        const layers = [document.createElement('div'), document.createElement('div')];
        layers.forEach((layer) => { layer.className = 'classic-reel-layer'; });
        stage.append(picture, ...layers);
        return { stage, picture, layers };
    }

    async function mount(productType) {
        const card = document.querySelector(`.product-card[data-type="${productType}"]`);
        const wrap = card?.querySelector('.card-img-wrap');
        if (!card || !wrap) return;

        let manifest;
        try {
            const response = await fetch(`/assets/catalog-reels/${productType}/manifest.json`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            manifest = await response.json();
            if (manifest.productType !== productType || manifest.variants?.length !== 3) {
                throw new Error('Unexpected manifest');
            }
        } catch (error) {
            console.warn(`Render reel unavailable for ${productType}:`, error);
            return;
        }

        const ui = buildStage(manifest, manifest.label || productType.replaceAll('_', ' '));
        wrap.classList.add('classic-reel-wrap');
        wrap.replaceChildren(ui.stage);
        card.classList.add('classic-reel-card');
        if (!canAnimate) return;

        let running = false;
        let generation = 0;
        let timer = 0;
        let variantIndex = Math.floor(Math.random() * manifest.variants.length);
        let activeLayer = -1;

        function stop() {
            running = false;
            generation += 1;
            clearTimeout(timer);
            coordinator.release(stop);
            ui.layers.forEach((layer) => {
                layer.classList.remove('classic-reel-playing');
                layer.style.animationPlayState = 'paused';
            });
        }

        async function show(index, token) {
            const variant = manifest.variants[index];
            const url = assetUrl(manifest, variant.sprite);
            try { await preload(url); }
            catch (error) {
                console.warn(`Render reel frame failed for ${productType}:`, error);
                return;
            }
            if (!running || token !== generation) return;
            const next = activeLayer === 0 ? 1 : 0;
            const incoming = ui.layers[next];
            const outgoing = activeLayer >= 0 ? ui.layers[activeLayer] : null;
            incoming.style.backgroundImage = `url("${url}")`;
            incoming.style.animationPlayState = 'running';
            incoming.classList.remove('classic-reel-playing');
            void incoming.offsetWidth;
            incoming.classList.add('classic-reel-visible', 'classic-reel-playing');
            outgoing?.classList.remove('classic-reel-visible', 'classic-reel-playing');
            ui.picture.classList.add('classic-reel-poster-hidden');
            activeLayer = next;
            timer = setTimeout(() => {
                if (!running || token !== generation) return;
                variantIndex = (variantIndex + 1) % manifest.variants.length;
                show(variantIndex, token);
            }, 3900);
        }

        function start() {
            coordinator.claim(stop);
            if (running) return;
            running = true;
            show(variantIndex, ++generation);
        }

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting) start();
            else stop();
        }, { rootMargin: '180px 0px', threshold: 0.2 });
        observer.observe(card);
    }

    productTypes.forEach(mount);
}());
