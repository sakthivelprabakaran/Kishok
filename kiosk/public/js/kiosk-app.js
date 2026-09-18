/* =========================================
   KOOTZY KIOSK — MAIN APP LOGIC
   Three.js Integration + Cost Engine + UPI
   ========================================= */

import { KeychainViewer } from './viewer3d.js?v=wa38';
import * as Cart from './cart.js?v=k1';
import * as Pricing from './pricing.js?v=k1';
import * as BatchOffers from './batch-offers.js?v=k1';
import { KiriMotoBenchmark } from './kiri-moto-benchmark.js?v=k1';
import { bootAuthIfSession } from './auth-boot.js?v=k1';
import {
    FALLBACK_FILAMENT_COLOURS,
    MADE_TO_ORDER_NOTICE,
    loadFilamentColours,
} from './filament-catalog.js?v=k8';
import { loadProductCatalog } from './product-catalog.js?v=pc1';

// ===== DATA & CONFIG =====

const FONTS = [
    { name: 'Amatic SC', label: 'Amatic SC', file: 'Fonts/AmaticSC-Regular.ttf', lang: 'en' },
    { name: 'Anton', label: 'Anton', file: 'Fonts/Anton-Regular.ttf', lang: 'en' },
    { name: 'Archivo Black', label: 'Archivo Black', file: 'Fonts/ArchivoBlack-Regular.ttf', lang: 'en' },
    { name: 'BagelFatOne', label: 'Bagel Fat One', file: 'Fonts/BagelFatOne-Regular.ttf', lang: 'en' },
    { name: 'Baloo Thambi 2', label: 'Baloo Thambi', file: 'Fonts/BalooThambi2.ttf', lang: 'ta' },
    { name: 'Bebas Neue', label: 'Bebas Neue', file: 'Fonts/BebasNeue-Regular.ttf', lang: 'en' },
    { name: 'Brandy', label: 'Brandy', file: 'Fonts/Brandy.ttf', lang: 'en' },
    { name: 'CANAVAR', label: 'Canavar', file: 'Fonts/CANAVAR.ttf', lang: 'en' },
    { name: 'Chewy', label: 'Chewy', file: 'Fonts/Chewy-Regular.ttf', lang: 'en' },
    { name: 'Cinzel', label: 'Cinzel', file: 'Fonts/Cinzel-Regular.ttf', lang: 'en' },
    { name: 'Creepster', label: 'Creepster', file: 'Fonts/Creepster-Regular.ttf', lang: 'en' },
    { name: 'Exo 2', label: 'Exo 2', file: 'Fonts/Exo2-Regular.ttf', lang: 'en' },
    { name: 'Flockey', label: 'Flockey', file: 'Fonts/Flockey.ttf', lang: 'en' },
    { name: 'Franxurter', label: 'Franxurter', file: 'Fonts/Franxurter.ttf', lang: 'en' },
    { name: 'Fredoka One', label: 'Fredoka One', file: 'Fonts/FredokaOne-Regular.ttf', lang: 'en' },
    { name: 'Hind Madurai', label: 'Hind Madurai', file: 'Fonts/HindMadurai.ttf', lang: 'ta' },
    { name: 'Impact', label: 'Impact', file: 'Fonts/impact.ttf', lang: 'en' },
    { name: 'Kavivanar', label: 'Kavivanar', file: 'Fonts/Kavivanar.ttf', lang: 'ta' },
    { name: 'Lobster', label: 'Lobster', file: 'Fonts/Lobster-Regular.ttf', lang: 'en' },
    { name: 'Monoton', label: 'Monoton', file: 'Fonts/Monoton-Regular.ttf', lang: 'en' },
    { name: 'Nasi', label: 'Nasi', file: 'Fonts/Nasi.otf', lang: 'en' },
    { name: 'Nature Beauty', label: 'Nature Beauty', file: 'Fonts/Nature Beauty.ttf', lang: 'en' },
    { name: 'OleoScript', label: 'Oleo Script', file: 'Fonts/OleoScript-Bold.ttf', lang: 'en' },
    { name: 'Orbitron', label: 'Orbitron', file: 'Fonts/Orbitron-Regular.ttf', lang: 'en' },
    { name: 'Oswald', label: 'Oswald', file: 'Fonts/Oswald-Regular.ttf', lang: 'en' },
    { name: 'Pacifico', label: 'Pacifico', file: 'Fonts/Pacifico-Regular.ttf', lang: 'en' },
    { name: 'Playfair Display', label: 'Playfair Display', file: 'Fonts/PlayfairDisplay-Regular.ttf', lang: 'en' },
    { name: 'Poppins', label: 'Poppins', file: 'Fonts/Poppins-Regular.ttf', lang: 'en' },
    { name: 'Press Start 2P', label: 'Press Start 2P', file: 'Fonts/PressStart2P-Regular.ttf', lang: 'en' },
    { name: 'Quicksilver Italic', label: 'Quicksilver', file: 'Fonts/Quicksilver Italic.ttf', lang: 'en' },
    { name: 'Raleway', label: 'Raleway', file: 'Fonts/Raleway-Regular.ttf', lang: 'en' },
    { name: 'Retrow Mentho', label: 'Retrow Mentho', file: 'Fonts/Retrow Mentho.ttf', lang: 'en' },
    { name: 'Rock Boys', label: 'Rock Boys', file: 'Fonts/Rock Boys.ttf', lang: 'en' },
    { name: 'Satisfy', label: 'Satisfy', file: 'Fonts/Satisfy-Regular.ttf', lang: 'en' },
    { name: 'Shadows Into Light', label: 'Shadows Into Light', file: 'Fonts/ShadowsIntoLight.ttf', lang: 'en' },
    { name: 'Storm Catcher', label: 'Storm Catcher', file: 'Fonts/Storm Catcher.otf', lang: 'en' },
    { name: 'Sunday Chillin', label: 'Sunday Chillin', file: 'Fonts/Sunday Chillin.ttf', lang: 'en' },
    { name: 'Super Bubble', label: 'Super Bubble', file: 'Fonts/Super Bubble.ttf', lang: 'en' }
];
;

function toPalette(colours) {
    return colours.map((colour) => ({
        hex: colour.hex,
        label: colour.name,
        state: colour.state,
        notice: colour.notice || '',
    }));
}

const fallbackPalette = toPalette(FALLBACK_FILAMENT_COLOURS);
const COLOR_PALETTES = {
    base: [...fallbackPalette],
    font: [...fallbackPalette],
    outline: [...fallbackPalette],
    line2: [...fallbackPalette],
};

// Pricing comes from the shared module — the same file the server imports at
// checkout, so the number shown here is the number charged. The constants that
// used to live here (MATERIAL_RATE etc.) moved into Pricing.RATES.
const DEFAULT_BATCH_SIZE = Pricing.RATES.DEFAULT_BATCH_SIZE;
const PRICING_LAB_ENABLED = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    || new URLSearchParams(window.location.search).get('kiri') === '1';

const UPI_VPA = 'sakthivelprabakaran311-1@okaxis';

// ===== STATE =====

const WORDART_BACKING_HINTS = {
    none:   "Letters only — the word itself is the whole piece.",
    solid:  "A solid panel behind the letters. Sturdier, and the letters pop against it.",
    hollow: "Stands up on its own like a desk sign — the biggest option. Hollow inside, so it is lighter than it looks.",
};

const state = {
    currentStep: 1,
    totalSteps: 4,
    hasRing: true,
    layers: '3L', // standard 3 layer customizer
    name: 'Sample',
    productType: 'keychain', // default
    lang: 'en',
    fontCategory: 'all',
    colors: {
        base: '#D67842',
        font: '#F1ECE1',
        outline: '#0E0E10',
        line2: '#F9A800'
    },
    selectedFont: 'Brandy',
    selectedFontFile: 'Fonts/Brandy.ttf',
    
    // Word Art specific
    wordartTopFont: 'Brandy',
    wordartTopFontFile: 'Fonts/Brandy.ttf',
    wordartBottomFont: 'CANAVAR',
    wordartBottomFontFile: 'Fonts/CANAVAR.ttf',
    wordartActiveSlot: 'top',
    // Backing panel behind the letters: 'none' | 'solid' | 'hollow'
    wordartBase: 'none',
    
    // Desk Organizer specific
    organizerLayout: '2x3',

    // Name Beads specific
    beadShape: 'square',         // 'square' (0) | 'circle' (1) | 'letter' (2)
    beadDirection: 'horizontal', // 'horizontal' (0) | 'vertical' (1)
    beadSize: 12,
    holeDiameter: 4,
    beadSpacing: 2,
    beadLetterHeight: 1.2,
    
    quantity: 1,
    ringPosition: 'left',     // which side the ring attaches (kept 'left')
    ringAnchor: 'top',        // vertical placement: 'top' corner | 'center'
    showFDMTexture: false,
    
    // Dynamic values from viewer
    dims: null,
    activeBatches: [],
    matchedBatchSize: null,
    costs: null,
    kiriComparison: null,
    catalogProduct: null,
    crew: {
        enabled: false,
        count: 3,
        activeIndex: 0,
        members: [],
        refreshing: false,
    },
};

// ===== DOM ELEMENTS =====

const el = {};

function cacheElements() {
    el.viewerCanvas    = document.getElementById('viewer3dCanvas');
    el.viewerLoading   = document.getElementById('viewerLoading');
    el.viewerLoadingText = el.viewerLoading && el.viewerLoading.querySelector('[data-loading-text]');
    el.dragHint        = document.getElementById('dragHint');
    el.customerSizeChip = document.getElementById('customerSizeChip');
    el.customerSizeValue = document.getElementById('customerSizeValue');
    el.customerDimensionsBtn = document.getElementById('customerDimensionsBtn');
    
    el.productTitle    = document.getElementById('productTitle');
    el.productSubtitle = document.getElementById('productSubtitle');
    el.productAvailabilityNotice = document.getElementById('productAvailabilityNotice');
    el.productAvailabilityTitle = document.getElementById('productAvailabilityTitle');
    el.productAvailabilityMessage = document.getElementById('productAvailabilityMessage');

    el.crewModeCard = document.getElementById('crewModeCard');
    el.soloModeBtn = document.getElementById('soloModeBtn');
    el.crewModeBtn = document.getElementById('crewModeBtn');
    el.crewBuilder = document.getElementById('crewBuilder');
    el.crewCountMinus = document.getElementById('crewCountMinus');
    el.crewCountPlus = document.getElementById('crewCountPlus');
    el.crewCountValue = document.getElementById('crewCountValue');
    el.crewMemberStrip = document.getElementById('crewMemberStrip');
    el.crewRefreshPreviews = document.getElementById('crewRefreshPreviews');
    el.crewStatus = document.getElementById('crewStatus');
    el.crewQuickSwitcher = document.getElementById('crewQuickSwitcher');
    el.crewQuickTitle = document.getElementById('crewQuickTitle');
    el.crewQuickProgress = document.getElementById('crewQuickProgress');
    el.crewQuickMembers = document.getElementById('crewQuickMembers');
    el.crewEditNamesBtn = document.getElementById('crewEditNamesBtn');
    
    el.stepDots        = document.querySelectorAll('.step-dot');
    el.stepLines       = document.querySelectorAll('.stepper-line');
    el.stepperText     = document.getElementById('stepperTextIndicator');
    el.stepperNav      = document.querySelector('.stepper-nav');
    el.btnNextStep     = document.getElementById('btnNextStep');
    el.btnPrevStep     = document.getElementById('btnPrevStep');
    
    el.nameInput       = document.getElementById('nameInput');
    el.charCount       = document.getElementById('charCount');
    el.singleInputContainer = document.getElementById('singleInputContainer');
    el.dualInputsContainer  = document.getElementById('dualInputsContainer');
    el.wordartLine1    = document.getElementById('wordartLine1');
    el.wordartLine2    = document.getElementById('wordartLine2');
    el.charCount1      = document.getElementById('charCount1');
    el.charCount2      = document.getElementById('charCount2');
    el.wordartHint     = document.getElementById('wordartHint');
    el.wordartBackingRow    = document.getElementById('wordartBackingRow');
    el.wordartBackingToggle = document.getElementById('wordartBackingToggle');
    el.wordartBackingHint   = document.getElementById('wordartBackingHint');

    el.organizerLayoutRow    = document.getElementById('organizerLayoutRow');
    el.organizerLayoutToggle = document.getElementById('organizerLayoutToggle');

    el.beadShapeRow         = document.getElementById('beadShapeRow');
    el.beadShapeToggle      = document.getElementById('beadShapeToggle');
    el.beadDirectionRow     = document.getElementById('beadDirectionRow');
    el.beadDirectionToggle  = document.getElementById('beadDirectionToggle');
    
    el.langToggle      = document.getElementById('langToggleBtn');
    el.fontSlotTabs    = document.getElementById('wordartSlotTabs');
    el.fontStrip       = document.getElementById('fontSelectorStrip');
    el.fontCategoryTabs = document.getElementById('fontCategoryTabs');
    el.fontScrollHint  = document.getElementById('fontScrollHint');
    
    el.baseColorRow    = document.getElementById('baseColorRow');
    el.fontColorRow    = document.getElementById('fontColorRow');
    el.outlineColorRow = document.getElementById('outlineColorRow');
    el.line2ColorRow   = document.getElementById('line2ColorRow');

    el.baseColorLabel  = document.getElementById('baseColorLabel');
    el.fontColorLabel  = document.getElementById('fontColorLabel');
    el.outlineColorLabel = document.getElementById('outlineColorLabel');
    el.line2ColorLabel = document.getElementById('line2ColorLabel');

    el.baseColorVal    = document.getElementById('baseColorVal');
    el.fontColorVal    = document.getElementById('fontColorVal');
    el.outlineColorVal = document.getElementById('outlineColorVal');
    el.line2ColorVal   = document.getElementById('line2ColorVal');
    
    el.baseSwatches    = document.getElementById('baseSwatches');
    el.fontSwatches    = document.getElementById('fontSwatches');
    el.outlineSwatches = document.getElementById('outlineSwatches');
    el.line2Swatches   = document.getElementById('line2Swatches');

    const colorWrap = document.querySelector('.color-options-wrap');
    if (colorWrap && !document.getElementById('filamentAvailabilityNotice')) {
        const notice = document.createElement('div');
        notice.id = 'filamentAvailabilityNotice';
        notice.className = 'filament-availability-notice';
        notice.hidden = true;
        colorWrap.appendChild(notice);
    }
    if (colorWrap && !document.getElementById('filamentColourDisclaimer')) {
        const disclaimer = document.createElement('p');
        disclaimer.id = 'filamentColourDisclaimer';
        disclaimer.className = 'filament-colour-disclaimer';
        disclaimer.textContent = 'Screen preview only — actual filament colour may vary with lighting and display.';
        colorWrap.appendChild(disclaimer);
    }
    el.filamentAvailabilityNotice = document.getElementById('filamentAvailabilityNotice');
    
    el.ringPositionSection = document.getElementById('ringPositionSection');
    el.ringPosToggle   = document.getElementById('ringPosToggle');
    el.thicknessToggle = document.getElementById('thicknessToggle');
    
    el.calcWeight      = document.getElementById('calcWeight');
    el.calcTime        = document.getElementById('calcTime');
    el.priceMat        = document.getElementById('priceMat');
    el.priceMachine    = document.getElementById('priceMachine');
    el.priceLabor      = document.getElementById('priceLabor');
    el.priceTotal      = document.getElementById('priceTotal');
    el.infoPrintTime   = document.getElementById('infoPrintTime');
    el.kiriBenchmarkCard = document.getElementById('kiriBenchmarkCard');
    el.kiriCurrentPrice = document.getElementById('kiriCurrentPrice');
    el.kiriCurrentMetrics = document.getElementById('kiriCurrentMetrics');
    el.kiriSlicedPrice = document.getElementById('kiriSlicedPrice');
    el.kiriSlicedMetrics = document.getElementById('kiriSlicedMetrics');
    el.kiriDifference = document.getElementById('kiriDifference');
    el.kiriProgress = document.getElementById('kiriProgress');
    el.kiriProgressBar = document.getElementById('kiriProgressBar');
    el.kiriBenchmarkStatus = document.getElementById('kiriBenchmarkStatus');
    el.kiriBenchmarkBtn = document.getElementById('kiriBenchmarkBtn');
    
    el.batchPromoAlert = document.getElementById('batchPromoAlert');
    el.batchPromoAlertMsg = document.getElementById('batchPromoAlertMsg');
    
    el.qtyMinus        = document.getElementById('qtyMinus');
    el.qtyPlus         = document.getElementById('qtyPlus');
    el.qtyVal          = document.getElementById('qtyVal');
    
    el.custName        = document.getElementById('custName');
    el.custPhone       = document.getElementById('custPhone');
    el.btnPlaceOrder   = document.getElementById('btnPlaceOrder');
    el.btnAddToCart    = document.getElementById('btnAddToCart');
    
    // Modal elements
    el.paymentModal    = document.getElementById('paymentModal');
    el.closePaymentModal = document.getElementById('closePaymentModal');
    el.modalPayAmt     = document.getElementById('modalPayAmt');
    el.linkGPay        = document.getElementById('linkGPay');
    el.linkPhonePe     = document.getElementById('linkPhonePe');
    el.linkGenericUPI  = document.getElementById('linkGenericUPI');
    el.upiQRCode       = document.getElementById('upiQRCode');
    el.upiTxnIdInput   = document.getElementById('upiTxnIdInput');
    el.btnSubmitVerify = document.getElementById('btnSubmitVerify');
}

// ===== 3D VIEWER WORK =====

let viewer = null;
let kiriBenchmark = null;
let kiriBenchmarkEnabled = false;
let kiriBenchmarkTimer = null;
let kiriBenchmarkRunning = false;

function productCanOrder() {
    return !state.catalogProduct || state.catalogProduct.orderable;
}

function syncProductAvailability() {
    const product = state.catalogProduct;
    const blocked = product && !product.orderable;
    const notice = el.productAvailabilityNotice;
    if (notice) {
        notice.hidden = !blocked;
        notice.classList.toggle('is-unavailable', Boolean(blocked && !product.visible));
    }
    if (blocked) {
        const paused = product.lifecycleState === 'paused';
        if (el.productAvailabilityTitle) {
            el.productAvailabilityTitle.textContent = paused
                ? 'Orders temporarily paused'
                : 'This product is currently unavailable';
        }
        if (el.productAvailabilityMessage) {
            el.productAvailabilityMessage.textContent = product.pauseMessage
                || (paused
                    ? `${product.displayName} can still be previewed, but new orders are paused.`
                    : `${product.displayName} is not accepting new orders.`);
        }
    }
    for (const button of [el.btnAddToCart, el.btnPlaceOrder, el.btnSubmitVerify]) {
        if (button) button.disabled = Boolean(blocked);
    }
}

async function loadCurrentProductAvailability() {
    const products = await loadProductCatalog();
    state.catalogProduct = products.find((product) => product.productType === state.productType) || {
        productType: state.productType,
        displayName: 'This product',
        lifecycleState: 'retired',
        visible: false,
        orderable: false,
        pauseMessage: '',
    };
    syncProductAvailability();
}
let kiriBenchmarkPending = false;
let kiriModelRevision = 0;
let kiriBenchmarkStatusMessage = '';
let kiriBenchmarkProgressValue = 0;

function init3DViewer() {
    if (!viewer) {
        viewer = new KeychainViewer(el.viewerCanvas);
        if (new URLSearchParams(window.location.search).get('functionalTest') === '1') {
            window.__kootzyViewer = viewer;
            window.__kootzyCustomizer = {
            snapshot() {
                const visibleColorRoles = ['base', 'font', 'outline', 'line2'].filter((role) => {
                    const row = el[`${role}ColorRow`];
                    return row && getComputedStyle(row).display !== 'none';
                });
                return {
                    productType: state.productType,
                    currentStep: state.currentStep,
                    stepperRenderRevision: renderStepper.revision || 0,
                    colors: { ...state.colors },
                    renderedColors: {
                        base: viewer?._lastBaseColor || null,
                        font: viewer?._lastFontColor || null,
                        outline: viewer?._lastOutlineColor || null,
                        line2: viewer?._lastParams?.lineColors?.[1] || null,
                    },
                    visibleColorRoles,
                    wordartBase: state.wordartBase,
                    layers: state.layers,
                    loadingVisible: Boolean(el.viewerLoading && getComputedStyle(el.viewerLoading).display !== 'none'),
                    loadingText: el.viewerLoadingText?.textContent || '',
                    idle: !_update3DRunning && !_update3DTimer && !_update3DDirty,
                    updateState: {
                        running: _update3DRunning,
                        timerPending: Boolean(_update3DTimer),
                        dirty: _update3DDirty,
                    },
                    dimensions: state.dims ? { ...state.dims } : null,
                    crew: {
                        enabled: state.crew.enabled,
                        count: state.crew.count,
                        activeIndex: state.crew.activeIndex,
                        configured: visibleCrewMembers().map((member) => Boolean(member.configured)),
                    },
                    modelUuid: viewer?.keychainGroup?.uuid || null,
                    geometryUuids: viewer?.keychainGroup
                        ? viewer.keychainGroup.children
                            .filter((child) => child.geometry)
                            .map((child) => child.geometry.uuid)
                        : [],
                };
            },
            waitForIdle(timeoutMs = 30000) {
                const started = performance.now();
                return new Promise((resolve, reject) => {
                    const poll = () => {
                        if (!_update3DRunning && !_update3DTimer && !_update3DDirty) {
                            resolve(this.snapshot());
                        } else if (performance.now() - started > timeoutMs) {
                            reject(new Error('Customizer did not become idle before timeout.'));
                        } else {
                            setTimeout(poll, 25);
                        }
                    };
                    poll();
                });
            },
            };
        }
        viewer.container.addEventListener('viewermetricschange', (event) => {
            state.dims = event.detail.dimensions;
            renderCustomerDimensions(event.detail);
        });
        viewer.container.addEventListener('viewercolorschange', () => {
            if (!state.crew.enabled || state.crew.refreshing) return;
            requestAnimationFrame(() => {
                if (viewer && viewer.renderer) viewer.renderer.render(viewer.scene, viewer.camera);
                saveActiveCrewDraft({ capture: true });
                renderCrewMembers();
            });
        });
        const showDimensions = window.matchMedia('(min-width: 880px)').matches;
        viewer.setDimensionOverlayVisible(showDimensions);
    }
}

function renderCustomerDimensions(detail) {
    const dims = detail && detail.dimensions;
    if (!dims) return;
    const valid = dims.width > 0 && dims.height > 0 && dims.depth > 0;
    if (el.customerSizeChip) el.customerSizeChip.hidden = !valid;
    if (el.customerSizeValue && valid) {
        el.customerSizeValue.textContent =
            `L ${dims.width.toFixed(1)} × H ${dims.height.toFixed(1)} × T ${dims.depth.toFixed(1)} mm`;
        el.customerSizeChip.setAttribute(
            'aria-label',
            `Approximate finished size: length ${dims.width.toFixed(1)} millimetres, `
                + `height ${dims.height.toFixed(1)} millimetres, `
                + `thickness ${dims.depth.toFixed(1)} millimetres`
        );
    }
    if (el.customerDimensionsBtn) {
        const visible = Boolean(detail.dimensionsVisible);
        el.customerDimensionsBtn.classList.toggle('active', visible);
        el.customerDimensionsBtn.setAttribute('aria-pressed', String(visible));
        el.customerDimensionsBtn.title = visible ? 'Hide dimensions' : 'Show dimensions';
    }
}

const CREW_MIN = 2;
const CREW_MAX = 6;

function newCrewId() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
        return `crew-${crypto.randomUUID()}`;
    }
    return `crew-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentCrewDraft(existing = {}) {
    return {
        name: state.name,
        font: state.selectedFont,
        fontFile: state.selectedFontFile,
        layers: state.layers,
        colors: { ...state.colors },
        ringPosition: state.ringPosition,
        ringAnchor: state.ringAnchor,
        showFDMTexture: state.showFDMTexture,
        preview: existing.preview || '',
        dims: existing.dims || null,
        unitPrice: Number(existing.unitPrice) || 0,
        weightG: Number(existing.weightG) || 0,
        dirty: existing.dirty !== false,
        configured: Boolean(existing.configured),
    };
}

function makeCrewMember(index, source) {
    const member = currentCrewDraft(source || {});
    if (index > 0 && !source) {
        member.name = '';
        member.preview = '';
        member.dims = null;
        member.unitPrice = 0;
        member.weightG = 0;
        member.dirty = true;
    }
    return member;
}

function ensureCrewMembers() {
    while (state.crew.members.length < CREW_MAX) {
        state.crew.members.push(makeCrewMember(state.crew.members.length));
    }
}

function visibleCrewMembers() {
    return state.crew.members.slice(0, state.crew.count);
}

function setCrewStatus(message = '', isError = false) {
    if (!el.crewStatus) return;
    el.crewStatus.textContent = message;
    el.crewStatus.classList.toggle('is-error', isError);
}

function saveActiveCrewDraft({ capture = false, markDirty = false } = {}) {
    if (!state.crew.enabled || state.productType !== 'keychain') return;
    ensureCrewMembers();
    const index = Math.min(state.crew.activeIndex, state.crew.count - 1);
    const previous = state.crew.members[index] || {};
    const next = currentCrewDraft(previous);
    if (markDirty) next.dirty = true;
    if (capture && viewer && state.dims) {
        next.preview = captureViewerPreview();
        next.dims = { ...state.dims };
        next.unitPrice = Number(state.costs && state.costs.finalAmount) || 0;
        next.weightG = Number(state.dims.weightGrams) || 0;
        next.dirty = false;
    }
    state.crew.members[index] = next;
}

function crewEstimatedTotal() {
    const members = visibleCrewMembers();
    if (!members.length || members.some((member) => member.dirty || !member.unitPrice)) return 0;
    return members.reduce((total, member) => total + member.unitPrice, 0);
}

function renderCrewMembers() {
    if (!el.crewMemberStrip) return;
    el.crewMemberStrip.textContent = '';
    visibleCrewMembers().forEach((member, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `crew-member-card${index === state.crew.activeIndex ? ' active' : ''}`
            + `${member.name.trim() ? '' : ' is-missing'}`
            + `${member.configured ? ' is-complete' : ''}`;
        card.dataset.crewMember = String(index);
        card.setAttribute('role', 'tab');
        card.setAttribute('aria-selected', String(index === state.crew.activeIndex));
        card.setAttribute('aria-label', member.name.trim()
            ? `Edit crew member ${index + 1}, ${member.name.trim()}`
            : `Add name for crew member ${index + 1}`);

        const preview = document.createElement('span');
        preview.className = 'crew-member-preview';
        if (member.preview) {
            const image = document.createElement('img');
            image.src = member.preview;
            image.alt = '';
            image.decoding = 'async';
            preview.appendChild(image);
        } else {
            const placeholder = document.createElement('span');
            placeholder.textContent = member.name.trim() || `Member ${index + 1}`;
            preview.appendChild(placeholder);
        }

        const meta = document.createElement('span');
        meta.className = 'crew-member-meta';
        const name = document.createElement('strong');
        name.textContent = member.name.trim() || `Member ${index + 1}`;
        const detail = document.createElement('small');
        detail.textContent = member.unitPrice && !member.dirty
            ? `${member.font} · ₹${member.unitPrice}`
            : `${member.font} · Preview needed`;
        meta.append(name, detail);
        card.append(preview, meta);
        card.addEventListener('click', () => selectCrewMember(index));
        el.crewMemberStrip.appendChild(card);
    });

    if (el.crewCountValue) el.crewCountValue.textContent = String(state.crew.count);
    if (el.crewCountMinus) el.crewCountMinus.disabled = state.crew.count <= CREW_MIN || state.crew.refreshing;
    if (el.crewCountPlus) el.crewCountPlus.disabled = state.crew.count >= CREW_MAX || state.crew.refreshing;
    if (el.crewRefreshPreviews) el.crewRefreshPreviews.disabled = state.crew.refreshing;

    const total = crewEstimatedTotal();
    if (total > 0 && !state.crew.refreshing) {
        setCrewStatus(`All ${state.crew.count} previews are current · Estimated set total ₹${total}`);
    }
    renderCrewQuickSwitcher();
}

function configuredCrewCount() {
    return visibleCrewMembers().filter((member) => member.configured).length;
}

function nextUnconfiguredCrewIndex(fromIndex = state.crew.activeIndex) {
    for (let offset = 1; offset < state.crew.count; offset += 1) {
        const index = (fromIndex + offset) % state.crew.count;
        if (!state.crew.members[index]?.configured) return index;
    }
    return -1;
}

function markActiveCrewConfigured() {
    if (!state.crew.enabled) return;
    saveActiveCrewDraft({ capture: true });
    const member = state.crew.members[state.crew.activeIndex];
    if (member) member.configured = true;
    renderCrewMembers();
}

function renderCrewQuickSwitcher() {
    if (!el.crewQuickSwitcher || !el.crewQuickMembers) return;
    const visible = state.crew.enabled && !isDesktop() && state.currentStep > 1;
    el.crewQuickSwitcher.hidden = !visible;
    if (!visible) return;

    const members = visibleCrewMembers();
    const active = members[state.crew.activeIndex];
    const previousActive = el.crewQuickMembers.dataset.activeIndex;
    if (el.crewQuickTitle) {
        el.crewQuickTitle.textContent =
            `Customizing ${active?.name?.trim() || `Member ${state.crew.activeIndex + 1}`}`;
    }
    if (el.crewQuickProgress) {
        el.crewQuickProgress.textContent =
            `${configuredCrewCount()} of ${state.crew.count} finished · Tap a name to switch`;
    }

    el.crewQuickMembers.textContent = '';
    members.forEach((member, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `crew-quick-member${index === state.crew.activeIndex ? ' active' : ''}`
            + `${member.configured ? ' is-complete' : ''}`;
        button.dataset.crewQuickMember = String(index);
        button.dataset.memberNumber = String(index + 1);
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(index === state.crew.activeIndex));
        button.textContent = member.name.trim() || `Member ${index + 1}`;
        button.addEventListener('click', () => selectCrewMember(index));
        el.crewQuickMembers.appendChild(button);
    });
    el.crewQuickMembers.dataset.activeIndex = String(state.crew.activeIndex);

    if (previousActive !== String(state.crew.activeIndex)) {
        requestAnimationFrame(() => {
            const activeButton = el.crewQuickMembers.querySelector('.crew-quick-member.active');
            if (!activeButton) return;
            const target = activeButton.offsetLeft
                - (el.crewQuickMembers.clientWidth - activeButton.offsetWidth) / 2;
            el.crewQuickMembers.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        });
    }
}

function syncCrewUi() {
    const available = state.productType === 'keychain';
    if (el.crewModeCard) el.crewModeCard.hidden = !available;
    if (!available && state.crew.enabled) state.crew.enabled = false;
    document.body.classList.toggle('crew-mode-active', available && state.crew.enabled);
    if (el.crewBuilder) el.crewBuilder.hidden = !state.crew.enabled;
    if (el.soloModeBtn) {
        el.soloModeBtn.classList.toggle('active', !state.crew.enabled);
        el.soloModeBtn.setAttribute('aria-pressed', String(!state.crew.enabled));
    }
    if (el.crewModeBtn) {
        el.crewModeBtn.classList.toggle('active', state.crew.enabled);
        el.crewModeBtn.setAttribute('aria-pressed', String(state.crew.enabled));
    }
    if (el.btnAddToCart) {
        const label = el.btnAddToCart.querySelector('.btn-text');
        if (label && !el.btnAddToCart.disabled) {
            label.textContent = state.crew.enabled
                ? `Add ${state.crew.count}-member crew to cart`
                : 'Add to cart';
        }
    }
    if (state.crew.enabled) renderCrewMembers();
    else if (el.crewQuickSwitcher) el.crewQuickSwitcher.hidden = true;
}

function setCrewMode(enabled) {
    if (state.productType !== 'keychain' || state.crew.refreshing) return;
    if (enabled === state.crew.enabled) return;
    if (enabled) {
        state.crew.enabled = true;
        state.crew.activeIndex = 0;
        state.crew.members = [makeCrewMember(0)];
        ensureCrewMembers();
        state.quantity = 1;
        if (el.qtyVal) el.qtyVal.textContent = '1';
        saveActiveCrewDraft({ capture: true });
        setCrewStatus('Customize each member, then refresh all previews before adding the set.');
    } else {
        saveActiveCrewDraft({ capture: true });
        state.crew.enabled = false;
        setCrewStatus('');
    }
    syncCrewUi();
    calculatePricing();
    renderStepper();
}

function setCrewCount(nextCount) {
    if (!state.crew.enabled || state.crew.refreshing) return;
    saveActiveCrewDraft({ capture: true });
    state.crew.count = Math.max(CREW_MIN, Math.min(CREW_MAX, Number(nextCount) || CREW_MIN));
    ensureCrewMembers();
    if (state.crew.activeIndex >= state.crew.count) {
        selectCrewMember(state.crew.count - 1);
        return;
    }
    renderCrewMembers();
    syncCrewUi();
}

function applyCrewMemberToEditor(member) {
    state.name = member.name;
    state.selectedFont = member.font;
    state.selectedFontFile = member.fontFile;
    state.layers = member.layers;
    state.colors = { ...member.colors };
    state.ringPosition = member.ringPosition || 'left';
    state.ringAnchor = member.ringAnchor || 'top';
    state.showFDMTexture = Boolean(member.showFDMTexture);
    state.quantity = 1;

    el.nameInput.value = state.name;
    el.charCount.textContent = String(state.name.length);
    if (el.qtyVal) el.qtyVal.textContent = '1';
    if (el.thicknessToggle) {
        el.thicknessToggle.querySelectorAll('.pos-opt').forEach((button) => {
            button.classList.toggle('active', button.dataset.val === state.layers);
        });
    }
    if (el.ringPosToggle) {
        el.ringPosToggle.querySelectorAll('.pos-opt').forEach((button) => {
            button.classList.toggle('active', button.dataset.val === state.ringAnchor);
        });
    }
    applyProductTypeConstraints();
    renderFontList();
    renderColorSwatches();
}

function selectCrewMember(index) {
    if (!state.crew.enabled || state.crew.refreshing) return;
    const nextIndex = Math.max(0, Math.min(state.crew.count - 1, Number(index) || 0));
    if (nextIndex === state.crew.activeIndex) return;
    saveActiveCrewDraft({ capture: true });
    state.crew.activeIndex = nextIndex;
    applyCrewMemberToEditor(state.crew.members[nextIndex]);
    setCrewStatus(`Editing member ${nextIndex + 1} of ${state.crew.count}.`);
    renderCrewMembers();
    update3DModelNow();
}

function firstMissingCrewName() {
    return visibleCrewMembers().findIndex((member) => !String(member.name || '').trim());
}

function validateCrewNames() {
    if (!state.crew.enabled) return true;
    saveActiveCrewDraft();
    const missing = firstMissingCrewName();
    if (missing < 0) return true;
    selectCrewMember(missing);
    setCrewStatus(`Add a name for member ${missing + 1} before continuing.`, true);
    el.nameInput.focus();
    return false;
}

function classicCrewViewerParams(member) {
    return {
        ringPosition: member.ringPosition || 'left',
        ring: { anchor: member.ringAnchor || 'top' },
        wave_mode: 'wave',
        wave_amplitude: 5.0,
        wave_cycles: 1.0,
        text_size: 22,
        letter_gap: -2.5,
        base_thickness: 2.5,
        height_even: 4.0,
        height_odd: 2.0,
        ring_outer_d: 10,
        ring_inner_d: 5,
        ring_height: 4.5,
        showFDMTexture: Boolean(member.showFDMTexture),
    };
}

async function renderCrewMemberExact(member) {
    await viewer.update(
        member.name,
        member.fontFile,
        member.colors,
        member.layers,
        classicCrewViewerParams(member),
        'keychain',
        null
    );
    if (viewer.renderer) viewer.renderer.render(viewer.scene, viewer.camera);
    const dims = viewer.getDimensions();
    const offer = BatchOffers.findBatchDiscount({
        productType: 'keychain',
        design: {
            layers: member.layers,
            colors: {
                base: member.colors.base,
                font: member.colors.font,
                ...(member.layers === '3L' ? { outline: member.colors.outline } : {}),
            },
        },
        weightG: dims.weightGrams,
    }, state.activeBatches, Pricing.priceLine, DEFAULT_BATCH_SIZE);
    const priced = Pricing.priceLine({
        weightG: dims.weightGrams,
        quantity: 1,
        batchSize: offer ? offer.batchSize : DEFAULT_BATCH_SIZE,
    });
    return {
        ...member,
        preview: captureViewerPreview(),
        dims: { ...dims },
        unitPrice: priced.unitPrice,
        weightG: dims.weightGrams,
        dirty: false,
    };
}

async function refreshAllCrewPreviews() {
    if (!state.crew.enabled || state.crew.refreshing || !viewer) return false;
    if (!validateCrewNames()) return false;

    saveActiveCrewDraft();
    clearTimeout(_update3DTimer);
    _update3DTimer = null;
    while (_update3DRunning) {
        await new Promise((resolve) => setTimeout(resolve, 25));
    }

    state.crew.refreshing = true;
    _update3DDirty = false;
    document.body.classList.add('crew-refreshing');
    showViewerLoading(`Preparing crew previews…`);
    renderCrewMembers();

    const restoreIndex = state.crew.activeIndex;
    try {
        for (let index = 0; index < state.crew.count; index += 1) {
            setCrewStatus(`Generating exact preview ${index + 1} of ${state.crew.count}…`);
            showViewerLoading(`Preparing ${index + 1} of ${state.crew.count} crew keychains…`);
            state.crew.members[index] = await renderCrewMemberExact(state.crew.members[index]);
            renderCrewMembers();
        }
        setCrewStatus(`All ${state.crew.count} exact previews are ready.`);
        return true;
    } catch (error) {
        console.error('Crew preview refresh failed:', error);
        setCrewStatus(error.message || 'Could not prepare every crew preview.', true);
        return false;
    } finally {
        state.crew.activeIndex = restoreIndex;
        applyCrewMemberToEditor(state.crew.members[restoreIndex]);
        try {
            const restored = await renderCrewMemberExact(state.crew.members[restoreIndex]);
            state.crew.members[restoreIndex] = restored;
            state.dims = { ...restored.dims };
            calculatePricing();
        } catch (error) {
            console.error('Crew editor restore failed:', error);
            _update3DDirty = true;
        }
        state.crew.refreshing = false;
        document.body.classList.remove('crew-refreshing');
        hideViewerLoading();
        renderCrewMembers();
        syncCrewUi();
        renderCustomerDimensions({
            dimensions: state.dims,
            dimensionsVisible: viewer.dimensionOverlayVisible,
        });
    }
}

function buildCrewCartLine(member, crewId, memberIndex) {
    const design = {
        font: member.font,
        fontFile: member.fontFile,
        layers: member.layers,
        colors: {
            base: member.colors.base,
            font: member.colors.font,
            ...(member.layers === '3L' ? { outline: member.colors.outline } : {}),
        },
        ringPosition: member.ringPosition || 'left',
        ringAnchor: member.ringAnchor || 'top',
        showFDMTexture: Boolean(member.showFDMTexture),
        crew: {
            id: crewId,
            label: 'Kootzy Crew',
            memberIndex: memberIndex + 1,
            memberCount: state.crew.count,
        },
    };
    if (member.dims) {
        design.finishedSize = {
            approximate: true,
            lengthMm: Number(member.dims.width.toFixed(1)),
            heightMm: Number(member.dims.height.toFixed(1)),
            thicknessMm: Number(member.dims.depth.toFixed(1)),
        };
    }
    return {
        productType: 'keychain',
        text: member.name,
        quantity: 1,
        design,
        preview: member.preview,
        unitPrice: member.unitPrice,
        weightG: member.weightG,
    };
}

async function addCrewToCart() {
    const ready = await refreshAllCrewPreviews();
    if (!ready) return false;
    const crewId = newCrewId();
    const members = visibleCrewMembers();
    for (let index = 0; index < members.length; index += 1) {
        setCrewStatus(`Adding member ${index + 1} of ${members.length} to your cart…`);
        await Cart.add(buildCrewCartLine(members[index], crewId, index));
    }
    setCrewStatus(`${members.length}-member Kootzy Crew added to your cart.`);
    return true;
}

// Debounced entry point. Rapid calls (typing, slider drags) collapse into a single
// rebuild ~180ms after the last change. While a build is running, further calls set
// a "dirty" flag so exactly one more rebuild runs after it finishes — no pile-up.
var _update3DTimer   = null;
var _update3DRunning = false;
var _update3DDirty   = false;

function showViewerLoading(message) {
    if (!el.viewerLoading) return;
    if (el.viewerLoadingText && message) el.viewerLoadingText.textContent = message;
    el.viewerLoading.style.display = 'flex';
    el.viewerCanvas?.setAttribute('aria-busy', 'true');
}

function hideViewerLoading() {
    if (!el.viewerLoading) return;
    el.viewerLoading.style.display = 'none';
    el.viewerCanvas?.removeAttribute('aria-busy');
}

function update3DModel(options = {}) {
    if (state.crew.enabled) saveActiveCrewDraft({ markDirty: true });
    if (state.crew.refreshing) {
        _update3DDirty = true;
        return;
    }
    if (options.showLoading) {
        showViewerLoading(options.loadingMessage || 'Updating 3D preview…');
    }
    if (_update3DRunning) { _update3DDirty = true; return; }
    clearTimeout(_update3DTimer);
    _update3DTimer = setTimeout(() => {
        _update3DTimer = null;
        _runUpdate3D();
    }, 180);
}

function updateColorsWithoutRebuild() {
    if (state.crew.enabled) saveActiveCrewDraft({ markDirty: true });
    if (!viewer || _update3DRunning || _update3DTimer || _update3DDirty) return false;
    return viewer.updateColors({
        base: state.colors.base,
        font: state.colors.font,
        outline: state.colors.outline,
        line2: state.colors.line2,
    });
}

// Force an immediate rebuild with no debounce (used on init / product switch).
function update3DModelNow() {
    clearTimeout(_update3DTimer);
    _update3DTimer = null;
    if (_update3DRunning) { _update3DDirty = true; return; }
    _runUpdate3D();
}

async function _runUpdate3D() {
    if (!viewer) return;
    if (_update3DRunning) { _update3DDirty = true; return; }
    _update3DRunning = true;
    _update3DDirty = false;

    showViewerLoading(
        state.productType === 'wordart' && state.wordartBase === 'hollow'
            ? 'Building hollow Word Art…'
            : 'Generating 3D Studio Preview…'
    );

    const isWordart = state.productType === 'wordart';
    const isLoveSeries = state.productType === 'loveseries';
    const isWordartLike = isWordart || isLoveSeries;
    
    // Determine target font file and payload
    let fontPath = state.selectedFontFile;
    let wordartFonts = null;
    let nameText = state.name;
    
    if (isWordart) {
        nameText = `${el.wordartLine1.value}\n${el.wordartLine2.value}`;
        fontPath = state.wordartTopFontFile;
        wordartFonts = {
            top: state.wordartTopFontFile,
            bottom: state.wordartBottomFontFile
        };
    } else if (isLoveSeries) {
        nameText = `${state.name}\nLOVE`;
        fontPath = state.selectedFontFile;
        wordartFonts = {
            top: state.selectedFontFile,
            bottom: 'Fonts/CANAVAR.ttf' // standard LOVE series bottom font
        };
    }
    
    const colorsPayload = {
        base: state.colors.base,
        font: state.colors.font,
        outline: state.colors.outline,
        line2: state.colors.line2
    };
    
    const paramsPayload = {
        ringPosition: state.ringPosition,
        ring: { anchor: state.ringAnchor || 'top' },
        // Word-art backing. No depth slider on the storefront, so the mode picks one:
        // solid = 4mm flat plaque, hollow = 20mm standing block.
        base: (isWordartLike && state.wordartBase !== 'none')
            ? { wordartMode: state.wordartBase, depth: state.wordartBase === 'hollow' ? 20 : 4 }
            : undefined,
        wave_mode: "wave",
        wave_amplitude: 5.0,
        wave_cycles: 1.0,
        text_size: 22,
        letter_gap: -2.5,
        base_thickness: 2.5,
        height_even: 4.0,
        height_odd: 2.0,
        ring_outer_d: 10,
        ring_inner_d: 5,
        ring_height: 4.5,
        showFDMTexture: state.showFDMTexture,
        organizerLayout: state.organizerLayout,
        bead_shape: state.beadShape === 'circle' ? 1 : (state.beadShape === 'letter' ? 2 : 0),
        beadShape: state.beadShape,
        layout_direction: state.beadDirection === 'vertical' ? 1 : 0,
        beadDirection: state.beadDirection,
        bead_size: state.beadSize,
        hole_diameter: state.holeDiameter,
        spacing: state.beadSpacing,
        letter_height: state.beadLetterHeight
    };

    // LED Word Art: overlap adjacent glyphs (like the Wavy Nametag's negative
    // letter_gap) so the Clipper union fuses them into ONE connected solid for any
    // font — no cursive requirement. The builder runs at font_size 100; the Nametag
    // overlaps at ~-11% of size (-2.5 / 22), so -12 ≈ the same proportional overlap.
    // NOTE: Word STAND is intentionally NOT overlapped — its letters print
    // separately and clip onto the stand, so they must stay apart.
    if (state.productType === 'led_word_art') {
        paramsPayload.letter_spacing = -12;
    }
    
    try {
        await viewer.update(
            nameText,
            fontPath,
            colorsPayload,
            state.layers,
            paramsPayload,
            state.productType,
            wordartFonts
        );
        
        // Recalculate dimensions & weight
        state.dims = viewer.getDimensions();
        kiriModelRevision += 1;
        state.kiriComparison = null;
        calculatePricing();
        if (state.crew.enabled && !state.crew.refreshing) {
            if (viewer.renderer) viewer.renderer.render(viewer.scene, viewer.camera);
            saveActiveCrewDraft({ capture: true });
            renderCrewMembers();
        }
        renderKiriBenchmark();
        if (kiriBenchmarkEnabled) scheduleKiriBenchmark();
    } catch (err) {
        console.error('Failed to update 3D model:', err);
    } finally {
        _update3DRunning = false;
        // Coalesced changes arrived mid-build → run exactly one more rebuild.
        if (_update3DDirty) {
            _update3DDirty = false;
            _update3DTimer = setTimeout(() => {
                _update3DTimer = null;
                _runUpdate3D();
            }, 0);
        } else {
            hideViewerLoading();
        }
    }
}

// ===== PRICING ENGINE =====

function calculatePricing() {
    if (!state.dims) return;
    
    const weight = state.dims.weightGrams || 2.0; // fallback if zero
    
    // 1. Only a Classic Keychain whose actual printable colour roles match a
    // sufficiently large live batch can receive a discount. Word Art and the
    // other multi-colour products are deliberately excluded until batches have
    // a product-specific schema.
    const matchedOffer = BatchOffers.findBatchDiscount({
        productType: state.productType,
        design: {
            layers: state.layers,
            colors: relevantColors(),
        },
        weightG: weight,
    }, state.activeBatches, Pricing.priceLine, DEFAULT_BATCH_SIZE);

    let batchSize = DEFAULT_BATCH_SIZE;
    if (matchedOffer) {
        batchSize = matchedOffer.batchSize;
        state.matchedBatchSize = batchSize;
        
        // Show success alert
        if (isDesktop() || state.currentStep === 3) {
            el.batchPromoAlert.style.display = 'flex';
        }
        el.batchPromoAlertMsg.textContent = `${matchedOffer.name} matches this Classic Keychain. You save ₹${matchedOffer.savings} per item.`;
    } else {
        state.matchedBatchSize = null;
        el.batchPromoAlert.style.display = 'none';
    }
    
    // 2. Price through the shared module — the exact code the server runs at
    // checkout, so what this page shows is what gets charged. This replaces the
    // `const finalAmount = 10` test hardcode that shipped every product at ₹10
    // while the cost breakdown below it was computed and thrown away.
    const priced = Pricing.priceLine({ weightG: weight, quantity: 1, batchSize });
    const b = priced.breakdown;

    // Save to state
    state.costs = {
        weight: Math.round(weight * 10) / 10,
        printTimeMins: b.printTimeMins,
        materialCost: Math.round(b.materialCost),
        machineCost: Math.round(b.machineCost),
        laborCost: Math.round(b.labourCost),
        productionCost: Math.round(b.productionCost),
        finalAmount: priced.unitPrice
    };
    
    // 3. Update DOM
    el.calcWeight.textContent = state.costs.weight;
    el.calcTime.textContent = state.costs.printTimeMins;
    el.priceMat.textContent = `₹${state.costs.materialCost}`;
    el.priceMachine.textContent = `₹${state.costs.machineCost}`;
    el.priceLabor.textContent = `₹${state.costs.laborCost}`;
    el.priceTotal.textContent = `₹${state.costs.finalAmount * state.quantity}`;
    el.infoPrintTime.textContent = `~${state.costs.printTimeMins} min`;
    
    // Update main checkout button text
    const btnText = document.querySelector('.primary-pay-btn .btn-text');
    btnText.textContent = `PAY ₹${state.costs.finalAmount * state.quantity} VIA UPI`;
}

function renderKiriBenchmark() {
    if (!el.kiriBenchmarkCard) return;
    const visible = PRICING_LAB_ENABLED && state.productType === 'keychain';
    el.kiriBenchmarkCard.hidden = !visible;
    if (!visible || !state.costs) return;

    el.kiriCurrentPrice.textContent = `₹${state.costs.finalAmount}`;
    el.kiriCurrentMetrics.textContent =
        `${state.costs.weight.toFixed(1)} g · ${state.costs.printTimeMins} min`;

    const comparison = state.kiriComparison;
    if (comparison) {
        el.kiriSlicedPrice.textContent = `₹${comparison.unitPrice}`;
        el.kiriSlicedMetrics.textContent =
            `${comparison.weightGrams.toFixed(1)} g · ${Math.round(comparison.printTimeMins)} min`;
        const delta = comparison.unitPrice - comparison.currentUnitPrice;
        const percent = comparison.currentUnitPrice > 0
            ? Math.abs(delta / comparison.currentUnitPrice) * 100
            : 0;
        const direction = delta === 0 ? 'the same as' : (delta > 0 ? 'higher than' : 'lower than');
        el.kiriDifference.hidden = false;
        el.kiriDifference.textContent = delta === 0
            ? `Both methods return ₹${comparison.unitPrice}.`
            : `Kiri is ₹${Math.abs(delta)} ${direction} the current price (${percent.toFixed(1)}%).`;
        el.kiriBenchmarkStatus.textContent =
            'Completed locally in this browser. No STL or customer design was uploaded.';
        el.kiriBenchmarkBtn.textContent = 'Refresh Kiri comparison';
    } else {
        el.kiriSlicedPrice.textContent = '—';
        el.kiriSlicedMetrics.textContent = kiriBenchmarkRunning
            ? 'Slicing the exact Classic STL…'
            : 'Run the exact STL slice';
        el.kiriDifference.hidden = true;
        el.kiriBenchmarkStatus.textContent = kiriBenchmarkStatusMessage
            || 'Uses the Bambu A1 profile, 0.20 mm layers, three walls and 40% grid infill.';
        el.kiriBenchmarkBtn.textContent = kiriBenchmarkRunning
            ? 'Kiri:Moto is calculating…'
            : 'Run Kiri comparison';
    }

    el.kiriBenchmarkBtn.disabled = kiriBenchmarkRunning;
    el.kiriProgress.hidden = !kiriBenchmarkRunning;
    el.kiriProgressBar.style.width = `${Math.round(kiriBenchmarkProgressValue * 100)}%`;
}

function updateKiriProgress(update) {
    const progress = Number(update && update.progress);
    if (Number.isFinite(progress)) {
        kiriBenchmarkProgressValue = Math.max(
            kiriBenchmarkProgressValue,
            Math.min(1, Math.max(0, progress))
        );
    }
    if (update && update.message) kiriBenchmarkStatusMessage = update.message;
    renderKiriBenchmark();
}

function scheduleKiriBenchmark(delay = 800) {
    if (!kiriBenchmarkEnabled || !PRICING_LAB_ENABLED || state.productType !== 'keychain') return;
    clearTimeout(kiriBenchmarkTimer);
    kiriBenchmarkTimer = setTimeout(runKiriBenchmark, delay);
}

async function runKiriBenchmark() {
    if (!viewer || !state.costs || state.productType !== 'keychain') return;
    if (kiriBenchmarkRunning) {
        kiriBenchmarkPending = true;
        return;
    }

    clearTimeout(kiriBenchmarkTimer);
    kiriBenchmarkRunning = true;
    kiriBenchmarkPending = false;
    kiriBenchmarkProgressValue = 0.02;
    kiriBenchmarkStatusMessage = 'Loading the local Kiri:Moto slicing engine…';
    state.kiriComparison = null;
    renderKiriBenchmark();

    const revision = kiriModelRevision;
    const currentUnitPrice = state.costs.finalAmount;
    try {
        if (!kiriBenchmark) {
            kiriBenchmark = new KiriMotoBenchmark({ onProgress: updateKiriProgress });
        }
        const stl = viewer.getSTLBinary();
        if (!stl) throw new Error('The Classic Keychain STL is not ready yet.');

        const metrics = await kiriBenchmark.slice(stl);
        if (revision !== kiriModelRevision || state.productType !== 'keychain') {
            kiriBenchmarkPending = true;
            return;
        }

        const priced = Pricing.priceFromSliceMetrics({
            weightG: metrics.weightGrams,
            printTimeMins: metrics.printTimeMins,
            quantity: 1,
            batchSize: state.matchedBatchSize || DEFAULT_BATCH_SIZE,
        });
        state.kiriComparison = {
            currentUnitPrice,
            unitPrice: priced.unitPrice,
            weightGrams: metrics.weightGrams,
            printTimeMins: metrics.printTimeMins,
            filamentMm: metrics.filamentMm,
            breakdown: priced.breakdown,
        };
        kiriBenchmarkStatusMessage = '';
    } catch (error) {
        console.error('Kiri:Moto benchmark failed:', error);
        kiriBenchmarkStatusMessage =
            `Comparison failed: ${error && error.message ? error.message : 'Unknown slicer error'}`;
    } finally {
        kiriBenchmarkRunning = false;
        kiriBenchmarkProgressValue = state.kiriComparison ? 1 : 0;
        renderKiriBenchmark();
        if (kiriBenchmarkPending) {
            kiriBenchmarkPending = false;
            scheduleKiriBenchmark(0);
        }
    }
}

// Desktop shows every step at once in one scrolling sidebar; mobile keeps
// the step-by-step wizard. Single source of truth for the breakpoint.
function isDesktop() { return window.matchMedia('(min-width: 880px)').matches; }

let stepperNavMeasureFrame = 0;
let stepperNavResizeObserver = null;
let stepperNavLastHeight = 0;

function syncStepperNavClearance() {
    cancelAnimationFrame(stepperNavMeasureFrame);
    stepperNavMeasureFrame = requestAnimationFrame(() => {
        const nav = el.stepperNav;
        const mobileFixed = nav && !isDesktop() && getComputedStyle(nav).position === 'fixed';
        const height = mobileFixed ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        if (height === stepperNavLastHeight) return;
        stepperNavLastHeight = height;
        document.documentElement.style.setProperty(
            '--stepper-nav-height',
            `${height || 76}px`
        );
    });
}

function setupStepperNavClearance() {
    if (!el.stepperNav) return;
    if ('ResizeObserver' in window) {
        stepperNavResizeObserver = new ResizeObserver(syncStepperNavClearance);
        stepperNavResizeObserver.observe(el.stepperNav);
    }
    syncStepperNavClearance();
}

/* Conditional step-cards: sections that depend on the PRODUCT, not just on
 * which wizard step you are on, and so must stay hidden even when their step
 * is reached.
 *
 * renderStepper() used to inline these rules — twice, once per layout branch —
 * and #thicknessSection was missing from both. Since the stepper reveals a card
 * with `style.display = ''`, which CLEARS the inline `display:none` in the
 * markup rather than re-asserting it, Thickness reappeared for every product.
 * Clicking an option then ran applyProductTypeConstraints() and it vanished
 * again: exactly how the bug was reported ("click it and it's gone").
 *
 * One predicate, one place to add the next conditional section.
 */
function isSectionUnavailable(elem) {
    switch (elem.id) {
        case 'thicknessSection':        // layer thickness: Classic Keychain only
        case 'ringPositionSection':     // only the Classic Keychain has a ring
            return state.productType !== 'keychain';
        case 'batchPromoAlert':
            return !state.matchedBatchSize;
        default:
            return false;
    }
}

function renderStepper() {
    renderStepper.revision = (renderStepper.revision || 0) + 1;
    const desktop = isDesktop();
    const crewEnabled = Boolean(state.crew && state.crew.enabled);
    document.body.classList.toggle('all-steps', desktop);
    document.body.classList.toggle(
        'crew-review-step',
        !desktop && crewEnabled && state.currentStep === 4
    );

    if (desktop) {
        // Show ALL steps in the sidebar (respecting the conditional sections).
        document.querySelectorAll('[data-step]').forEach(elem => {
            elem.style.display = isSectionUnavailable(elem) ? 'none' : '';
        });
    } else {
        // Mobile wizard: hide all, show only the current step.
        document.querySelectorAll('[data-step]').forEach(elem => { elem.style.display = 'none'; });
        document.querySelectorAll(`[data-step="${state.currentStep}"]`).forEach(elem => {
            if (isSectionUnavailable(elem)) return;
            elem.style.display = '';
        });
    }

    // Update Progress Indicator
    el.stepDots.forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.toggle('active', dotStep === state.currentStep);
        dot.classList.toggle('completed', dotStep < state.currentStep);
    });
    
    el.stepLines.forEach((line, idx) => {
        line.classList.toggle('completed', idx + 1 < state.currentStep);
    });

    // Update Text Indicator
    const stepTitles = {
        1: 'Step 1: Text Customization',
        2: 'Step 2: Font Selection',
        3: 'Step 3: Colors & Details',
        4: 'Step 4: Review & Payment'
    };
    if(el.stepperText) {
        const activeCrewName = crewEnabled && state.currentStep > 1
            ? state.crew.members[state.crew.activeIndex]?.name?.trim()
            : '';
        el.stepperText.textContent = activeCrewName
            ? `${stepTitles[state.currentStep]} · ${activeCrewName}`
            : stepTitles[state.currentStep];
    }

    // Update Buttons
    // The Add to cart button tracks the Pay button: both belong to the final
    // review step (and to every step on desktop, where all steps are visible).
    // `is-review` on the nav flips the visual hierarchy so Add to cart reads as
    // the primary action and the walk-up "pay now" path reads as secondary.
    const showCheckoutButtons = (visible) => {
        if (el.btnPlaceOrder) {
            el.btnPlaceOrder.style.display = visible && !crewEnabled ? 'flex' : 'none';
        }
        if (el.btnAddToCart)  el.btnAddToCart.style.display  = visible ? 'inline-flex' : 'none';
        const nav = el.stepperNav || document.querySelector('.stepper-nav');
        if (nav) {
            nav.classList.toggle('is-review', visible);
            nav.classList.toggle('is-crew-review', visible && crewEnabled);
        }
        if (typeof syncCrewUi === 'function') syncCrewUi();
        if (typeof syncStepperNavClearance === 'function') syncStepperNavClearance();
    };

    if (desktop) {
        // All steps visible → no wizard nav, just the Pay button.
        if(el.btnPrevStep) el.btnPrevStep.style.display = 'none';
        if(el.btnNextStep) el.btnNextStep.style.display = 'none';
        showCheckoutButtons(true);
        return;
    }
    if(el.btnPrevStep) el.btnPrevStep.style.display = '';   // restore for mobile
    if (state.currentStep === 1) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'hidden';
        if(el.btnNextStep) el.btnNextStep.style.display = '';
        if(el.btnNextStep) {
            const firstName = crewEnabled
                ? state.crew.members[0]?.name?.trim()
                : '';
            el.btnNextStep.textContent = firstName
                ? `Next: Customize ${firstName}`
                : 'Next: Font';
        }
        showCheckoutButtons(false);
    } else if (state.currentStep === 2) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = '';
        if(el.btnNextStep) {
            const activeName = crewEnabled
                ? state.crew.members[state.crew.activeIndex]?.name?.trim()
                : '';
            el.btnNextStep.textContent = activeName
                ? `Next: Colors for ${activeName}`
                : 'Next: Colors';
        }
        showCheckoutButtons(false);
    } else if (state.currentStep === 3) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = '';
        if(el.btnNextStep) {
            const nextCrewIndex = crewEnabled
                ? nextUnconfiguredCrewIndex()
                : -1;
            const nextCrewName = nextCrewIndex >= 0
                ? state.crew.members[nextCrewIndex]?.name?.trim()
                : '';
            el.btnNextStep.textContent = crewEnabled
                ? (nextCrewName ? `Save & customize ${nextCrewName}` : 'Review Crew')
                : 'Next: Review & Pay';
        }
        showCheckoutButtons(false);
    } else if (state.currentStep === 4) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = 'none';
        showCheckoutButtons(true);
    }
    if (typeof renderCrewQuickSwitcher === 'function') renderCrewQuickSwitcher();
    if (typeof syncStepperNavClearance === 'function') syncStepperNavClearance();
}

// ===== UI RENDERERS =====

// ── Real glyph SVG previews via opentype.js ──
// Cache parsed fonts so we only fetch/parse each TTF once.
const _fontPreviewCache = {};
function _loadPreviewFont(file) {
    if (_fontPreviewCache[file]) return _fontPreviewCache[file];
    const p = new Promise((resolve, reject) => {
        if (typeof opentype === 'undefined') { reject(new Error('opentype missing')); return; }
        opentype.load(file, (err, font) => err ? reject(err) : resolve(font));
    });
    _fontPreviewCache[file] = p;
    return p;
}

// Build a crisp, auto-fitted SVG of `text` rendered in the given font.
function buildFontPreviewSVG(font, text) {
    const VB_W = 150, VB_H = 56, fontSize = 42;
    const path = font.getPath(text, 0, 0, fontSize);
    const bb = path.getBoundingBox();
    const w = (bb.x2 - bb.x1) || 1, h = (bb.y2 - bb.y1) || 1;
    // fit into the viewBox with padding
    const pad = 8;
    const scale = Math.min((VB_W - pad * 2) / w, (VB_H - pad * 2) / h, 1.4);
    const tx = (VB_W - w * scale) / 2 - bb.x1 * scale;
    const ty = (VB_H - h * scale) / 2 - bb.y1 * scale;
    const d = path.toPathData(2);
    return '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
           (font.names && font.names.fontFamily ? font.names.fontFamily.en : 'font') + ' preview">' +
           '<g transform="translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) + ') scale(' + scale.toFixed(3) + ')">' +
           '<path d="' + d + '" fill="currentColor"/></g></svg>';
}

// ── Font preview text, rendered lazily ──
// Typing used to call renderFontList(), which wiped the strip and rebuilt every
// card: ~34 × (opentype getPath + toPathData + innerHTML SVG parse) plus a full
// strip layout, per typing burst — and it reset the strip's scroll position.
// Now the cards are structural and only the preview glyphs are swapped, and only
// for the cards actually scrolled into view.
let _previewSample = 'Abc';
const _visibleCards = new Set();
let _previewObserver = null;

function computePreviewSample() {
    let sample = (state.name || '').split('\n')[0].trim();
    if (!sample) sample = state.productType === 'linked_initials' ? 'SP' : 'Abc';
    return sample.slice(0, 6);   // keep previews readable
}

function ensurePreviewObserver() {
    if (_previewObserver || !el.fontStrip || typeof IntersectionObserver === 'undefined') return;
    _previewObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                _visibleCards.add(entry.target);
                renderCardPreview(entry.target);
            } else {
                _visibleCards.delete(entry.target);
            }
        });
    }, { root: el.fontStrip, rootMargin: '0px 300px' });
}

// Draw `_previewSample` into one card. No-op when the card already shows it.
function renderCardPreview(card) {
    if (!card || card.dataset.sample === _previewSample) return;
    const target = card.querySelector('.font-preview-text');
    if (!target) return;

    const sample = _previewSample;
    const file   = card.dataset.file;
    const name   = card.dataset.name;
    card.dataset.sample = sample;   // claim before the async hop so we don't queue duplicates

    _loadPreviewFont(file)
        .then(f => {
            if (card.dataset.sample !== sample) return;   // superseded by newer text
            target.innerHTML = buildFontPreviewSVG(f, sample);
        })
        .catch(() => {
            if (card.dataset.sample !== sample) return;
            target.textContent = sample;
            target.style.fontFamily = `"${name}", sans-serif`;
        });
}

// Debounced: swap preview text without touching the DOM structure.
let _fontRefreshTimer = null;
function refreshFontPreviews() {
    clearTimeout(_fontRefreshTimer);
    _fontRefreshTimer = setTimeout(() => {
        const next = computePreviewSample();
        if (next === _previewSample) return;
        _previewSample = next;

        if (_previewObserver) {
            // Off-screen cards keep the stale sample and re-render when scrolled in.
            _visibleCards.forEach(renderCardPreview);
        } else {
            el.fontStrip.querySelectorAll('.font-card').forEach(renderCardPreview);
        }
    }, 400);
}

// Let a vertical mouse wheel scroll the horizontal font strip, and add
// hover arrow buttons (desktop affordance). Wired once.
let _fontNavWired = false;
function setupFontStripNav() {
    if (_fontNavWired || !el.fontStrip) return;
    _fontNavWired = true;

    // wheel → horizontal: translate vertical wheel delta into horizontal scroll
    el.fontStrip.addEventListener('wheel', (e) => {
        const dom = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (dom === 0) return;
        const max = el.fontStrip.scrollWidth - el.fontStrip.clientWidth;
        if (max <= 0) return;                 // nothing to scroll
        const atStart = el.fontStrip.scrollLeft <= 0 && dom < 0;
        const atEnd   = el.fontStrip.scrollLeft >= max - 1 && dom > 0;
        if (atStart || atEnd) return;         // let the page scroll at the edges
        e.preventDefault();
        el.fontStrip.scrollLeft += dom;
    }, { passive: false });

    // optional arrow buttons if present in the DOM
    const wrap = el.fontStrip.parentElement;
    const prev = wrap && wrap.querySelector('.font-nav-prev');
    const next = wrap && wrap.querySelector('.font-nav-next');
    const step = () => Math.max(160, el.fontStrip.clientWidth * 0.8);
    if (prev) prev.addEventListener('click', () => el.fontStrip.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => el.fontStrip.scrollBy({ left:  step(), behavior: 'smooth' }));
}

function renderFontList() {
    // Structural rebuild: the set of cards or the selection changed. Detach the
    // old cards from the observer first so _visibleCards never holds dead nodes.
    if (_previewObserver) _previewObserver.disconnect();
    _visibleCards.clear();
    el.fontStrip.innerHTML = '';

    const isLinkedInitials = state.productType === 'linked_initials';

    if (isLinkedInitials) {
        state.selectedFont = 'Rock Boys';
        state.selectedFontFile = 'Fonts/Rock Boys.ttf';
        if (el.fontCategoryTabs) el.fontCategoryTabs.style.display = 'none';
        if (el.langToggle) el.langToggle.style.display = 'none';
        if (el.fontScrollHint) el.fontScrollHint.textContent = 'Optimized exclusively with Rock Boys font for interlocking 3D fit';
    } else {
        if (el.fontCategoryTabs) el.fontCategoryTabs.style.display = 'flex';
        if (el.langToggle) el.langToggle.style.display = '';
        if (el.fontScrollHint) el.fontScrollHint.textContent = 'Scroll or tap ‹ › to see all 30+ fonts';
    }

    let filtered = FONTS.filter(f => f.lang === state.lang);
    if (isLinkedInitials) {
        filtered = FONTS.filter(f => f.name === 'Rock Boys');
    } else if (state.fontCategory && state.fontCategory !== 'all') {
        filtered = filtered.filter(f => f.tags && f.tags.includes(state.fontCategory));
    }

    // What text to preview: the user's typed name (first line), else "Abc".
    _previewSample = computePreviewSample();
    ensurePreviewObserver();

    filtered.forEach(font => {
        const isSelected = (state.productType === 'wordart')
            ? (state.wordartActiveSlot === 'top' ? state.wordartTopFont === font.name : state.wordartBottomFont === font.name)
            : (state.selectedFont === font.name);

        const card = document.createElement('div');
        card.className = `font-card ${isSelected ? 'selected' : ''}`;
        card.dataset.name = font.name;
        card.dataset.file = font.file;

        // Real glyph preview (filled while the font loads).
        const pText = document.createElement('span');
        pText.className = 'font-preview-text';
        pText.textContent = '…';   // tiny placeholder until the SVG renders

        const cName = document.createElement('span');
        cName.className = 'font-card-name';
        cName.textContent = font.label;

        card.appendChild(pText);
        card.appendChild(cName);

        card.addEventListener('click', () => {
            document.querySelectorAll('.font-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            if (state.productType === 'wordart') {
                if (state.wordartActiveSlot === 'top') {
                    state.wordartTopFont = font.name;
                    state.wordartTopFontFile = font.file;
                } else {
                    state.wordartBottomFont = font.name;
                    state.wordartBottomFontFile = font.file;
                }
            } else {
                state.selectedFont = font.name;
                state.selectedFontFile = font.file;
            }

            update3DModel();
        });

        el.fontStrip.appendChild(card);

        // Preview glyphs render lazily — on scroll-in via the observer, or
        // immediately when IntersectionObserver is unavailable.
        if (_previewObserver) {
            _previewObserver.observe(card);
        } else {
            renderCardPreview(card);
        }
    });
}

function applyFilamentCatalogue(colours) {
    const palette = toPalette(Array.isArray(colours) ? colours : FALLBACK_FILAMENT_COLOURS);
    for (const key of Object.keys(COLOR_PALETTES)) COLOR_PALETTES[key] = [...palette];

    // A colour switched to Unavailable must disappear from new customer
    // designs. Keep every still-valid selection; only replace removed colours.
    for (const key of Object.keys(state.colors)) {
        const current = String(state.colors[key] || '').toUpperCase();
        if (!palette.some((colour) => colour.hex.toUpperCase() === current)) {
            state.colors[key] = palette[0] ? palette[0].hex : '#F1ECE1';
        }
    }
}

let _filamentRefreshPromise = null;
let _filamentCatalogueSignature = '';

function filamentCatalogueSignature(colours) {
    return JSON.stringify((Array.isArray(colours) ? colours : []).map((colour) => [
        colour.id, colour.name, colour.hex, colour.state, colour.sortOrder,
    ]));
}

async function refreshFilamentCatalogue({ rebuildSelection = true } = {}) {
    if (_filamentRefreshPromise) return _filamentRefreshPromise;
    _filamentRefreshPromise = (async () => {
        const colours = await loadFilamentColours();
        const signature = filamentCatalogueSignature(colours);
        if (signature === _filamentCatalogueSignature) return false;

        const previous = { ...state.colors };
        applyFilamentCatalogue(colours);
        _filamentCatalogueSignature = signature;
        applyProductTypeConstraints();

        const selectionChanged = Object.keys(state.colors)
            .some((key) => state.colors[key] !== previous[key]);
        if (rebuildSelection && selectionChanged && viewer) {
            if (!updateColorsWithoutRebuild()) update3DModel();
        }
        return true;
    })();
    try {
        return await _filamentRefreshPromise;
    } finally {
        _filamentRefreshPromise = null;
    }
}

function updateFilamentAvailabilityNotice() {
    if (!el.filamentAvailabilityNotice) return;
    const rows = {
        base: el.baseColorRow,
        font: el.fontColorRow,
        outline: el.outlineColorRow,
        line2: el.line2ColorRow,
    };
    const selected = Object.keys(rows).find((key) => {
        const row = rows[key];
        if (!row || row.style.display === 'none') return false;
        const current = String(state.colors[key] || '').toUpperCase();
        const colour = COLOR_PALETTES[key].find((item) => item.hex.toUpperCase() === current);
        return colour && colour.state === 'made_to_order';
    });
    el.filamentAvailabilityNotice.hidden = !selected;
    el.filamentAvailabilityNotice.textContent = selected
        ? `Made to order · ${MADE_TO_ORDER_NOTICE}`
        : '';
}

function renderColorSwatches() {
    const swatchesConfigs = [
        { container: el.baseSwatches, badge: el.baseColorVal, palette: COLOR_PALETTES.base, key: 'base' },
        { container: el.fontSwatches, badge: el.fontColorVal, palette: COLOR_PALETTES.font, key: 'font' },
        { container: el.outlineSwatches, badge: el.outlineColorVal, palette: COLOR_PALETTES.outline, key: 'outline' },
        { container: el.line2Swatches, badge: el.line2ColorVal, palette: COLOR_PALETTES.line2, key: 'line2' }
    ];
    
    swatchesConfigs.forEach(conf => {
        if (!conf.container) return;
        conf.container.innerHTML = '';

        // Update active badge name
        const activeColor = conf.palette.find(c => c.hex.toLowerCase() === (state.colors[conf.key] || '').toLowerCase());
        if (conf.badge && activeColor) {
            conf.badge.textContent = activeColor.label;
        }

        conf.palette.forEach(color => {
            const isSelected = (state.colors[conf.key] || '').toLowerCase() === color.hex.toLowerCase();
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = `swatch ${color.state === 'made_to_order' ? 'made-to-order' : ''} ${isSelected ? 'selected' : ''}`;
            swatch.style.backgroundColor = color.hex;
            swatch.dataset.colorRole = conf.key;
            swatch.dataset.colorHex = color.hex.toUpperCase();
            const availability = color.state === 'made_to_order' ? ` — ${MADE_TO_ORDER_NOTICE}` : '';
            swatch.title = color.label + availability;
            swatch.setAttribute('aria-label', color.label + availability);
            swatch.setAttribute('aria-pressed', String(isSelected));
            if (['#F1ECE1', '#D7CAAB', '#F9A800'].includes(color.hex.toUpperCase())) {
                swatch.classList.add('light-swatch');
            }
            
            swatch.addEventListener('click', () => {
                conf.container.querySelectorAll('.swatch').forEach(s => {
                    s.classList.remove('selected');
                    s.setAttribute('aria-pressed', 'false');
                });
                swatch.classList.add('selected');
                swatch.setAttribute('aria-pressed', 'true');
                state.colors[conf.key] = color.hex;
                if (conf.badge) {
                    conf.badge.textContent = color.label;
                }
                updateFilamentAvailabilityNotice();
                if (!updateColorsWithoutRebuild()) update3DModel();
            });
            
            conf.container.appendChild(swatch);
        });
    });
    updateFilamentAvailabilityNotice();
}

function applyProductTypeConstraints() {
    const isWordart    = state.productType === 'wordart';
    const isLoveSeries = state.productType === 'loveseries';
    const isTileKey    = state.productType === 'tilekey';
    const isLinkedInitials = state.productType === 'linked_initials';
    const isNametag    = state.productType === 'nametag';
    const isGirly      = state.productType === 'girly_keychain';
    const isSupported  = state.productType === 'supported_text';
    const isFlower     = state.productType === 'flower_keychain';
    const isLedStand   = state.productType === 'led_word_stand';
    const isLedArt     = state.productType === 'led_word_art';
    const isBordered   = state.productType === 'bordered_keychain';
    const isBubble     = state.productType === 'bubble_keychain';
    const isNameplate  = state.productType === 'nameplate';
    const isDeskOrganizer = state.productType === 'desk_organizer';
    const isBeads      = state.productType === 'name_beads';
    const isWordartLike = isWordart || isLoveSeries;

    // Toggle Input visibility
    if (el.wordartBackingRow) el.wordartBackingRow.style.display = isWordartLike ? 'block' : 'none';
    if (el.organizerLayoutRow) el.organizerLayoutRow.style.display = isDeskOrganizer ? 'block' : 'none';
    if (el.beadShapeRow) el.beadShapeRow.style.display = isBeads ? 'block' : 'none';
    if (el.beadDirectionRow) el.beadDirectionRow.style.display = isBeads ? 'block' : 'none';

    if (isWordart) {
        el.singleInputContainer.style.display = 'none';
        el.dualInputsContainer.style.display = 'flex';
        el.wordartHint.style.display = 'block';
    } else {
        el.singleInputContainer.style.display = 'block';
        el.dualInputsContainer.style.display = 'none';
        el.wordartHint.style.display = 'none';
        
        // Pre-fill input
        if (isLinkedInitials) {
            el.nameInput.maxLength = 2;
            state.name = state.name.substring(0, 2);
            state.selectedFont = 'Rock Boys';
            state.selectedFontFile = 'Fonts/Rock Boys.ttf';
        } else if (isFlower) {
            el.nameInput.maxLength = 1;
            state.name = state.name.substring(0, 1);
        } else if (isLedStand) {
            el.nameInput.maxLength = 3;
            state.name = state.name.substring(0, 3).toUpperCase();
        } else if (isLedArt) {
            el.nameInput.maxLength = 15;
        } else if (isBubble) {
            el.nameInput.maxLength = 12;
            state.name = state.name || 'Rodic';
            state.selectedFont = 'Super Bubble';
            state.selectedFontFile = 'Fonts/Super Bubble.ttf';
            state.colors.base = '#F1ECE1';    // Pure White base plate & inset floor
            state.colors.font = '#1D7D8D';    // Water Blue rim & bubble text
            state.colors.outline = '#F1ECE1';
        } else if (isDeskOrganizer) {
            el.nameInput.maxLength = 12;
            state.name = state.name || 'ALEX';
            state.selectedFont = state.selectedFont || 'BagelFatOne';
            state.colors.base = state.colors.base || '#F1ECE1';     // Main box body
            state.colors.font = state.colors.font || '#C93655';     // Imperial Red name
            state.colors.outline = state.colors.outline || '#F1ECE1';
        } else if (isBeads) {
            el.nameInput.maxLength = 10;
            state.name = state.name || 'EMMA';
            state.selectedFont = state.selectedFont || 'Lilita One';
            state.colors.base = state.colors.base || '#1D7D8D';     // Water Blue bead body
            state.colors.font = state.colors.font || '#F1ECE1';     // Embossed letter color
            state.colors.outline = state.colors.outline || '#1D7D8D';
        } else {
            el.nameInput.maxLength = 15;
        }
        el.nameInput.value = state.name;
        el.charCount.textContent = state.name.length;
    }

    // Toggle Font tab slot select (Wordart line 1 vs line 2)
    el.fontSlotTabs.style.display = isWordart ? 'flex' : 'none';

    // Show/Hide keyring position selector (only relevant and adjustable for standard keychain)
    const hasRing = state.productType === 'keychain';
    state.hasRing = hasRing;

    // NOTE: visibility of #ringPositionSection and #thicknessSection is owned
    // solely by renderStepper() via isSectionUnavailable(). Writing display
    // here as well is what created the Thickness bug: the two systems disagreed
    // and whichever ran last won. This function only records the flags.

    // ── Dynamic Color Rows Configuration & Contextual Labels ──
    if (isLinkedInitials) {
        // Linked initials: Left initial = FONT A (colors.font), Right initial = FONT B (colors.line2)
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'FONT A';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'flex';
        if (el.line2ColorLabel) el.line2ColorLabel.textContent = 'FONT B';
        if (el.baseColorRow) el.baseColorRow.style.display = 'none';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
    } else if (isWordart) {
        // Word art (2 layers: Back Panel + 2-Line Text)
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Line 1 Color (Top Text)';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'flex';
        if (el.line2ColorLabel) el.line2ColorLabel.textContent = 'Line 2 Color (Bottom Text)';
        if (el.baseColorRow) {
            el.baseColorRow.style.display = 'flex';
            if (el.baseColorLabel) el.baseColorLabel.textContent = 'Back Panel Color';
        }
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
    } else if (isLoveSeries) {
        // LOVE Series (2 layers: Back Panel + Texts)
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Name Color (Top)';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'flex';
        if (el.line2ColorLabel) el.line2ColorLabel.textContent = 'LOVE Text Color';
        if (el.baseColorRow) {
            el.baseColorRow.style.display = 'flex';
            if (el.baseColorLabel) el.baseColorLabel.textContent = 'Back Panel Color';
        }
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
    } else if (isTileKey) {
        // Tile keychain: Base = Strip, Line2 = Tile, Font = Letters
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Backing Strip Color';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'flex';
        if (el.line2ColorLabel) el.line2ColorLabel.textContent = 'Tile Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Letter Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
    } else if (isNametag) {
        // Wavy nametag: Single color body
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Nametag Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'none';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isGirly) {
        // Girly keychain: Base & Bow = Base, Name text = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Base & Bow Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Font Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isFlower) {
        // Flower initial: Flower petal & center disc = Base, Letter = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Flower Base Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Letter Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isSupported) {
        // Supported cursive nameplate: Single piece cursive text + supports
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Nameplate Color';
        if (el.baseColorRow) el.baseColorRow.style.display = 'none';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isLedStand) {
        // LED word stand: Stand & housing = Base, Translucent cover = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Stand & Housing Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Diffuser Cover Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isLedArt) {
        // LED word art: Housing tray = Base, Translucent cover = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Housing Tray Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Diffuser Cover Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isBordered) {
        // Bordered keychain: Border = Base, Text = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Border / Base Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Font Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isBubble) {
        // Bubble Badge Keychain: Base Plate = Base Color, Rim & Bubble Text = Font Color
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Base Plate Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Rim & Text Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isNameplate) {
        // Desk nameplate: Plaque = Base, Outline = Outline, Text = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Plaque Base Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'flex';
        if (el.outlineColorLabel) el.outlineColorLabel.textContent = 'Outline Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Font Color';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isDeskOrganizer) {
        // Desk Organizer: Body = Base, Compartment Dividers = Outline, Name = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Organizer Body Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'flex';
        if (el.outlineColorLabel) el.outlineColorLabel.textContent = 'Compartment Dividers Color';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Name Text Color';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else if (isBeads) {
        // Name Beads: Body = Base, Letters = Font
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Bead Body Color';
        if (el.outlineColorRow) el.outlineColorRow.style.display = 'none';
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Letter Text Color';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    } else {
        // Classic keychain (2L vs 3L)
        if (el.baseColorRow) el.baseColorRow.style.display = 'flex';
        if (el.baseColorLabel) el.baseColorLabel.textContent = 'Base Color';
        if (el.outlineColorRow) {
            el.outlineColorRow.style.display = (state.layers === '2L') ? 'none' : 'flex';
            if (el.outlineColorLabel) el.outlineColorLabel.textContent = 'Outline Color';
        }
        if (el.fontColorRow) el.fontColorRow.style.display = 'flex';
        if (el.fontColorLabel) el.fontColorLabel.textContent = 'Font Color';
        if (el.line2ColorRow) el.line2ColorRow.style.display = 'none';
    }

    // Refresh color swatches active badge labels
    renderColorSwatches();

    // Update Product Details Title
    let titleStr = "Classic Keychain";
    let subStr = "Standard, sturdy extruded letters keychain";
    switch (state.productType) {
        case 'flower_keychain':
            titleStr = "Flower Initial";
            subStr = "Cursive initial letter surrounded by flower petals";
            break;
        case 'nametag':
            titleStr = "Wavy Nametag";
            subStr = "Text mounted on an organic wave baseband";
            break;
        case 'girly_keychain':
            titleStr = "Girly Keychain";
            subStr = "Premium loop keychain featuring a cute 3D ribbon bow";
            break;
        case 'tilekey':
            titleStr = "Letter Tiles Keychain";
            subStr = "Linked individual block letters tiles";
            break;
        case 'linked_initials':
            titleStr = "Linked Initials";
            subStr = "Two overlapping linked letters";
            break;
        case 'supported_text':
            titleStr = "Supported Nameplate";
            subStr = "Cursive desk nameplate supported by star/heart bridges";
            break;
        case 'wordart':
            titleStr = "Custom Word Art";
            subStr = "Dual layer desk art combining script and block text";
            break;
        case 'loveseries':
            titleStr = "LOVE Series Stand";
            subStr = "Your custom name bridging a block LOVE base stand";
            break;
        case 'nameplate':
            titleStr = "Desk Nameplate";
            subStr = "Sturdy display sign board with standee slots";
            break;
        case 'led_word_stand':
            titleStr = "LED Word Stand";
            subStr = "Modular light-up letters that clip onto a hollow LED-channel stand";
            break;
        case 'led_word_art':
            titleStr = "LED Word Art";
            subStr = "Unified hollow tray sign; your text doubles as a glowing diffuser cover";
            break;
        case 'bubble_keychain':
            titleStr = "Bubble Badge Keychain";
            subStr = "Puffy 3D bubble lettering with recessed contrast inset and raised protective rim";
            break;
        case 'desk_organizer':
            titleStr = "Desk Organizer";
            subStr = "Multi-compartment desk caddy with 3D personalized name";
            break;
        case 'name_beads':
            titleStr = "Custom Name Beads";
            subStr = "Personalized alphabet beads with center cord hole for bracelets & lanyards";
            break;
    }
    el.productTitle.textContent = titleStr;
    el.productSubtitle.textContent = subStr;
    syncCrewUi();
}

// ===== UPI INITIATOR =====

function openUPILink(app) {
    const orderAmt = state.costs.finalAmount * state.quantity;
    const note = `KSK-${state.productType.substring(0,3).toUpperCase()}-${state.name.substring(0,5).toUpperCase()}`.replace(/\s+/g, '');
    const params = `pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent('Kootzy')}&am=${orderAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    let appUrl = `upi://pay?${params}`;
    
    if (app === 'gpay') {
        if (isIOS) {
            // iOS Google Pay scheme
            appUrl = `gpay://upi/pay?${params}`;
        } else {
            // Android Google Pay scheme via Chrome Intent
            appUrl = `intent://pay?${params}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        }
    } else if (app === 'phonepe') {
        if (isIOS) {
            // iOS PhonePe scheme
            appUrl = `phonepe://pay?${params}`;
        } else {
            // Android PhonePe scheme via Chrome Intent
            appUrl = `intent://pay?${params}#Intent;scheme=upi;package=com.phonepe.app;end`;
        }
    }
    
    window.location.href = appUrl;
}



function triggerPaymentModal() {
    const orderAmt = state.costs.finalAmount * state.quantity;
    const note = `KSK-${state.productType.substring(0,3).toUpperCase()}-${state.name.substring(0,5).toUpperCase()}`.replace(/\s+/g, '');
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent('Kootzy')}&am=${orderAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    el.modalPayAmt.textContent = `₹${orderAmt}`;
    
    // Set up app links
    el.linkGenericUPI.href = upiUrl;
    
    // Set up QR Code fallback (public API generator)
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    el.upiQRCode.src = qrApi;
    
    // Open modal
    el.paymentModal.classList.add('active');
}

/* Cart count in the header. Reads the local cart synchronously so the badge is
 * correct on first paint; a signed-in cart refreshes it asynchronously after. */
function updateCartBadge() {
    const badges = document.querySelectorAll('[data-cart-count]');
    if (badges.length === 0) return;

    const paint = (n) => {
        for (const b of badges) {
            b.textContent = String(n);
            b.hidden = n === 0;
        }
    };

    paint(Cart.localCount());
    if (Cart.isSignedIn()) {
        Cart.count().then(paint).catch(() => { /* keep the local figure */ });
    }
}

/* Only the colour slots this product actually uses.
 *
 * state.colors always carries all four slots (base/font/outline/line2) with
 * defaults, but most products use two or three — a classic keychain is three,
 * and the leftover line2 default was showing up as a fourth swatch in the cart.
 * This mirrors the visibility table in applyProductTypeConstraints(), which is
 * what the customer actually saw while designing.
 */
function relevantColors() {
    const c = state.colors;
    const t = state.productType;

    if (t === 'linked_initials') return { font: c.font, line2: c.line2 };
    if (t === 'wordart' || t === 'loveseries') {
        const out = { font: c.font, line2: c.line2 };
        // The back panel only exists when a backing is selected.
        if (state.wordartBase !== 'none') out.base = c.base;
        return out;
    }
    if (t === 'tilekey') return { base: c.base, font: c.font, line2: c.line2 };
    if (t === 'nametag') return { base: c.base };
    if (t === 'supported_text') return { font: c.font };
    if (t === 'nameplate' || t === 'desk_organizer') {
        return { base: c.base, font: c.font, outline: c.outline };
    }
    if (['girly_keychain', 'flower_keychain', 'led_word_stand', 'led_word_art',
         'bordered_keychain', 'bubble_keychain', 'name_beads'].includes(t)) {
        return { base: c.base, font: c.font };
    }
    // Classic keychain: outline exists only in 3-layer mode.
    const out = { base: c.base, font: c.font };
    if (state.layers === '3L') out.outline = c.outline;
    return out;
}

/* Capture the 3D viewer exactly as the customer sees it, as a small JPEG data
 * URL for the cart line.
 *
 * Two traps this handles:
 *  - The renderer is alpha:true (transparent canvas over a CSS background), and
 *    JPEG has no alpha channel — capturing without compositing first produces
 *    the model on a BLACK background. So the frame is drawn onto an offscreen
 *    canvas filled with the brand pale (#F5FAFB) before encoding.
 *  - preserveDrawingBuffer is already true (the PNG export needs it), so
 *    drawImage from the WebGL canvas reads the last rendered frame reliably.
 *
 * Returns '' on any failure — a missing thumbnail must never block adding to
 * the cart.
 */
function captureViewerPreview() {
    try {
        const canvas = el.viewerCanvas && el.viewerCanvas.querySelector('canvas');
        if (!canvas || !canvas.width || !canvas.height) return '';

        const MAX_EDGE = 480;    // plenty for a cart thumbnail, ~15–35 KB as JPEG
        const scale = Math.min(1, MAX_EDGE / Math.max(canvas.width, canvas.height));
        const w = Math.max(1, Math.round(canvas.width * scale));
        const h = Math.max(1, Math.round(canvas.height * scale));

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        ctx.fillStyle = '#F5FAFB';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(canvas, 0, 0, w, h);
        return off.toDataURL('image/jpeg', 0.82);
    } catch (_) {
        return '';
    }
}

/* Snapshot the current design for the cart.
 *
 * This has to be complete enough to (a) re-render a preview later and (b) tell
 * the operator exactly what to print. It mirrors the shape _runUpdate3D() feeds
 * the viewer, so a cart line can be replayed without translation.
 *
 * The price and weight travel along for display only — the server recomputes them
 * at checkout, because a browser-supplied price is not a price.
 */
function buildCartLine() {
    const isWordart = state.productType === 'wordart';
    const isLoveSeries = state.productType === 'loveseries';

    let text = state.name;
    if (isWordart) {
        text = `${el.wordartLine1.value}\n${el.wordartLine2.value}`.trim();
    } else if (isLoveSeries) {
        text = `${state.name}\nLOVE`;
    }

    const design = {
        font: state.selectedFont,
        fontFile: state.selectedFontFile,
        layers: state.layers,
        colors: relevantColors(),
        ringPosition: state.ringPosition,
        ringAnchor: state.ringAnchor,
        showFDMTexture: state.showFDMTexture,
    };
    if (state.dims && state.dims.width > 0 && state.dims.height > 0 && state.dims.depth > 0) {
        design.finishedSize = {
            approximate: true,
            lengthMm: Number(state.dims.width.toFixed(1)),
            heightMm: Number(state.dims.height.toFixed(1)),
            thicknessMm: Number(state.dims.depth.toFixed(1)),
        };
    }

    // Only carry the product-specific fields that actually apply, so the jsonb
    // stays readable instead of every line hauling every product's options.
    if (isWordart || isLoveSeries) {
        design.wordartBase = state.wordartBase;
        design.wordartFonts = {
            top: isWordart ? state.wordartTopFontFile : state.selectedFontFile,
            bottom: isWordart ? state.wordartBottomFontFile : 'Fonts/CANAVAR.ttf',
        };
    }
    if (state.productType === 'desk_organizer') {
        design.organizerLayout = state.organizerLayout;
    }
    if (state.productType === 'name_beads') {
        design.beadShape = state.beadShape;
        design.beadDirection = state.beadDirection;
        design.beadSize = state.beadSize;
        design.holeDiameter = state.holeDiameter;
        design.beadSpacing = state.beadSpacing;
        design.beadLetterHeight = state.beadLetterHeight;
    }

    return {
        productType: state.productType,
        text,
        quantity: state.quantity,
        design,
        // The exact preview the customer approved, captured at this moment —
        // colours, font, rotation and all. Follows the design through cart and
        // order so what they see later is what they built, not a re-render.
        preview: captureViewerPreview(),
        unitPrice: (state.costs && state.costs.finalAmount) || 0,
        weightG: (state.dims && state.dims.weightGrams) || 0,
    };
}

// Rewriting .value during an `input` event snaps the caret to the end, so
// mid-word edits are impossible. Restore the selection when we have to rewrite.
function setInputValuePreservingCaret(input, next) {
    if (input.value === next) return;
    const pos = input.selectionStart;
    input.value = next;
    if (pos === null || pos === undefined) return;
    const cap = Math.min(pos, next.length);
    try { input.setSelectionRange(cap, cap); } catch (_) { /* type doesn't support selection */ }
}

let keyboardPointerScrollY = null;
let keyboardSessionScrollY = 0;
let keyboardDismissTimer = null;

function isTextEntryElement(node) {
    if (!node || !(node instanceof HTMLElement)) return false;
    if (node instanceof HTMLTextAreaElement) return true;
    if (!(node instanceof HTMLInputElement)) return node.isContentEditable;
    return !['button', 'checkbox', 'color', 'file', 'hidden', 'radio', 'range', 'reset', 'submit']
        .includes(node.type);
}

function isIOSWebKit() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function startMobileKeyboardSession(scrollY = window.scrollY) {
    if (isDesktop()) return;
    clearTimeout(keyboardDismissTimer);
    keyboardSessionScrollY = scrollY;
    document.body.classList.add('mobile-keyboard-active');
}

function finishMobileKeyboardSession() {
    if (isTextEntryElement(document.activeElement)) return;
    document.body.classList.remove('mobile-keyboard-active');
    syncStepperNavClearance();

    if (!isIOSWebKit() || isDesktop()) return;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(keyboardSessionScrollY, maxScroll));
    const nudge = target < maxScroll ? target + 1 : Math.max(0, target - 1);

    // A one-pixel scroll forces Safari to reconcile its visual and layout
    // viewports after the keyboard closes, then restores the customer's place.
    window.scrollTo(0, nudge);
    requestAnimationFrame(() => {
        window.scrollTo(0, target);
        syncStepperNavClearance();
    });
}

function setupMobileKeyboardStability() {
    document.addEventListener('pointerdown', (event) => {
        if (!isDesktop() && isTextEntryElement(event.target)) {
            keyboardPointerScrollY = window.scrollY;
            startMobileKeyboardSession(keyboardPointerScrollY);
        }
    }, true);

    document.addEventListener('focusin', (event) => {
        if (isDesktop() || !isTextEntryElement(event.target)) return;
        startMobileKeyboardSession(keyboardPointerScrollY ?? window.scrollY);
        keyboardPointerScrollY = null;
    });

    document.addEventListener('focusout', (event) => {
        if (!isTextEntryElement(event.target)) return;
        clearTimeout(keyboardDismissTimer);
        keyboardDismissTimer = setTimeout(finishMobileKeyboardSession, 420);
    });
}

// ===== EVENT BINDINGS =====

function setupEvents() {
    if (el.soloModeBtn) {
        el.soloModeBtn.addEventListener('click', () => setCrewMode(false));
    }
    if (el.crewModeBtn) {
        el.crewModeBtn.addEventListener('click', () => setCrewMode(true));
    }
    if (el.crewCountMinus) {
        el.crewCountMinus.addEventListener('click', () => setCrewCount(state.crew.count - 1));
    }
    if (el.crewCountPlus) {
        el.crewCountPlus.addEventListener('click', () => setCrewCount(state.crew.count + 1));
    }
    if (el.crewRefreshPreviews) {
        el.crewRefreshPreviews.addEventListener('click', () => refreshAllCrewPreviews());
    }
    if (el.crewEditNamesBtn) {
        el.crewEditNamesBtn.addEventListener('click', () => {
            state.currentStep = 1;
            renderStepper();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (el.customerDimensionsBtn) {
        el.customerDimensionsBtn.addEventListener('click', () => {
            if (!viewer) return;
            const currentlyVisible = el.customerDimensionsBtn.getAttribute('aria-pressed') === 'true';
            viewer.setDimensionOverlayVisible(!currentlyVisible);
        });
    }

    if (el.kiriBenchmarkBtn) {
        el.kiriBenchmarkBtn.addEventListener('click', () => {
            kiriBenchmarkEnabled = true;
            kiriBenchmarkStatusMessage = '';
            scheduleKiriBenchmark(0);
        });
    }

    // Stepper Navigation
    if(el.btnNextStep) {
        el.btnNextStep.addEventListener('click', () => {
            // Validation before proceeding
            if (state.currentStep === 1) {
                if (state.crew.enabled) {
                    if (!validateCrewNames()) return;
                    if (state.crew.activeIndex !== 0) {
                        selectCrewMember(0);
                    }
                    state.currentStep = 2;
                    renderStepper();
                    if (!isDesktop()) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    return;
                } else if (state.productType === 'wordart') {
                    if (!el.wordartLine1.value.trim() && !el.wordartLine2.value.trim()) {
                        alert('Please enter text for at least one line.');
                        return;
                    }
                } else {
                    if (!el.nameInput.value.trim()) {
                        alert('Please enter some text.');
                        return;
                    }
                }
            }

            if (state.currentStep === 3 && state.crew.enabled) {
                markActiveCrewConfigured();
                const nextCrewIndex = nextUnconfiguredCrewIndex();
                if (nextCrewIndex >= 0) {
                    selectCrewMember(nextCrewIndex);
                    state.currentStep = 2;
                    setCrewStatus(
                        `Now customizing ${state.crew.members[nextCrewIndex].name.trim()} `
                        + `(${configuredCrewCount()} of ${state.crew.count} finished).`
                    );
                } else {
                    state.currentStep = 4;
                    setCrewStatus(`All ${state.crew.count} crew members are ready to review.`);
                }
                renderStepper();
                if (!isDesktop()) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return;
            }
            
            if (state.currentStep < state.totalSteps) {
                state.currentStep++;
                renderStepper();
                if (!isDesktop()) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }

    if(el.btnPrevStep) {
        el.btnPrevStep.addEventListener('click', () => {
            if (state.currentStep > 1) {
                state.currentStep--;
                renderStepper();
                if (!isDesktop()) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }

    // Step dots click navigation
    if (el.stepDots && el.stepDots.length) {
        el.stepDots.forEach(dot => {
            dot.addEventListener('click', () => {
                let targetStep = parseInt(dot.dataset.step);
                if (targetStep && targetStep !== state.currentStep) {
                    if (targetStep > 1 && state.currentStep === 1) {
                        if (state.crew.enabled) {
                            if (!validateCrewNames()) return;
                            if (state.crew.activeIndex !== 0) selectCrewMember(0);
                        } else if (state.productType === 'wordart') {
                            if (!el.wordartLine1.value.trim() && !el.wordartLine2.value.trim()) {
                                alert('Please enter text for at least one line.');
                                return;
                            }
                        } else {
                            if (!el.nameInput.value.trim()) {
                                alert('Please enter some text.');
                                return;
                            }
                        }
                    }
                    if (targetStep === 4 && state.crew.enabled) {
                        if (state.currentStep === 3) markActiveCrewConfigured();
                        const incomplete = visibleCrewMembers().findIndex((member) => !member.configured);
                        if (incomplete >= 0) {
                            if (state.crew.activeIndex !== incomplete) selectCrewMember(incomplete);
                            targetStep = 2;
                            setCrewStatus(
                                `Finish customizing ${state.crew.members[incomplete].name.trim()} before review.`,
                                true
                            );
                        }
                    }
                    state.currentStep = targetStep;
                    renderStepper();
                    if (!isDesktop()) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // URL Query check for product type
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam) {
        state.productType = typeParam;
    }
    const layersParam = urlParams.get('layers');
    if (layersParam === '2L' || layersParam === '3L') {
        state.layers = layersParam;
        if (el.thicknessToggle) {
            el.thicknessToggle.querySelectorAll('.pos-opt').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.val === layersParam);
            });
        }
    }
    const queryColor = (key) => {
        const value = String(urlParams.get(key) || '').trim();
        return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
    };
    const baseParam = queryColor('base');
    const fontParam = queryColor('font');
    const outlineParam = queryColor('outline');
    if (baseParam) state.colors.base = baseParam;
    if (fontParam) state.colors.font = fontParam;
    if (outlineParam) state.colors.outline = outlineParam;
    
    // Hide drag-hint on first user interaction with viewer
    function hideDragHint() {
        if (el.dragHint && !el.dragHint.classList.contains('hidden')) {
            el.dragHint.classList.add('hidden');
        }
    }
    if (el.viewerCanvas) {
        el.viewerCanvas.addEventListener('pointerdown', hideDragHint, { passive: true });
        el.viewerCanvas.addEventListener('touchstart', hideDragHint, { passive: true });
        el.viewerCanvas.addEventListener('mousedown', hideDragHint, { passive: true });
        el.viewerCanvas.addEventListener('viewerinteract', hideDragHint);
    }
    
    // Tamil / English selector
    el.langToggle.addEventListener('click', () => {
        state.lang = state.lang === 'en' ? 'ta' : 'en';
        el.langToggle.textContent = state.lang === 'en' ? 'EN' : 'தமிழ்';
        el.langToggle.classList.toggle('active', state.lang === 'ta');
        
        // Set default font for new language selection
        if (state.lang === 'ta') {
            state.selectedFont = 'Baloo Thambi 2';
            state.selectedFontFile = 'Fonts/BalooThambi2.ttf';
        } else {
            state.selectedFont = 'Brandy';
            state.selectedFontFile = 'Fonts/Brandy.ttf';
        }
        
        renderFontList();
        update3DModel();
    });

    // Font category filter tabs (All, Cursive, Bold, Retro)
    const fontCatBtns = document.querySelectorAll('.font-cat-btn');
    if (fontCatBtns && fontCatBtns.length) {
        fontCatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fontCatBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                state.fontCategory = btn.dataset.cat || 'all';
                renderFontList();
            });
        });
    }

    // Font slot toggling for Word Art (Top font vs Bottom font)
    document.getElementById('btnSlotTop').addEventListener('click', (e) => {
        document.querySelectorAll('.slot-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.wordartActiveSlot = 'top';
        renderFontList();
    });
    
    document.getElementById('btnSlotBottom').addEventListener('click', (e) => {
        document.querySelectorAll('.slot-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.wordartActiveSlot = 'bottom';
        renderFontList();
    });

    // Text inputs
    el.nameInput.addEventListener('input', (e) => {
        // Letter Tiles are single capital letters by design — force caps there.
        // Every other product (keychain, nameplate, etc.) keeps the user's
        // own casing so names like "Priya" aren't shouted as "PRIYA".
        if (state.productType === 'tilekey') {
            setInputValuePreservingCaret(e.target, e.target.value.toUpperCase());
            state.name = e.target.value;
        } else {
            state.name = e.target.value;
        }
        el.charCount.textContent = state.name.length;
        update3DModel();
        refreshFontPreviews();   // re-render glyph previews with the typed name (debounced)
    });
    
    el.wordartLine1.addEventListener('input', (e) => {
        const val = e.target.value;
        el.charCount1.textContent = val.length;
        update3DModel();
    });
    
    el.wordartLine2.addEventListener('input', (e) => {
        setInputValuePreservingCaret(e.target, e.target.value.toUpperCase());
        const val = e.target.value;
        el.charCount2.textContent = val.length;
        update3DModel();
    });

    // Ring Position choices
    if(el.ringPosToggle) {
        el.ringPosToggle.querySelectorAll('.pos-opt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                el.ringPosToggle.querySelectorAll('.pos-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.ringAnchor = btn.dataset.val;   // 'top' | 'center'
                update3DModel();
            });
        });
    }

    // Word Art backing choice (None / Solid / Hollow)
    if (el.wordartBackingToggle) {
        el.wordartBackingToggle.querySelectorAll(".wa-backing-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.classList.contains("active")) return;
                el.wordartBackingToggle.querySelectorAll(".wa-backing-opt").forEach(b => {
                    b.classList.remove("active");
                    b.setAttribute("aria-selected", "false");
                });
                btn.classList.add("active");
                btn.setAttribute("aria-selected", "true");
                state.wordartBase = btn.dataset.mode;   // none | solid | hollow
                if (el.wordartBackingHint) {
                    el.wordartBackingHint.textContent =
                        WORDART_BACKING_HINTS[state.wordartBase] || WORDART_BACKING_HINTS.none;
                }
                applyProductTypeConstraints();
                update3DModel({
                    showLoading: state.wordartBase === 'hollow',
                    loadingMessage: 'Building hollow Word Art…',
                });   // rebuild -> new volume -> calculatePricing() reprices
            });
        });
    }

    // Desk Organizer Compartment Layout Toggle
    if (el.organizerLayoutToggle) {
        el.organizerLayoutToggle.querySelectorAll('.wa-backing-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                el.organizerLayoutToggle.querySelectorAll('.wa-backing-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.organizerLayout = btn.dataset.layout;
                update3DModel();
            });
        });
    }

    // Name Beads Shape Toggle
    if (el.beadShapeToggle) {
        el.beadShapeToggle.querySelectorAll('.wa-backing-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                el.beadShapeToggle.querySelectorAll('.wa-backing-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.beadShape = btn.dataset.shape;
                update3DModel();
            });
        });
    }

    // Name Beads Direction Toggle
    if (el.beadDirectionToggle) {
        el.beadDirectionToggle.querySelectorAll('.wa-backing-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                el.beadDirectionToggle.querySelectorAll('.wa-backing-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.beadDirection = btn.dataset.direction;
                update3DModel();
            });
        });
    }

    // Thickness choices
    if(el.thicknessToggle) {
        el.thicknessToggle.querySelectorAll('.pos-opt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                el.thicknessToggle.querySelectorAll('.pos-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.layers = btn.dataset.val;
                applyProductTypeConstraints();
                update3DModel();
            });
        });
    }

    // Quantity modifiers
    el.qtyMinus.addEventListener('click', () => {
        if (state.quantity > 1) {
            state.quantity--;
            el.qtyVal.textContent = state.quantity;
            calculatePricing();
        }
    });
    el.qtyPlus.addEventListener('click', () => {
        state.quantity++;
        el.qtyVal.textContent = state.quantity;
        calculatePricing();
    });

    // Payment triggers
    el.linkGPay.addEventListener('click', (e) => {
        e.preventDefault();
        openUPILink('gpay');
    });
    el.linkPhonePe.addEventListener('click', (e) => {
        e.preventDefault();
        openUPILink('phonepe');
    });

    if (el.btnAddToCart) {
        el.btnAddToCart.addEventListener('click', async () => {
            if (!productCanOrder()) {
                syncProductAvailability();
                return;
            }
            // Guard against a double tap creating two lines.
            if (el.btnAddToCart.disabled) return;
            const label = el.btnAddToCart.querySelector('.btn-text');
            const original = label ? label.textContent : '';
            el.btnAddToCart.disabled = true;
            try {
                if (state.crew.enabled) {
                    if (label) label.textContent = 'Preparing crew…';
                    const added = await addCrewToCart();
                    if (!added) {
                        if (label) label.textContent = original;
                        return;
                    }
                } else {
                    await Cart.add(buildCartLine());
                }
                if (label) label.textContent = 'Added ✓';
                updateCartBadge();
                // Brief confirmation in place, rather than yanking the customer to
                // the cart — most people add more than one design.
                setTimeout(() => {
                    if (label) {
                        label.textContent = state.crew.enabled
                            ? `Add ${state.crew.count}-member crew to cart`
                            : 'Add to cart';
                    }
                    el.btnAddToCart.disabled = !productCanOrder();
                }, 1400);
            } catch (err) {
                alert(err.message || 'Could not add this design to the cart.');
                if (label) label.textContent = original;
                el.btnAddToCart.disabled = !productCanOrder();
            }
        });
    }

    el.btnPlaceOrder.addEventListener('click', () => {
        if (!productCanOrder()) {
            syncProductAvailability();
            return;
        }
        // Validate form
        if (!el.custName.value.trim() || !el.custPhone.value.trim()) {
            alert('Please enter your Name and Phone Number to queue the order.');
            return;
        }
        if (!el.custPhone.value.match(/^[0-9]{10}$/)) {
            alert('Please enter a valid 10-digit Phone Number.');
            return;
        }
        
        triggerPaymentModal();
    });

    el.closePaymentModal.addEventListener('click', () => {
        el.paymentModal.classList.remove('active');
    });
    
    // Close modal on background tap
    el.paymentModal.addEventListener('click', (e) => {
        if (e.target === el.paymentModal) {
            el.paymentModal.classList.remove('active');
        }
    });

    // Order submit
    el.btnSubmitVerify.addEventListener('click', async () => {
        if (!productCanOrder()) {
            syncProductAvailability();
            return;
        }
        const txnId = el.upiTxnIdInput.value.trim();
        if (txnId.length !== 12 || !/^\d+$/.test(txnId)) {
            alert('Please enter your 12-digit numeric UPI Reference / Transaction ID to verify payment.');
            return;
        }

        el.btnSubmitVerify.disabled = true;
        el.btnSubmitVerify.textContent = 'Submitting order…';

        const activeFont = state.productType === 'wordart' 
            ? `${state.wordartTopFont}/${state.wordartBottomFont}` 
            : state.selectedFont;

        let baseColor = state.colors.base;
        let fontColor = state.colors.font;

        if (state.productType === 'wordart' || state.productType === 'loveseries') {
            baseColor = state.colors.base;
            fontColor = state.colors.font === state.colors.line2 
                ? state.colors.font 
                : `${state.colors.font}/${state.colors.line2}`;
        } else if (state.productType === 'tilekey') {
            fontColor = `${state.colors.font}/${state.colors.line2}`;
        } else if (state.productType === 'linked_initials') {
            baseColor = state.colors.font;
            fontColor = state.colors.line2;
        } else if (state.productType === 'keychain') {
            if (state.layers === '3L') {
                fontColor = `${state.colors.outline}/${state.colors.font}`;
            }
        }

        const payload = {
            name: el.custName.value.trim(),
            phone: el.custPhone.value.trim(),
            productType: state.productType,
            wordartBase: state.wordartBase,
            text: state.productType === 'wordart' ? `${el.wordartLine1.value}/${el.wordartLine2.value}` : state.name,
            font: activeFont,
            baseColor: baseColor,
            fontColor: fontColor,
            weightG: state.costs.weight,
            printTimeMins: state.costs.printTimeMins,
            materialCost: state.costs.materialCost,
            machineCost: state.costs.machineCost,
            laborCost: state.costs.laborCost,
            productionCost: state.costs.productionCost,
            finalAmount: state.costs.finalAmount * state.quantity,
            layers: state.layers,
            upiTxnId: txnId
        };

        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const resData = await response.json();
            
            if (resData.success) {
                // Redirect to success page
                const pickupMins = Math.ceil(state.costs.printTimeMins * state.quantity + 10); // +10min post process buffer
                const chargedAmount = (resData.order && resData.order.finalAmount) || payload.finalAmount;
                window.location.href = `order-success.html?orderNum=${resData.orderNum}&name=${encodeURIComponent(payload.name)}&time=${pickupMins}&amt=${chargedAmount}&qty=${state.quantity}`;
            } else {
                alert('Error submitting order: ' + (resData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Submit order failed:', err);
            alert('Server connection error. Please try again or inform kiosk staff.');
        } finally {
            el.btnSubmitVerify.disabled = false;
            el.btnSubmitVerify.textContent = 'Submit Order & Start Printing';
        }
    });
}

// ===== INITIALIZATION =====

async function init() {
    cacheElements();
    setupEvents();
    setupStepperNavClearance();
    setupMobileKeyboardStability();

    const filamentPromise = loadFilamentColours();
    const productAvailabilityPromise = loadCurrentProductAvailability();
    
    // Fetch active batches from server
    try {
        const response = await fetch('/api/batches');
        // A 503 (Supabase not configured) or 500 returns an error object, and
        // assigning that to activeBatches made calculatePricing's .find() throw
        // — which killed the whole price display, showing ₹0. Batches are an
        // optional promo; their failure must never take pricing down.
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) state.activeBatches = data;
        }
    } catch (err) {
        console.error('Failed to load active batches from server:', err);
    }

    const initialFilaments = await filamentPromise;
    await productAvailabilityPromise;
    applyFilamentCatalogue(initialFilaments);
    _filamentCatalogueSignature = filamentCatalogueSignature(initialFilaments);
    applyProductTypeConstraints();
    renderFontList();
    renderColorSwatches();
    setupFontStripNav();
    init3DViewer();
    update3DModelNow();
    renderStepper();
    syncProductAvailability();
    updateCartBadge();

    // If this browser has a signed-in session, load auth so Add to cart writes
    // to the SERVER cart. Without this, a signed-in customer's adds went to
    // localStorage here while cart.html listed the server cart — badge said 1,
    // cart page said empty. Non-blocking: anonymous walk-ups never pay the cost.
    bootAuthIfSession().then((signedIn) => {
        if (signedIn) updateCartBadge();
    });

    // Re-render the stepper when crossing the desktop/mobile breakpoint so the
    // layout switches between all-steps and wizard cleanly. Debounced.
    let _rsTimer = null;
    let lastDesktopLayout = isDesktop();
    window.addEventListener('resize', () => {
        clearTimeout(_rsTimer);
        _rsTimer = setTimeout(() => {
            const nextDesktopLayout = isDesktop();
            if (nextDesktopLayout !== lastDesktopLayout) {
                lastDesktopLayout = nextDesktopLayout;
                renderStepper();
            }
            if (
                document.body.classList.contains('mobile-keyboard-active')
                && !isTextEntryElement(document.activeElement)
            ) {
                finishMobileKeyboardSession();
            }
            syncStepperNavClearance();
        }, 200);
    });
    window.addEventListener('focus', () => refreshFilamentCatalogue());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshFilamentCatalogue();
    });
    window.addEventListener('storage', (event) => {
        if (event.key === 'filamentCatalogRevision') refreshFilamentCatalogue();
    });
}

window.addEventListener('DOMContentLoaded', init);
