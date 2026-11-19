import { adminService } from '../services/api';
import type {
  AdminStudent,
  AdminSummary,
  AuditLogEntry,
  Listing,
  ModerationReport,
  VerificationQueueItem,
} from '../types/marketplace';
import type { MarketplaceController } from './marketplace';

interface BannerConfig {
  badgeTag: string;
  badgeText: string;
  headline1: string;
  headline2: string;
  subline: string;
}

const DEFAULT_BANNER: BannerConfig = {
  badgeTag: 'Live',
  badgeText: 'Built for the University Student Community.',
  headline1: 'Buy. Sell. Swap.',
  headline2: 'TradeX Makes It Better.',
  subline: "Find what you need. Sell what you don't. Trade with your campus community.",
};

const BANNER_STORAGE_KEY = 'tradex_hero_banner_config';

export function initAdmin(marketplaceCtrl?: MarketplaceController): void {
  // Main Container & Dialog
  const adminContainer = document.getElementById('admin-dashboard-container');
  if (!adminContainer) return;
  const container = adminContainer;

  // Nav & Tabs
  const tabBtns = Array.from(adminContainer.querySelectorAll<HTMLButtonElement>('[data-admin-tab]'));
  const tabPanes = {
    overview: document.getElementById('admin-pane-overview'),
    products: document.getElementById('admin-pane-products'),
    banners: document.getElementById('admin-pane-banners'),
    verifications: document.getElementById('admin-pane-verif'),
    students: document.getElementById('admin-pane-students'),
    reports: document.getElementById('admin-pane-reports'),
    audit: document.getElementById('admin-pane-audit'),
  };
  const breadcrumbActive = document.getElementById('admin-breadcrumb-active');

  // Summary Badges & Pills
  const topPendingPill = document.getElementById('admin-top-pending-pill');
  const topStudentsPill = document.getElementById('admin-top-students-pill');
  const topReportsPill = document.getElementById('admin-top-reports-pill');
  const topProductsPill = document.getElementById('admin-top-products-pill');
  const navVerifBadge = document.getElementById('admin-nav-verif-badge');
  const navStudentsBadge = document.getElementById('admin-nav-students-badge');
  const navReportsBadge = document.getElementById('admin-nav-reports-badge');
  const navProductsBadge = document.getElementById('admin-nav-products-badge');

  // Overview Pane Elements
  const kpiUsersCount = document.getElementById('admin-kpi-users-count');
  const kpiProductsCount = document.getElementById('admin-kpi-products-count');
  const kpiVolumeCount = document.getElementById('admin-kpi-volume-count');
  const kpiVerifsCount = document.getElementById('admin-kpi-verifs-count');
  const overviewVerifCount = document.getElementById('admin-overview-verif-count');
  const categoryBarsList = document.getElementById('admin-category-bars-list');
  const categoryTotalBadge = document.getElementById('admin-category-total-badge');
  const overviewBannerPreview = document.getElementById('admin-overview-banner-preview');
  const btnOverviewAddProduct = document.getElementById('btn-overview-add-product');
  const btnOverviewEditBanner = document.getElementById('btn-overview-edit-banner');
  const btnOverviewReviewIds = document.getElementById('btn-overview-review-ids');
  const btnQuickJumpBanner = document.getElementById('btn-quick-jump-banner');

  // Products Management Elements
  const btnToggleAddProduct = document.getElementById('btn-admin-toggle-add-product');
  const addProductPanel = document.getElementById('admin-add-product-panel');
  const btnCloseAddProduct = document.getElementById('btn-admin-close-add-product');
  const btnCancelProduct = document.getElementById('btn-admin-cancel-product');
  const addProductForm = document.getElementById('admin-add-product-form') as HTMLFormElement | null;
  const inputNewTitle = document.getElementById('admin-new-title') as HTMLInputElement | null;
  const inputNewPrice = document.getElementById('admin-new-price') as HTMLInputElement | null;
  const inputNewCategory = document.getElementById('admin-new-category') as HTMLSelectElement | null;
  const inputNewType = document.getElementById('admin-new-type') as HTMLSelectElement | null;
  const inputNewCondition = document.getElementById('admin-new-condition') as HTMLSelectElement | null;
  const inputNewSpot = document.getElementById('admin-new-spot') as HTMLSelectElement | null;
  const inputNewImgUrl = document.getElementById('admin-new-img-url') as HTMLInputElement | null;
  const inputNewDesc = document.getElementById('admin-new-desc') as HTMLTextAreaElement | null;
  const imgPresetBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-img-preset-btn'));
  const productSearchInput = document.getElementById('admin-product-search') as HTMLInputElement | null;
  const productFilterCat = document.getElementById('admin-product-filter-cat') as HTMLSelectElement | null;
  const productFilterStatus = document.getElementById('admin-product-filter-status') as HTMLSelectElement | null;
  const productsTbody = document.getElementById('admin-products-tbody');

  // Banner Manager Elements
  const previewBadgeTag = document.getElementById('admin-preview-badge-tag');
  const previewBadgeText = document.getElementById('admin-preview-badge-text');
  const previewLine1 = document.getElementById('admin-preview-line1');
  const previewLine2 = document.getElementById('admin-preview-line2');
  const previewSubline = document.getElementById('admin-preview-subline');
  const inputBadgeTag = document.getElementById('admin-input-badge-tag') as HTMLInputElement | null;
  const inputBadgeText = document.getElementById('admin-input-badge-text') as HTMLInputElement | null;
  const inputHeadline1 = document.getElementById('admin-input-headline-1') as HTMLInputElement | null;
  const inputHeadline2 = document.getElementById('admin-input-headline-2') as HTMLInputElement | null;
  const inputSubline = document.getElementById('admin-input-subline') as HTMLTextAreaElement | null;
  const btnSaveBanner = document.getElementById('btn-save-banner');
  const btnResetBanner = document.getElementById('btn-reset-banner');

  // Exit Buttons
  const btnExitAdmin = document.getElementById('btn-exit-admin');
  const btnExitAdminTop = document.getElementById('btn-exit-admin-top');
  const btnAdminMobileExit = document.getElementById('btn-admin-mobile-exit');

  // Split Console Elements (Verifications)
  const splitConsole = document.getElementById('admin-split-console');
  const queueEmpty = document.getElementById('admin-queue-empty');
  const queueCounter = document.getElementById('admin-queue-counter');
  const btnQueuePrev = document.getElementById('btn-queue-prev');
  const btnQueueNext = document.getElementById('btn-queue-next');

  // Document Inspector Elements
  const docImage = document.getElementById('admin-doc-image') as HTMLImageElement | null;
  const docMetaFile = document.getElementById('admin-doc-meta-file');
  const docMetaTime = document.getElementById('admin-doc-meta-time');
  const btnDocZoomIn = document.getElementById('btn-doc-zoom-in');
  const btnDocZoomOut = document.getElementById('btn-doc-zoom-out');
  const btnDocReset = document.getElementById('btn-doc-reset');
  const btnDocRotate = document.getElementById('btn-doc-rotate');

  // Student Dossier Elements
  const studentAvatar = document.getElementById('admin-student-avatar');
  const studentName = document.getElementById('admin-student-name');
  const studentEmail = document.getElementById('admin-student-email');
  const dossierId = document.getElementById('admin-dossier-id');
  const dossierUni = document.getElementById('admin-dossier-uni');
  const dossierDept = document.getElementById('admin-dossier-dept');
  const dossierYear = document.getElementById('admin-dossier-year');
  const dossierSubmitted = document.getElementById('admin-dossier-submitted');

  // Verification Decision Actions
  const btnAdminApprove = document.getElementById('btn-admin-approve');
  const btnAdminRejectToggle = document.getElementById('btn-admin-reject-toggle');
  const rejectionDrawer = document.getElementById('admin-rejection-drawer');
  const presetReasonsContainer = document.getElementById('admin-preset-reasons');
  const customReasonInput = document.getElementById('admin-custom-reason-input') as HTMLInputElement | null;
  const btnConfirmRejection = document.getElementById('btn-confirm-rejection');
  const btnCancelRejection = document.getElementById('btn-cancel-rejection');

  // Student Directory Elements
  const studentSearchInput = document.getElementById('admin-student-search') as HTMLInputElement | null;
  const studentFilterSelect = document.getElementById('admin-student-filter') as HTMLSelectElement | null;
  const studentsTbody = document.getElementById('admin-students-tbody');

  // Reports Queue Elements
  const reportsContainer = document.getElementById('admin-reports-container');

  // Audit Trail Elements
  const auditTbody = document.getElementById('admin-audit-tbody');

  // Local State
  let activeTab: 'overview' | 'products' | 'banners' | 'verifications' | 'students' | 'reports' | 'audit' = 'overview';
  let verificationQueue: VerificationQueueItem[] = [];
  let currentQueueIndex = 0;
  let studentsList: AdminStudent[] = [];
  let reportsList: ModerationReport[] = [];
  let auditLogs: AuditLogEntry[] = [];
  let summary: AdminSummary | null = null;

  // Document Zoom & Rotation State
  let docZoomLevel = 1.0;
  let docRotationAngle = 0;
  let selectedPresetReason = '';

  function updateDocTransform(): void {
    if (!docImage) return;
    docImage.style.transform = `scale(${docZoomLevel}) rotate(${docRotationAngle}deg)`;
    if (btnDocReset) {
      btnDocReset.textContent = `${Math.round(docZoomLevel * 100)}%`;
    }
  }

  function resetDocTransform(): void {
    docZoomLevel = 1.0;
    docRotationAngle = 0;
    updateDocTransform();
  }

  // Open & Close
  function openAdminDashboard(): void {
    container.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    refreshAllData();
  }

  function closeAdminDashboard(): void {
    container.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  // Tab Navigation
  function switchTab(tab: 'overview' | 'products' | 'banners' | 'verifications' | 'students' | 'reports' | 'audit'): void {
    activeTab = tab;

    tabBtns.forEach((btn) => {
      const isTarget = btn.getAttribute('data-admin-tab') === tab;
      btn.classList.toggle('is-active', isTarget);
    });

    Object.entries(tabPanes).forEach(([key, pane]) => {
      if (pane) {
        pane.classList.toggle('is-active', key === tab);
      }
    });

    if (breadcrumbActive) {
      const titles: Record<string, string> = {
        overview: 'Operations & Overview',
        products: 'Product & Inventory Management',
        banners: 'Hero Banner & Campus Showcase',
        verifications: 'ID Verifications Review',
        students: 'Student Directory',
        reports: 'Moderation Reports',
        audit: 'Audit Trail',
      };
      breadcrumbActive.textContent = titles[tab] || 'Console';
    }

    if (tab === 'overview') renderOverview();
    if (tab === 'products') renderProductsTable();
    if (tab === 'banners') renderBannerManager();
    if (tab === 'verifications') renderVerificationsView();
    if (tab === 'students') renderStudentsDirectory();
    if (tab === 'reports') renderReportsQueue();
    if (tab === 'audit') renderAuditTrail();
  }

  // Data Loading & Syncing
  async function refreshAllData(): Promise<void> {
    try {
      const [verifs, students, reps, logs, sum] = await Promise.all([
        adminService.fetchVerifications(),
        adminService.fetchStudents(),
        adminService.fetchReports(),
        adminService.fetchAuditLogs(),
        adminService.fetchSummary(),
      ]);

      verificationQueue = verifs.filter((v) => v.status === 'PENDING_APPROVAL');
      studentsList = students;
      reportsList = reps;
      auditLogs = logs;
      summary = sum;

      updateSummaryCounts();
      renderOverview();
      renderProductsTable();
      renderBannerManager();
      renderVerificationsView();
      if (activeTab === 'students') renderStudentsDirectory();
      if (activeTab === 'reports') renderReportsQueue();
      if (activeTab === 'audit') renderAuditTrail();
    } catch (err) {
      console.error('[Admin] Error refreshing admin dashboard data:', err);
    }
  }

  function updateSummaryCounts(): void {
    const pendingCount = verificationQueue.length;
    const activeStudentCount = studentsList.length || 4;
    const openReportCount = reportsList.filter((r) => r.status === 'OPEN').length;
    const listings = marketplaceCtrl ? marketplaceCtrl.getListings() : [];
    const productsCount = listings.length;

    if (topPendingPill) topPendingPill.textContent = String(pendingCount);
    if (topStudentsPill) topStudentsPill.textContent = String(activeStudentCount);
    if (topReportsPill) topReportsPill.textContent = String(openReportCount);
    if (topProductsPill) topProductsPill.textContent = String(productsCount);

    if (navVerifBadge) navVerifBadge.textContent = String(pendingCount);
    if (navStudentsBadge) navStudentsBadge.textContent = String(activeStudentCount);
    if (navReportsBadge) navReportsBadge.textContent = String(openReportCount);
    if (navProductsBadge) navProductsBadge.textContent = String(productsCount);
  }

  // --- Pane 0: Overview & KPI Analytics ---
  function renderOverview(): void {
    const listings = marketplaceCtrl ? marketplaceCtrl.getListings() : [];
    const usersCount = studentsList.length || 4;
    const productsCount = listings.length;
    const totalVolume = listings.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const pendingCount = verificationQueue.length;

    if (kpiUsersCount) kpiUsersCount.textContent = String(usersCount);
    if (kpiProductsCount) kpiProductsCount.textContent = String(productsCount);
    if (kpiVolumeCount) kpiVolumeCount.textContent = `ETB ${totalVolume.toLocaleString()}`;
    if (kpiVerifsCount) kpiVerifsCount.textContent = String(pendingCount);
    if (overviewVerifCount) overviewVerifCount.textContent = String(pendingCount);

    if (categoryTotalBadge) categoryTotalBadge.textContent = `${productsCount} Live Items`;

    // Category Distribution Bars
    if (categoryBarsList && productsCount > 0) {
      const categoryCounts: Record<string, number> = {};
      listings.forEach((item) => {
        const cat = item.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const categoriesSorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
      categoryBarsList.innerHTML = categoriesSorted
        .map(([cat, count]) => {
          const pct = Math.round((count / productsCount) * 100);
          return `
            <div class="admin-cat-bar-item">
              <div class="admin-cat-bar-header">
                <span>${escapeHtml(cat)}</span>
                <span style="color: #06D6A0;">${count} items (${pct}%)</span>
              </div>
              <div class="admin-cat-bar-track">
                <div class="admin-cat-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Banner overview status
    const currentBanner = loadBannerConfig();
    if (overviewBannerPreview) {
      overviewBannerPreview.textContent = `Headline: "${currentBanner.headline1}" • Active`;
    }
  }

  // --- Pane 1: Products & Inventory Management ---
  function renderProductsTable(): void {
    if (!productsTbody) return;

    let listings = marketplaceCtrl ? marketplaceCtrl.getListings() : [];

    const query = productSearchInput?.value.trim().toLowerCase() || '';
    const catFilter = productFilterCat?.value || 'ALL';
    const statusFilter = productFilterStatus?.value || 'ALL';

    if (query) {
      listings = listings.filter((item) =>
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.seller && item.seller.toLowerCase().includes(query)) ||
        (item.spot && item.spot.toLowerCase().includes(query)) ||
        (item.desc && item.desc.toLowerCase().includes(query))
      );
    }

    if (catFilter !== 'ALL') {
      listings = listings.filter((item) => item.category === catFilter);
    }

    if (statusFilter !== 'ALL') {
      const wantSold = statusFilter === 'SOLD';
      listings = listings.filter((item) => Boolean(item.sold) === wantSold);
    }

    if (listings.length === 0) {
      productsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px; color: var(--polar-500);">
            No products match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    productsTbody.innerHTML = listings
      .map((item) => {
        const isSold = Boolean(item.sold);
        const statusBadge = isSold
          ? '<span class="admin-status-pill is-sold">SOLD</span>'
          : '<span class="admin-status-pill is-active">ACTIVE</span>';

        const toggleBtnLabel = isSold ? 'Reactivate' : 'Mark Sold';

        return `
          <tr data-prod-id="${escapeHtml(item.id)}">
            <td>
              <div class="admin-prod-cell">
                <img src="${escapeHtml(item.img)}" class="admin-prod-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='/images/listings/college-textbooks.jpg'" />
                <div>
                  <div class="admin-prod-title">${escapeHtml(item.title)}</div>
                  <div class="admin-prod-meta">${escapeHtml(item.condition || 'Good')} • ${escapeHtml(item.type || 'Buy / Sell')}</div>
                </div>
              </div>
            </td>
            <td><span class="admin-badge-cat" style="font-size: 11px; padding: 2px 7px; border-radius: 6px; background: rgba(6, 214, 160, 0.1); color: #06D6A0;">${escapeHtml(item.category)}</span></td>
            <td style="font-weight: 700; color: #F2FDF9; font-family: var(--font-display);">${item.price > 0 ? Number(item.price).toLocaleString() + ' ETB' : 'FREE'}</td>
            <td>
              <div style="font-size: 13px; font-weight: 600; color: #E2F5EE;">${escapeHtml(item.seller || 'Student')}</div>
              <div style="font-size: 11px; color: var(--polar-500);">${escapeHtml(item.dept || 'Campus')}</div>
            </td>
            <td style="font-size: 12px; color: #9EC7BA;">${escapeHtml(item.spot || 'Library Safe Zone')}</td>
            <td>${statusBadge}</td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn-table-action" data-action="toggle-sold" data-id="${escapeHtml(item.id)}">
                  ${toggleBtnLabel}
                </button>
                <button type="button" class="btn-table-action is-danger" data-action="delete-product" data-id="${escapeHtml(item.id)}" title="Delete item from marketplace">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Handle Add Product As Admin
  function setupProductManagement(): void {
    btnToggleAddProduct?.addEventListener('click', () => {
      if (addProductPanel) {
        const isHidden = addProductPanel.style.display === 'none';
        addProductPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) inputNewTitle?.focus();
      }
    });

    btnCloseAddProduct?.addEventListener('click', () => {
      if (addProductPanel) addProductPanel.style.display = 'none';
    });

    btnCancelProduct?.addEventListener('click', () => {
      if (addProductPanel) addProductPanel.style.display = 'none';
    });

    // Preset button selection
    imgPresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        imgPresetBtns.forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        const imgUrl = btn.getAttribute('data-img');
        if (imgUrl && inputNewImgUrl) {
          inputNewImgUrl.value = imgUrl;
        }
      });
    });

    // Form Submit
    addProductForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = inputNewTitle?.value.trim() || '';
      const price = parseFloat(inputNewPrice?.value || '0') || 0;
      const category = inputNewCategory?.value || 'Campus Merch';
      const type = (inputNewType?.value || 'Buy / Sell') as Listing['type'];
      const condition = inputNewCondition?.value || 'Brand New';
      const spot = inputNewSpot?.value || 'Official Campus Store / Bookstore';
      const img = inputNewImgUrl?.value.trim() || '/images/listings/college-textbooks.jpg';
      const desc = inputNewDesc?.value.trim() || 'Official university campus product verified by TradeX.';

      if (!title) {
        alert('Please enter a product title.');
        return;
      }

      const newListing: Listing = {
        id: 'admin-prod-' + Date.now(),
        title,
        price,
        category,
        type,
        condition,
        spot,
        img,
        desc,
        seller: 'tradeX Official (Admin Store)',
        dept: 'Verified Campus Administration',
        priceLabel: price > 0 ? `${price.toLocaleString()} ETB` : 'FREE',
        typeClass: type === 'Swap' ? 'type-swap' : type === 'Giveaway' ? 'type-free' : 'type-sell',
        saved: false,
        sold: false,
      };

      if (marketplaceCtrl) {
        marketplaceCtrl.addListing(newListing);
      }

      // Add to audit logs
      const logEntry: AuditLogEntry = {
        id: 'audit-' + Date.now(),
        timestamp: 'Just now',
        actorName: 'Admin Staff (Dawit M.)',
        action: 'CREATE_LISTING',
        targetType: 'PRODUCT',
        targetName: newListing.title,
        notes: `Published official campus product in category "${category}" (${newListing.priceLabel})`,
      };
      auditLogs.unshift(logEntry);

      alert(`Official product "${newListing.title}" successfully published to the campus marketplace!`);

      addProductForm.reset();
      if (addProductPanel) addProductPanel.style.display = 'none';

      updateSummaryCounts();
      renderOverview();
      renderProductsTable();
    });

    // Filter Listeners
    productSearchInput?.addEventListener('input', () => renderProductsTable());
    productFilterCat?.addEventListener('change', () => renderProductsTable());
    productFilterStatus?.addEventListener('change', () => renderProductsTable());

    // Table Actions Delegation
    productsTbody?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>('.btn-table-action');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const prodId = btn.getAttribute('data-id');
      if (!prodId) return;

      if (action === 'delete-product') {
        if (confirm('Are you sure you want to remove this product from the marketplace?')) {
          marketplaceCtrl?.deleteListing(prodId);
          alert('Product removed from marketplace.');
          updateSummaryCounts();
          renderOverview();
          renderProductsTable();
        }
      } else if (action === 'toggle-sold') {
        const allListings = marketplaceCtrl?.getListings() ?? [];
        const item = allListings.find((l) => l.id === prodId);
        if (item) {
          const nextSold = !item.sold;
          marketplaceCtrl?.updateListing(prodId, { sold: nextSold });
          renderProductsTable();
        }
      }
    });
  }

  // --- Pane 2: Hero & Banner Announcement Manager ---
  function loadBannerConfig(): BannerConfig {
    try {
      const raw = localStorage.getItem(BANNER_STORAGE_KEY);
      if (raw) return { ...DEFAULT_BANNER, ...JSON.parse(raw) };
    } catch {
      // Fallback to default
    }
    return { ...DEFAULT_BANNER };
  }

  function saveBannerConfig(config: BannerConfig): void {
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Safe guard storage failure
    }
  }

  function applyBannerToHomepage(config: BannerConfig): void {
    const heroBadgeTag = document.querySelector<HTMLElement>('#badge .badge-live-tag');
    const heroBadgeText = document.querySelector<HTMLElement>('#badge .badge-text');
    const headline1 = document.getElementById('headline-line-1');
    const headline2 = document.getElementById('headline-line-2');
    const subline = document.getElementById('subline');

    if (heroBadgeTag) heroBadgeTag.textContent = config.badgeTag;
    if (heroBadgeText) heroBadgeText.textContent = config.badgeText;
    if (headline1) headline1.textContent = config.headline1;
    if (headline2) headline2.textContent = config.headline2;
    if (subline) subline.textContent = config.subline;
  }

  function renderBannerManager(): void {
    const config = loadBannerConfig();

    if (inputBadgeTag) inputBadgeTag.value = config.badgeTag;
    if (inputBadgeText) inputBadgeText.value = config.badgeText;
    if (inputHeadline1) inputHeadline1.value = config.headline1;
    if (inputHeadline2) inputHeadline2.value = config.headline2;
    if (inputSubline) inputSubline.value = config.subline;

    if (previewBadgeTag) previewBadgeTag.textContent = config.badgeTag;
    if (previewBadgeText) previewBadgeText.textContent = config.badgeText;
    if (previewLine1) previewLine1.textContent = config.headline1;
    if (previewLine2) previewLine2.textContent = config.headline2;
    if (previewSubline) previewSubline.textContent = config.subline;
  }

  function setupBannerManager(): void {
    // Initial application of saved banner on start
    const initialConfig = loadBannerConfig();
    applyBannerToHomepage(initialConfig);

    // Live sync inputs to preview box
    const updatePreview = () => {
      if (previewBadgeTag && inputBadgeTag) previewBadgeTag.textContent = inputBadgeTag.value || DEFAULT_BANNER.badgeTag;
      if (previewBadgeText && inputBadgeText) previewBadgeText.textContent = inputBadgeText.value || DEFAULT_BANNER.badgeText;
      if (previewLine1 && inputHeadline1) previewLine1.textContent = inputHeadline1.value || DEFAULT_BANNER.headline1;
      if (previewLine2 && inputHeadline2) previewLine2.textContent = inputHeadline2.value || DEFAULT_BANNER.headline2;
      if (previewSubline && inputSubline) previewSubline.textContent = inputSubline.value || DEFAULT_BANNER.subline;
    };

    [inputBadgeTag, inputBadgeText, inputHeadline1, inputHeadline2, inputSubline].forEach((el) => {
      el?.addEventListener('input', updatePreview);
    });

    btnSaveBanner?.addEventListener('click', () => {
      const config: BannerConfig = {
        badgeTag: inputBadgeTag?.value.trim() || DEFAULT_BANNER.badgeTag,
        badgeText: inputBadgeText?.value.trim() || DEFAULT_BANNER.badgeText,
        headline1: inputHeadline1?.value.trim() || DEFAULT_BANNER.headline1,
        headline2: inputHeadline2?.value.trim() || DEFAULT_BANNER.headline2,
        subline: inputSubline?.value.trim() || DEFAULT_BANNER.subline,
      };

      saveBannerConfig(config);
      applyBannerToHomepage(config);

      alert('Hero banner & campus announcements updated and published live across TradeX!');
      renderOverview();
    });

    btnResetBanner?.addEventListener('click', () => {
      if (confirm('Reset hero headlines and badges to initial factory defaults?')) {
        saveBannerConfig(DEFAULT_BANNER);
        applyBannerToHomepage(DEFAULT_BANNER);
        renderBannerManager();
        alert('Banner reset to defaults.');
        renderOverview();
      }
    });
  }

  // --- Verifications View ---
  function renderVerificationsView(): void {
    if (!splitConsole || !queueEmpty) return;

    if (verificationQueue.length === 0) {
      splitConsole.style.display = 'none';
      queueEmpty.style.display = 'block';
      if (queueCounter) queueCounter.textContent = '0 of 0';
      return;
    }

    splitConsole.style.display = 'grid';
    queueEmpty.style.display = 'none';

    if (currentQueueIndex >= verificationQueue.length) {
      currentQueueIndex = Math.max(0, verificationQueue.length - 1);
    }

    const item = verificationQueue[currentQueueIndex];
    if (!item) return;

    if (queueCounter) {
      queueCounter.textContent = `${currentQueueIndex + 1} of ${verificationQueue.length}`;
    }

    // Update Doc Inspector
    if (docImage) {
      docImage.src = item.idDocumentUrl || '/images/brand/sample-student-id.png';
      resetDocTransform();
    }
    if (docMetaFile) {
      docMetaFile.textContent = `Scan: ${item.idDocumentUrl ? item.idDocumentUrl.split('.').pop()?.toUpperCase() : 'JPG'} • University ID`;
    }
    if (docMetaTime) {
      docMetaTime.textContent = `Submitted: ${item.submittedAt}`;
    }

    // Update Student Dossier
    if (studentAvatar) {
      studentAvatar.textContent = item.studentName.charAt(0).toUpperCase();
    }
    if (studentName) studentName.textContent = item.studentName;
    if (studentEmail) studentEmail.textContent = item.email;
    if (dossierId) dossierId.textContent = item.studentId;
    if (dossierUni) dossierUni.textContent = 'Addis Ababa University';
    if (dossierDept) dossierDept.textContent = item.department;
    if (dossierYear) dossierYear.textContent = item.academicYear;
    if (dossierSubmitted) dossierSubmitted.textContent = item.submittedAt;

    closeRejectionDrawer();
  }

  function advanceQueue(): void {
    if (currentQueueIndex < verificationQueue.length - 1) {
      currentQueueIndex++;
    } else {
      currentQueueIndex = Math.max(0, verificationQueue.length - 1);
    }
    renderVerificationsView();
  }

  function retreatQueue(): void {
    if (currentQueueIndex > 0) {
      currentQueueIndex--;
    }
    renderVerificationsView();
  }

  // Decisions
  async function handleApprove(): Promise<void> {
    const item = verificationQueue[currentQueueIndex];
    if (!item) return;

    try {
      await adminService.approveVerification(item.userId);
      const student = studentsList.find((s) => s.id === item.userId);
      if (student) student.status = 'APPROVED';

      verificationQueue = verificationQueue.filter((v) => v.id !== item.id);
      updateSummaryCounts();
      renderVerificationsView();
      renderOverview();
      window.alert(`Approved student credential for ${item.studentName}!`);
    } catch (err) {
      console.error('[Admin] Failed to approve verification:', err);
      window.alert('Error approving verification.');
    }
  }

  async function handleReject(reason: string): Promise<void> {
    const item = verificationQueue[currentQueueIndex];
    if (!item) return;

    try {
      await adminService.rejectVerification(item.userId, reason);
      const student = studentsList.find((s) => s.id === item.userId);
      if (student) student.status = 'REJECTED';

      verificationQueue = verificationQueue.filter((v) => v.id !== item.id);
      updateSummaryCounts();
      renderVerificationsView();
      renderOverview();
      window.alert(`Verification rejected. Student ${item.studentName} notified.`);
    } catch (err) {
      console.error('[Admin] Failed to reject verification:', err);
      window.alert('Error rejecting verification.');
    }
  }

  function openRejectionDrawer(): void {
    if (!rejectionDrawer) return;
    rejectionDrawer.classList.add('is-open');
    selectedPresetReason = '';
    if (customReasonInput) customReasonInput.value = '';
    rejectionDrawer.querySelectorAll('.admin-preset-btn').forEach((b) => b.classList.remove('is-selected'));
  }

  function closeRejectionDrawer(): void {
    if (!rejectionDrawer) return;
    rejectionDrawer.classList.remove('is-open');
  }

  // --- Student Directory View ---
  function renderStudentsDirectory(): void {
    if (!studentsTbody) return;

    let filtered = [...studentsList];
    const query = studentSearchInput?.value.trim().toLowerCase() || '';
    const statusFilter = studentFilterSelect?.value || 'ALL';

    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.studentId.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (filtered.length === 0) {
      studentsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--polar-500);">
            No student accounts matching criteria.
          </td>
        </tr>
      `;
      return;
    }

    studentsTbody.innerHTML = filtered
      .map((student) => {
        const isSuspended = student.status === 'SUSPENDED';
        const isApproved = student.status === 'APPROVED';
        const statusBadgeClass = isApproved
          ? 'admin-badge-approved'
          : isSuspended
            ? 'admin-badge-suspended'
            : 'admin-badge-pending';
        const statusLabel = isApproved ? 'VERIFIED' : isSuspended ? 'SUSPENDED' : 'PENDING';

        const actionBtn = isSuspended
          ? `<button type="button" class="btn-table-action" data-action="reactivate" data-id="${student.id}">Reactivate</button>`
          : `<button type="button" class="btn-table-action is-danger" data-action="suspend" data-id="${student.id}">Suspend</button>`;

        return `
          <tr data-student-id="${student.id}">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="admin-table-avatar">${student.fullName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight: 600; color: #F2FDF9;">${escapeHtml(student.fullName)}</div>
                  <div style="font-size: 11.5px; color: var(--polar-500);">${escapeHtml(student.email)}</div>
                </div>
              </div>
            </td>
            <td style="font-family: monospace; font-size: 12px; color: #E2F5EE;">${escapeHtml(student.studentId)}</td>
            <td>
              <div style="font-size: 12.5px; color: #E2F5EE;">${escapeHtml(student.department)}</div>
              <div style="font-size: 11px; color: var(--polar-500);">${escapeHtml(student.academicYear)}</div>
            </td>
            <td>
              <span class="${statusBadgeClass}">${statusLabel}</span>
            </td>
            <td style="font-size: 12px; color: var(--polar-500);">${student.joinedAt}</td>
            <td>${actionBtn}</td>
          </tr>
        `;
      })
      .join('');
  }

  async function handleStudentAction(action: 'suspend' | 'reactivate', studentId: string): Promise<void> {
    try {
      if (action === 'suspend') {
        const reason = window.prompt('Provide a reason for student suspension:') || 'Terms of service violation';
        await adminService.updateStudentStatus(studentId, 'SUSPENDED', reason);
        const s = studentsList.find((item) => item.id === studentId);
        if (s) s.status = 'SUSPENDED';
        window.alert('Student account suspended.');
      } else {
        await adminService.updateStudentStatus(studentId, 'APPROVED', 'Reactivated by staff');
        const s = studentsList.find((item) => item.id === studentId);
        if (s) s.status = 'APPROVED';
        window.alert('Student account reactivated.');
      }
      renderStudentsDirectory();
      updateSummaryCounts();
    } catch (err) {
      console.error('[Admin] Error performing student action:', err);
      window.alert('Failed to update student status.');
    }
  }

  // --- Reports Queue View ---
  function renderReportsQueue(): void {
    if (!reportsContainer) return;

    const openReports = reportsList.filter((r) => r.status === 'OPEN');

    if (openReports.length === 0) {
      reportsContainer.innerHTML = `
        <div style="padding: 48px; text-align: center; background: #081F17; border: 1px solid rgba(6, 214, 160, 0.2); border-radius: 18px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #F2FDF9; margin-bottom: 6px;">No Active Reports</h3>
          <p style="font-size: 13.5px; color: var(--polar-500);">Community report queue is clear. No policy violations flagged.</p>
        </div>
      `;
      return;
    }

    reportsContainer.innerHTML = openReports
      .map((report) => `
        <div class="admin-report-card" data-report-id="${report.id}">
          <div class="admin-report-top">
            <div>
              <div class="admin-report-title">Listing: ${escapeHtml(report.targetTitle)}</div>
              <div style="font-size: 12px; color: var(--polar-500); margin-top: 2px;">
                Reported by <strong>${escapeHtml(report.reporterName)}</strong> (${escapeHtml(report.timestamp)})
              </div>
            </div>
            <span class="admin-report-badge">${escapeHtml(report.reason)}</span>
          </div>
          <div class="admin-report-details">
            "${escapeHtml(report.details)}"
          </div>
          <div class="admin-report-actions">
            <button type="button" class="btn-table-action is-danger" data-report-action="REMOVE_LISTING" data-id="${report.id}">
              Remove Listing
            </button>
            <button type="button" class="btn-table-action is-danger" data-report-action="SUSPEND_USER" data-id="${report.id}">
              Suspend Seller
            </button>
            <button type="button" class="btn-table-action" data-report-action="DISMISS" data-id="${report.id}">
              Dismiss Report
            </button>
          </div>
        </div>
      `)
      .join('');
  }

  async function handleReportAction(reportId: string, action: 'REMOVE_LISTING' | 'SUSPEND_USER' | 'DISMISS'): Promise<void> {
    try {
      await adminService.resolveReport(reportId, action, `Staff resolved report with ${action}`);
      reportsList = reportsList.filter((r) => r.id !== reportId);
      updateSummaryCounts();
      renderReportsQueue();
      window.alert(`Report resolved with action: ${action}`);
    } catch (err) {
      console.error('[Admin] Error resolving report:', err);
      window.alert('Failed to resolve report.');
    }
  }

  // --- Audit Trail View ---
  function renderAuditTrail(): void {
    if (!auditTbody) return;

    if (auditLogs.length === 0) {
      auditTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 32px; color: var(--polar-500);">
            No logged moderation events recorded.
          </td>
        </tr>
      `;
      return;
    }

    auditTbody.innerHTML = auditLogs
      .map((log) => `
        <tr>
          <td style="font-size: 11.5px; color: var(--polar-500);">${log.timestamp}</td>
          <td style="font-weight: 600; color: #E2F5EE;">${escapeHtml(log.actorName)}</td>
          <td>
            <span style="font-size: 11px; font-weight: 700; color: #06D6A0; background: rgba(6, 214, 160, 0.1); padding: 2px 6px; border-radius: 4px;">
              ${log.action}
            </span>
          </td>
          <td style="font-size: 13px; color: #F2FDF9;">${escapeHtml(log.targetName)}</td>
          <td style="font-size: 12px; color: var(--polar-500);">${escapeHtml(log.notes || '')}</td>
        </tr>
      `)
      .join('');
  }

  // Utilities
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Setup Event Handlers
  setupProductManagement();
  setupBannerManager();

  // Tab Navigation clicks
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-admin-tab') as 'overview' | 'products' | 'banners' | 'verifications' | 'students' | 'reports' | 'audit' | null;
      if (targetTab) switchTab(targetTab);
    });
  });

  // Overview Quick Actions
  btnOverviewAddProduct?.addEventListener('click', () => {
    switchTab('products');
    if (addProductPanel) {
      addProductPanel.style.display = 'block';
      inputNewTitle?.focus();
    }
  });

  btnOverviewEditBanner?.addEventListener('click', () => switchTab('banners'));
  btnQuickJumpBanner?.addEventListener('click', () => switchTab('banners'));
  btnOverviewReviewIds?.addEventListener('click', () => switchTab('verifications'));

  // Exit handlers
  const handleExit = () => {
    closeAdminDashboard();
    if (window.location.hash === '#admin') {
      window.location.hash = '';
    }
  };

  btnExitAdmin?.addEventListener('click', handleExit);
  btnExitAdminTop?.addEventListener('click', handleExit);
  btnAdminMobileExit?.addEventListener('click', handleExit);

  // Verification queue controls
  btnQueuePrev?.addEventListener('click', retreatQueue);
  btnQueueNext?.addEventListener('click', advanceQueue);

  // Document Inspector tool buttons
  btnDocZoomIn?.addEventListener('click', () => {
    docZoomLevel = Math.min(3.0, docZoomLevel + 0.25);
    updateDocTransform();
  });

  btnDocZoomOut?.addEventListener('click', () => {
    docZoomLevel = Math.max(0.5, docZoomLevel - 0.25);
    updateDocTransform();
  });

  btnDocReset?.addEventListener('click', resetDocTransform);

  btnDocRotate?.addEventListener('click', () => {
    docRotationAngle = (docRotationAngle + 90) % 360;
    updateDocTransform();
  });

  // Decision Buttons
  btnAdminApprove?.addEventListener('click', handleApprove);
  btnAdminRejectToggle?.addEventListener('click', () => {
    if (rejectionDrawer?.classList.contains('is-open')) {
      closeRejectionDrawer();
    } else {
      openRejectionDrawer();
    }
  });

  presetReasonsContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('.admin-preset-btn');
    if (!btn) return;

    presetReasonsContainer.querySelectorAll('.admin-preset-btn').forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedPresetReason = btn.getAttribute('data-reason') || '';
  });

  btnConfirmRejection?.addEventListener('click', () => {
    const customReason = customReasonInput?.value.trim() || '';
    const finalReason = customReason || selectedPresetReason;
    if (!finalReason) {
      window.alert('Please select or provide a rejection reason for the student.');
      return;
    }
    handleReject(finalReason);
  });

  btnCancelRejection?.addEventListener('click', closeRejectionDrawer);

  // Student Directory Filters & Delegation
  studentSearchInput?.addEventListener('input', () => {
    renderStudentsDirectory();
  });

  studentFilterSelect?.addEventListener('change', () => {
    renderStudentsDirectory();
  });

  studentsTbody?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('.btn-table-action');
    if (!btn) return;

    const action = btn.getAttribute('data-action') as 'suspend' | 'reactivate' | null;
    const studentId = btn.getAttribute('data-id');
    if (action && studentId) {
      handleStudentAction(action, studentId);
    }
  });

  // Reports Queue Actions
  reportsContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('[data-report-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-report-action') as 'REMOVE_LISTING' | 'SUSPEND_USER' | 'DISMISS' | null;
    const reportId = btn.getAttribute('data-id');
    if (action && reportId) {
      handleReportAction(reportId, action);
    }
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (!container.classList.contains('is-active')) return;

    if (e.key === 'Escape') {
      if (rejectionDrawer?.classList.contains('is-open')) {
        closeRejectionDrawer();
      } else {
        closeAdminDashboard();
      }
    } else if (activeTab === 'verifications') {
      if (e.key === 'ArrowLeft') {
        btnQueuePrev?.click();
      } else if (e.key === 'ArrowRight') {
        btnQueueNext?.click();
      }
    }
  });

  // Subscribe to marketplace listings changes if controller is supplied
  if (marketplaceCtrl && typeof marketplaceCtrl.subscribe === 'function') {
    marketplaceCtrl.subscribe(() => {
      updateSummaryCounts();
      if (activeTab === 'overview') renderOverview();
      if (activeTab === 'products') renderProductsTable();
    });
  }

  // Direct Hash Routing: if URL has #admin, open dashboard automatically!
  function checkHashRouting(): void {
    if (window.location.hash === '#admin') {
      openAdminDashboard();
    }
  }

  window.addEventListener('hashchange', checkHashRouting);
  checkHashRouting();

  // Top Navbar Direct Link listeners
  const btnNavAdmin = document.getElementById('btn-nav-admin');
  const mobileNavAdmin = document.getElementById('mobile-nav-admin');

  btnNavAdmin?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#admin';
    openAdminDashboard();
  });

  mobileNavAdmin?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#admin';
    openAdminDashboard();
  });

  // Global window exposure for triggers & developer convenience
  (window as unknown as { openAdminDashboard: () => void; closeAdminDashboard: () => void }).openAdminDashboard = openAdminDashboard;
  (window as unknown as { openAdminDashboard: () => void; closeAdminDashboard: () => void }).closeAdminDashboard = closeAdminDashboard;
}
