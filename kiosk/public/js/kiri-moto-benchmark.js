const ENGINE_URL = '/vendor/kiri/engine.js?v=4.7.0';
const WORKER_URL = '/vendor/kiri/worker.js?v=4.7.0';
const MINION_URL = '/vendor/kiri/minion.js?v=4.7.0';

export const CLASSIC_A1_DEVICE = Object.freeze({
    mode: 'FDM',
    deviceName: 'Bambu A1 pricing benchmark',
    bedWidth: 256,
    bedDepth: 256,
    bedHeight: 2.5,
    maxHeight: 256,
    bedRound: false,
    bedBelt: false,
    originCenter: false,
    fwRetract: false,
    gcodeFExt: 'gcode',
    gcodeSpace: true,
    gcodeStrip: false,
    gcodePre: ['G90', 'M83'],
    gcodePost: [],
    gcodeFan: ['M106 S{fan_speed}'],
    gcodeTrack: [],
    gcodeLayer: [],
    gcodeChange: [],
    extruders: [{
        extFilament: 1.75,
        extNozzle: 0.4,
        extOffsetX: 0,
        extOffsetY: 0,
    }],
});

// This deliberately mirrors the assumptions in the current estimator:
// 0.20 mm layers, three walls and 40% grid infill. The benchmark changes only
// the source of weight/time—from a fixed approximation to an actual slice.
export const CLASSIC_A1_PROCESS = Object.freeze({
    processName: 'Classic Keychain 0.20mm',
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceShells: 3,
    sliceShellOrder: 'in-out',
    sliceFillAngle: 45,
    sliceFillOverlap: 0.35,
    sliceFillSparse: 0.4,
    sliceFillType: 'grid',
    sliceBottomLayers: 3,
    sliceTopLayers: 4,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportAngle: 60,
    sliceSupportOffset: 0.4,
    sliceSupportGap: 1,
    sliceLineWidth: 0.42,
    firstLayerRate: 20,
    firstLayerFillRate: 40,
    firstLayerPrintMult: 1,
    firstLayerFanSpeed: 0,
    outputFeedrate: 120,
    outputFinishrate: 90,
    outputSeekrate: 200,
    outputShellMult: 1,
    outputFillMult: 1,
    outputSparseMult: 1,
    outputRetractDist: 0.8,
    outputRetractSpeed: 30,
    outputRetractWipe: 0,
    outputRetractDwell: 0,
    outputShortPoly: 100,
    outputMinSpeed: 10,
    outputLayerRetract: false,
    outputFanSpeed: 255,
    outputFanLayer: 2,
    outputNozzle: 0,
    outputAvoidGaps: true,
    outputRaft: false,
    outputBrimCount: 0,
    outputPurgeTower: 0,
    zHopDistance: 0,
    ranges: [],
});

export function filamentLengthToGrams(lengthMm, diameterMm = 1.75, densityGPerCm3 = 1.24) {
    const length = Number(lengthMm);
    const diameter = Number(diameterMm);
    const density = Number(densityGPerCm3);
    if (![length, diameter, density].every(Number.isFinite) || length <= 0 || diameter <= 0 || density <= 0) {
        return 0;
    }
    const radius = diameter / 2;
    const volumeCm3 = (Math.PI * radius * radius * length) / 1000;
    return volumeCm3 * density;
}

export function parseKiriMetrics(gcode) {
    const source = String(gcode || '');
    const filamentMatch = source.match(/;\s*---\s*filament used:\s*([\d.]+)\s*mm\s*---/i);
    const timeMatch = source.match(/;\s*---\s*print time:\s*([\d.]+)\s*s\s*---/i);
    if (!filamentMatch || !timeMatch) {
        throw new Error('Kiri:Moto did not return filament and print-time metrics.');
    }

    const filamentMm = Number(filamentMatch[1]);
    const printTimeSeconds = Number(timeMatch[1]);
    if (!Number.isFinite(filamentMm) || !Number.isFinite(printTimeSeconds)) {
        throw new Error('Kiri:Moto returned invalid slice metrics.');
    }

    return {
        filamentMm,
        weightGrams: filamentLengthToGrams(filamentMm),
        printTimeSeconds,
        printTimeMins: printTimeSeconds / 60,
    };
}

export class KiriMotoBenchmark {
    constructor(options = {}) {
        this.engineUrl = options.engineUrl || ENGINE_URL;
        this.workerUrl = options.workerUrl || WORKER_URL;
        this.minionUrl = options.minionUrl || MINION_URL;
        this.onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
        this.enginePromise = null;
        this.running = false;
    }

    async slice(stlData) {
        if (this.running) throw new Error('A Kiri:Moto benchmark is already running.');
        this.running = true;
        try {
            const engine = await this._getEngine();
            const binary = normalizeBinary(stlData);

            engine
                .setMode('FDM')
                .setController({ threaded: false })
                .setDevice({ ...CLASSIC_A1_DEVICE, extruders: CLASSIC_A1_DEVICE.extruders.map((item) => ({ ...item })) })
                .setProcess({ ...CLASSIC_A1_PROCESS, ranges: [] })
                .setListener((message) => this._handleProgress(message));

            this.onProgress({ phase: 'model', progress: 0.05, message: 'Preparing exact STL' });
            await engine.parse(binary);
            this.onProgress({ phase: 'slice', progress: 0.12, message: 'Slicing 0.20 mm layers' });
            await engine.slice();
            this.onProgress({ phase: 'prepare', progress: 0.72, message: 'Calculating print paths' });
            await engine.prepare();
            this.onProgress({ phase: 'export', progress: 0.92, message: 'Reading filament and time' });
            const gcode = await engine.export();
            const metrics = parseKiriMetrics(gcode);
            this.onProgress({ phase: 'done', progress: 1, message: 'Slice comparison ready' });
            return metrics;
        } finally {
            this.running = false;
        }
    }

    async _getEngine() {
        if (!this.enginePromise) {
            this.enginePromise = import(this.engineUrl).then(({ Engine }) => new Engine({
                workURL: this.workerUrl,
                poolURL: this.minionUrl,
            }));
        }
        return this.enginePromise;
    }

    _handleProgress(message) {
        if (message && message.slice) {
            const update = message.slice;
            const raw = Number(update.update ?? update.progress);
            this.onProgress({
                phase: 'slice',
                progress: Number.isFinite(raw) ? 0.12 + Math.max(0, Math.min(1, raw)) * 0.58 : 0.4,
                message: update.message || 'Slicing model',
            });
        } else if (message && message.prepare && message.prepare.update) {
            const update = message.prepare.update;
            const raw = Number(update.update ?? update.progress ?? update);
            this.onProgress({
                phase: 'prepare',
                progress: Number.isFinite(raw) ? 0.72 + Math.max(0, Math.min(1, raw)) * 0.18 : 0.8,
                message: update.message || 'Calculating print paths',
            });
        }
    }
}

function normalizeBinary(data) {
    if (data instanceof ArrayBuffer) return data.slice(0);
    if (ArrayBuffer.isView(data)) {
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    throw new TypeError('A binary STL ArrayBuffer is required.');
}
