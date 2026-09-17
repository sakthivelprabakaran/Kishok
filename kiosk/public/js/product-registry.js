/* Stable definitions shared by the storefront and both server runtimes. */
export const PRODUCT_DEFINITIONS = Object.freeze([
    { type: 'bubble_keychain', label: 'Bubble Badge', category: 'keychain', sortOrder: 10, displayTimeMinutes: 20 },
    { type: 'keychain', label: 'Classic Keychain', category: 'keychain', sortOrder: 20, displayTimeMinutes: 15 },
    { type: 'flower_keychain', label: 'Flower Initial', category: 'keychain', sortOrder: 30, displayTimeMinutes: 25 },
    { type: 'nametag', label: 'Wavy Nametag', category: 'keychain', sortOrder: 40, displayTimeMinutes: 22 },
    { type: 'girly_keychain', label: 'Girly Keychain', category: 'keychain', sortOrder: 50, displayTimeMinutes: 25 },
    { type: 'tilekey', label: 'Letter Tiles', category: 'keychain', sortOrder: 60, displayTimeMinutes: 30 },
    { type: 'linked_initials', label: 'Linked Initials', category: 'keychain', sortOrder: 70, displayTimeMinutes: 18 },
    { type: 'name_beads', label: 'Name Beads', category: 'keychain', sortOrder: 80, displayTimeMinutes: 15 },
    { type: 'supported_text', label: 'Supported Name', category: 'desk', sortOrder: 90, displayTimeMinutes: 35 },
    { type: 'wordart', label: 'Word Art', category: 'desk', sortOrder: 100, displayTimeMinutes: 45 },
    { type: 'loveseries', label: 'LOVE Series', category: 'desk', sortOrder: 110, displayTimeMinutes: 40 },
    { type: 'nameplate', label: 'Desk Nameplate', category: 'desk', sortOrder: 120, displayTimeMinutes: 40 },
    { type: 'led_word_stand', label: 'LED Word Stand', category: 'desk', sortOrder: 130, displayTimeMinutes: 60 },
    { type: 'desk_organizer', label: 'Desk Organizer', category: 'desk', sortOrder: 140, displayTimeMinutes: 75 },
    { type: 'led_word_art', label: 'LED Word Art', category: 'desk', sortOrder: 150, displayTimeMinutes: 45 },
    { type: 'bordered_keychain', label: 'Bordered Keychain', category: 'keychain', sortOrder: 160, displayTimeMinutes: 25, defaultState: 'hidden' },
]);

export const PRODUCT_LIFECYCLE_STATES = Object.freeze([
    'draft', 'active', 'paused', 'hidden', 'retired',
]);

export const CUSTOMER_PRODUCT_TYPES = Object.freeze(
    PRODUCT_DEFINITIONS.map((product) => product.type)
);

export function findProductDefinition(type) {
    return PRODUCT_DEFINITIONS.find((product) => product.type === type) || null;
}

export function defaultProductRecord(definition) {
    const lifecycleState = definition.defaultState || 'active';
    return {
        productType: definition.type,
        displayName: definition.label,
        category: definition.category,
        lifecycleState,
        sortOrder: definition.sortOrder,
        displayTimeMinutes: definition.displayTimeMinutes,
        badge: '',
        pauseMessage: '',
        resumeAt: null,
        isFeatured: false,
        visible: lifecycleState === 'active' || lifecycleState === 'paused',
        orderable: lifecycleState === 'active',
    };
}

export function defaultProductCatalog() {
    return PRODUCT_DEFINITIONS.map(defaultProductRecord);
}
