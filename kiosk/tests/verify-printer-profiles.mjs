import assert from 'node:assert/strict';

import {
    DEFAULT_PRINTER_PROFILE_ID,
    evaluatePrinterFit,
    getPrinterProfile,
} from '../public/js/printer-profiles.js';

const a1 = getPrinterProfile();
assert.equal(DEFAULT_PRINTER_PROFILE_ID, 'bambu_a1');
assert.deepEqual(a1.buildVolumeMm, { x: 256, y: 256, z: 256 });
assert.equal(a1.gridMinorMm, 10);
assert.equal(a1.gridMajorMm, 50);

const fit = (width, height = 10, depth = 5) => evaluatePrinterFit({ width, height, depth });

assert.equal(fit(230.3).status, 'fits');
assert.equal(fit(230.4).status, 'near');
assert.equal(fit(256).status, 'near');
assert.equal(fit(256.1).status, 'over');
assert.deepEqual(fit(256.1).exceededAxes, ['x']);
assert.deepEqual(evaluatePrinterFit({ width: 10, height: 260, depth: 270 }).exceededAxes, ['y', 'z']);

console.log('[PASS] Bambu Lab A1 profile and 90%/256mm fit boundaries');
