import { KeychainViewer } from './viewer3d.js?classic-reel-pilot=1';

const WIDTH = 840;
const HEIGHT = 600;
const ANGLES = [-8, -4, 0, 4, 8];
const PLA = Object.freeze({
    red: '#C93655',
    blue: '#1D7D8D',
    orange: '#D67842',
    white: '#F1ECE1',
    black: '#0E0E10',
    forest: '#008351',
    army: '#7C8A68',
    beige: '#D7CAAB',
    yellow: '#F9A800',
});
const PRODUCT_CONFIGS = Object.freeze({
    keychain: {
        label: 'Classic Keychain',
        text: 'Luna',
        font: 'Lobster',
        fontFile: 'Fonts/Lobster-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'left', ring: { anchor: 'center' }, showFDMTexture: false },
        variants: [
            {
                id: 'orange-white-black',
                label: 'Luna - Lobster - Forest Green, White and Black',
                text: 'Luna',
                font: 'Lobster',
                fontFile: 'Fonts/Lobster-Regular.ttf',
                layers: '3L',
                colors: { base: PLA.forest, font: PLA.white, outline: PLA.black, line2: PLA.white },
            },
            {
                id: 'purple-white-gold',
                label: 'Zoya - Oleo Script - Imperial Red, White and Beige',
                text: 'Zoya',
                font: 'Oleo Script',
                fontFile: 'Fonts/OleoScript-Bold.ttf',
                layers: '3L',
                colors: { base: PLA.red, font: PLA.white, outline: PLA.beige, line2: PLA.white },
            },
            {
                id: 'blue-gold-black',
                label: 'MIRA - Super Bubble - Water Blue, Yellow and Black',
                text: 'MIRA',
                font: 'Super Bubble',
                fontFile: 'Fonts/Super Bubble.ttf',
                layers: '3L',
                colors: { base: PLA.blue, font: PLA.yellow, outline: PLA.black, line2: PLA.white },
            },
            {
                id: 'peach-black-2l',
                label: 'Aira - Satisfy - Terracotta Orange and Black - 2 Layer',
                text: 'Aira',
                font: 'Satisfy',
                fontFile: 'Fonts/Satisfy-Regular.ttf',
                layers: '2L',
                colors: { base: PLA.orange, font: PLA.black, outline: PLA.black, line2: PLA.white },
            },
            {
                id: 'lavender-plum-2l',
                label: 'AARAV - Fredoka One - Light Beige and Army Green - 2 Layer',
                text: 'AARAV',
                font: 'Fredoka One',
                fontFile: 'Fonts/FredokaOne-Regular.ttf',
                layers: '2L',
                colors: { base: PLA.beige, font: PLA.army, outline: PLA.army, line2: PLA.white },
            },
        ],
    },
    bubble_keychain: {
        label: 'Bubble Badge',
        text: 'RODIC',
        font: 'Super Bubble',
        fontFile: 'Fonts/Super Bubble.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'white-blue', label: 'Pure White and Water Blue', colors: { base: PLA.white, font: PLA.blue, outline: PLA.white, line2: PLA.white } },
            { id: 'beige-red', label: 'Light Beige and Imperial Red', colors: { base: PLA.beige, font: PLA.red, outline: PLA.beige, line2: PLA.white } },
            { id: 'black-yellow', label: 'Pitch Black and Lemon Yellow', colors: { base: PLA.black, font: PLA.yellow, outline: PLA.black, line2: PLA.white } },
        ],
    },
    flower_keychain: {
        label: 'Flower Initial',
        text: 'S',
        font: 'Pacifico',
        fontFile: 'Fonts/Pacifico-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'red-white', label: 'Imperial Red and Pure White', colors: { base: PLA.red, font: PLA.white, outline: PLA.black, line2: PLA.white } },
            { id: 'forest-yellow', label: 'Forest Green and Lemon Yellow', colors: { base: PLA.forest, font: PLA.yellow, outline: PLA.black, line2: PLA.white } },
            { id: 'blue-beige', label: 'Water Blue and Light Beige', colors: { base: PLA.blue, font: PLA.beige, outline: PLA.black, line2: PLA.white } },
        ],
    },
    nametag: {
        label: 'Wavy Nametag',
        text: 'Zoya',
        font: 'Chewy',
        fontFile: 'Fonts/Chewy-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'imperial-red', label: 'Imperial Red', colors: { base: PLA.red, font: PLA.red, outline: PLA.red, line2: PLA.red } },
            { id: 'water-blue', label: 'Water Blue', colors: { base: PLA.blue, font: PLA.blue, outline: PLA.blue, line2: PLA.blue } },
            { id: 'army-green', label: 'Army Green', colors: { base: PLA.army, font: PLA.army, outline: PLA.army, line2: PLA.army } },
        ],
    },
    girly_keychain: {
        label: 'Girly Keychain',
        text: 'Maya',
        font: 'Pacifico',
        fontFile: 'Fonts/Pacifico-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'red-white', label: 'Imperial Red and Pure White', colors: { base: PLA.red, font: PLA.white, outline: PLA.black, line2: PLA.white } },
            { id: 'blue-yellow', label: 'Water Blue and Lemon Yellow', colors: { base: PLA.blue, font: PLA.yellow, outline: PLA.black, line2: PLA.white } },
            { id: 'beige-black', label: 'Light Beige and Pitch Black', colors: { base: PLA.beige, font: PLA.black, outline: PLA.black, line2: PLA.white } },
        ],
    },
    tilekey: {
        label: 'Letter Tiles',
        text: 'AIRA',
        font: 'Bagel Fat One',
        fontFile: 'Fonts/BagelFatOne-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'blue-white-red', label: 'Water Blue, White and Red', colors: { base: PLA.blue, font: PLA.white, outline: PLA.red, line2: PLA.red } },
            { id: 'black-yellow-orange', label: 'Pitch Black, Yellow and Orange', colors: { base: PLA.black, font: PLA.yellow, outline: PLA.orange, line2: PLA.orange } },
            { id: 'forest-beige-army', label: 'Forest Green, Beige and Army Green', colors: { base: PLA.forest, font: PLA.beige, outline: PLA.army, line2: PLA.army } },
        ],
    },
    linked_initials: {
        label: 'Linked Initials',
        text: 'AK',
        font: 'Rock Boys',
        fontFile: 'Fonts/Rock Boys.ttf',
        layers: '3L',
        params: { ringPosition: 'left', showFDMTexture: false },
        variants: [
            { id: 'red-white', label: 'Imperial Red and Pure White', colors: { base: PLA.black, font: PLA.red, outline: PLA.black, line2: PLA.white } },
            { id: 'blue-yellow', label: 'Water Blue and Lemon Yellow', colors: { base: PLA.black, font: PLA.blue, outline: PLA.black, line2: PLA.yellow } },
            { id: 'forest-beige', label: 'Forest Green and Light Beige', colors: { base: PLA.black, font: PLA.forest, outline: PLA.black, line2: PLA.beige } },
        ],
    },
    name_beads: {
        label: 'Name Beads',
        text: 'EMMA',
        font: 'Bagel Fat One',
        fontFile: 'Fonts/BagelFatOne-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false, beadShape: 'square', beadDirection: 'horizontal' },
        variants: [
            { id: 'blue-white', label: 'Water Blue and Pure White', colors: { base: PLA.blue, font: PLA.white, outline: PLA.blue, line2: PLA.white } },
            { id: 'red-beige', label: 'Imperial Red and Light Beige', colors: { base: PLA.red, font: PLA.beige, outline: PLA.red, line2: PLA.white } },
            { id: 'army-yellow', label: 'Army Green and Lemon Yellow', colors: { base: PLA.army, font: PLA.yellow, outline: PLA.army, line2: PLA.white } },
        ],
    },
    supported_text: {
        label: 'Supported Name',
        text: 'Zoya',
        font: 'Lobster',
        fontFile: 'Fonts/Lobster-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false },
        variants: [
            { id: 'imperial-red', label: 'Imperial Red', colors: { base: PLA.red, font: PLA.red, outline: PLA.red, line2: PLA.red } },
            { id: 'water-blue', label: 'Water Blue', colors: { base: PLA.blue, font: PLA.blue, outline: PLA.blue, line2: PLA.blue } },
            { id: 'forest-green', label: 'Forest Green', colors: { base: PLA.forest, font: PLA.forest, outline: PLA.forest, line2: PLA.forest } },
        ],
    },
    wordart: {
        label: 'Word Art',
        text: 'Vivi\nSAKTHI',
        font: 'Brandy / CANAVAR',
        fontFile: 'Fonts/Brandy.ttf',
        wordartFonts: { top: 'Fonts/Brandy.ttf', bottom: 'Fonts/CANAVAR.ttf' },
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false, base: { wordartMode: 'none' } },
        variants: [
            { id: 'teal-red-gold', label: 'Water Blue, Imperial Red and Yellow', colors: { base: PLA.blue, font: PLA.red, outline: PLA.black, line2: PLA.yellow } },
            { id: 'purple-gold-white', label: 'Forest Green, Beige and White', colors: { base: PLA.forest, font: PLA.beige, outline: PLA.black, line2: PLA.white } },
            { id: 'blue-white-gold', label: 'Pitch Black, White and Terracotta', colors: { base: PLA.black, font: PLA.white, outline: PLA.black, line2: PLA.orange } },
        ],
    },
    loveseries: {
        label: 'LOVE Series',
        text: 'Aira',
        font: 'Satisfy',
        fontFile: 'Fonts/Satisfy-Regular.ttf',
        wordartFonts: { top: 'Fonts/Satisfy-Regular.ttf', bottom: 'Fonts/BagelFatOne-Regular.ttf' },
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false, base: { wordartMode: 'none' } },
        variants: [
            { id: 'red-white', label: 'Imperial Red and Pure White', colors: { base: PLA.black, font: PLA.red, outline: PLA.black, line2: PLA.white } },
            { id: 'blue-yellow', label: 'Water Blue and Lemon Yellow', colors: { base: PLA.black, font: PLA.blue, outline: PLA.black, line2: PLA.yellow } },
            { id: 'forest-beige', label: 'Forest Green and Light Beige', colors: { base: PLA.black, font: PLA.forest, outline: PLA.black, line2: PLA.beige } },
        ],
    },
    nameplate: {
        label: 'Desk Nameplate',
        text: 'AARAV',
        font: 'Anton',
        fontFile: 'Fonts/Anton-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false },
        variants: [
            { id: 'black-white-red', label: 'Pitch Black, White and Red', colors: { base: PLA.black, font: PLA.white, outline: PLA.red, line2: PLA.white } },
            { id: 'beige-blue-black', label: 'Light Beige, Blue and Black', colors: { base: PLA.beige, font: PLA.blue, outline: PLA.black, line2: PLA.white } },
            { id: 'army-yellow-forest', label: 'Army Green, Yellow and Forest Green', colors: { base: PLA.army, font: PLA.yellow, outline: PLA.forest, line2: PLA.white } },
        ],
    },
    led_word_stand: {
        label: 'LED Word Stand',
        text: 'JOY',
        font: 'Anton',
        fontFile: 'Fonts/Anton-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false },
        variants: [
            { id: 'black-white', label: 'Pitch Black and Pure White', colors: { base: PLA.black, font: PLA.white, outline: PLA.black, line2: PLA.white } },
            { id: 'red-white', label: 'Imperial Red and Pure White', colors: { base: PLA.red, font: PLA.white, outline: PLA.red, line2: PLA.white } },
            { id: 'blue-beige', label: 'Water Blue and Light Beige', colors: { base: PLA.blue, font: PLA.beige, outline: PLA.blue, line2: PLA.white } },
        ],
    },
    desk_organizer: {
        label: 'Desk Organizer',
        text: 'ALEX',
        font: 'Bagel Fat One',
        fontFile: 'Fonts/BagelFatOne-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false, organizerLayout: '2x3' },
        variants: [
            { id: 'white-pink', label: 'Pure White and Imperial Red', colors: { base: PLA.white, font: PLA.red, outline: PLA.black, line2: PLA.white } },
            { id: 'white-blue', label: 'Light Beige and Water Blue', colors: { base: PLA.beige, font: PLA.blue, outline: PLA.black, line2: PLA.white } },
            { id: 'purple-gold', label: 'Army Green and Lemon Yellow', colors: { base: PLA.army, font: PLA.yellow, outline: PLA.black, line2: PLA.white } },
        ],
    },
    led_word_art: {
        label: 'LED Word Art',
        text: 'Love',
        font: 'Lobster',
        fontFile: 'Fonts/Lobster-Regular.ttf',
        layers: '3L',
        params: { ringPosition: 'none', showFDMTexture: false },
        variants: [
            { id: 'black-white', label: 'Pitch Black and Pure White', colors: { base: PLA.black, font: PLA.white, outline: PLA.black, line2: PLA.white } },
            { id: 'red-beige', label: 'Imperial Red and Light Beige', colors: { base: PLA.red, font: PLA.beige, outline: PLA.red, line2: PLA.white } },
            { id: 'blue-white', label: 'Water Blue and Pure White', colors: { base: PLA.blue, font: PLA.white, outline: PLA.blue, line2: PLA.white } },
        ],
    },
});

const requestedProduct = new URLSearchParams(location.search).get('product') || 'keychain';
const product = PRODUCT_CONFIGS[requestedProduct] || PRODUCT_CONFIGS.keychain;

const statusEl = document.getElementById('renderStatus');
const outputEl = document.getElementById('render-output');
const comparisonEl = document.getElementById('classicReelComparison');

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function settleFrame(viewer) {
    viewer.controls.update();
    viewer.renderer.render(viewer.scene, viewer.camera);
    await nextFrame();
    viewer.renderer.render(viewer.scene, viewer.camera);
    await nextFrame();
}

function canvasForFrame(source) {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(source, 0, 0, WIDTH, HEIGHT);
    return canvas;
}

function visibleBounds(frames) {
    let minX = WIDTH;
    let minY = HEIGHT;
    let maxX = -1;
    let maxY = -1;

    for (const frame of frames) {
        const pixels = frame.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT).data;
        for (let y = 0; y < HEIGHT; y += 1) {
            for (let x = 0; x < WIDTH; x += 1) {
                if (pixels[(y * WIDTH + x) * 4 + 3] <= 6) continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) return { x: 0, y: 0, width: WIDTH, height: HEIGHT };
    const padding = 7;
    const x = Math.max(0, minX - padding);
    const y = Math.max(0, minY - padding);
    const right = Math.min(WIDTH, maxX + padding + 1);
    const bottom = Math.min(HEIGHT, maxY + padding + 1);
    return { x, y, width: right - x, height: bottom - y };
}

function normalizeFrames(frames) {
    const bounds = visibleBounds(frames);
    const maxWidth = WIDTH - 42;
    const maxHeight = HEIGHT - 42;
    const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
    const drawWidth = Math.round(bounds.width * scale);
    const drawHeight = Math.round(bounds.height * scale);
    const dx = Math.round((WIDTH - drawWidth) / 2);
    const dy = Math.round((HEIGHT - drawHeight) / 2);

    return frames.map((frame) => {
        const normalized = document.createElement('canvas');
        normalized.width = WIDTH;
        normalized.height = HEIGHT;
        const ctx = normalized.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(
            frame,
            bounds.x, bounds.y, bounds.width, bounds.height,
            dx, dy, drawWidth, drawHeight
        );
        return normalized;
    });
}

function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function publish(payload) {
    outputEl.textContent = utf8ToBase64(JSON.stringify(payload));
    document.documentElement.dataset.renderComplete = 'true';
}

async function buildVariant(viewer, variant) {
    statusEl.textContent = `Rendering ${variant.label}…`;
    const text = variant.text || product.text;
    const font = variant.font || product.font;
    const fontFile = variant.fontFile || product.fontFile;
    const layers = variant.layers || product.layers;
    const variantParams = variant.params || {};
    const params = {
        ...product.params,
        ...variantParams,
        ring: {
            ...(product.params.ring || {}),
            ...(variantParams.ring || {}),
        },
    };
    const wordartFonts = variant.wordartFonts || product.wordartFonts;
    await viewer.update(
        text,
        fontFile,
        variant.colors,
        layers,
        params,
        requestedProduct,
        wordartFonts
    );
    viewer.setAutoRotate(false);
    const shadowWasVisible = Boolean(viewer.shadowPlane && viewer.shadowPlane.visible);
    if (viewer.shadowPlane) viewer.shadowPlane.visible = false;
    // Catalogue assets use a controlled CSS drop shadow. Disable the viewer's
    // shadow map for these transparent captures so raised layers cannot cast
    // low-resolution self-shadows ("shadow acne") across pale letter faces.
    viewer.renderer.shadowMap.enabled = false;
    viewer.keychainGroup?.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
    });

    const dimensions = viewer.getDimensions();
    const target = viewer.controls.target.clone();
    const basePosition = viewer.camera.position.clone();
    const offset = basePosition.clone().sub(target);
    const up = viewer.camera.up.clone().normalize();
    const sprite = document.createElement('canvas');
    sprite.width = WIDTH * ANGLES.length;
    sprite.height = HEIGHT;
    const spriteCtx = sprite.getContext('2d', { alpha: true });
    const capturedFrames = [];

    for (let index = 0; index < ANGLES.length; index += 1) {
        const angle = ANGLES[index];
        const angledOffset = offset.clone().applyAxisAngle(up, angle * Math.PI / 180);
        viewer.camera.position.copy(target).add(angledOffset);
        viewer.camera.lookAt(target);
        await settleFrame(viewer);

        const frame = canvasForFrame(viewer.renderer.domElement);
        capturedFrames.push(frame);
    }

    const frames = normalizeFrames(capturedFrames);
    frames.forEach((frame, index) => spriteCtx.drawImage(frame, index * WIDTH, 0));
    const posterCanvas = frames[ANGLES.indexOf(0)];

    viewer.camera.position.copy(basePosition);
    viewer.camera.lookAt(target);
    if (viewer.shadowPlane) viewer.shadowPlane.visible = shadowWasVisible;
    await settleFrame(viewer);

    return {
        id: variant.id,
        label: variant.label,
        text,
        font,
        fontFile,
        layers,
        ringPosition: params.ringPosition,
        ringAnchor: params.ring?.anchor || 'top',
        colors: variant.colors,
        dimensions,
        spriteWebp: sprite.toDataURL('image/webp', 0.96),
        posterWebp: posterCanvas.toDataURL('image/webp', 0.98),
        posterPng: posterCanvas.toDataURL('image/png'),
    };
}

async function run() {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
        throw new Error('This render generator is restricted to localhost.');
    }

    const viewer = new KeychainViewer(document.getElementById('classicReelViewer'));
    viewer.renderer.setPixelRatio(2);
    viewer.renderer.setSize(WIDTH / 2, HEIGHT / 2, false);
    viewer.setAutoRotate(false);
    const variants = [];

    for (const variant of product.variants) {
        variants.push(await buildVariant(viewer, variant));
    }

    comparisonEl.src = variants[0].posterWebp;
    const dims = variants[0].dimensions;
    statusEl.textContent =
        `Complete · ${dims.width.toFixed(1)} × ${dims.height.toFixed(1)} × ${dims.depth.toFixed(1)} mm`
        + ` · ${ANGLES.length} source angles × ${variants.length} colours`;
    const firstVariant = variants[0];
    publish({
        version: 2,
        productType: requestedProduct,
        label: product.label,
        text: firstVariant.text,
        font: firstVariant.font,
        fontFile: firstVariant.fontFile,
        layers: product.layers,
        ringPosition: firstVariant.ringPosition,
        ringAnchor: firstVariant.ringAnchor,
        showFDMTexture: false,
        width: WIDTH,
        height: HEIGHT,
        angles: ANGLES,
        variants,
    });
}

try {
    await run();
} catch (error) {
    console.error(error);
    statusEl.textContent = `Render failed: ${error.message || error}`;
    publish({ error: String(error && (error.stack || error.message) || error) });
}
