import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const visualDir = path.resolve(
    process.env.CUSTOMIZER_VISUAL_DIR || path.join(os.tmpdir(), 'kootzy-customizer-functional'),
);
const allProducts = [
    'bubble_keychain',
    'keychain',
    'flower_keychain',
    'nametag',
    'girly_keychain',
    'tilekey',
    'linked_initials',
    'name_beads',
    'supported_text',
    'wordart',
    'loveseries',
    'nameplate',
    'led_word_stand',
    'desk_organizer',
    'led_word_art',
];
const products = process.env.CREW_ONLY === '1' ? ['keychain'] : allProducts;
const mobileViewport = process.env.CUSTOMIZER_MOBILE === '1';
const expectedRoles = {
    bubble_keychain: ['base', 'font'],
    keychain: ['base', 'font', 'outline'],
    flower_keychain: ['base', 'font'],
    nametag: ['base'],
    girly_keychain: ['base', 'font'],
    tilekey: ['base', 'font', 'line2'],
    linked_initials: ['font', 'line2'],
    name_beads: ['base', 'font'],
    supported_text: ['font'],
    wordart: ['base', 'font', 'line2'],
    loveseries: ['base', 'font', 'line2'],
    nameplate: ['base', 'font', 'outline'],
    led_word_stand: ['base', 'font'],
    desk_organizer: ['base', 'font', 'outline'],
    led_word_art: ['base', 'font'],
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolve(address.port));
        });
    });
}

function findChrome() {
    return [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

async function waitForJson(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
            if (response.ok) return response.json();
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

class CdpClient {
    constructor(socket) {
        this.socket = socket;
        this.nextId = 1;
        this.pending = new Map();
        this.events = [];
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(String(event.data));
            if (!message.id) {
                this.events.push(message);
                return;
            }
            const pending = this.pending.get(message.id);
            if (!pending) return;
            this.pending.delete(message.id);
            if (message.error) pending.reject(new Error(message.error.message));
            else pending.resolve(message.result || {});
        });
    }

    static connect(url) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);
            socket.addEventListener('open', () => resolve(new CdpClient(socket)), { once: true });
            socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome CDP.')), { once: true });
        });
    }

    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression, awaitPromise = true) {
        const response = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise,
            returnByValue: true,
        });
        if (response.exceptionDetails) {
            throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        }
        return response.result?.value;
    }
}

async function waitForServer(origin, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(1000) });
            if (response.ok) return;
        } catch (_) {
            // Keep polling while the local server starts.
        }
        await delay(100);
    }
    throw new Error('Local test server did not start.');
}

const chrome = findChrome();
if (!chrome) throw new Error('Chrome or Edge is required for the customizer browser functional test.');

const appPort = await freePort();
const debugPort = await freePort();
const origin = `http://127.0.0.1:${appPort}`;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kootzy-customizer-chrome-'));
fs.mkdirSync(visualDir, { recursive: true });

const server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(appPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
});
const browser = spawn(chrome, [
    '--headless=new',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--enable-gpu',
    '--window-size=1440,1000',
    '--force-device-scale-factor=1',
    `--remote-debugging-port=${debugPort}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profileDir}`,
    'about:blank',
], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
});

let cdp;
try {
    await waitForServer(origin);
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find((item) => item.type === 'page');
    assert(target?.webSocketDebuggerUrl, 'Chrome page target was not found.');

    cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    if (mobileViewport) {
        await cdp.send('Emulation.setUserAgentOverride', {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
        });
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true,
            screenWidth: 390,
            screenHeight: 844,
        });
        await cdp.send('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 5,
        });
    }

    const results = [];
    for (const [productIndex, productType] of products.entries()) {
        await cdp.send('Page.navigate', {
            url: `${origin}/customize.html?type=${encodeURIComponent(productType)}&functionalTest=1`,
        });

        const ready = await cdp.evaluate(`(async () => {
            const deadline = performance.now() + 90000;
            while (!window.__kootzyCustomizer && performance.now() < deadline) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            if (!window.__kootzyCustomizer) throw new Error('Customizer test API did not initialize.');
            return window.__kootzyCustomizer.waitForIdle(90000);
        })()`);
        assert.equal(ready.productType, productType);
        assert.deepEqual([...ready.visibleColorRoles].sort(), [...expectedRoles[productType]].sort());

        const result = await cdp.evaluate(`(async () => {
            const expectedRoles = ${JSON.stringify(expectedRoles[productType])};
            const collectSwatches = () => Object.fromEntries(expectedRoles.map((role) => [
                role,
                [...document.querySelectorAll('[data-color-role="' + role + '"]')],
            ]));
            let swatches = collectSwatches();
            for (const role of expectedRoles) {
                if (swatches[role].length !== 9) {
                    throw new Error(role + ' has ' + swatches[role].length + ' colors instead of 9.');
                }
            }

            let fastPathProbe = null;
            if (${JSON.stringify(productType)} === 'wordart') {
                const line1 = document.querySelector('#wordartLine1');
                const line2 = document.querySelector('#wordartLine2');
                line1.value = 'VIVI';
                line2.value = 'THA';
                line1.dispatchEvent(new Event('input', { bubbles: true }));
                line2.dispatchEvent(new Event('input', { bubbles: true }));
                await window.__kootzyCustomizer.waitForIdle(90000);

                document.querySelector('#wordartBackingToggle [data-mode="hollow"]').click();
                await window.__kootzyCustomizer.waitForIdle(90000);
                // The backing-mode handler reapplies product constraints and
                // recreates swatch buttons, so collect the live DOM nodes again.
                swatches = collectSwatches();

                const before = window.__kootzyCustomizer.snapshot();
                const viewerBefore = window.__kootzyViewer;
                const fastPathReadyBefore = Boolean(
                    viewerBefore?._wordartColorMaterials
                    && viewerBefore?._lastParams?.productType === 'wordart'
                );
                const registryCountsBefore = Object.fromEntries(
                    Object.entries(viewerBefore?._wordartColorMaterials || {})
                        .map(([role, materials]) => [role, materials.length])
                );
                const target = swatches.base.find((button) =>
                    button.dataset.colorHex !== before.colors.base.toUpperCase()
                );
                const started = performance.now();
                target.click();
                const elapsedMs = performance.now() - started;
                const after = window.__kootzyCustomizer.snapshot();
                fastPathProbe = {
                    elapsedMs,
                    fastPathReadyBefore,
                    registryCountsBefore,
                    lastProductTypeBefore: viewerBefore?._lastParams?.productType || null,
                    sameModel: before.modelUuid === after.modelUuid,
                    sameGeometry: JSON.stringify(before.geometryUuids) === JSON.stringify(after.geometryUuids),
                    sameDimensions: JSON.stringify(before.dimensions) === JSON.stringify(after.dimensions),
                    idle: after.idle,
                    updateState: after.updateState,
                    loadingVisible: after.loadingVisible,
                };
                if (!fastPathProbe.sameModel || !fastPathProbe.sameGeometry || !fastPathProbe.sameDimensions) {
                    throw new Error('Word Art color update rebuilt or changed geometry.');
                }
                if (!fastPathProbe.idle || fastPathProbe.loadingVisible) {
                    throw new Error(
                        'Word Art color update entered the blocking rebuild/loading path: '
                        + JSON.stringify(fastPathProbe)
                    );
                }
                if (elapsedMs >= 50) {
                    throw new Error('Word Art color update took ' + elapsedMs.toFixed(1) + 'ms.');
                }
            }

            let colorCases = 0;
            const exercise = (roleIndex) => {
                if (roleIndex === expectedRoles.length) {
                    colorCases += 1;
                    const snapshot = window.__kootzyCustomizer.snapshot();
                    for (const role of expectedRoles) {
                        const selected = document.querySelectorAll(
                            '[data-color-role="' + role + '"].selected[aria-pressed="true"]'
                        );
                        if (selected.length !== 1) throw new Error(role + ' does not have exactly one selected swatch.');
                        if (snapshot.colors[role].toUpperCase() !== selected[0].dataset.colorHex) {
                            throw new Error(role + ' state and selected swatch disagree.');
                        }
                    }
                    return;
                }
                const role = expectedRoles[roleIndex];
                for (const button of swatches[role]) {
                    button.click();
                    exercise(roleIndex + 1);
                }
            };
            exercise(0);

            const optionGroups = [
                'wordartBackingToggle',
                'organizerLayoutToggle',
                'beadShapeToggle',
                'beadDirectionToggle',
                'ringPosToggle',
                'thicknessToggle',
            ];
            const exercisedOptions = {};
            let hollowImmediate = null;
            for (const id of optionGroups) {
                const group = document.getElementById(id);
                if (!group || getComputedStyle(group).display === 'none'
                    || getComputedStyle(group.closest('[id$="Row"], [data-step], .step-card') || group).display === 'none') {
                    continue;
                }
                const buttons = [...group.querySelectorAll('button')];
                exercisedOptions[id] = buttons.length;
                for (const button of buttons) {
                    button.click();
                    if (button.dataset.mode === 'hollow') {
                        const loading = window.__kootzyCustomizer.snapshot();
                        hollowImmediate = {
                            visible: loading.loadingVisible,
                            text: loading.loadingText,
                            busy: document.getElementById('viewer3dCanvas').getAttribute('aria-busy'),
                        };
                    }
                    const active = button.classList.contains('active')
                        || button.getAttribute('aria-selected') === 'true';
                    if (!active) throw new Error(id + ' option did not become active.');
                }
            }

            const optionCoverage = {
                textInputs: 0,
                fontCategories: 0,
                fonts: 0,
                language: 0,
                quantity: 0,
                dimensions: 0,
            };
            const editableInputs = ['nameInput', 'wordartLine1', 'wordartLine2']
                .map((id) => document.getElementById(id))
                .filter((input) => input && input.getClientRects().length > 0);
            for (const input of editableInputs) {
                const before = input.value;
                input.value = input.id === 'wordartLine2' ? 'ART' : 'TEST';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                if (input.value === before) throw new Error(input.id + ' did not accept text input.');
                optionCoverage.textInputs += 1;
            }

            const allCategory = document.querySelector('.font-cat-btn[data-cat="all"]');
            for (const category of document.querySelectorAll('.font-cat-btn')) {
                category.click();
                if (category.getAttribute('aria-selected') !== 'true') {
                    throw new Error('Font category did not become selected.');
                }
                optionCoverage.fontCategories += 1;
            }
            allCategory?.click();
            const fontCards = [...document.querySelectorAll('.font-card')];
            for (const card of fontCards) {
                card.click();
                if (!card.classList.contains('selected')) throw new Error('Font card did not become selected.');
                optionCoverage.fonts += 1;
            }

            const language = document.getElementById('langToggleBtn');
            if (language && getComputedStyle(language).display !== 'none') {
                const initial = language.textContent;
                language.click();
                if (language.textContent === initial) throw new Error('Language toggle did not change.');
                language.click();
                optionCoverage.language = 2;
            }

            const quantity = document.getElementById('qtyVal');
            const plus = document.getElementById('qtyPlus');
            const minus = document.getElementById('qtyMinus');
            if (quantity && plus && minus) {
                const initial = Number(quantity.textContent);
                plus.click();
                if (Number(quantity.textContent) !== initial + 1) throw new Error('Quantity plus did not increment.');
                minus.click();
                if (Number(quantity.textContent) !== initial) throw new Error('Quantity minus did not restore.');
                optionCoverage.quantity = 2;
            }

            const dimensions = document.getElementById('customerDimensionsBtn');
            if (dimensions) {
                const initial = dimensions.getAttribute('aria-pressed');
                dimensions.click();
                if (dimensions.getAttribute('aria-pressed') === initial) {
                    throw new Error('Dimensions toggle did not change.');
                }
                dimensions.click();
                if (dimensions.getAttribute('aria-pressed') !== initial) {
                    throw new Error('Dimensions toggle did not restore.');
                }
                optionCoverage.dimensions = 2;
            }

            const palette = [...document.querySelectorAll('[data-color-role="base"], [data-color-role="font"], [data-color-role="outline"], [data-color-role="line2"]')]
                .map((button) => button.dataset.colorHex)
                .filter((hex, index, all) => all.indexOf(hex) === index);
            expectedRoles.forEach((role, roleIndex) => {
                const wanted = palette[(${productIndex} + roleIndex * 3) % palette.length];
                document.querySelector('[data-color-role="' + role + '"][data-color-hex="' + wanted + '"]').click();
            });
            if (${JSON.stringify(productType)} === 'wordart') {
                document.querySelector('#wordartBackingToggle [data-mode="hollow"]').click();
            }

            const final = await window.__kootzyCustomizer.waitForIdle(90000);
            for (const role of expectedRoles) {
                const expected = final.colors[role].toUpperCase();
                const rendered = final.renderedColors[role] && final.renderedColors[role].toUpperCase();
                if (rendered !== expected) {
                    throw new Error(role + ' rendered ' + rendered + ' but selected ' + expected + '.');
                }
            }
            if (final.loadingVisible) throw new Error('Loading overlay remained visible after rendering completed.');

            let crewProbe = null;
            let matchSetProbe = null;
            if (${JSON.stringify(productType)} === 'keychain') {
                localStorage.removeItem('kootzyCart.v1');
                document.getElementById('crewModeBtn').click();
                const names = ['Amma', 'Appa', 'Mithra'];
                for (let index = 0; index < names.length; index += 1) {
                    document.querySelector('[data-crew-member="' + index + '"]').click();
                    const input = document.getElementById('nameInput');
                    input.value = names[index];
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    await window.__kootzyCustomizer.waitForIdle(90000);
                }
                let mobileFlow = null;
                if (matchMedia('(max-width: 879px)').matches) {
                    const nextButton = document.getElementById('btnNextStep');
                    nextButton.click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    const enteredFontStep = window.__kootzyCustomizer.snapshot();
                    const quickSwitcher = document.getElementById('crewQuickSwitcher');
                    const quickVisible = !quickSwitcher.hidden
                        && getComputedStyle(quickSwitcher).display !== 'none';

                    nextButton.click();
                    const colorStep = window.__kootzyCustomizer.snapshot();
                    document.querySelector('[data-crew-quick-member="1"]').click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    const switchedOnColorStep = window.__kootzyCustomizer.snapshot();
                    document.querySelector('[data-crew-quick-member="0"]').click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    nextButton.click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    const advancedToNextMember = window.__kootzyCustomizer.snapshot();

                    mobileFlow = {
                        quickVisible,
                        enteredStep: enteredFontStep.currentStep,
                        enteredMember: enteredFontStep.crew.activeIndex,
                        colorStep: colorStep.currentStep,
                        switchedStep: switchedOnColorStep.currentStep,
                        switchedMember: switchedOnColorStep.crew.activeIndex,
                        advancedStep: advancedToNextMember.currentStep,
                        advancedMember: advancedToNextMember.crew.activeIndex,
                        configured: advancedToNextMember.crew.configured,
                        nextLabel: nextButton.textContent,
                    };
                    if (!quickVisible || enteredFontStep.currentStep !== 2 || enteredFontStep.crew.activeIndex !== 0) {
                        throw new Error('Crew mobile flow did not start with Member 1 and a visible switcher.');
                    }
                    if (colorStep.currentStep !== 3
                        || switchedOnColorStep.currentStep !== 3
                        || switchedOnColorStep.crew.activeIndex !== 1) {
                        throw new Error('Crew member switching did not preserve the current mobile customization step.');
                    }
                    if (advancedToNextMember.currentStep !== 2
                        || advancedToNextMember.crew.activeIndex !== 1
                        || advancedToNextMember.crew.configured[0] !== true) {
                        throw new Error('Crew mobile flow did not save Member 1 and advance to Member 2.');
                    }

                    nextButton.click();
                    nextButton.click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    nextButton.click();
                    nextButton.click();
                    await window.__kootzyCustomizer.waitForIdle(90000);
                    const review = window.__kootzyCustomizer.snapshot();
                    window.scrollTo(0, document.body.scrollHeight);
                    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                    const nav = document.querySelector('.stepper-nav');
                    const back = document.getElementById('btnPrevStep');
                    const add = document.getElementById('btnAddToCart');
                    const phone = document.getElementById('custPhone');
                    const navRect = nav.getBoundingClientRect();
                    const backRect = back.getBoundingClientRect();
                    const addRect = add.getBoundingClientRect();
                    const phoneRect = phone.getBoundingClientRect();
                    const paddingBottom = parseFloat(
                        getComputedStyle(document.querySelector('.customizer-pane')).paddingBottom
                    );
                    mobileFlow.footer = {
                        reviewStep: review.currentStep,
                        navHeight: navRect.height,
                        sameRow: Math.abs(backRect.top - addRect.top) < 4,
                        formClearsFooter: phoneRect.bottom <= navRect.top - 8,
                        paddingBottom,
                        quickPosition: getComputedStyle(quickSwitcher).position,
                        crewReviewClass: nav.classList.contains('is-crew-review'),
                    };
                    if (review.currentStep !== 4
                        || navRect.height > 92
                        || !mobileFlow.footer.sameRow
                        || !mobileFlow.footer.formClearsFooter
                        || paddingBottom < navRect.height + 12
                        || mobileFlow.footer.quickPosition === 'sticky'
                        || !mobileFlow.footer.crewReviewClass) {
                        throw new Error(
                            'Crew review footer overlaps mobile content: '
                            + JSON.stringify(mobileFlow.footer)
                        );
                    }
                }
                document.getElementById('crewRefreshPreviews').click();
                const deadline = performance.now() + 90000;
                while (document.body.classList.contains('crew-refreshing') && performance.now() < deadline) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                if (document.body.classList.contains('crew-refreshing')) {
                    throw new Error('Crew previews did not finish before timeout.');
                }
                const previewCount = document.querySelectorAll('#crewMemberStrip .crew-member-preview img').length;
                const canvasCount = document.querySelectorAll('#viewer3dCanvas canvas').length;
                const addButton = document.getElementById('btnAddToCart');
                addButton.click();
                const cartDeadline = performance.now() + 90000;
                let cartItems = [];
                while (performance.now() < cartDeadline) {
                    const payload = JSON.parse(localStorage.getItem('kootzyCart.v1') || '{"items":[]}');
                    cartItems = payload.items || [];
                    if (cartItems.length === 3 && !addButton.disabled) break;
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                const crewIds = [...new Set(cartItems.map((item) => item.design?.crew?.id).filter(Boolean))];
                crewProbe = {
                    memberCards: document.querySelectorAll('[data-crew-member]').length,
                    previewCount,
                    canvasCount,
                    names: cartItems.map((item) => item.text).sort(),
                    crewIds,
                    memberIndexes: cartItems.map((item) => item.design?.crew?.memberIndex).sort(),
                    quantityHidden: getComputedStyle(document.querySelector('.qty-selector-wrap')).display === 'none',
                    mobileFlow,
                };
                if (crewProbe.memberCards !== 3 || previewCount !== 3 || canvasCount !== 1) {
                    throw new Error('Crew overview did not produce three exact previews with one WebGL canvas.');
                }
                if (cartItems.length !== 3 || crewIds.length !== 1) {
                    throw new Error('Crew cart lines were not grouped under one Crew ID.');
                }
                if (!crewProbe.quantityHidden) throw new Error('Crew mode must hide the single-item quantity control.');

                document.getElementById('soloModeBtn').click();
                localStorage.removeItem('kootzyCart.v1');
                document.getElementById('matchSetModeBtn').click();
                document.getElementById('matchSetRefresh').click();
                const setDeadline = performance.now() + 90000;
                while (document.body.classList.contains('match-set-refreshing')
                    && performance.now() < setDeadline) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                if (document.body.classList.contains('match-set-refreshing')) {
                    throw new Error('Match Set previews did not finish before timeout.');
                }
                const setPreviewCount =
                    document.querySelectorAll('#matchSetPreviewStrip .crew-member-preview img').length;
                while (addButton.disabled && performance.now() < setDeadline) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                addButton.click();
                let setItems = [];
                while (performance.now() < setDeadline) {
                    const payload = JSON.parse(localStorage.getItem('kootzyCart.v1') || '{"items":[]}');
                    setItems = payload.items || [];
                    if (setItems.length === 3 && !addButton.disabled) break;
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                const setIds = [...new Set(
                    setItems.map((item) => item.design?.matchSet?.id).filter(Boolean)
                )];
                matchSetProbe = {
                    previewCount: setPreviewCount,
                    canvasCount: document.querySelectorAll('#viewer3dCanvas canvas').length,
                    productTypes: setItems.map((item) => item.productType).sort(),
                    setIds,
                    itemIndexes: setItems.map((item) => item.design?.matchSet?.itemIndex).sort(),
                    quantityHidden: getComputedStyle(document.querySelector('.qty-selector-wrap')).display === 'none',
                };
                if (setPreviewCount !== 3 || matchSetProbe.canvasCount !== 1) {
                    throw new Error('Match Set did not produce three exact previews with one WebGL canvas.');
                }
                if (setItems.length !== 3 || setIds.length !== 1) {
                    throw new Error('Match Set cart lines were not grouped under one set ID.');
                }
                if (!matchSetProbe.quantityHidden) {
                    throw new Error('Match Set must hide the single-item quantity control.');
                }
            }
            return {
                colorCases,
                exercisedOptions,
                optionCoverage,
                hollowImmediate,
                fastPathProbe,
                crewProbe,
                matchSetProbe,
                final,
            };
        })()`);

        assert.equal(result.colorCases, 9 ** expectedRoles[productType].length);
        if (productType === 'wordart') {
            assert.equal(result.hollowImmediate?.visible, true);
            assert.match(result.hollowImmediate?.text || '', /Building hollow Word Art/);
            assert.equal(result.hollowImmediate?.busy, 'true');
            assert.equal(result.fastPathProbe?.sameGeometry, true);
            assert.equal(result.fastPathProbe?.loadingVisible, false);
            assert.ok(result.fastPathProbe?.elapsedMs < 50);
        }
        if (productType === 'keychain') {
            assert.equal(result.crewProbe?.memberCards, 3);
            assert.equal(result.crewProbe?.previewCount, 3);
            assert.equal(result.crewProbe?.canvasCount, 1);
            assert.deepEqual(result.crewProbe?.names, ['Amma', 'Appa', 'Mithra']);
            assert.deepEqual(result.crewProbe?.memberIndexes, [1, 2, 3]);
            assert.equal(result.crewProbe?.crewIds.length, 1);
            assert.equal(result.crewProbe?.quantityHidden, true);
            assert.equal(result.matchSetProbe?.previewCount, 3);
            assert.equal(result.matchSetProbe?.canvasCount, 1);
            assert.deepEqual(
                result.matchSetProbe?.productTypes,
                ['bubble_keychain', 'keychain', 'nameplate'],
            );
            assert.deepEqual(result.matchSetProbe?.itemIndexes, [1, 2, 3]);
            assert.equal(result.matchSetProbe?.setIds.length, 1);
            assert.equal(result.matchSetProbe?.quantityHidden, true);
            if (mobileViewport) {
                assert.equal(result.crewProbe?.mobileFlow?.quickVisible, true);
                assert.equal(result.crewProbe?.mobileFlow?.enteredStep, 2);
                assert.equal(result.crewProbe?.mobileFlow?.enteredMember, 0);
                assert.equal(result.crewProbe?.mobileFlow?.switchedStep, 3);
                assert.equal(result.crewProbe?.mobileFlow?.switchedMember, 1);
                assert.equal(result.crewProbe?.mobileFlow?.advancedStep, 2);
                assert.equal(result.crewProbe?.mobileFlow?.advancedMember, 1);
                assert.equal(result.crewProbe?.mobileFlow?.configured[0], true);
                assert.equal(result.crewProbe?.mobileFlow?.footer?.reviewStep, 4);
                assert.equal(result.crewProbe?.mobileFlow?.footer?.sameRow, true);
                assert.equal(result.crewProbe?.mobileFlow?.footer?.formClearsFooter, true);
                assert.equal(result.crewProbe?.mobileFlow?.footer?.crewReviewClass, true);
                assert.notEqual(result.crewProbe?.mobileFlow?.footer?.quickPosition, 'sticky');
                assert.ok(result.crewProbe?.mobileFlow?.footer?.navHeight <= 92);
            }
        }

        if (mobileViewport && productType === 'keychain') {
            const keyboardBefore = await cdp.evaluate(`(async () => {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const input = document.getElementById('custName');
                input.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true,
                    pointerType: 'touch',
                    isPrimary: true,
                }));
                input.focus();
                await new Promise((resolve) => requestAnimationFrame(resolve));
                const snapshot = window.__kootzyCustomizer.snapshot();
                return {
                    scrollY: window.scrollY,
                    currentStep: snapshot.currentStep,
                    renderRevision: snapshot.stepperRenderRevision,
                    keyboardClass: document.body.classList.contains('mobile-keyboard-active'),
                    activeElement: document.activeElement?.id || document.activeElement?.tagName,
                    isDesktop: window.matchMedia('(min-width: 880px)').matches,
                    inputDisabled: input.disabled,
                };
            })()`);

            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 390,
                height: 520,
                deviceScaleFactor: 2,
                mobile: true,
                screenWidth: 390,
                screenHeight: 844,
            });
            await delay(350);
            const keyboardDuring = await cdp.evaluate(`(() => ({
                keyboardClass: document.body.classList.contains('mobile-keyboard-active'),
                navVisibility: getComputedStyle(document.querySelector('.stepper-nav')).visibility,
                renderRevision: window.__kootzyCustomizer.snapshot().stepperRenderRevision,
            }))()`);

            await cdp.evaluate(`document.getElementById('custName').blur()`);
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 390,
                height: 844,
                deviceScaleFactor: 2,
                mobile: true,
                screenWidth: 390,
                screenHeight: 844,
            });
            await delay(700);
            const keyboardAfter = await cdp.evaluate(`(() => {
                const snapshot = window.__kootzyCustomizer.snapshot();
                const visibleStep = [...document.querySelectorAll('[data-step]')].some((element) => {
                    const rect = element.getBoundingClientRect();
                    return getComputedStyle(element).display !== 'none'
                        && rect.bottom > 0
                        && rect.top < window.innerHeight;
                });
                return {
                    scrollY: window.scrollY,
                    currentStep: snapshot.currentStep,
                    renderRevision: snapshot.stepperRenderRevision,
                    keyboardClass: document.body.classList.contains('mobile-keyboard-active'),
                    visibleStep,
                    bodyHeight: document.body.getBoundingClientRect().height,
                    viewportHeight: window.innerHeight,
                };
            })()`);

            assert.equal(
                keyboardBefore.keyboardClass,
                true,
                `Keyboard did not activate: ${JSON.stringify(keyboardBefore)}`,
            );
            assert.equal(keyboardDuring.keyboardClass, true);
            assert.equal(keyboardDuring.navVisibility, 'hidden');
            assert.equal(keyboardDuring.renderRevision, keyboardBefore.renderRevision);
            assert.equal(keyboardAfter.keyboardClass, false);
            assert.equal(keyboardAfter.currentStep, keyboardBefore.currentStep);
            assert.equal(keyboardAfter.renderRevision, keyboardBefore.renderRevision);
            assert.equal(keyboardAfter.visibleStep, true);
            assert.ok(keyboardAfter.bodyHeight >= keyboardAfter.viewportHeight);
            assert.ok(Math.abs(keyboardAfter.scrollY - keyboardBefore.scrollY) <= 2);
            result.keyboardProbe = { keyboardBefore, keyboardDuring, keyboardAfter };
        }

        await cdp.evaluate('window.scrollTo(0, 0)');
        await delay(100);
        const screenshot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
        });
        fs.writeFileSync(path.join(visualDir, `${productType}.png`), Buffer.from(screenshot.data, 'base64'));
        results.push({
            productType,
            colorCases: result.colorCases,
            options: result.exercisedOptions,
            optionCoverage: result.optionCoverage,
            fastPathProbe: result.fastPathProbe,
            crewProbe: result.crewProbe,
            dimensions: result.final.dimensions,
        });
        console.log(`[PASS] ${productType}: ${result.colorCases} color combinations`);
    }

    const browserErrors = cdp.events.filter((event) =>
        event.method === 'Runtime.exceptionThrown'
        || (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error')
    );
    assert.equal(browserErrors.length, 0, `Browser emitted ${browserErrors.length} runtime errors.`);

    const total = results.reduce((sum, result) => sum + result.colorCases, 0);
    fs.writeFileSync(
        path.join(visualDir, 'results.json'),
        `${JSON.stringify({ total, results }, null, 2)}\n`,
    );
    console.log(`[PASS] Browser functional run: ${total} color combinations across ${results.length} products.`);
    console.log(`Visual screenshots: ${visualDir}`);
} finally {
    if (cdp) {
        try { await cdp.send('Browser.close'); } catch (_) {}
    }
    if (!browser.killed) browser.kill();
    if (!server.killed) server.kill();
    try {
        fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (_) {
        // Temporary Chrome files can remain locked briefly on Windows.
    }
}
