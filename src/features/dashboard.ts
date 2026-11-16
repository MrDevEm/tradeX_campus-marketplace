import { isApiConfigured } from '../config/env';
import { dashboardService } from '../services/api';

interface DashboardOptions {
  openCreateListingModal: () => void;
  openInboxModal: () => void;
}

export function initDashboard(options: DashboardOptions): void {
  const btnToggleDash = document.getElementById('btn-toggle-dash');
  const dashContainer = document.getElementById('dashboard-view-container');
  const dashBtnPost = document.getElementById('dash-btn-post');
  const dashOpenMessages = document.getElementById('dash-open-messages');

  if (btnToggleDash && dashContainer) {
    btnToggleDash.addEventListener('click', () => {
      dashContainer.classList.add('is-active');
      if (isApiConfigured()) {
        void dashboardService
          .fetchSummary()
          .then((summary) => {
            if (!summary) return;
            const statNums = dashContainer.querySelectorAll<HTMLElement>('.dash-stat-num');
            if (statNums[0]) statNums[0].textContent = String(summary.activeListingsCount);
            if (statNums[1]) statNums[1].textContent = String(summary.savedItemsCount);
            if (statNums[2]) statNums[2].textContent = String(summary.unreadChatsCount);
            if (statNums[3]) statNums[3].textContent = summary.trustScore;
          })
          .catch(() => {
            // Keep baseline values when backend summary endpoint is unavailable.
          });
      }
    });
  }

  ['btn-exit-dash', 'btn-exit-dash-mobile', 'btn-exit-dash-top'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn && dashContainer) {
      btn.addEventListener('click', () => {
        dashContainer.classList.remove('is-active');
      });
    }
  });

  dashBtnPost?.addEventListener('click', () => {
    options.openCreateListingModal();
  });

  dashOpenMessages?.addEventListener('click', (e) => {
    e.preventDefault();
    options.openInboxModal();
  });
}
