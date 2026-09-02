/* =========================================
   KOOTZY KIOSK — MAIN APP LOGIC
   Three.js Integration + Cost Engine + UPI
   ========================================= */

import { KeychainViewer } from './viewer3d.js?v=wa2';
import * as Cart from './cart.js?v=kootzy1';
import * as Pricing from './pricing.js?v=kootzy1';

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

const COLOR_PALETTES = {
    base: [
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#000000', label: 'Black' },
        { hex: '#FFFFFF', label: 'White' }
    ],
    font: [
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#000000', label: 'Black' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' }
    ],
    outline: [
        { hex: '#000000', label: 'Black' },
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' }
    ],
    line2: [
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#000000', label: 'Black' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' }
    ]
};

// Pricing comes from the shared module — the same file the server imports at
// checkout, so the number shown here is the number charged. The constants that
// used to live here (MATERIAL_RATE etc.) moved into Pricing.RATES.
const SETUP_PER_BATCH    = Pricing.RATES.SETUP_PER_BATCH;
const DEFAULT_BATCH_SIZE = Pricing.RATES.DEFAULT_BATCH_SIZE;

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
        base: '#ff9933',
        font: '#FFFFFF',
        outline: '#000000',
        line2: '#FFD700'
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
    costs: null
};

// ===== DOM ELEMENTS =====

const el = {};

function cacheElements() {
    el.viewerCanvas    = document.getElementById('viewer3dCanvas');
    el.viewerLoading   = document.getElementById('viewerLoading');
    el.dragHint        = document.getElementById('dragHint');
    
    el.productTitle    = document.getElementById('productTitle');
    el.productSubtitle = document.getElementById('productSubtitle');
    
    el.stepDots        = document.querySelectorAll('.step-dot');
    el.stepLines       = document.querySelectorAll('.stepper-line');
    el.stepperText     = document.getElementById('stepperTextIndicator');
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

function init3DViewer() {
    if (!viewer) {
        viewer = new KeychainViewer(el.viewerCanvas);
    }
}

// Debounced entry point. Rapid calls (typing, slider drags) collapse into a single
// rebuild ~180ms after the last change. While a build is running, further calls set
// a "dirty" flag so exactly one more rebuild runs after it finishes — no pile-up.
var _update3DTimer   = null;
var _update3DRunning = false;
var _update3DDirty   = false;

function update3DModel() {
    if (_update3DRunning) { _update3DDirty = true; return; }
    clearTimeout(_update3DTimer);
    _update3DTimer = setTimeout(_runUpdate3D, 180);
}

// Force an immediate rebuild with no debounce (used on init / product switch).
function update3DModelNow() {
    clearTimeout(_update3DTimer);
    if (_update3DRunning) { _update3DDirty = true; return; }
    _runUpdate3D();
}

async function _runUpdate3D() {
    if (!viewer) return;
    if (_update3DRunning) { _update3DDirty = true; return; }
    _update3DRunning = true;
    _update3DDirty = false;

    el.viewerLoading.style.display = 'flex';

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
        calculatePricing();
    } catch (err) {
        console.error('Failed to update 3D model:', err);
    } finally {
        el.viewerLoading.style.display = 'none';
        _update3DRunning = false;
        // Coalesced changes arrived mid-build → run exactly one more rebuild.
        if (_update3DDirty) {
            _update3DDirty = false;
            _update3DTimer = setTimeout(_runUpdate3D, 0);
        }
    }
}

// ===== PRICING ENGINE =====

function calculatePricing() {
    if (!state.dims) return;
    
    const weight = state.dims.weightGrams || 2.0; // fallback if zero
    
    // 1. Check if user's color combo matches any active printing batches
    const matchedBatch = state.activeBatches.find(b => {
        const bBase = b.baseColor.toLowerCase();
        const bFont = b.fontColor.toLowerCase();
        const sBase = state.colors.base.toLowerCase();
        const sFont = state.colors.font.toLowerCase();
        const sOutline = state.colors.outline ? state.colors.outline.toLowerCase() : '';

        // If standard 3-layer keychain
        if (state.productType === 'keychain' && state.layers === '3L') {
            if (bFont.includes('/')) {
                return bBase === sBase && bFont === `${sOutline}/${sFont}`;
            }
            return bBase === sBase && bFont === sFont;
        }

        // Wordart or Loveseries
        if (state.productType === 'wordart' || state.productType === 'loveseries') {
            const sLine2 = state.colors.line2 ? state.colors.line2.toLowerCase() : '';
            if (bFont.includes('/')) {
                return bBase === sOutline && bFont === `${sFont}/${sLine2}`;
            }
            return bBase === sOutline && (bFont === sFont || bFont === sLine2);
        }

        // Tilekey
        if (state.productType === 'tilekey') {
            const sLine2 = state.colors.line2 ? state.colors.line2.toLowerCase() : '';
            if (bFont.includes('/')) {
                return bBase === sBase && bFont === `${sFont}/${sLine2}`;
            }
            return bBase === sBase && (bFont === sFont || bFont === sLine2);
        }

        // Default 2-layer match
        return bBase === sBase && bFont === sFont;
    });
    
    let batchSize = DEFAULT_BATCH_SIZE;
    if (matchedBatch) {
        batchSize = matchedBatch.count >= 5 ? matchedBatch.count : 5;
        state.matchedBatchSize = batchSize;
        
        // Show success alert
        if (state.currentStep === 3) {
            el.batchPromoAlert.style.display = 'flex';
        }
        el.batchPromoAlertMsg.textContent = `Excellent! A batch of ${matchedBatch.name} is printing. Per-item setup fee drops from ₹30 to ₹${(SETUP_PER_BATCH / batchSize).toFixed(0)}!`;
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

// Desktop shows every step at once in one scrolling sidebar; mobile keeps
// the step-by-step wizard. Single source of truth for the breakpoint.
function isDesktop() { return window.matchMedia('(min-width: 880px)').matches; }

function renderStepper() {
    const desktop = isDesktop();
    document.body.classList.toggle('all-steps', desktop);

    if (desktop) {
        // Show ALL steps in the sidebar (respecting the conditional sections).
        document.querySelectorAll('[data-step]').forEach(elem => {
            if (elem.id === 'ringPositionSection' && !state.hasRing) { elem.style.display = 'none'; return; }
            if (elem.id === 'batchPromoAlert' && !state.matchedBatchSize) { elem.style.display = 'none'; return; }
            elem.style.display = '';
        });
    } else {
        // Mobile wizard: hide all, show only the current step.
        document.querySelectorAll('[data-step]').forEach(elem => { elem.style.display = 'none'; });
        document.querySelectorAll(`[data-step="${state.currentStep}"]`).forEach(elem => {
            if (elem.id === 'ringPositionSection' && !state.hasRing) return;
            if (elem.id === 'batchPromoAlert' && !state.matchedBatchSize) return;
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
    if(el.stepperText) el.stepperText.textContent = stepTitles[state.currentStep];

    // Update Buttons
    // The Add to cart button tracks the Pay button: both belong to the final
    // review step (and to every step on desktop, where all steps are visible).
    const showCheckoutButtons = (visible) => {
        if (el.btnPlaceOrder) el.btnPlaceOrder.style.display = visible ? 'flex' : 'none';
        if (el.btnAddToCart)  el.btnAddToCart.style.display  = visible ? 'inline-flex' : 'none';
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
        if(el.btnNextStep) el.btnNextStep.textContent = 'Next: Font';
        showCheckoutButtons(false);
    } else if (state.currentStep === 2) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = '';
        if(el.btnNextStep) el.btnNextStep.textContent = 'Next: Colors';
        showCheckoutButtons(false);
    } else if (state.currentStep === 3) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = '';
        if(el.btnNextStep) el.btnNextStep.textContent = 'Next: Review & Pay';
        showCheckoutButtons(false);
    } else if (state.currentStep === 4) {
        if(el.btnPrevStep) el.btnPrevStep.style.visibility = 'visible';
        if(el.btnNextStep) el.btnNextStep.style.display = 'none';
        showCheckoutButtons(true);
    }
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
            const swatch = document.createElement('div');
            swatch.className = `swatch ${isSelected ? 'selected' : ''}`;
            swatch.style.backgroundColor = color.hex;
            swatch.title = color.label;
            swatch.setAttribute('aria-label', color.label);
            
            swatch.addEventListener('click', () => {
                conf.container.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                state.colors[conf.key] = color.hex;
                if (conf.key === 'base') {
                    state.colors.outline = color.hex;
                }
                if (conf.badge) {
                    conf.badge.textContent = color.label;
                }
                update3DModel();
            });
            
            conf.container.appendChild(swatch);
        });
    });
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
            state.colors.base = '#FFFFFF';    // White base plate & inset floor
            state.colors.font = '#3A88FE';    // Light blue rim & bubble text
            state.colors.outline = '#FFFFFF';
        } else if (isDeskOrganizer) {
            el.nameInput.maxLength = 12;
            state.name = state.name || 'ALEX';
            state.selectedFont = state.selectedFont || 'BagelFatOne';
            state.colors.base = state.colors.base || '#FFFFFF';     // Main box body
            state.colors.font = state.colors.font || '#FF1F4B';     // Name text color
            state.colors.outline = state.colors.outline || '#FFFFFF';
        } else if (isBeads) {
            el.nameInput.maxLength = 10;
            state.name = state.name || 'EMMA';
            state.selectedFont = state.selectedFont || 'Lilita One';
            state.colors.base = state.colors.base || '#00C8FF';     // Bead Body color
            state.colors.font = state.colors.font || '#FFFFFF';     // Embossed letter color
            state.colors.outline = state.colors.outline || '#00C8FF';
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
    if (el.ringPositionSection) {
        el.ringPositionSection.style.display = (state.currentStep === 3 && hasRing) ? 'block' : 'none';
    }

    // Toggle Thickness toggle (only relevant for standard keychain)
    if (el.thicknessToggle && el.thicknessToggle.parentElement) {
        const isStandardKeychain = state.productType === 'keychain';
        el.thicknessToggle.parentElement.style.display = isStandardKeychain ? 'block' : 'none';
    }

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
        colors: { ...state.colors },
        ringPosition: state.ringPosition,
        ringAnchor: state.ringAnchor,
        showFDMTexture: state.showFDMTexture,
    };

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

// ===== EVENT BINDINGS =====

function setupEvents() {
    // Stepper Navigation
    if(el.btnNextStep) {
        el.btnNextStep.addEventListener('click', () => {
            // Validation before proceeding
            if (state.currentStep === 1) {
                if (state.productType === 'wordart') {
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
                const targetStep = parseInt(dot.dataset.step);
                if (targetStep && targetStep !== state.currentStep) {
                    if (targetStep > 1 && state.currentStep === 1) {
                        if (state.productType === 'wordart') {
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
                update3DModel();   // rebuild -> new volume -> calculatePricing() reprices
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
            // Guard against a double tap creating two lines.
            if (el.btnAddToCart.disabled) return;
            const label = el.btnAddToCart.querySelector('.btn-text');
            const original = label ? label.textContent : '';
            el.btnAddToCart.disabled = true;
            try {
                await Cart.add(buildCartLine());
                if (label) label.textContent = 'Added ✓';
                updateCartBadge();
                // Brief confirmation in place, rather than yanking the customer to
                // the cart — most people add more than one design.
                setTimeout(() => {
                    if (label) label.textContent = original;
                    el.btnAddToCart.disabled = false;
                }, 1400);
            } catch (err) {
                alert(err.message || 'Could not add this design to the cart.');
                if (label) label.textContent = original;
                el.btnAddToCart.disabled = false;
            }
        });
    }

    el.btnPlaceOrder.addEventListener('click', () => {
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
            batchSize: state.matchedBatchSize || DEFAULT_BATCH_SIZE,
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
                window.location.href = `order-success.html?orderNum=${resData.orderNum}&name=${encodeURIComponent(payload.name)}&time=${pickupMins}&amt=${payload.finalAmount}&qty=${state.quantity}`;
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
    applyProductTypeConstraints();
    
    // Fetch active batches from server
    try {
        const response = await fetch('/api/batches');
        state.activeBatches = await response.json();
    } catch (err) {
        console.error('Failed to load active batches from server:', err);
    }
    
    renderFontList();
    renderColorSwatches();
    setupFontStripNav();
    init3DViewer();
    update3DModelNow();
    renderStepper();
    updateCartBadge();

    // Re-render the stepper when crossing the desktop/mobile breakpoint so the
    // layout switches between all-steps and wizard cleanly. Debounced.
    let _rsTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(_rsTimer);
        _rsTimer = setTimeout(renderStepper, 200);
    });
}

window.addEventListener('DOMContentLoaded', init);
