/* =========================================
   YOURSGIFTS KIOSK — MAIN APP LOGIC
   Three.js Integration + Cost Engine + UPI
   ========================================= */

import { KeychainViewer } from './viewer3d.js';

// ===== DATA & CONFIG =====

const FONTS = [
    { name: 'Brandy',             label: 'Brandy',          file: 'Fonts/Brandy.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'CANAVAR',            label: 'Canavar',         file: 'Fonts/CANAVAR.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Super Bubble',       label: 'Super Bubble',    file: 'Fonts/Super Bubble.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Franxurter',         label: 'Franxurter',      file: 'Fonts/Franxurter.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Sunday Chillin',     label: 'Sunday Chillin',  file: 'Fonts/Sunday Chillin.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Quicksilver Italic', label: 'Quicksilver',     file: 'Fonts/Quicksilver Italic.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Retrow Mentho',      label: 'Retrow Mentho',   file: 'Fonts/Retrow Mentho.ttf', lang: 'en', tags: ['retro'] },
    { name: 'BagelFatOne',        label: 'Bagel Fat One',   file: 'Fonts/BagelFatOne-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Flockey',            label: 'Flockey',         file: 'Fonts/Flockey.ttf', lang: 'en', tags: ['bold'] },
    { name: 'OleoScript',         label: 'Oleo Script',     file: 'Fonts/OleoScript-Bold.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Rock Boys',          label: 'Rock Boys',       file: 'Fonts/Rock Boys.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Storm Catcher',      label: 'Storm Catcher',   file: 'Fonts/Storm Catcher.otf', lang: 'en', tags: ['retro'] },
    { name: 'Nature Beauty',      label: 'Nature Beauty',   file: 'Fonts/Nature Beauty.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Nasi',               label: 'Nasi',            file: 'Fonts/Nasi.otf', lang: 'en', tags: ['retro'] },
    { name: 'Baloo Thambi 2',     label: 'Baloo Thambi',    file: 'Fonts/BalooThambi2.ttf', lang: 'ta', tags: ['bold'] },
    { name: 'Hind Madurai',       label: 'Hind Madurai',    file: 'Fonts/HindMadurai.ttf', lang: 'ta', tags: ['retro'] },
    { name: 'Kavivanar',          label: 'Kavivanar',       file: 'Fonts/Kavivanar.ttf', lang: 'ta', tags: ['cursive'] },
    // Wavy Nametag Fonts
    { name: 'Chewy',              label: 'Chewy',           file: 'Fonts/Chewy-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Bebas Neue',         label: 'Bebas Neue',      file: 'Fonts/BebasNeue-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Lobster',            label: 'Lobster',         file: 'Fonts/Lobster-Regular.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Pacifico',           label: 'Pacifico',        file: 'Fonts/Pacifico-Regular.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Raleway',            label: 'Raleway',         file: 'Fonts/Raleway-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Oswald',             label: 'Oswald',          file: 'Fonts/Oswald-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Anton',              label: 'Anton',           file: 'Fonts/Anton-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Archivo Black',      label: 'Archivo Black',   file: 'Fonts/ArchivoBlack-Regular.ttf', lang: 'en', tags: ['bold'] }
];

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

// Pricing Constants (Exact Achuva Model)
const MATERIAL_RATE     = 1.50; // ₹ per gram
const MACHINE_RATE      = 25.00; // ₹ per hour (depreciation + power + maintenance)
const SETUP_PER_BATCH   = 30.00; // ₹ per batch setup cost
const POST_PROCESS      = 5.00; // ₹ per item cleanup
const FAILURE_BUFFER    = 1.10; // 10% buffer
const DEFAULT_BATCH_SIZE = 5;

const UPI_VPA = 'sakthivelprabakaran311-1@okaxis';

// ===== STATE =====

const state = {
    name: 'SAMPLE',
    productType: 'keychain', // default
    lang: 'en',
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
    
    quantity: 1,
    ringPosition: 'left',
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
    el.autoRotate      = document.getElementById('autoRotateToggle');
    el.rotateIcon      = document.getElementById('rotateIcon');
    el.toggleFDM       = document.getElementById('toggleFDM');
    
    el.productTitle    = document.getElementById('productTitle');
    el.productSubtitle = document.getElementById('productSubtitle');
    
    el.nameInput       = document.getElementById('nameInput');
    el.charCount       = document.getElementById('charCount');
    el.singleInputContainer = document.getElementById('singleInputContainer');
    el.dualInputsContainer  = document.getElementById('dualInputsContainer');
    el.wordartLine1    = document.getElementById('wordartLine1');
    el.wordartLine2    = document.getElementById('wordartLine2');
    el.charCount1      = document.getElementById('charCount1');
    el.charCount2      = document.getElementById('charCount2');
    el.wordartHint     = document.getElementById('wordartHint');
    
    el.langToggle      = document.getElementById('langToggleBtn');
    el.fontSlotTabs    = document.getElementById('wordartSlotTabs');
    el.fontStrip       = document.getElementById('fontSelectorStrip');
    
    el.baseColorRow    = document.getElementById('baseColorRow');
    el.fontColorRow    = document.getElementById('fontColorRow');
    el.outlineColorRow = document.getElementById('outlineColorRow');
    el.line2ColorRow   = document.getElementById('line2ColorRow');
    
    el.baseSwatches    = document.getElementById('baseSwatches');
    el.fontSwatches    = document.getElementById('fontSwatches');
    el.outlineSwatches = document.getElementById('outlineSwatches');
    el.line2Swatches   = document.getElementById('line2Swatches');
    
    el.ringPositionSection = document.getElementById('ringPositionSection');
    el.ringPosToggle   = document.getElementById('ringPosToggle');
    
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

async function update3DModel() {
    if (!viewer) return;
    
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
        showFDMTexture: state.showFDMTexture
    };
    
    try {
        await viewer.update(
            nameText,
            fontPath,
            colorsPayload,
            '3L', // standard 3 layer customizer
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
    }
}

// ===== PRICING ENGINE =====

function calculatePricing() {
    if (!state.dims) return;
    
    const weight = state.dims.weightGrams || 2.0; // fallback if zero
    
    // 1. Check if user's color combo matches any active printing batches
    const customerComboName = `${state.colors.base.toUpperCase()}/${state.colors.font.toUpperCase()}`;
    const matchedBatch = state.activeBatches.find(b => {
        // For wordart or letter tiles, base color is relevant. For standard, base color + font color matter.
        return b.baseColor.toLowerCase() === state.colors.base.toLowerCase() &&
               b.fontColor.toLowerCase() === state.colors.font.toLowerCase();
    });
    
    let batchSize = DEFAULT_BATCH_SIZE;
    if (matchedBatch) {
        batchSize = matchedBatch.count >= 5 ? matchedBatch.count : 5;
        state.matchedBatchSize = batchSize;
        
        // Show success alert
        el.batchPromoAlert.style.display = 'flex';
        el.batchPromoAlertMsg.textContent = `Excellent! A batch of ${matchedBatch.name} is printing. Per-item setup fee drops from ₹30 to ₹${(SETUP_PER_BATCH / batchSize).toFixed(0)}!`;
    } else {
        state.matchedBatchSize = null;
        el.batchPromoAlert.style.display = 'none';
    }
    
    // 2. Calculations based on Achuva cost formulas
    // printTime = (weight / 9g per hour) * 60 min
    const printTimeMins = (weight / 9.0) * 60;
    
    const materialCost = weight * MATERIAL_RATE;
    const machineCost = (printTimeMins / 60) * MACHINE_RATE;
    const laborCost = (SETUP_PER_BATCH / batchSize) + POST_PROCESS;
    
    const productionCost = materialCost + machineCost + laborCost;
    const finalAmount = Math.ceil(productionCost * FAILURE_BUFFER);
    
    // Save to state
    state.costs = {
        weight: Math.round(weight * 10) / 10,
        printTimeMins: Math.round(printTimeMins),
        materialCost: Math.round(materialCost),
        machineCost: Math.round(machineCost),
        laborCost: Math.round(laborCost),
        productionCost: Math.round(productionCost),
        finalAmount: finalAmount
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

// ===== UI RENDERERS =====

function renderFontList() {
    el.fontStrip.innerHTML = '';
    
    const filtered = FONTS.filter(f => f.lang === state.lang);
    
    filtered.forEach(font => {
        const isSelected = (state.productType === 'wordart') 
            ? (state.wordartActiveSlot === 'top' ? state.wordartTopFont === font.name : state.wordartBottomFont === font.name)
            : (state.selectedFont === font.name);
            
        const card = document.createElement('div');
        card.className = `font-card ${isSelected ? 'selected' : ''}`;
        card.dataset.name = font.name;
        card.dataset.file = font.file;
        
        // Preview styled representation
        const pText = document.createElement('span');
        pText.className = 'font-preview-text';
        pText.textContent = 'Abc';
        
        // Try applying font preview dynamically if supported, else default styling
        pText.style.fontFamily = `"${font.name}", sans-serif`;
        
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
    });
}

function renderColorSwatches() {
    const swatchesConfigs = [
        { container: el.baseSwatches, palette: COLOR_PALETTES.base, key: 'base' },
        { container: el.fontSwatches, palette: COLOR_PALETTES.font, key: 'font' },
        { container: el.outlineSwatches, palette: COLOR_PALETTES.outline, key: 'outline' },
        { container: el.line2Swatches, palette: COLOR_PALETTES.line2, key: 'line2' }
    ];
    
    swatchesConfigs.forEach(conf => {
        conf.container.innerHTML = '';
        conf.palette.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = `swatch ${state.colors[conf.key].toLowerCase() === color.hex.toLowerCase() ? 'selected' : ''}`;
            swatch.style.backgroundColor = color.hex;
            swatch.title = color.label;
            
            swatch.addEventListener('click', () => {
                conf.container.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                state.colors[conf.key] = color.hex;
                
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
    const isBordered   = state.productType === 'bordered_keychain';
    const isSupported  = state.productType === 'supported_text';
    const isFlower     = state.productType === 'flower_keychain';
    const isWordartLike = isWordart || isLoveSeries;

    // Toggle Input visibility
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
        } else if (isFlower) {
            el.nameInput.maxLength = 1;
            state.name = state.name.substring(0, 1);
        } else {
            el.nameInput.maxLength = 15;
        }
        el.nameInput.value = state.name;
        el.charCount.textContent = state.name.length;
    }

    // Toggle Font tab slot select (Wordart line 1 vs line 2)
    el.fontSlotTabs.style.display = isWordart ? 'flex' : 'none';

    // Show/Hide keyring position selector
    const hasRing = state.productType === 'keychain' || state.productType === 'tilekey' || state.productType === 'linked_initials' || state.productType === 'nametag' || isBordered || isFlower;
    el.ringPositionSection.style.display = hasRing ? 'block' : 'none';

    // Toggle Color rows depending on item style
    if (isTileKey) {
        el.line2ColorRow.style.display   = 'flex';
        el.baseColorRow.style.display    = 'flex';
        el.outlineColorRow.style.display = 'none';
    } else if (isLinkedInitials) {
        el.line2ColorRow.style.display   = 'flex';
        el.baseColorRow.style.display    = 'none';
        el.outlineColorRow.style.display = 'none';
    } else if (isNametag || isGirly || isBordered || isFlower) {
        el.line2ColorRow.style.display   = 'none';
        el.baseColorRow.style.display    = 'flex';
        el.outlineColorRow.style.display = 'none';
    } else if (isSupported) {
        el.line2ColorRow.style.display   = 'none';
        el.baseColorRow.style.display    = 'none';
        el.outlineColorRow.style.display = 'none';
    } else {
        el.line2ColorRow.style.display   = isWordartLike ? 'flex' : 'none';
        el.baseColorRow.style.display    = isWordartLike ? 'none' : 'flex';
        el.outlineColorRow.style.display = 'flex'; // Standard 3-layer has outlines
    }

    // Update Product Details Title
    let titleStr = "Classic Keychain";
    let subStr = "Standard, sturdy extruded letters keychain";
    switch (state.productType) {
        case 'bordered_keychain':
            titleStr = "Bordered Keychain";
            subStr = "Enclosed text in a customized raised outer frame";
            break;
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
    }
    el.productTitle.textContent = titleStr;
    el.productSubtitle.textContent = subStr;
}

// ===== UPI INITIATOR =====

function openUPILink(app) {
    const orderAmt = state.costs.finalAmount * state.quantity;
    const note = `KSK-${state.productType.substring(0,3).toUpperCase()}-${state.name.substring(0,5).toUpperCase()}`.replace(/\s+/g, '');
    
    // Standard cross-platform UPI scheme (supported by both Android and iOS)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent('YoursGifts')}&am=${orderAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    window.location.href = upiUrl;
}


function triggerPaymentModal() {
    const orderAmt = state.costs.finalAmount * state.quantity;
    const note = `KSK-${state.productType.substring(0,3).toUpperCase()}-${state.name.substring(0,5).toUpperCase()}`.replace(/\s+/g, '');
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent('YoursGifts')}&am=${orderAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    el.modalPayAmt.textContent = `₹${orderAmt}`;
    
    // Set up app links
    el.linkGenericUPI.href = upiUrl;
    
    // Set up QR Code fallback (public API generator)
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    el.upiQRCode.src = qrApi;
    
    // Open modal
    el.paymentModal.classList.add('active');
}

// ===== EVENT BINDINGS =====

function setupEvents() {
    // URL Query check for product type
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam) {
        state.productType = typeParam;
    }
    
    // Auto-rotate
    el.autoRotate.addEventListener('click', () => {
        const active = viewer.toggleAutoRotate();
        el.autoRotate.classList.toggle('active', active);
        el.rotateIcon.textContent = active ? '🔄' : '⏸️';
    });
    
    // FDM Texture toggle
    el.toggleFDM.addEventListener('click', () => {
        state.showFDMTexture = !state.showFDMTexture;
        el.toggleFDM.classList.toggle('active', state.showFDMTexture);
        update3DModel();
    });
    
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
        state.name = e.target.value.toUpperCase();
        e.target.value = state.name; // enforce uppercase in input field
        el.charCount.textContent = state.name.length;
        update3DModel();
    });
    
    el.wordartLine1.addEventListener('input', (e) => {
        const val = e.target.value;
        el.charCount1.textContent = val.length;
        update3DModel();
    });
    
    el.wordartLine2.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        e.target.value = val;
        el.charCount2.textContent = val.length;
        update3DModel();
    });

    // Ring Position choices
    el.ringPosToggle.querySelectorAll('.pos-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            el.ringPosToggle.querySelectorAll('.pos-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.ringPosition = btn.dataset.val;
            update3DModel();
        });
    });

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

        const payload = {
            name: el.custName.value.trim(),
            phone: el.custPhone.value.trim(),
            productType: state.productType,
            text: state.productType === 'wordart' ? `${el.wordartLine1.value}/${el.wordartLine2.value}` : state.name,
            font: activeFont,
            baseColor: state.colors.base,
            fontColor: state.colors.font,
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
    init3DViewer();
    update3DModel();
}

window.addEventListener('DOMContentLoaded', init);
