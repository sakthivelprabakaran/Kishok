import { findBatchDiscount, findMatchingBatch, isDiscountBatch } from '../public/js/batch-offers.js';
import { priceLine, RATES } from '../public/js/pricing.js';

const results = [];
function check(label, pass, detail = '') {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
}

const redWhite5 = {
    id: 1, baseColor: '#FF6251', fontColor: '#FFFFFF',
    name: 'RED/WHITE', count: 5,
};
const redWhite10 = { ...redWhite5, id: 2, count: 10 };
const redBlackWhite10 = {
    id: 3, baseColor: '#FF6251', fontColor: '#000000/#FFFFFF',
    name: 'RED/BLACK/WHITE', count: 10,
};

const classic2L = {
    productType: 'keychain',
    weightG: 20,
    design: {
        layers: '2L',
        colors: { base: '#ff6251', font: '#ffffff' },
    },
};
const classic3L = {
    productType: 'keychain',
    weightG: 20,
    design: {
        layers: '3L',
        colors: { base: '#ff6251', outline: '#000000', font: '#ffffff' },
    },
};
const wordArt = {
    productType: 'wordart',
    weightG: 20,
    design: {
        wordartBase: 'none',
        colors: {
            base: '#ff6251',
            outline: '#000000',
            font: '#ffffff',
            line2: '#ffd700',
        },
    },
};

check('normal five-item batch is not advertised as a discount',
    !isDiscountBatch(redWhite5, RATES.DEFAULT_BATCH_SIZE));
check('larger batch can produce a discount',
    isDiscountBatch(redWhite10, RATES.DEFAULT_BATCH_SIZE));

const offer2L = findBatchDiscount(
    classic2L, [redWhite10], priceLine, RATES.DEFAULT_BATCH_SIZE
);
check('exact two-layer Classic Keychain receives the verified offer',
    offer2L && offer2L.batchSize === 10 && offer2L.savings === 4,
    JSON.stringify(offer2L));

check('Word Art never matches the Classic-only batch schema',
    findMatchingBatch(wordArt, [redWhite10], RATES.DEFAULT_BATCH_SIZE) === null);
check('three-layer Classic does not match a two-colour batch',
    findMatchingBatch(classic3L, [redWhite10], RATES.DEFAULT_BATCH_SIZE) === null);
check('three-layer Classic requires exact base, outline and text colours',
    Boolean(findMatchingBatch(classic3L, [redBlackWhite10], RATES.DEFAULT_BATCH_SIZE)));
check('mismatched Classic colours receive no offer',
    findBatchDiscount({
        ...classic2L,
        design: { ...classic2L.design, colors: { base: '#000000', font: '#ffffff' } },
    }, [redWhite10], priceLine, RATES.DEFAULT_BATCH_SIZE) === null);

const passed = results.filter(Boolean).length;
console.log('\n' + '='.repeat(40));
console.log(`RESULT: ${passed}/${results.length} batch-offer checks passed.`);
if (passed !== results.length) process.exit(1);
