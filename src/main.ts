import './styles/index.css';

import { initAdmin } from './features/admin';
import { initAuth } from './features/auth';
import { initHeroCarousel } from './features/carousel';
import { initDashboard } from './features/dashboard';
import { initMarketplace } from './features/marketplace';
import { initMessaging } from './features/messaging';
import { initNavbar } from './features/navbar';
import type { Listing } from './types/marketplace';

function bootstrapTradeX(): void {
  initHeroCarousel();
  initNavbar();
  initAuth();
  initAdmin();

  let messagingCtrl: ReturnType<typeof initMessaging> | null = null;

  const marketplaceCtrl = initMarketplace({
    onOpenChatForListing: (item: Listing) => {
      messagingCtrl?.openChatForListing(item);
    },
  });

  messagingCtrl = initMessaging({
    getListings: marketplaceCtrl.getListings,
    openItemDetails: marketplaceCtrl.openItemDetails,
    getSelectedListing: marketplaceCtrl.getSelectedListing,
  });

  initDashboard({
    openCreateListingModal: marketplaceCtrl.openCreateListingModal,
    openInboxModal: messagingCtrl.openInboxModal,
  });

  const modalDetails = document.getElementById('modal-details');
  const modalCreate = document.getElementById('modal-create-listing');
  const modalAuth = document.getElementById('modal-auth');
  const modalMsg = messagingCtrl.modalMsg;

  [modalDetails, modalCreate, modalMsg, modalAuth].forEach((m) => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        if (m === modalMsg) messagingCtrl?.closeChatModal();
        else m.classList.remove('is-open');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalMsg && modalMsg.classList.contains('is-open')) {
      messagingCtrl?.closeChatModal();
    }
  });
}

bootstrapTradeX();
