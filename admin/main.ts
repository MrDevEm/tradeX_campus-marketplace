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

function updateStaffProfileUI() {
  const user = authService.getUser();
  if (user) {
    const staffEmailEl = document.getElementById('admin-staff-email');
    const staffAvatarEl = document.getElementById('admin-staff-avatar');
    if (staffEmailEl) staffEmailEl.textContent = user.email || 'admin@mu.edu.et';
    if (staffAvatarEl) {
      const nameSource = user.fullName || user.email || 'Admin';
      const initials = nameSource
        .split(/[ @._]/)
        .filter(Boolean)
        .map((s: string) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      staffAvatarEl.textContent = initials || 'CA';
    }
  }
}

async function updateTelemetryStatus() {
  try {
    const start = performance.now();
    const res = await fetch('/api/health/ready');
    const elapsed = Math.max(1, Math.round(performance.now() - start));
    const latencyEl = document.getElementById('admin-telemetry-latency');
    if (latencyEl) {
      latencyEl.textContent = `${elapsed}ms`;
      latencyEl.style.color = res.ok ? 'var(--admin-emerald)' : 'var(--admin-rose)';
    }
  } catch {
    const latencyEl = document.getElementById('admin-telemetry-latency');
    if (latencyEl) {
      latencyEl.textContent = 'online';
    }
  }
}

function launchAdminConsole() {
  document.body.classList.add('is-authenticated');

  if (!adminInitialized) {
    initAdmin(standaloneMarketplaceCtrl);
    adminInitialized = true;
    syncLiveListings();
    updateStaffProfileUI();
    updateTelemetryStatus();
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

  // Wire Top Command Bar & Sidebar Sign Out
  const handleLogout = async () => {
    await authService.logout();
    document.body.classList.remove('is-authenticated');
  };

  const sidebarSignoutBtn = document.getElementById('btn-admin-signout');
  sidebarSignoutBtn?.addEventListener('click', handleLogout);

  const topLogoutBtn = document.getElementById('btn-admin-top-logout');
  topLogoutBtn?.addEventListener('click', handleLogout);

  // Global search shortcut (Ctrl+K or Cmd+K)
  const searchInput = document.getElementById('admin-global-search-input') as HTMLInputElement | null;
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Global quick-search input handler (filters active tab or jumps to sections)
  searchInput?.addEventListener('input', (e) => {
    const term = (e.target as HTMLInputElement).value.trim().toLowerCase();
    if (!term) return;

    if (term.startsWith('prod') || term.startsWith('item')) {
      document.getElementById('admin-tab-btn-products')?.click();
    } else if (term.startsWith('verif') || term.startsWith('id')) {
      document.getElementById('admin-tab-btn-verif')?.click();
    } else if (term.startsWith('rep')) {
      document.getElementById('admin-tab-btn-reports')?.click();
    } else if (term.startsWith('stud')) {
      document.getElementById('admin-tab-btn-students')?.click();
    } else if (term.startsWith('set')) {
      document.getElementById('admin-tab-btn-settings')?.click();
    }
  });
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
