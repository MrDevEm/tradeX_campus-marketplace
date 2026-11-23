import '../src/styles/index.css';
import './admin.css';

import { initAdmin } from '../src/features/admin.ts';
import { authService } from '../src/services/api/auth.service.ts';
import { listingsService } from '../src/services/api/listings.service.ts';
import { INITIAL_MARKETPLACE_LISTINGS } from '../src/data/marketplaceSeed.ts';
import type { Listing } from '../src/types/marketplace.ts';
import type { MarketplaceController } from '../src/features/marketplace.ts';

let adminInitialized = false;
let listingsCache: Listing[] = [...INITIAL_MARKETPLACE_LISTINGS];
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying subscriber:', e);
    }
  });
}

const standaloneMarketplaceCtrl: MarketplaceController = {
  openItemDetails: (id: string) => {
    console.log('[Admin] Open item details:', id);
  },
  openCreateListingModal: () => {
    const tabProducts = document.getElementById('admin-tab-btn-products');
    const panel = document.getElementById('admin-add-product-panel');
    tabProducts?.click();
    if (panel) panel.style.display = 'block';
  },
  getListings: () => listingsCache,
  getSelectedListing: () => listingsCache[0],
  addListing: (listing: Listing) => {
    listingsCache.unshift(listing);
    notifySubscribers();
  },
  deleteListing: (id: string) => {
    listingsCache = listingsCache.filter((item) => item.id !== id);
    notifySubscribers();
  },
  updateListing: (id: string, updates: Partial<Listing>) => {
    listingsCache = listingsCache.map((item) => (item.id === id ? { ...item, ...updates } : item));
    notifySubscribers();
  },
  subscribe: (fn: () => void) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};

async function syncLiveListings() {
  try {
    const liveListings = await listingsService.getListings();
    if (liveListings && liveListings.length > 0) {
      listingsCache = liveListings;
      notifySubscribers();
    }
  } catch (err) {
    console.warn('[Admin] Fallback to cached seed listings:', err);
  }
}

function launchAdminConsole() {
  document.body.classList.add('is-authenticated');

  if (!adminInitialized) {
    initAdmin(standaloneMarketplaceCtrl);
    adminInitialized = true;
    syncLiveListings();
  }

  // Ensure Exit buttons navigate to main marketplace
  const exitBtn = document.getElementById('btn-exit-admin');
  const mobileExitBtn = document.getElementById('btn-admin-mobile-exit');
  const exitMarketplaceUrl = 'https://tradex-campus.onrender.com';

  [exitBtn, mobileExitBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = exitMarketplaceUrl;
    });
  });

  // Inject a dedicated Sign Out button in the sidebar footer if not present
  const sidebarFooter = document.querySelector('.admin-sidebar-footer');
  if (sidebarFooter && !document.getElementById('btn-admin-signout')) {
    const signoutBtn = document.createElement('button');
    signoutBtn.type = 'button';
    signoutBtn.id = 'btn-admin-signout';
    signoutBtn.className = 'btn-exit-admin';
    signoutBtn.style.marginTop = '8px';
    signoutBtn.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    signoutBtn.style.color = '#FDA4AF';
    signoutBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>Sign Out</span>
    `;
    signoutBtn.addEventListener('click', async () => {
      await authService.logout();
      document.body.classList.remove('is-authenticated');
    });
    sidebarFooter.appendChild(signoutBtn);
  }
}

function setupAuthGate() {
  const form = document.getElementById('admin-login-form') as HTMLFormElement | null;
  const emailInput = document.getElementById('admin-auth-email') as HTMLInputElement | null;
  const passInput = document.getElementById('admin-auth-password') as HTMLInputElement | null;
  const errorBox = document.getElementById('admin-login-error');
  const submitBtn = document.getElementById('btn-admin-submit') as HTMLButtonElement | null;
  const togglePassBtn = document.getElementById('btn-toggle-admin-password') as HTMLButtonElement | null;
  const eyeShow = togglePassBtn?.querySelector('.admin-eye-icon-show') as HTMLElement | null;
  const eyeHide = togglePassBtn?.querySelector('.admin-eye-icon-hide') as HTMLElement | null;

  // Toggle password visibility (show / hide)
  togglePassBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!passInput) return;
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';

    if (eyeShow && eyeHide) {
      eyeShow.style.display = isPassword ? 'none' : 'block';
      eyeHide.style.display = isPassword ? 'block' : 'none';
    }

    const label = isPassword ? 'Hide password' : 'Show password';
    togglePassBtn.setAttribute('aria-label', label);
    togglePassBtn.setAttribute('title', label);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!emailInput || !passInput) return;

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Logging in...</span>';
    }

    try {
      const session = await authService.login({ email, password });
      if (!session || !session.user) {
        throw new Error('Authentication failed. Please check your credentials.');
      }

      if (session.user.role !== 'ADMIN') {
        await authService.logout();
        throw new Error('Access denied: this account does not possess staff administrative privileges.');
      }

      launchAdminConsole();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err instanceof Error ? err.message : 'Login failed. Please verify credentials.';
        errorBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Login</span>';
      }
    }
  });

  // Check if existing session has ADMIN role
  const currentUser = authService.getCurrentUser();
  if (currentUser && currentUser.role === 'ADMIN') {
    launchAdminConsole();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupAuthGate();
});
