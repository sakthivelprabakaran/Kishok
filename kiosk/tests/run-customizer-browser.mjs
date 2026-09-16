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
const products = [
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
            const swatches = Object.fromEntries(expectedRoles.map((role) => [
                role,
                [...document.querySelectorAll('[data-color-role="' + role + '"]')],
            ]));
            for (const role of expectedRoles) {
                if (swatches[role].length !== 9) {
                    throw new Error(role + ' has ' + swatches[role].length + ' colors instead of 9.');
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
            return {
                colorCases,
                exercisedOptions,
                optionCoverage,
                hollowImmediate,
                final,
            };
        })()`);

        assert.equal(result.colorCases, 9 ** expectedRoles[productType].length);
        if (productType === 'wordart') {
            assert.equal(result.hollowImmediate?.visible, true);
            assert.match(result.hollowImmediate?.text || '', /Building hollow Word Art/);
            assert.equal(result.hollowImmediate?.busy, 'true');
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
