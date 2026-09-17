import { defaultProductCatalog } from './product-registry.js';

export async function loadProductCatalog() {
    try {
        const response = await fetch(`/api/products?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Catalogue request failed');
        const payload = await response.json();
        return Array.isArray(payload.products) ? payload.products : defaultProductCatalog();
    } catch (error) {
        console.error('Using built-in product catalogue:', error);
        return defaultProductCatalog();
    }
}

function pauseLabel(product) {
    return product.pauseMessage || 'Orders temporarily paused';
}

export async function applyHomepageProductCatalog() {
    const grid = document.getElementById('productGrid');
    const featuredGrid = document.getElementById('featuredProductGrid');
    const featuredSection = document.getElementById('featuredProductsSection');
    if (!grid) return;
    const products = await loadProductCatalog();
    const byType = new Map(products.map((product) => [product.productType, product]));
    const cards = [...document.querySelectorAll('.product-card[data-type]')];

    cards.forEach((card) => {
        const product = byType.get(card.dataset.type);
        if (!product) {
            card.hidden = true;
            card.dataset.catalogHidden = 'true';
            return;
        }
        card.dataset.category = product.category;
        card.dataset.sortOrder = String(product.sortOrder);
        card.dataset.featured = product.isFeatured ? 'true' : 'false';
        card.dataset.catalogHidden = product.visible ? 'false' : 'true';
        card.hidden = !product.visible;

        const name = card.querySelector('.card-name');
        const time = card.querySelector('.card-time');
        const action = card.querySelector('.card-action');
        if (name) name.textContent = product.displayName;
        if (time) time.textContent = `🖨️ ${product.displayTimeMinutes}m`;

        let badge = card.querySelector('.product-catalog-badge');
        if (product.badge) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'product-catalog-badge';
                card.querySelector('.card-img-wrap')?.appendChild(badge);
            }
            badge.textContent = product.badge;
        } else if (badge) {
            badge.remove();
        }

        card.classList.toggle('product-card-paused', product.lifecycleState === 'paused');
        card.setAttribute('aria-disabled', product.orderable ? 'false' : 'true');
        if (!product.orderable) {
            card.dataset.pauseMessage = pauseLabel(product);
            if (action) action.textContent = 'Paused';
        }
    });

    cards
        .sort((a, b) => Number(a.dataset.sortOrder || 999999) - Number(b.dataset.sortOrder || 999999))
        .forEach((card) => grid.appendChild(card));

    if (featuredGrid && featuredSection) {
        const featuredCards = cards
            .filter((card) => card.dataset.featured === 'true' && card.dataset.catalogHidden !== 'true')
            .slice(0, 3);
        featuredCards.forEach((card) => {
            card.classList.add('product-card-featured');
            featuredGrid.appendChild(card);
        });
        featuredSection.hidden = featuredCards.length === 0;
    }

    document.addEventListener('click', (event) => {
        const card = event.target.closest('.product-card-paused');
        if (!card) return;
        event.preventDefault();
        alert(card.dataset.pauseMessage || 'Orders are temporarily paused for this product.');
    });
    document.dispatchEvent(new CustomEvent('productcatalogready', {
        detail: { featuredCount: featuredGrid ? featuredGrid.children.length : 0 },
    }));
}
