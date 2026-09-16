import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const publicRoot = path.join(projectRoot, 'public');
const productId = String(process.env.CATALOG_REEL_PRODUCT || 'keychain');
const catalogMode = Boolean(process.env.CATALOG_REEL_PRODUCT);
const assetDir = catalogMode
    ? path.join(publicRoot, 'assets', 'catalog-reels', productId)
    : path.join(publicRoot, 'assets', 'classic-reel');
const assetUrlBase = catalogMode
    ? `/assets/catalog-reels/${productId}`
    : '/assets/classic-reel';
const origin = String(process.env.CLASSIC_REEL_ORIGIN || 'http://127.0.0.1:3015').replace(/\/+$/, '');
const renderUrl = `${origin}/_classic-reel-renderer.html?generate=1&product=${encodeURIComponent(productId)}`;

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ].filter(Boolean);
    return candidates.find((candidate) => fs.existsSync(candidate)) || '';
}

async function assertServer() {
    try {
        const response = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        throw new Error(
            `Local server is not reachable at ${origin}. Start it with PORT=3015 before running this generator.`
            + ` (${error.message})`
        );
    }
}

function dataUrlBuffer(value, expectedMime) {
    const match = new RegExp(`^data:${expectedMime.replace('/', '\\/')};base64,(.+)$`).exec(String(value || ''));
    if (!match) throw new Error(`Expected ${expectedMime} data URL`);
    return Buffer.from(match[1], 'base64');
}

function sourceHash() {
    const hash = crypto.createHash('sha256');
    hash.update(productId);
    for (const relative of [
        'public/js/viewer3d.js',
        'public/js/classic-reel-renderer.js',
        'public/_classic-reel-renderer.html',
        'scripts/generate-classic-reel.mjs',
    ]) {
        hash.update(relative);
        hash.update(fs.readFileSync(path.join(projectRoot, relative)));
    }
    return hash.digest('hex');
}

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

async function fetchJsonWithRetry(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
            if (response.ok) return await response.json();
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await delay(150);
    }
    throw new Error(`Chrome debugging endpoint did not start: ${lastError?.message || 'timeout'}`);
}

class CdpClient {
    constructor(socket) {
        this.socket = socket;
        this.nextId = 1;
        this.pending = new Map();
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(String(event.data));
            if (!message.id || !this.pending.has(message.id)) return;
            const { resolve, reject } = this.pending.get(message.id);
            this.pending.delete(message.id);
            if (message.error) reject(new Error(message.error.message || 'Chrome debugging command failed'));
            else resolve(message.result || {});
        });
        socket.addEventListener('close', () => {
            for (const { reject } of this.pending.values()) reject(new Error('Chrome debugging socket closed'));
            this.pending.clear();
        });
    }

    static connect(url) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);
            socket.addEventListener('open', () => resolve(new CdpClient(socket)), { once: true });
            socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome debugging socket')), { once: true });
        });
    }

    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
}

async function renderPayload(chrome, profileDir) {
    const port = await freePort();
    const child = spawn(chrome, [
        '--headless=new',
        '--disable-extensions',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--force-device-scale-factor=1',
        '--window-size=960,760',
        '--enable-gpu',
        `--remote-debugging-port=${port}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${profileDir}`,
        renderUrl,
    ], {
        cwd: projectRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });

    let cdp;
    try {
        await fetchJsonWithRetry(`http://127.0.0.1:${port}/json/version`, 10000);
        const targets = await fetchJsonWithRetry(`http://127.0.0.1:${port}/json/list`, 5000);
        const target = targets.find((item) => item.type === 'page' && item.url.includes('_classic-reel-renderer.html'))
            || targets.find((item) => item.type === 'page');
        if (!target?.webSocketDebuggerUrl) throw new Error('Classic renderer page target was not found.');

        cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
        await cdp.send('Runtime.enable');

        const deadline = Date.now() + 70000;
        let status = 'Preparing exact 3D render…';
        while (Date.now() < deadline) {
            let state;
            try {
                state = await cdp.send('Runtime.evaluate', {
                    expression: `({
                        complete: document.documentElement.dataset.renderComplete === 'true',
                        status: document.getElementById('renderStatus')?.textContent || '',
                        output: document.getElementById('render-output')?.textContent || ''
                    })`,
                    returnByValue: true,
                });
            } catch (error) {
                if (/execution context|navigat|target closed/i.test(error.message)) {
                    await delay(200);
                    continue;
                }
                throw error;
            }
            const value = state.result?.value || {};
            status = value.status || status;
            if (value.complete && value.output) return value.output;
            await delay(250);
        }
        throw new Error(`Classic renderer timed out. Last status: ${status}`);
    } catch (error) {
        const diagnostics = stderr.trim().split(/\r?\n/).slice(-10).join('\n');
        throw new Error(`${error.message}\n${diagnostics}`);
    } finally {
        if (cdp) {
            try { await cdp.send('Browser.close'); } catch (_) {}
        }
        if (!child.killed) child.kill();
    }
}

function writeAsset(filename, buffer) {
    fs.writeFileSync(path.join(assetDir, filename), buffer);
    return { filename, bytes: buffer.length };
}

await assertServer();
const chrome = findChrome();
if (!chrome) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to a Chromium browser executable.');

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kootzy-classic-reel-'));
let encodedPayload;
try {
    encodedPayload = await renderPayload(chrome, profileDir);
} finally {
    try {
        await fs.promises.rm(profileDir, {
            recursive: true,
            force: true,
            maxRetries: 8,
            retryDelay: 250,
        });
    } catch (error) {
        console.warn(`Temporary Chrome profile could not be removed yet: ${error.message}`);
    }
}

const payload = JSON.parse(Buffer.from(encodedPayload.trim(), 'base64').toString('utf8'));
if (payload.error) throw new Error(payload.error);
if (payload.productType !== productId || payload.variants?.length !== 3 || payload.angles?.length !== 5) {
    throw new Error(`Renderer returned an unexpected ${productId} payload.`);
}

if (productId === 'keychain') for (const variant of payload.variants) {
    const depth = Number(variant.dimensions?.depth);
    if (!Number.isFinite(depth) || Math.abs(depth - 6) > 0.01) {
        throw new Error(`${variant.id} rendered at ${depth}mm instead of the fixed 6mm Classic thickness.`);
    }
}

fs.mkdirSync(assetDir, { recursive: true });
const written = [];
const manifestVariants = payload.variants.map((variant, index) => {
    const spriteName = `${variant.id}-orbit.webp`;
    const posterName = `${variant.id}-poster.webp`;
    const sprite = writeAsset(spriteName, dataUrlBuffer(variant.spriteWebp, 'image/webp'));
    const poster = writeAsset(posterName, dataUrlBuffer(variant.posterWebp, 'image/webp'));
    written.push(sprite, poster);
    if (index === 0) {
        written.push(writeAsset(catalogMode ? 'poster.png' : 'classic-keychain-poster.png', dataUrlBuffer(variant.posterPng, 'image/png')));
    }
    return {
        id: variant.id,
        label: variant.label,
        text: variant.text,
        font: variant.font,
        fontFile: variant.fontFile,
        ringPosition: variant.ringPosition,
        ringAnchor: variant.ringAnchor,
        colors: variant.colors,
        sprite: `${assetUrlBase}/${spriteName}`,
        poster: `${assetUrlBase}/${posterName}`,
        dimensions: {
            width: Number(variant.dimensions.width.toFixed(2)),
            height: Number(variant.dimensions.height.toFixed(2)),
            depth: Number(variant.dimensions.depth.toFixed(2)),
        },
    };
});

const initialPoster = written.find((asset) => asset.filename === `${payload.variants[0].id}-poster.webp`);
const totalBytes = written.reduce((sum, asset) => sum + asset.bytes, 0);
if (!initialPoster || initialPoster.bytes > 100 * 1024) {
    throw new Error(`Initial WebP poster is ${initialPoster?.bytes || 0} bytes; the 2x budget is 100KB.`);
}
if (totalBytes > 1024 * 1024) {
    throw new Error(`Classic reel assets total ${totalBytes} bytes; the 2x budget is 1MB.`);
}

const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceHash: sourceHash(),
    productType: payload.productType,
    sample: {
        text: payload.text,
        font: payload.font,
        fontFile: payload.fontFile,
        layers: payload.layers,
        ringPosition: payload.ringPosition,
        ringAnchor: payload.ringAnchor,
        showFDMTexture: payload.showFDMTexture,
    },
    frame: {
        width: payload.width,
        height: payload.height,
        angles: payload.angles,
    },
    poster: manifestVariants[0].poster,
    fallbackPoster: `${assetUrlBase}/${catalogMode ? 'poster.png' : 'classic-keychain-poster.png'}`,
    variants: manifestVariants,
    budgets: {
        initialPosterBytes: initialPoster.bytes,
        totalAssetBytes: totalBytes,
    },
};
fs.writeFileSync(path.join(assetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated Classic Keychain reel from ${renderUrl}`);
for (const asset of written) console.log(`${asset.filename}: ${asset.bytes} bytes`);
console.log(`Total: ${totalBytes} bytes`);
console.log(`Dimensions: ${manifestVariants[0].dimensions.width} × ${manifestVariants[0].dimensions.height} × 6 mm`);
