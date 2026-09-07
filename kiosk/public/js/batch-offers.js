/* Verified colour-batch offers.
 *
 * The batches table currently describes only a base colour plus one text colour
 * (or outline/text for a three-layer Classic Keychain). Until the schema grows
 * product-specific colour roles, only Classic Keychains can be matched safely.
 */

function color(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : '';
}

function batchCount(batch) {
    const count = parseInt(batch && batch.count, 10);
    return Number.isFinite(count) ? count : 0;
}

export function isDiscountBatch(batch, defaultBatchSize = 5) {
    const fontColors = String(batch && batch.fontColor || '').split('/').map(color);
    return Boolean(
        color(batch && batch.baseColor)
        && (fontColors.length === 1 || fontColors.length === 2)
        && fontColors.every(Boolean)
        && batchCount(batch) > defaultBatchSize
    );
}

export function findMatchingBatch(line, batches, defaultBatchSize = 5) {
    if (!line || line.productType !== 'keychain' || !Array.isArray(batches)) return null;

    const design = line.design || {};
    const colors = design.colors || {};
    const layers = design.layers === '2L' ? '2L' : '3L';
    const base = color(colors.base);
    const font = color(colors.font);
    const outline = color(colors.outline);

    if (!base || !font) return null;

    return batches.find((batch) => {
        if (!isDiscountBatch(batch, defaultBatchSize)) return false;

        const batchBase = color(batch.baseColor);
        const batchFonts = String(batch.fontColor || '').split('/').map(color);
        if (batchBase !== base) return false;

        if (layers === '2L') {
            return batchFonts.length === 1 && batchFonts[0] === font;
        }

        return batchFonts.length === 2
            && Boolean(outline)
            && batchFonts[0] === outline
            && batchFonts[1] === font;
    }) || null;
}

export function findBatchDiscount(line, batches, priceLine, defaultBatchSize = 5) {
    if (typeof priceLine !== 'function') return null;

    const batch = findMatchingBatch(line, batches, defaultBatchSize);
    if (!batch) return null;

    const batchSize = batchCount(batch);
    const standard = priceLine({ weightG: line.weightG, quantity: 1, batchSize: defaultBatchSize });
    const discounted = priceLine({ weightG: line.weightG, quantity: 1, batchSize });
    const savings = standard.unitPrice - discounted.unitPrice;
    if (savings <= 0) return null;

    return {
        name: String(batch.name || 'Colour batch'),
        baseColor: batch.baseColor,
        fontColor: batch.fontColor,
        batchSize,
        standardUnitPrice: standard.unitPrice,
        unitPrice: discounted.unitPrice,
        savings,
    };
}
