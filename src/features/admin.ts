import { adminService, authService } from '../services/api';
import type {
  AdminStudent,
  AdminSummary,
  AuditLogEntry,
  ModerationReport,
  UserStatus,
  VerificationQueueItem,
} from '../types/marketplace';

export function initAdmin(): void {
  // Main Container & Dialog
  const adminContainer = document.getElementById('admin-dashboard-container');
  if (!adminContainer) return;
  const container = adminContainer;

  // Nav & Tabs
  const tabBtns = Array.from(adminContainer.querySelectorAll<HTMLButtonElement>('[data-admin-tab]'));
  const tabPanes = {
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
  const navVerifBadge = document.getElementById('admin-nav-verif-badge');
  const navStudentsBadge = document.getElementById('admin-nav-students-badge');
  const navReportsBadge = document.getElementById('admin-nav-reports-badge');

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
  let activeTab: 'verifications' | 'students' | 'reports' | 'audit' = 'verifications';
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
  function switchTab(tab: 'verifications' | 'students' | 'reports' | 'audit'): void {
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
        verifications: 'ID Verifications Review',
        students: 'Student Directory',
        reports: 'Moderation Reports',
        audit: 'Audit Trail',
      };
      breadcrumbActive.textContent = titles[tab] || 'Console';
    }

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

      // Only show pending items in active verification queue
      verificationQueue = verifs.filter((v) => v.status === 'PENDING_APPROVAL');
      studentsList = students;
      reportsList = reps;
      auditLogs = logs;
      summary = sum;

      updateSummaryCounts();
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
    const activeStudentCount = studentsList.filter((s) => s.status === 'APPROVED').length;
    const openReportCount = reportsList.filter((r) => r.status === 'OPEN').length;

    if (topPendingPill) topPendingPill.textContent = String(pendingCount);
    if (topStudentsPill) topStudentsPill.textContent = String(activeStudentCount);
    if (topReportsPill) topReportsPill.textContent = String(openReportCount);

    if (navVerifBadge) navVerifBadge.textContent = String(pendingCount);
    if (navStudentsBadge) navStudentsBadge.textContent = String(studentsList.length);
    if (navReportsBadge) navReportsBadge.textContent = String(openReportCount);
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

    // Populate Dossier
    if (studentAvatar) {
      studentAvatar.textContent = (item.studentName || 'S').charAt(0).toUpperCase();
    }
    if (studentName) studentName.textContent = item.studentName;
    if (studentEmail) studentEmail.textContent = item.email;
    if (dossierId) dossierId.textContent = item.studentId;
    if (dossierUni) dossierUni.textContent = 'Addis Ababa University';
    if (dossierDept) dossierDept.textContent = item.department;
    if (dossierYear) dossierYear.textContent = item.academicYear;
    if (dossierSubmitted) dossierSubmitted.textContent = item.submittedAt;

    // Populate Document Scan Image
    if (docImage) {
      docImage.src = item.idDocumentUrl || '/images/products/laptop.jpg';
      resetDocTransform();
    }

    if (docMetaFile) {
      docMetaFile.textContent = 'Scan: Official Student ID Card (High-Res)';
    }
    if (docMetaTime) {
      docMetaTime.textContent = `Submitted ${item.submittedAt}`;
    }

    // Reset Rejection Drawer
    closeRejectionDrawer();
  }

  function closeRejectionDrawer(): void {
    if (rejectionDrawer) rejectionDrawer.classList.remove('is-open');
    selectedPresetReason = '';
    if (customReasonInput) customReasonInput.value = '';
    if (presetReasonsContainer) {
      presetReasonsContainer.querySelectorAll<HTMLButtonElement>('.admin-preset-btn').forEach((b) => {
        b.classList.remove('is-selected');
      });
    }
  }

  async function handleApproveCurrent(): Promise<void> {
    const item = verificationQueue[currentQueueIndex];
    if (!item) return;

    btnAdminApprove?.setAttribute('disabled', 'true');
    try {
      const success = await adminService.approveVerification(item.id);
      if (success) {
        // If the current student user in session matches, sync session
        const currentSession = authService.getCurrentUser();
        if (currentSession && (currentSession.id === item.userId || currentSession.email === item.email)) {
          authService.setCurrentUser({
            ...currentSession,
            verified: true,
            status: 'APPROVED',
          });
        }
        await refreshAllData();
      }
    } finally {
      btnAdminApprove?.removeAttribute('disabled');
    }
  }

  async function handleRejectCurrent(): Promise<void> {
    const item = verificationQueue[currentQueueIndex];
    if (!item) return;

    const reason = (customReasonInput?.value.trim() || selectedPresetReason).trim();
    if (!reason) {
      window.alert('Please select or enter a rejection reason.');
      return;
    }

    btnConfirmRejection?.setAttribute('disabled', 'true');
    try {
      const success = await adminService.rejectVerification(item.id, reason);
      if (success) {
        // If current student user matches, sync session
        const currentSession = authService.getCurrentUser();
        if (currentSession && (currentSession.id === item.userId || currentSession.email === item.email)) {
          authService.setCurrentUser({
            ...currentSession,
            verified: false,
            status: 'REJECTED',
            rejectionReason: reason,
          });
        }
        await refreshAllData();
      }
    } finally {
      btnConfirmRejection?.removeAttribute('disabled');
    }
  }

  // --- Students Directory View ---
  function renderStudentsDirectory(): void {
    if (!studentsTbody) return;

    const searchTerm = studentSearchInput?.value.toLowerCase().trim() || '';
    const filterStatus = studentFilterSelect?.value || 'ALL';

    const filtered = studentsList.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm) ||
        s.email.toLowerCase().includes(searchTerm) ||
        s.studentId.toLowerCase().includes(searchTerm) ||
        s.department.toLowerCase().includes(searchTerm);

      if (!matchSearch) return false;
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'APPROVED') return s.status === 'APPROVED';
      if (filterStatus === 'PENDING') return s.status === 'PENDING_APPROVAL' || s.status === 'PENDING_UPLOAD';
      if (filterStatus === 'SUSPENDED') return s.status === 'SUSPENDED';
      return true;
    });

    if (filtered.length === 0) {
      studentsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--polar-500);">
            No campus students found matching the selected query.
          </td>
        </tr>
      `;
      return;
    }

    studentsTbody.innerHTML = filtered
      .map((student) => {
        const isApproved = student.status === 'APPROVED';
        const isSuspended = student.status === 'SUSPENDED';
        const statusClass = isApproved
          ? 'is-approved'
          : isSuspended
            ? 'is-suspended'
            : 'is-pending';
        const statusLabel = isApproved
          ? 'Verified Student'
          : isSuspended
            ? 'Suspended'
            : 'Pending Approval';

        return `
          <tr data-student-id="${student.id}">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(6, 214, 160, 0.15); color: #06D6A0; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px;">
                  ${student.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight: 600; color: #F2FDF9;">${student.fullName}</div>
                  <div style="font-size: 12px; color: #7AA99A;">${student.email}</div>
                </div>
              </div>
            </td>
            <td style="font-family: var(--font-sans); font-variant-numeric: tabular-nums; font-weight: 600;">
              ${student.studentId}
            </td>
            <td>
              <div>${student.department}</div>
              <div style="font-size: 11.5px; color: var(--polar-500);">${student.academicYear}</div>
            </td>
            <td>
              <span class="admin-status-pill ${statusClass}">${statusLabel}</span>
            </td>
            <td style="font-size: 12.5px; color: var(--polar-500);">
              ${student.joinedAt}
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                ${
                  isSuspended
                    ? `<button type="button" class="btn-table-action" data-action="reactivate" data-id="${student.id}">Reactivate</button>`
                    : `<button type="button" class="btn-table-action is-danger" data-action="suspend" data-id="${student.id}">Suspend</button>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function handleStudentAction(action: 'suspend' | 'reactivate', studentId: string): Promise<void> {
    const student = studentsList.find((s) => s.id === studentId);
    if (!student) return;

    if (action === 'suspend') {
      const confirmMsg = `Suspend student ${student.fullName}? They will lose access to campus marketplace trading.`;
      if (!window.confirm(confirmMsg)) return;
      await adminService.updateStudentStatus(studentId, 'SUSPENDED', 'Administrative policy suspension');
    } else {
      await adminService.updateStudentStatus(studentId, 'APPROVED', 'Administrative reinstatement');
    }
    await refreshAllData();
  }

  // --- Reports Queue View ---
  function renderReportsQueue(): void {
    if (!reportsContainer) return;

    const openReports = reportsList.filter((r) => r.status === 'OPEN');
    if (openReports.length === 0) {
      reportsContainer.innerHTML = `
        <div style="padding: 48px; text-align: center; background: #081F17; border: 1px solid rgba(6, 214, 160, 0.2); border-radius: 18px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06D6A0" stroke-width="2" style="margin: 0 auto 14px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <h3 style="font-family: var(--font-display); font-size: 19px; font-weight: 700; color: #F2FDF9; margin-bottom: 6px;">All Reports Triaged!</h3>
          <p style="font-size: 13.5px; color: var(--polar-500);">No outstanding campus peer moderation reports require review.</p>
        </div>
      `;
      return;
    }

    reportsContainer.innerHTML = openReports
      .map((report) => `
        <div class="admin-report-card" data-report-id="${report.id}">
          <div class="admin-report-top">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="admin-report-badge">${report.targetType}: ${report.reason}</span>
              <span style="font-size: 12px; color: var(--polar-500);">${report.timestamp}</span>
            </div>
            <span style="font-size: 12.5px; color: #9EC7BA;">Reported by: <strong>${report.reporterName}</strong></span>
          </div>
          <div class="admin-report-title">${report.targetTitle}</div>
          <div class="admin-report-details">${report.details}</div>
          <div class="admin-report-actions">
            <button type="button" class="btn-table-action is-danger" data-report-action="REMOVE_LISTING" data-id="${report.id}">
              Remove Listing & Warn
            </button>
            <button type="button" class="btn-table-action is-danger" data-report-action="SUSPEND_USER" data-id="${report.id}">
              Suspend Seller
            </button>
            <button type="button" class="btn-table-action" data-report-action="DISMISS" data-id="${report.id}">
              Dismiss (No Violation)
            </button>
          </div>
        </div>
      `)
      .join('');
  }

  async function handleReportAction(reportId: string, action: 'REMOVE_LISTING' | 'SUSPEND_USER' | 'DISMISS'): Promise<void> {
    const report = reportsList.find((r) => r.id === reportId);
    if (!report) return;

    const note =
      action === 'DISMISS'
        ? 'Report dismissed after review: content meets campus guidelines.'
        : action === 'REMOVE_LISTING'
          ? 'Listing taken down for policy violation.'
          : 'User suspended for safety infraction.';

    await adminService.resolveReport(reportId, action, note);
    await refreshAllData();
  }

  // --- Audit Trail View ---
  function renderAuditTrail(): void {
    if (!auditTbody) return;

    if (auditLogs.length === 0) {
      auditTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 32px; color: var(--polar-500);">
            No audit records logged yet.
          </td>
        </tr>
      `;
      return;
    }

    auditTbody.innerHTML = auditLogs
      .map((entry) => `
        <tr>
          <td style="font-family: var(--font-sans); font-variant-numeric: tabular-nums; font-size: 12.5px; color: var(--polar-500); white-space: nowrap;">
            ${entry.timestamp}
          </td>
          <td style="font-weight: 600; color: #F2FDF9;">
            ${entry.actorName}
          </td>
          <td>
            <span class="admin-status-pill ${
              entry.action.includes('APPROVED') || entry.action.includes('VERIFIED')
                ? 'is-approved'
                : entry.action.includes('REJECTED') || entry.action.includes('SUSPENDED') || entry.action.includes('REMOVE')
                  ? 'is-suspended'
                  : 'is-pending'
            }">
              ${entry.action}
            </span>
          </td>
          <td style="color: #E2F5EE; font-weight: 500;">
            ${entry.targetName}
          </td>
          <td style="font-size: 13px; color: #9EC7BA; max-width: 380px;">
            ${entry.notes}
          </td>
        </tr>
      `)
      .join('');
  }

  // --- Event Listeners Wiring ---

  // Tab Switching
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-admin-tab') as 'verifications' | 'students' | 'reports' | 'audit';
      if (tab) switchTab(tab);
    });
  });

  // Exit Triggers
  btnExitAdmin?.addEventListener('click', closeAdminDashboard);
  btnExitAdminTop?.addEventListener('click', closeAdminDashboard);
  btnAdminMobileExit?.addEventListener('click', closeAdminDashboard);

  // Queue Navigation
  btnQueuePrev?.addEventListener('click', () => {
    if (verificationQueue.length === 0) return;
    currentQueueIndex = (currentQueueIndex - 1 + verificationQueue.length) % verificationQueue.length;
    renderVerificationsView();
  });

  btnQueueNext?.addEventListener('click', () => {
    if (verificationQueue.length === 0) return;
    currentQueueIndex = (currentQueueIndex + 1) % verificationQueue.length;
    renderVerificationsView();
  });

  // Document Inspector Tools
  btnDocZoomIn?.addEventListener('click', () => {
    docZoomLevel = Math.min(docZoomLevel + 0.25, 2.5);
    updateDocTransform();
  });

  btnDocZoomOut?.addEventListener('click', () => {
    docZoomLevel = Math.max(docZoomLevel - 0.25, 0.5);
    updateDocTransform();
  });

  btnDocReset?.addEventListener('click', resetDocTransform);

  btnDocRotate?.addEventListener('click', () => {
    docRotationAngle = (docRotationAngle + 90) % 360;
    updateDocTransform();
  });

  // Approve & Reject Actions
  btnAdminApprove?.addEventListener('click', handleApproveCurrent);

  btnAdminRejectToggle?.addEventListener('click', () => {
    rejectionDrawer?.classList.toggle('is-open');
  });

  btnCancelRejection?.addEventListener('click', closeRejectionDrawer);

  presetReasonsContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('.admin-preset-btn');
    if (!btn) return;

    presetReasonsContainer.querySelectorAll<HTMLButtonElement>('.admin-preset-btn').forEach((b) => {
      b.classList.remove('is-selected');
    });
    btn.classList.add('is-selected');
    selectedPresetReason = btn.getAttribute('data-reason') || '';
    if (customReasonInput) {
      customReasonInput.value = selectedPresetReason;
    }
  });

  btnConfirmRejection?.addEventListener('click', handleRejectCurrent);

  // Student Directory Controls
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

  // Global window exposure for triggers & developer convenience
  (window as unknown as { openAdminDashboard: () => void; closeAdminDashboard: () => void }).openAdminDashboard = openAdminDashboard;
  (window as unknown as { openAdminDashboard: () => void; closeAdminDashboard: () => void }).closeAdminDashboard = closeAdminDashboard;
}
