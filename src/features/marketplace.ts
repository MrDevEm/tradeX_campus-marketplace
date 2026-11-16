import { isApiConfigured } from '../config/env';
import { CATEGORIES_DATA, INITIAL_MARKETPLACE_LISTINGS } from '../data/marketplaceSeed';
import { listingsService } from '../services/api';
import type { Listing, ListingBadgeClass, ListingSortOrder, ListingType } from '../types/marketplace';
import { escapeHtml } from '../utils/html';

export interface MarketplaceController {
  openItemDetails: (id: string) => void;
  openCreateListingModal: () => void;
  getListings: () => Listing[];
  getSelectedListing: () => Listing | undefined;
}

interface MarketplaceOptions {
  onOpenChatForListing: (item: Listing) => void;
}

export function initMarketplace(options: MarketplaceOptions): MarketplaceController {
  let marketplaceListings: Listing[] = INITIAL_MARKETPLACE_LISTINGS.map((item) => ({ ...item }));
  let selectedListingForChat: Listing | undefined = marketplaceListings[0];

  const catContainer = document.getElementById('categories-grid-container');
  const listingsGrid = document.getElementById('listings-grid');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const categoryPills = document.querySelectorAll<HTMLElement>('#filter-category-pills .filter-chip');
  const typeSelect = document.getElementById('filter-type-select') as HTMLSelectElement | null;
  const sortSelect = document.getElementById('filter-sort-select') as HTMLSelectElement | null;

  const modalDetails = document.getElementById('modal-details');
  const btnCloseDetails = document.getElementById('btn-close-details');

  const modalCreate = document.getElementById('modal-create-listing');
  const btnOpenCreateHero = document.getElementById('btn-create-listing-hero');
  const btnOpenCreateFeed = document.getElementById('btn-post-listing-feed');
  const footerPostLink = document.getElementById('footer-post-link');
  const btnCloseCreate = document.getElementById('btn-close-create');
  const formCreate = document.getElementById('form-create-listing') as HTMLFormElement | null;

  const createImageDropzone = document.getElementById('create-image-dropzone');
  const createImageFileInput = document.getElementById('create-image-file') as HTMLInputElement | null;
  const createImagePreviewWrap = document.getElementById('create-image-preview-wrap');
  const createImagePreviewImg = document.getElementById('create-image-preview') as HTMLImageElement | null;
  const createImageLabel = document.getElementById('create-image-label');
  const btnRemoveCreateImage = document.getElementById('btn-remove-create-image');

  let currentCategory = 'all';
  let currentSearch = '';
  let currentType = 'all';
  let currentSort: ListingSortOrder = 'newest';
  let uploadedCreateImageDataUrl = '';

  function setActiveCategoryFilter(catId: string): void {
    currentCategory = catId;
    categoryPills.forEach((p) => {
      p.classList.toggle('is-active', p.getAttribute('data-category') === catId);
    });
    if (catContainer) {
      catContainer.querySelectorAll('.category-card').forEach((card) => {
        card.classList.toggle('is-active', card.getAttribute('data-cat-id') === catId);
      });
    }
    renderListings();
  }

  if (catContainer) {
    catContainer.innerHTML = CATEGORIES_DATA.map(
      (cat, idx) => `
      <a href="#marketplace" class="category-card" data-cat-id="${escapeHtml(cat.id)}" style="--cat-index: ${idx};">
        <div class="category-icon" aria-hidden="true">${cat.icon}</div>
        <div class="category-text-wrap">
          <div class="category-name">${escapeHtml(cat.name)}</div>
          <div class="category-count">${escapeHtml(cat.count)}</div>
        </div>
        <span class="category-explore" aria-hidden="true">
          Browse
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"></path>
            <path d="M13 6l6 6-6 6"></path>
          </svg>
        </span>
      </a>
    `
    ).join('');

    if ('IntersectionObserver' in window) {
      catContainer.classList.add('animate-ready');
      const catObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              catContainer.classList.add('is-inview');
              catObserver.disconnect();
            }
          });
        },
        { threshold: 0.14 }
      );
      catObserver.observe(catContainer);
    }

    catContainer.querySelectorAll('.category-card').forEach((el) => {
      el.addEventListener('click', () => {
        const catId = el.getAttribute('data-cat-id');
        if (catId) setActiveCategoryFilter(catId);
      });
    });
  }

  function openItemDetails(id: string): void {
    const item = marketplaceListings.find((l) => l.id === id);
    if (!item || !modalDetails) return;
    selectedListingForChat = item;

    const titleEl = document.getElementById('modal-details-title');
    const imgEl = document.getElementById('modal-details-img') as HTMLImageElement | null;
    const priceEl = document.getElementById('modal-details-price');
    const typeEl = document.getElementById('modal-details-type');
    const headingEl = document.getElementById('modal-details-heading');
    const descEl = document.getElementById('modal-details-desc');
    const condEl = document.getElementById('modal-details-cond');
    const spotRow = document.getElementById('modal-details-spot-row');
    const spotEl = document.getElementById('modal-details-spot');
    const sellerEl = document.getElementById('modal-details-seller');

    if (titleEl) titleEl.textContent = item.category + ' — Campus Listing';
    if (imgEl) imgEl.src = item.img;
    if (priceEl) priceEl.textContent = item.priceLabel;
    if (typeEl) {
      typeEl.textContent = item.type;
      typeEl.className = 'listing-badge-type ' + item.typeClass;
    }
    if (headingEl) headingEl.textContent = item.title;
    if (descEl) descEl.textContent = item.desc;
    if (condEl) condEl.textContent = item.condition;
    if (spotRow) spotRow.style.display = item.spot ? 'flex' : 'none';
    if (spotEl) spotEl.textContent = item.spot || '';
    if (sellerEl) sellerEl.textContent = item.seller;

    const bkmkBtn = document.getElementById('btn-bookmark-item') as HTMLButtonElement | null;
    if (bkmkBtn) {
      bkmkBtn.textContent = item.saved ? 'Saved ✓' : 'Save Item';
      bkmkBtn.onclick = () => {
        const nextSaved = !item.saved;
        item.saved = nextSaved;
        bkmkBtn.textContent = item.saved ? 'Saved ✓' : 'Save Item';
        if (isApiConfigured()) {
          void listingsService.toggleSaveListing(item.id, nextSaved).catch(() => {
            item.saved = !nextSaved;
            bkmkBtn.textContent = item.saved ? 'Saved ✓' : 'Save Item';
          });
        }
      };
    }

    modalDetails.classList.add('is-open');
  }

  function renderListings(): void {
    if (!listingsGrid) return;

    const filtered = marketplaceListings.filter((item) => {
      if (currentCategory !== 'all') {
        if (currentCategory === 'Books' && item.category !== 'Books') return false;
        if (currentCategory === 'Electronics' && item.category !== 'Electronics') return false;
        if (currentCategory === 'Fashion' && item.category !== 'Fashion') return false;
        if (currentCategory === 'Accessories' && item.category !== 'Accessories') return false;
        if (currentCategory === 'Free' && item.type !== 'Giveaway' && item.category !== 'Free') return false;
        if (currentCategory === 'Other' && item.category !== 'Other') return false;
      }

      if (currentType !== 'all' && item.type !== currentType) {
        return false;
      }

      if (currentSearch.trim()) {
        const q = currentSearch.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.spot.toLowerCase().includes(q) ||
          item.seller.toLowerCase().includes(q) ||
          item.dept.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    if (currentSort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    }

    if (filtered.length === 0) {
      listingsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--polar-100); border-radius: 20px; border: 1px dashed var(--brand-border-emerald);">
          <div style="font-size: 36px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--brunswick-900); margin-bottom: 6px;">No campus listings matched your filter</h3>
          <p style="font-size: 14px; color: var(--brand-muted); margin-bottom: 20px;">Try adjusting your keyword or reset filters to see all available student items.</p>
          <button class="btn-primary-cta" style="height: 42px; font-size: 14px; margin: 0 auto;" id="btn-reset-filters">Reset All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-reset-filters');
      resetBtn?.addEventListener('click', () => {
        currentCategory = 'all';
        currentSearch = '';
        currentType = 'all';
        if (searchInput) searchInput.value = '';
        categoryPills.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-category') === 'all'));
        if (typeSelect) typeSelect.value = 'all';
        renderListings();
      });
      return;
    }

    listingsGrid.innerHTML = filtered
      .map(
        (item) => `
      <div class="listing-card" data-id="${escapeHtml(item.id)}">
        <div class="listing-img-wrap">
          <img class="listing-img" src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <span class="listing-badge-type ${escapeHtml(item.typeClass)}">${escapeHtml(item.type)}</span>
          <span class="listing-badge-condition">${escapeHtml(item.condition)}</span>
        </div>
        <div class="listing-body">
          <div class="listing-price-row">
            <div class="listing-price">${escapeHtml(item.priceLabel)}</div>
            <span class="listing-category-text">${escapeHtml(item.category)}</span>
          </div>
          <h3 class="listing-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
          ${
            item.spot
              ? `
          <div class="listing-meeting-spot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${escapeHtml(item.spot)}</span>
          </div>`
              : ''
          }
          <div class="listing-footer">
            <div class="seller-info">
              <div class="seller-avatar">${escapeHtml(item.seller.charAt(0))}</div>
              <div class="seller-text">
                <div class="seller-name">${escapeHtml(item.seller)}</div>
              </div>
            </div>
            <div class="listing-actions">
              <button class="btn-chat-listing btn-chat-post" data-id="${escapeHtml(item.id)}" aria-label="Chat with ${escapeHtml(item.seller)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat
              </button>
              <button class="btn-view-listing btn-open-item" data-id="${escapeHtml(item.id)}">Details</button>
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    listingsGrid.querySelectorAll('.btn-chat-post').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = marketplaceListings.find((l) => l.id === id);
        if (item) options.onOpenChatForListing(item);
      });
    });

    listingsGrid.querySelectorAll('.btn-open-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) openItemDetails(id);
      });
    });
  }

  categoryPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-category');
      if (cat) setActiveCategoryFilter(cat);
    });
  });

  searchInput?.addEventListener('input', (e) => {
    currentSearch = (e.target as HTMLInputElement).value;
    renderListings();
  });

  typeSelect?.addEventListener('change', (e) => {
    currentType = (e.target as HTMLSelectElement).value;
    renderListings();
  });

  sortSelect?.addEventListener('change', (e) => {
    currentSort = (e.target as HTMLSelectElement).value as ListingSortOrder;
    renderListings();
  });

  btnCloseDetails?.addEventListener('click', () => {
    modalDetails?.classList.remove('is-open');
  });

  function updateCreateImagePreview(src: string, labelText: string): void {
    if (!createImagePreviewImg || !createImagePreviewWrap) return;
    if (src) {
      createImagePreviewImg.src = src;
      createImagePreviewWrap.classList.add('has-image');
      if (labelText && createImageLabel) {
        createImageLabel.textContent = labelText;
      }
    } else {
      createImagePreviewImg.removeAttribute('src');
      createImagePreviewWrap.classList.remove('has-image');
      if (createImageLabel) {
        createImageLabel.textContent = 'Click or drag photo here to upload';
      }
    }
  }

  function handleCreateImageFile(file: File | undefined | null): void {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      uploadedCreateImageDataUrl = typeof result === 'string' ? result : '';
      if (uploadedCreateImageDataUrl) {
        updateCreateImagePreview(uploadedCreateImageDataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearCreateImageSelection(): void {
    uploadedCreateImageDataUrl = '';
    if (createImageFileInput) createImageFileInput.value = '';
    updateCreateImagePreview('', '');
  }

  createImageFileInput?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    handleCreateImageFile(file);
  });

  if (createImageDropzone) {
    ['dragenter', 'dragover'].forEach((evt) => {
      createImageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        createImageDropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      createImageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        createImageDropzone.classList.remove('is-dragover');
      });
    });
    createImageDropzone.addEventListener('drop', (e) => {
      const dragEvent = e as DragEvent;
      const file = dragEvent.dataTransfer?.files?.[0];
      handleCreateImageFile(file);
    });
  }

  btnRemoveCreateImage?.addEventListener('click', clearCreateImageSelection);

  function openCreateListingModal(): void {
    modalCreate?.classList.add('is-open');
  }

  btnOpenCreateHero?.addEventListener('click', openCreateListingModal);
  btnOpenCreateFeed?.addEventListener('click', openCreateListingModal);
  footerPostLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openCreateListingModal();
  });

  btnCloseCreate?.addEventListener('click', () => {
    modalCreate?.classList.remove('is-open');
  });

  formCreate?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('create-title') as HTMLInputElement | null;
    const categoryEl = document.getElementById('create-category') as HTMLSelectElement | null;
    const typeEl = document.getElementById('create-type') as HTMLSelectElement | null;
    const priceEl = document.getElementById('create-price') as HTMLInputElement | null;
    const conditionEl = document.getElementById('create-condition') as HTMLSelectElement | null;
    const descEl = document.getElementById('create-desc') as HTMLTextAreaElement | null;

    const title = titleEl?.value ?? '';
    const category = categoryEl?.value ?? 'Other';
    const type = (typeEl?.value ?? 'Buy / Sell') as ListingType;
    const price = parseFloat(priceEl?.value ?? '0') || 0;
    const condition = conditionEl?.value ?? 'Good Condition';
    const desc = descEl?.value || 'Clean campus listing posted by verified student.';

    let typeClass: ListingBadgeClass = 'type-sell';
    if (type === 'Swap') typeClass = 'type-swap';
    if (type === 'Giveaway') typeClass = 'type-free';

    const priceLabel = price > 0 ? price.toLocaleString() + ' ETB' : type === 'Giveaway' ? 'FREE' : type;

    const defaultImg =
      category === 'Books'
        ? '/images/listings/college-textbooks.jpg'
        : category === 'Accessories'
          ? '/images/listings/citizen-watch.jpg'
          : category === 'Free'
            ? '/images/listings/chocolate-pack.jpg'
            : 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80';

    let newListing: Listing = {
      id: 'item-' + Date.now(),
      title,
      category,
      type,
      typeClass,
      price,
      priceLabel,
      condition,
      spot: '',
      seller: 'You (Dawit M.)',
      dept: 'Verified Student',
      desc,
      img: uploadedCreateImageDataUrl || defaultImg,
      saved: false,
    };

    if (isApiConfigured()) {
      try {
        const created = await listingsService.createListing({
          title,
          category,
          type,
          price,
          condition,
          desc,
          imageDataUrl: uploadedCreateImageDataUrl || undefined,
        });
        if (created) newListing = created;
      } catch {
        // Keep local optimistic creation if API call fails.
      }
    }

    marketplaceListings.unshift(newListing);
    renderListings();
    formCreate.reset();
    clearCreateImageSelection();
    modalCreate?.classList.remove('is-open');

    const mktSec = document.getElementById('marketplace');
    mktSec?.scrollIntoView({ behavior: 'smooth' });
  });

  renderListings();

  if (isApiConfigured()) {
    void listingsService
      .fetchListings()
      .then((remoteListings) => {
        if (remoteListings && remoteListings.length > 0) {
          marketplaceListings = remoteListings;
          selectedListingForChat = marketplaceListings[0];
          renderListings();
        }
      })
      .catch(() => {
        // Retain initial listings if backend is unreachable.
      });
  }

  return {
    openItemDetails,
    openCreateListingModal,
    getListings: () => marketplaceListings,
    getSelectedListing: () => selectedListingForChat,
  };
}
