/*
 * Print-volume profiles used by viewer-only manufacturing aids.
 *
 * These values never alter product geometry or STL export. They provide a
 * consistent reference for build-plate rendering and current-orientation fit.
 */

const PROFILE_LIST = [
    {
        id: 'bambu_a1',
        label: 'Bambu Lab A1',
        buildVolumeMm: Object.freeze({ x: 256, y: 256, z: 256 }),
        gridMinorMm: 10,
        gridMajorMm: 50,
    },
];

export const PRINTER_PROFILES = Object.freeze(Object.fromEntries(
    PROFILE_LIST.map((profile) => [profile.id, Object.freeze({ ...profile })])
));

export const DEFAULT_PRINTER_PROFILE_ID = 'bambu_a1';

export function getPrinterProfile(profileOrId = DEFAULT_PRINTER_PROFILE_ID) {
    if (profileOrId && typeof profileOrId === 'object' && profileOrId.buildVolumeMm) {
        return profileOrId;
    }
    return PRINTER_PROFILES[profileOrId] || PRINTER_PROFILES[DEFAULT_PRINTER_PROFILE_ID];
}

export function evaluatePrinterFit(dimensions, profileOrId = DEFAULT_PRINTER_PROFILE_ID) {
    const profile = getPrinterProfile(profileOrId);
    const volume = profile.buildVolumeMm;
    const values = {
        x: Math.max(0, Number(dimensions && dimensions.width) || 0),
        y: Math.max(0, Number(dimensions && dimensions.height) || 0),
        z: Math.max(0, Number(dimensions && dimensions.depth) || 0),
    };
    const ratios = {
        x: values.x / volume.x,
        y: values.y / volume.y,
        z: values.z / volume.z,
    };
    const exceededAxes = Object.keys(ratios).filter((axis) => ratios[axis] > 1);
    const nearAxes = Object.keys(ratios).filter((axis) => ratios[axis] >= 0.9 && ratios[axis] <= 1);
    const maxUsageRatio = Math.max(ratios.x, ratios.y, ratios.z);
    const status = exceededAxes.length ? 'over' : (nearAxes.length ? 'near' : 'fits');

    return Object.freeze({
        profileId: profile.id,
        profileLabel: profile.label,
        status,
        fits: status !== 'over',
        dimensionsMm: Object.freeze({ ...values }),
        limitsMm: volume,
        ratios: Object.freeze({ ...ratios }),
        maxUsageRatio,
        exceededAxes: Object.freeze(exceededAxes),
        nearAxes: Object.freeze(nearAxes),
    });
}
