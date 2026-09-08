import assert from 'node:assert/strict';
import {
    CLASSIC_A1_DEVICE,
    CLASSIC_A1_PROCESS,
    filamentLengthToGrams,
    parseKiriMetrics,
} from '../public/js/kiri-moto-benchmark.js';
import { priceFromSliceMetrics, priceLine } from '../public/js/pricing.js';

let passed = 0;
function check(label, fn) {
    fn();
    passed += 1;
    console.log(`[PASS] ${label}`);
}

check('Classic benchmark uses the Bambu A1 build volume', () => {
    assert.equal(CLASSIC_A1_DEVICE.bedWidth, 256);
    assert.equal(CLASSIC_A1_DEVICE.bedDepth, 256);
    assert.equal(CLASSIC_A1_DEVICE.maxHeight, 256);
});

check('Classic benchmark matches the current 0.20mm / 3-wall / 40% assumptions', () => {
    assert.equal(CLASSIC_A1_PROCESS.sliceHeight, 0.2);
    assert.equal(CLASSIC_A1_PROCESS.sliceShells, 3);
    assert.equal(CLASSIC_A1_PROCESS.sliceFillSparse, 0.4);
    assert.equal(CLASSIC_A1_PROCESS.sliceSupportEnable, false);
});

check('1 metre of 1.75mm PLA converts to about 2.98g', () => {
    const grams = filamentLengthToGrams(1000);
    assert.ok(grams > 2.97 && grams < 2.99, grams);
});

check('Kiri footer metrics are parsed into filament, weight and minutes', () => {
    const metrics = parseKiriMetrics([
        '; --- filament used: 1500.50 mm ---',
        '; --- print time: 1800s ---',
    ].join('\n'));
    assert.equal(metrics.filamentMm, 1500.5);
    assert.equal(metrics.printTimeSeconds, 1800);
    assert.equal(metrics.printTimeMins, 30);
    assert.ok(metrics.weightGrams > 4.47 && metrics.weightGrams < 4.49);
});

check('slice pricing keeps the existing business rates but accepts real print time', () => {
    const current = priceLine({ weightG: 10, batchSize: 5 });
    const sliced = priceFromSliceMetrics({ weightG: 10, printTimeMins: 30, batchSize: 5 });
    assert.equal(current.breakdown.materialCost, sliced.breakdown.materialCost);
    assert.equal(current.breakdown.labourCost, sliced.breakdown.labourCost);
    assert.equal(sliced.breakdown.printTimeMins, 30);
    assert.equal(sliced.breakdown.source, 'slice');
    assert.notEqual(current.unitPrice, sliced.unitPrice);
});

check('invalid Kiri output fails instead of silently inventing a price', () => {
    assert.throws(() => parseKiriMetrics('G1 X10 Y10'), /did not return/);
});

console.log(`RESULT: ${passed} Kiri:Moto benchmark checks passed.`);
