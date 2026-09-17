export const DEFAULT_STORE_STATUS = Object.freeze({
    acceptingOrders: true,
    pauseMessage: '',
    resumeAt: null,
});

export async function loadStoreStatus() {
    try {
        const response = await fetch(`/api/store-status?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Store status request failed');
        const payload = await response.json();
        return payload.storeStatus || DEFAULT_STORE_STATUS;
    } catch (error) {
        console.error('Using open-store fallback:', error);
        return { ...DEFAULT_STORE_STATUS };
    }
}

function resumeLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `Expected to reopen ${date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    })}.`;
}

function renderStatus(status) {
    const paused = status.acceptingOrders === false;
    document.documentElement.dataset.acceptingOrders = paused ? 'false' : 'true';
    document.querySelectorAll('[data-store-status]').forEach((banner) => {
        banner.hidden = !paused;
        const message = banner.querySelector('[data-store-status-message]');
        const resume = banner.querySelector('[data-store-status-resume]');
        if (message) {
            message.textContent = status.pauseMessage
                || 'New orders are temporarily paused. You can still explore and prepare your design.';
        }
        if (resume) {
            const text = resumeLabel(status.resumeAt);
            resume.textContent = text;
            resume.hidden = !text;
        }
    });
    document.querySelectorAll('[data-order-action]').forEach((action) => {
        action.setAttribute('aria-disabled', paused ? 'true' : 'false');
        action.classList.toggle('store-order-action-paused', paused);
        if ('disabled' in action) action.disabled = paused;
    });
    window.kootzyStoreStatus = status;
    document.dispatchEvent(new CustomEvent('storestatuschange', { detail: status }));
}

document.addEventListener('click', (event) => {
    if (window.kootzyStoreStatus?.acceptingOrders !== false) return;
    const action = event.target.closest('[data-order-action]');
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = window.kootzyStoreStatus.pauseMessage
        || 'New orders are temporarily paused. Please check back shortly.';
    alert(message);
}, true);

export async function applyStoreStatus() {
    const status = await loadStoreStatus();
    renderStatus(status);
    return status;
}

applyStoreStatus();
