/* Catalogue names for product-type slugs, shared by every page that lists cart
 * or order lines. Extracted because cart-page.js and checkout-page.js each grew
 * their own copy — the same drift disease the repo already suffers with FONTS
 * being duplicated between kiosk-app.js and admin-console.js. */
export const PRODUCT_LABELS = {
    keychain: 'Classic Keychain',
    bubble_keychain: 'Bubble Keychain',
    nameplate: 'Nameplate',
    wordart: 'Word Art',
    loveseries: 'LOVE Series',
    tilekey: 'Letter Tiles',
    linked_initials: 'Linked Initials',
    nametag: 'Wavy Nametag',
    girly_keychain: 'Girly Keychain',
    bordered_keychain: 'Bordered Keychain',
    supported_text: 'Supported Nameplate',
    flower_keychain: 'Flower Initial',
    desk_organizer: 'Desk Organizer',
    led_word_stand: 'LED Word Stand',
    led_word_art: 'LED Word Art',
    name_beads: 'Custom Name Beads',
};
