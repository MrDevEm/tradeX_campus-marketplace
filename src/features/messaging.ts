import { isApiConfigured } from '../config/env';
import { INITIAL_CONVERSATIONS, LOCAL_CHAT_MEDIA_POOL } from '../data/marketplaceSeed';
import { messagingService, chatService, CAMPUS_MEETUP_SPOTS } from '../services/api';
import type { CampusMeetupSpot, ChatMessage, ChatMobileView, Conversation, Listing } from '../types/marketplace';
import { escapeHtml } from '../utils/html';

export interface MessagingController {
  openChatForListing: (item: Listing) => void;
  openInboxModal: () => void;
  closeChatModal: () => void;
  modalMsg: HTMLElement | null;
}

interface MessagingOptions {
  getListings: () => Listing[];
  openItemDetails: (id: string) => void;
  getSelectedListing: () => Listing | undefined;
}

export function initMessaging(options: MessagingOptions): MessagingController {
  const modalDetails = document.getElementById('modal-details');
  const modalMsg = document.getElementById('modal-messaging');
  const chatShell = document.getElementById('chat-modal-shell');
  const convList = document.getElementById('conv-list');
  const chatInboxCount = document.getElementById('chat-inbox-count');
  const chatInboxSearch = document.getElementById('chat-inbox-search') as HTMLInputElement | null;
  const chatThread = document.getElementById('chat-thread');
  const chatComposerWrap = document.getElementById('chat-composer-wrap');
  const formSendMessage = document.getElementById('form-send-message') as HTMLFormElement | null;
  const chatMsgInput = document.getElementById('chat-msg-input') as HTMLInputElement | null;
  const activeChatSeller = document.getElementById('active-chat-seller');
  const activeChatStatus = document.getElementById('active-chat-status');
  const activeChatAvatar = document.getElementById('active-chat-avatar');
  const chatInfoAvatar = document.getElementById('chat-info-avatar');
  const chatInfoName = document.getElementById('chat-info-name');
  const chatInfoHandle = document.getElementById('chat-info-handle');
  const chatSharedMediaGrid = document.getElementById('chat-shared-media-grid');
  const chatSharedPostGrid = document.getElementById('chat-shared-post-grid');
  const btnViewAllMedia = document.getElementById('btn-chat-view-all-media');
  const chatAttachPopover = document.getElementById('chat-attach-popover');
  const btnChatPlus = document.getElementById('btn-chat-plus');
  const chatPhotoInput = document.getElementById('chat-photo-input') as HTMLInputElement | null;
  const chatMenuDropdown = document.getElementById('chat-menu-dropdown');
  const chatToastEl = document.getElementById('chat-toast');
  const chatToastTextEl = document.getElementById('chat-toast-text');
  const btnChatUndo = document.getElementById('btn-chat-undo');
  const chatLightbox = document.getElementById('chat-lightbox');
  const chatLightboxImg = document.getElementById('chat-lightbox-img') as HTMLImageElement | null;

  // Real-time Meetup & Typing Elements
  const btnChatMeetupSpots = document.getElementById('btn-chat-meetup-spots');
  const chatMeetupPopover = document.getElementById('chat-meetup-popover');
  const btnCloseMeetupPicker = document.getElementById('btn-close-meetup-picker');
  const chatMeetupSpotsList = document.getElementById('chat-meetup-spots-list');
  const chatTypingIndicator = document.getElementById('chat-typing-indicator');
  const chatTypingName = document.getElementById('chat-typing-name');

  let activeConversations: Conversation[] = INITIAL_CONVERSATIONS.map((c) => ({
    ...c,
    sharedMedia: [...c.sharedMedia],
    messages: c.messages.map((m) => ({ ...m })),
  }));

  let currentConv: Conversation | null = activeConversations[0] || null;
  let showAllMediaFlag = false;
  let chatToastTimer: number | undefined;
  let undoActionFn: (() => void) | null = null;
  let chatReturnToDetailsId: string | null = null;

  function getFormattedNow(): string {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function showChatToast(msg: string, onUndo?: () => void): void {
    if (!chatToastEl || !chatToastTextEl) return;
    chatToastTextEl.textContent = msg;
    undoActionFn = typeof onUndo === 'function' ? onUndo : null;
    if (btnChatUndo) {
      btnChatUndo.style.display = undoActionFn ? 'inline-block' : 'none';
    }
    chatToastEl.classList.add('is-visible');
    window.clearTimeout(chatToastTimer);
    chatToastTimer = window.setTimeout(
      () => {
        chatToastEl.classList.remove('is-visible');
        undoActionFn = null;
      },
      undoActionFn ? 4800 : 2400
    );
  }

  btnChatUndo?.addEventListener('click', () => {
    if (typeof undoActionFn === 'function') {
      const fn = undoActionFn;
      undoActionFn = null;
      chatToastEl?.classList.remove('is-visible');
      window.clearTimeout(chatToastTimer);
      fn();
    }
  });

  function setChatMobileView(view: ChatMobileView): void {
    if (chatShell) chatShell.setAttribute('data-mobile-view', view);
    document.querySelectorAll('[data-chat-tab]').forEach((tab) => {
      const active = tab.getAttribute('data-chat-tab') === view;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncChatMobileViewport(): void {
    if (!modalMsg) return;
    const vv = window.visualViewport;
    const isMobile = window.innerWidth <= 767;
    const isTopWindow = window.self === window.top;
    if (
      isMobile &&
      isTopWindow &&
      modalMsg.classList.contains('is-open') &&
      vv &&
      vv.height > 200 &&
      vv.height < window.innerHeight - 60
    ) {
      modalMsg.style.height = vv.height + 'px';
      modalMsg.style.top = vv.offsetTop + 'px';
      modalMsg.style.bottom = 'auto';
    } else {
      modalMsg.style.height = '';
      modalMsg.style.top = '';
      modalMsg.style.bottom = '';
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncChatMobileViewport);
    window.visualViewport.addEventListener('scroll', syncChatMobileViewport);
  }

  chatMsgInput?.addEventListener('focus', () => {
    window.setTimeout(() => {
      syncChatMobileViewport();
      if (chatThread) chatThread.scrollTop = chatThread.scrollHeight;
    }, 140);
  });

  function openChatModal(): void {
    if (!modalMsg) return;
    modalMsg.classList.add('is-open');
    document.body.classList.add('chat-modal-open');
    syncChatMobileViewport();
  }

  function closeChatModal(): void {
    if (modalMsg) {
      modalMsg.classList.remove('is-open');
      modalMsg.style.height = '';
      modalMsg.style.top = '';
      modalMsg.style.bottom = '';
    }
    document.body.classList.remove('chat-modal-open');
    chatAttachPopover?.classList.remove('is-open');
    btnChatPlus?.classList.remove('is-active');
    chatMenuDropdown?.classList.remove('is-open');
  }

  function goBackFromChat(): void {
    const returnId = chatReturnToDetailsId;
    chatReturnToDetailsId = null;
    closeChatModal();
    if (returnId) {
      options.openItemDetails(returnId);
    }
  }

  function openChatLightbox(src: string | null): void {
    if (!chatLightbox || !chatLightboxImg || !src) return;
    chatLightboxImg.src = src;
    chatLightbox.classList.add('is-open');
  }

  function deleteMessageById(mid: string): void {
    if (!currentConv || !mid) return;
    const idx = currentConv.messages.findIndex((m) => m.id === mid);
    if (idx === -1) return;
    const removed = currentConv.messages[idx];
    const convRef = currentConv;

    const domNode = chatThread ? chatThread.querySelector(`.chat-msg-group[data-mid="${mid}"]`) : null;
    if (domNode) {
      domNode.classList.add('is-removing');
      window.setTimeout(() => {
        if (domNode.parentNode) domNode.parentNode.removeChild(domNode);
      }, 170);
    }

    currentConv.messages.splice(idx, 1);
    renderConversations();

    if (isApiConfigured()) {
      void messagingService.deleteMessage(convRef.id, mid).catch(() => {
        // Preserve local undo experience if offline.
      });
    }

    showChatToast('Message deleted', () => {
      convRef.messages.splice(Math.min(idx, convRef.messages.length), 0, removed);
      if (currentConv && currentConv.id === convRef.id) {
        renderChatMessages();
      }
      renderConversations();
    });
  }

  function buildMessageElement(m: ChatMessage, isNew: boolean): HTMLDivElement {
    const group = document.createElement('div');
    group.className = `chat-msg-group ${m.in ? 'is-in' : 'is-out'}${isNew ? ' is-new' : ''}`;
    group.setAttribute('data-mid', m.id);

    const ticksHtml = m.in
      ? ''
      : `
      <span class="chat-read-ticks" aria-label="Read">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 12 6 17 16 7"></polyline><polyline points="8 12 13 17 23 7"></polyline></svg>
      </span>
    `;

    const safeMid = escapeHtml(m.id);
    const safeTime = escapeHtml(m.time || '11:05');
    const safeText = escapeHtml(m.text);

    const deleteBtnHtml = `
      <button type="button" class="chat-msg-delete-btn" data-del-mid="${safeMid}" title="Delete message" aria-label="Delete message">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    `;

    const meetupCardHtml = m.meetupDetails
      ? `<div class="chat-meetup-proposal-card">
           <div class="chat-meetup-card-title">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
             Official Safe Campus Exchange Zone
           </div>
           <div class="chat-meetup-card-spot">${escapeHtml(m.meetupDetails.name)}</div>
           <div class="chat-meetup-card-meta">${escapeHtml(m.meetupDetails.safetyRating)} • Landmark: ${escapeHtml(m.meetupDetails.landmark)}</div>
         </div>`
      : '';

    const bodyHtml = m.img
      ? `<div class="msg-bubble ${m.in ? 'msg-in' : 'msg-out'} msg-photo-bubble" data-photo-src="${escapeHtml(m.img)}">
           <img src="${escapeHtml(m.img)}" alt="Shared photo" />
           ${m.text ? `<div class="msg-photo-caption">${safeText}</div>` : ''}
         </div>`
      : `<div class="msg-bubble ${m.in ? 'msg-in' : 'msg-out'}">${safeText}${meetupCardHtml}</div>`;

    group.innerHTML = `
      <div class="chat-msg-meta">
        ${m.in ? `${safeTime}${deleteBtnHtml}` : `${deleteBtnHtml}${safeTime}${ticksHtml}`}
      </div>
      ${bodyHtml}
    `;

    const photoEl = group.querySelector('.msg-photo-bubble');
    photoEl?.addEventListener('click', () => {
      openChatLightbox(photoEl.getAttribute('data-photo-src'));
    });

    const delBtn = group.querySelector('.chat-msg-delete-btn');
    delBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMessageById(m.id);
    });

    return group;
  }

  function appendMessageToThread(m: ChatMessage): void {
    if (!chatThread) return;
    const typingEl = document.getElementById('chat-typing-indicator');
    const el = buildMessageElement(m, true);
    if (typingEl && typingEl.parentNode === chatThread) {
      chatThread.insertBefore(el, typingEl);
    } else {
      chatThread.appendChild(el);
    }
    chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: 'smooth' });
  }

  function deleteConversationById(cid: string | null): void {
    if (!cid) return;
    const idx = activeConversations.findIndex((c) => c.id === cid);
    if (idx === -1) return;
    const removedConv = activeConversations[idx];
    const wasCurrent = currentConv && currentConv.id === cid;

    activeConversations.splice(idx, 1);
    if (wasCurrent) {
      currentConv = activeConversations[0] || null;
    }

    renderConversations();
    renderChatMessages();
    renderChatInfoPanel();

    if (window.innerWidth <= 767 && activeConversations.length > 0 && wasCurrent) {
      setChatMobileView('inbox');
    }

    if (isApiConfigured()) {
      void messagingService.deleteConversation(cid).catch(() => {});
    }

    showChatToast(`Deleted chat with ${removedConv.seller}`, () => {
      activeConversations.splice(Math.min(idx, activeConversations.length), 0, removedConv);
      currentConv = removedConv;
      renderConversations();
      renderChatMessages();
      renderChatInfoPanel();
      setChatMobileView('chat');
    });
  }

  function clearCurrentChat(): void {
    if (!currentConv || currentConv.messages.length === 0) {
      showChatToast('No messages to clear');
      return;
    }
    const convRef = currentConv;
    const backupMsgs = [...convRef.messages];
    convRef.messages = [];
    renderConversations();
    renderChatMessages();

    if (isApiConfigured()) {
      void messagingService.clearConversation(convRef.id).catch(() => {});
    }

    showChatToast('Chat messages cleared', () => {
      convRef.messages = backupMsgs;
      if (currentConv && currentConv.id === convRef.id) {
        renderChatMessages();
      }
      renderConversations();
    });
  }

  function renderConversations(): void {
    if (!convList) return;
    const q = (chatInboxSearch ? chatInboxSearch.value : '').trim().toLowerCase();
    const sorted = [...activeConversations].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    const visible = sorted.filter((c) => !q || c.seller.toLowerCase().includes(q) || c.item.toLowerCase().includes(q));

    if (chatInboxCount) chatInboxCount.textContent = `(${activeConversations.length})`;
    const mobileTabCount = document.getElementById('chat-mobile-tab-count');
    if (mobileTabCount) mobileTabCount.textContent = `(${activeConversations.length})`;

    if (visible.length === 0) {
      convList.innerHTML = `
        <div class="chat-empty-state">
          <div class="chat-empty-title">${activeConversations.length === 0 ? 'No chats yet' : 'No matches'}</div>
          <div class="chat-empty-desc">${activeConversations.length === 0 ? 'Start a conversation from any marketplace post.' : 'Try another seller or item name.'}</div>
        </div>
      `;
      return;
    }

    convList.innerHTML = visible
      .map((c) => {
        const lastMsg = c.messages[c.messages.length - 1];
        const preview = lastMsg ? (lastMsg.img ? 'Sent a photo' : lastMsg.text) : c.item;
        const isActive = currentConv && c.id === currentConv.id;
        return `
        <div class="conv-row-wrap ${isActive ? 'is-active' : ''}">
          <button type="button" class="conv-item" data-cid="${escapeHtml(c.id)}">
            <div class="conv-avatar-wrap">
              <div class="conv-avatar">${escapeHtml(c.seller.charAt(0).toUpperCase())}</div>
              <span class="conv-online-dot" aria-hidden="true"></span>
            </div>
            <div class="conv-meta">
              <div class="conv-top-row">
                <span class="conv-seller">${escapeHtml(c.seller)}</span>
                <span class="conv-time">${escapeHtml(c.lastTime || 'Now')}</span>
              </div>
              <div class="conv-item-title">
                ${c.pinned ? '<svg class="conv-pin-badge" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-4 4v5l-2 2-3.5-3.5L6 21l-3-3 5.5-5.5L5 9l2-2h5z"/></svg>' : ''}
                <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(preview)}</span>
              </div>
            </div>
          </button>
          <button type="button" class="conv-delete-btn" data-del-cid="${escapeHtml(c.id)}" title="Delete chat" aria-label="Delete chat with ${escapeHtml(c.seller)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      })
      .join('');

    convList.querySelectorAll('.conv-item').forEach((el) => {
      el.addEventListener('click', () => {
        const cid = el.getAttribute('data-cid');
        currentConv = activeConversations.find((c) => c.id === cid) || activeConversations[0] || null;
        showAllMediaFlag = false;
        renderConversations();
        renderChatMessages();
        renderChatInfoPanel();
        setChatMobileView('chat');
      });
    });

    convList.querySelectorAll('.conv-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversationById(btn.getAttribute('data-del-cid'));
      });
    });
  }

  function renderChatInfoPanel(): void {
    if (!currentConv) {
      if (chatInfoAvatar) chatInfoAvatar.textContent = 'T';
      if (chatInfoName) chatInfoName.textContent = 'tradeX Inbox';
      if (chatInfoHandle) chatInfoHandle.textContent = 'No active conversation';
      if (chatSharedMediaGrid) chatSharedMediaGrid.innerHTML = '';
      if (chatSharedPostGrid) chatSharedPostGrid.innerHTML = '';
      return;
    }
    const initial = currentConv.seller.charAt(0).toUpperCase();
    const handleSlug = '@' + currentConv.seller.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    if (chatInfoAvatar) chatInfoAvatar.textContent = initial;
    if (chatInfoName) chatInfoName.textContent = currentConv.seller;
    if (chatInfoHandle) chatInfoHandle.textContent = handleSlug;

    const pinBtn = document.getElementById('btn-chat-pin');
    pinBtn?.classList.toggle('is-active', Boolean(currentConv.pinned));

    const mediaItems =
      currentConv.sharedMedia && currentConv.sharedMedia.length
        ? currentConv.sharedMedia
        : [currentConv.img || LOCAL_CHAT_MEDIA_POOL[0], ...LOCAL_CHAT_MEDIA_POOL.slice(0, 5)];

    if (chatSharedMediaGrid) {
      const displayMedia = showAllMediaFlag ? mediaItems : mediaItems.slice(0, 6);
      chatSharedMediaGrid.innerHTML = displayMedia
        .map(
          (src, idx) => `
        <button type="button" class="chat-media-tile" data-media-src="${escapeHtml(src)}" aria-label="View shared photo ${idx + 1}">
          <img src="${escapeHtml(src)}" alt="Shared media ${idx + 1}" loading="lazy" onerror="this.src='/images/products/laptop.jpg'" />
        </button>
      `
        )
        .join('');

      chatSharedMediaGrid.querySelectorAll('.chat-media-tile').forEach((btn) => {
        btn.addEventListener('click', () => {
          openChatLightbox(btn.getAttribute('data-media-src'));
        });
      });
    }

    if (btnViewAllMedia) {
      btnViewAllMedia.textContent = showAllMediaFlag ? 'Show Less' : `View All (${mediaItems.length})`;
    }

    if (chatSharedPostGrid) {
      const posts = options.getListings().slice(0, 6);
      chatSharedPostGrid.innerHTML = posts
        .map(
          (post) => `
        <button type="button" class="chat-media-tile" data-post-id="${escapeHtml(post.id)}" title="${escapeHtml(post.title)}" aria-label="Open listing ${escapeHtml(post.title)}">
          <img src="${escapeHtml(post.img)}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='/images/products/book.png'" />
          <span class="chat-post-mini-badge" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="3"></rect></svg>
          </span>
        </button>
      `
        )
        .join('');

      chatSharedPostGrid.querySelectorAll('.chat-media-tile').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-post-id');
          const targetItem = options.getListings().find((l) => l.id === pid);
          if (targetItem) {
            closeChatModal();
            options.openItemDetails(targetItem.id);
          }
        });
      });
    }
  }

  function renderChatMessages(): void {
    if (!chatThread) return;
    const chatListingStrip = document.getElementById('chat-listing-strip');
    const chatStripImg = document.getElementById('chat-strip-img') as HTMLImageElement | null;
    const chatStripTitle = document.getElementById('chat-strip-title');
    const chatStripPrice = document.getElementById('chat-strip-price');

    if (!currentConv) {
      if (activeChatSeller) activeChatSeller.textContent = 'No Active Chat';
      if (activeChatStatus) activeChatStatus.textContent = 'Select or start a conversation';
      if (activeChatAvatar) activeChatAvatar.textContent = 'T';
      chatListingStrip?.classList.add('is-hidden');
      if (chatComposerWrap) chatComposerWrap.style.display = 'none';
      chatThread.innerHTML = `
        <div class="chat-empty-state">
          <div class="chat-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="chat-empty-title">Your inbox is clear</div>
          <div class="chat-empty-desc">Tap Chat on any marketplace listing to message a student seller.</div>
          <button type="button" class="chat-empty-btn" id="btn-chat-browse-mkt">Browse Marketplace</button>
        </div>
      `;
      const browseBtn = document.getElementById('btn-chat-browse-mkt');
      browseBtn?.addEventListener('click', () => {
        closeChatModal();
        const mkt = document.getElementById('marketplace');
        mkt?.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    if (chatComposerWrap) chatComposerWrap.style.display = 'block';
    const initial = currentConv.seller.charAt(0).toUpperCase();
    if (activeChatSeller) activeChatSeller.textContent = currentConv.seller;
    if (activeChatStatus) activeChatStatus.textContent = 'Online';
    if (activeChatAvatar) activeChatAvatar.textContent = initial;

    const listingImg = currentConv.img || '/images/products/laptop.jpg';
    const listingPrice = currentConv.priceLabel || 'Campus Trade';

    if (chatListingStrip) {
      chatListingStrip.classList.remove('is-hidden');
      if (chatStripImg) {
        chatStripImg.src = listingImg;
        chatStripImg.alt = currentConv.item || 'Listing';
      }
      if (chatStripTitle) chatStripTitle.textContent = currentConv.item || 'Campus Listing';
      if (chatStripPrice) chatStripPrice.textContent = listingPrice;
    }

    chatThread.innerHTML = '';

    const dateEl = document.createElement('div');
    dateEl.className = 'chat-date-divider';
    dateEl.textContent = 'Today';
    chatThread.appendChild(dateEl);

    const cardGroup = document.createElement('div');
    cardGroup.className = 'chat-msg-group is-in';
    cardGroup.innerHTML = `
      <div class="chat-msg-meta">${escapeHtml(currentConv.messages[0]?.time || currentConv.lastTime || '11:05')}</div>
      <button type="button" class="chat-listing-card-bubble" id="btn-chat-listing-card">
        <div class="chat-listing-thumb-wrap">
          <img src="${escapeHtml(listingImg)}" alt="${escapeHtml(currentConv.item)}" onerror="this.src='/images/products/laptop.jpg'" />
          <span class="chat-listing-corner-badge" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </span>
        </div>
        <div class="chat-listing-caption">
          <strong>${escapeHtml(currentConv.item)}</strong>
        </div>
        <div class="chat-listing-submeta">
          <span>${escapeHtml(listingPrice)}</span>
          <span aria-hidden="true">·</span>
          <span>Tap to view details</span>
        </div>
      </button>
    `;
    chatThread.appendChild(cardGroup);

    const cardBtn = document.getElementById('btn-chat-listing-card');
    cardBtn?.addEventListener('click', () => {
      const targetId = currentConv?.listingId || options.getSelectedListing()?.id;
      if (targetId) {
        closeChatModal();
        options.openItemDetails(targetId);
      }
    });

    currentConv.messages.forEach((m) => {
      chatThread.appendChild(buildMessageElement(m, false));
    });

    const typingEl = document.createElement('div');
    typingEl.className = 'chat-typing-bubble';
    typingEl.id = 'chat-typing-indicator';
    typingEl.setAttribute('aria-hidden', 'true');
    typingEl.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
    chatThread.appendChild(typingEl);

    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function openChatForListing(item: Listing): void {
    if (!item) return;
    chatReturnToDetailsId = modalDetails && modalDetails.classList.contains('is-open') ? item.id : null;
    modalDetails?.classList.remove('is-open');

    let found =
      activeConversations.find((c) => c.seller === item.seller && c.item === item.title) ||
      activeConversations.find((c) => c.seller === item.seller);
    if (!found) {
      const nowStr = getFormattedNow();
      found = {
        id: 'c-' + Date.now(),
        listingId: item.id,
        seller: item.seller,
        item: item.title,
        priceLabel: item.priceLabel,
        img: item.img,
        pinned: false,
        lastTime: nowStr,
        sharedMedia: [item.img, ...LOCAL_CHAT_MEDIA_POOL.slice(0, 5)],
        messages: [
          {
            id: 'm-' + Date.now(),
            in: false,
            time: nowStr,
            text: `Hi ${item.seller}! I saw your listing for "${item.title}". Is it still available to meet on campus?`,
          },
        ],
      };
      activeConversations.unshift(found);
    }
    currentConv = found;
    showAllMediaFlag = false;
    setChatMobileView('chat');
    renderConversations();
    renderChatMessages();
    renderChatInfoPanel();
    openChatModal();
  }

  function openInboxModal(): void {
    setChatMobileView(window.innerWidth <= 767 ? 'inbox' : 'chat');
    renderConversations();
    renderChatMessages();
    renderChatInfoPanel();
    openChatModal();
  }

  ['btn-close-msg', 'btn-close-msg-inbox', 'btn-close-msg-info', 'btn-close-msg-mobile'].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener('click', () => {
      chatReturnToDetailsId = null;
      closeChatModal();
    });
  });

  document.querySelectorAll('[data-chat-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.getAttribute('data-chat-tab') as ChatMobileView | null;
      if (view) setChatMobileView(view);
    });
  });

  document.getElementById('btn-chat-inbox-back')?.addEventListener('click', goBackFromChat);
  document.getElementById('btn-chat-back-inbox')?.addEventListener('click', goBackFromChat);

  const btnChatOpenInfo = document.getElementById('btn-chat-open-info');
  const btnChatToggleInfo = document.getElementById('btn-chat-toggle-info');
  const btnChatBackFromInfo = document.getElementById('btn-chat-back-from-info');
  const chatTabletScrim = document.getElementById('chat-tablet-scrim');

  btnChatOpenInfo?.addEventListener('click', () => {
    if (window.innerWidth <= 1024 && currentConv) setChatMobileView('info');
  });
  btnChatToggleInfo?.addEventListener('click', () => {
    if (!currentConv) return;
    const current = chatShell ? chatShell.getAttribute('data-mobile-view') : 'chat';
    setChatMobileView(current === 'info' ? 'chat' : 'info');
  });
  btnChatBackFromInfo?.addEventListener('click', () => setChatMobileView('chat'));
  chatTabletScrim?.addEventListener('click', () => setChatMobileView('chat'));

  chatInboxSearch?.addEventListener('input', () => renderConversations());

  document.querySelectorAll('.chat-accordion-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const acc = btn.closest('.chat-accordion');
      acc?.classList.toggle('is-open');
    });
  });

  btnViewAllMedia?.addEventListener('click', () => {
    showAllMediaFlag = !showAllMediaFlag;
    renderChatInfoPanel();
  });

  document.getElementById('btn-close-chat-lightbox')?.addEventListener('click', () => {
    chatLightbox?.classList.remove('is-open');
  });
  chatLightbox?.addEventListener('click', (e) => {
    if (e.target === chatLightbox) chatLightbox.classList.remove('is-open');
  });

  const btnChatMoreMenu = document.getElementById('btn-chat-more-menu');
  if (btnChatMoreMenu && chatMenuDropdown) {
    btnChatMoreMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      chatMenuDropdown.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => {
      const target = e.target as Node | null;
      if (target && !chatMenuDropdown.contains(target) && target !== btnChatMoreMenu) {
        chatMenuDropdown.classList.remove('is-open');
      }
    });
  }

  function togglePinCurrentConv(): void {
    if (!currentConv) return;
    currentConv.pinned = !currentConv.pinned;
    renderConversations();
    renderChatInfoPanel();
    if (isApiConfigured()) {
      void messagingService.togglePinConversation(currentConv.id, currentConv.pinned).catch(() => {});
    }
    showChatToast(currentConv.pinned ? 'Conversation pinned to top' : 'Conversation unpinned');
  }

  function openCurrentListingDetails(): void {
    const targetId = currentConv?.listingId || options.getSelectedListing()?.id;
    if (targetId) {
      closeChatModal();
      options.openItemDetails(targetId);
    } else {
      showChatToast('Listing details unavailable');
    }
  }

  function reportCurrentSeller(): void {
    chatMenuDropdown?.classList.remove('is-open');
    if (currentConv && isApiConfigured()) {
      void messagingService.reportConversation(currentConv.id).catch(() => {});
    }
    showChatToast(`Reported ${currentConv ? currentConv.seller : 'user'} to Campus Safety`);
  }

  document.getElementById('btn-chat-pin')?.addEventListener('click', togglePinCurrentConv);
  document.getElementById('chat-menu-pin')?.addEventListener('click', () => {
    chatMenuDropdown?.classList.remove('is-open');
    togglePinCurrentConv();
  });
  document.getElementById('btn-chat-details')?.addEventListener('click', openCurrentListingDetails);
  document.getElementById('chat-menu-view-listing')?.addEventListener('click', () => {
    chatMenuDropdown?.classList.remove('is-open');
    openCurrentListingDetails();
  });
  document.getElementById('chat-menu-clear')?.addEventListener('click', () => {
    chatMenuDropdown?.classList.remove('is-open');
    clearCurrentChat();
  });
  document.getElementById('chat-menu-delete')?.addEventListener('click', () => {
    chatMenuDropdown?.classList.remove('is-open');
    if (currentConv) deleteConversationById(currentConv.id);
  });
  document.getElementById('btn-chat-delete')?.addEventListener('click', () => {
    if (currentConv) deleteConversationById(currentConv.id);
  });
  document.getElementById('btn-chat-flag')?.addEventListener('click', reportCurrentSeller);
  document.getElementById('btn-report-chat')?.addEventListener('click', reportCurrentSeller);
  document.getElementById('btn-chat-trust')?.addEventListener('click', () => {
    showChatToast('Verified University Student (.edu ID confirmed)');
  });

  document.getElementById('btn-chat-strip-view')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCurrentListingDetails();
  });
  document.getElementById('chat-listing-strip')?.addEventListener('click', () => openCurrentListingDetails());

  if (btnChatPlus && chatAttachPopover) {
    btnChatPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = chatAttachPopover.classList.toggle('is-open');
      btnChatPlus.classList.toggle('is-active', isOpen);
    });
    document.addEventListener('click', (e) => {
      const target = e.target as Node | null;
      if (target && !chatAttachPopover.contains(target) && target !== btnChatPlus) {
        chatAttachPopover.classList.remove('is-open');
        btnChatPlus.classList.remove('is-active');
      }
    });
  }

  document.getElementById('btn-chat-photo-direct')?.addEventListener('click', () => chatPhotoInput?.click());

  const btnChatUploadPhoto = document.getElementById('btn-chat-upload-photo');
  if (btnChatUploadPhoto && chatPhotoInput) {
    btnChatUploadPhoto.addEventListener('click', () => chatPhotoInput.click());
    chatPhotoInput.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file || !currentConv) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result;
        if (typeof dataUrl !== 'string' || !currentConv) return;
        const nowStr = getFormattedNow();
        const newMsg: ChatMessage = { id: 'm-' + Date.now(), in: false, time: nowStr, img: dataUrl, text: file.name };
        currentConv.messages.push(newMsg);
        currentConv.lastTime = nowStr;
        if (!currentConv.sharedMedia) currentConv.sharedMedia = [];
        currentConv.sharedMedia.unshift(dataUrl);
        renderConversations();
        appendMessageToThread(newMsg);
        renderChatInfoPanel();

        if (isApiConfigured()) {
          void messagingService.sendMessage(currentConv.id, { text: file.name, img: dataUrl }).catch(() => {});
        }
      };
      reader.readAsDataURL(file);
      chatPhotoInput.value = '';
      chatAttachPopover?.classList.remove('is-open');
      btnChatPlus?.classList.remove('is-active');
    });
  }

  function sendMessageText(text: string, meetupDetails?: CampusMeetupSpot): void {
    if (!text || !currentConv) return;
    const convId = currentConv.id;
    void chatService.sendMessage(convId, { text, meetupDetails });
  }

  // Subscribe to real-time chat service events
  chatService.onMessage((msg, convId) => {
    const convTarget = activeConversations.find((c) => c.id === convId);
    if (!convTarget) return;

    if (!convTarget.messages.some((m) => m.id === msg.id)) {
      convTarget.messages.push(msg);
      convTarget.lastTime = msg.time;
      renderConversations();
    }

    if (currentConv && currentConv.id === convId) {
      appendMessageToThread(msg);
    }
  });

  chatService.onTyping(({ conversationId, sender, isTyping }) => {
    if (currentConv && currentConv.id === conversationId && chatTypingIndicator) {
      if (isTyping) {
        if (chatTypingName) chatTypingName.textContent = sender;
        chatTypingIndicator.style.display = 'flex';
        chatThread?.scrollTo({ top: chatThread.scrollHeight, behavior: 'smooth' });
      } else {
        chatTypingIndicator.style.display = 'none';
      }
    }
  });

  // Meetup Spots Picker Logic
  function renderMeetupSpots(): void {
    if (!chatMeetupSpotsList) return;
    chatMeetupSpotsList.innerHTML = CAMPUS_MEETUP_SPOTS.map(
      (s) => `
      <div class="chat-meetup-spot-card" data-spot-id="${s.id}">
        <div class="chat-meetup-spot-name">📍 ${escapeHtml(s.name)}</div>
        <div class="chat-meetup-spot-rating">🛡️ ${escapeHtml(s.safetyRating)}</div>
        <div class="chat-meetup-spot-desc">${escapeHtml(s.description)} (${escapeHtml(s.landmark)})</div>
      </div>
    `
    ).join('');
  }

  renderMeetupSpots();

  btnChatMeetupSpots?.addEventListener('click', () => {
    chatAttachPopover?.classList.remove('is-open');
    btnChatPlus?.classList.remove('is-active');
    chatMeetupPopover?.style.setProperty('display', 'block');
  });

  btnCloseMeetupPicker?.addEventListener('click', () => {
    chatMeetupPopover?.style.setProperty('display', 'none');
  });

  chatMeetupSpotsList?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('.chat-meetup-spot-card');
    if (!card) return;

    const spotId = card.getAttribute('data-spot-id');
    const spot = CAMPUS_MEETUP_SPOTS.find((s) => s.id === spotId);
    if (!spot) return;

    chatMeetupPopover?.style.setProperty('display', 'none');
    sendMessageText(`📍 Proposed Safe Campus Exchange: ${spot.name}. Let me know if this location works for you!`, spot);
  });

  document.querySelectorAll('[data-quick-msg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qm = btn.getAttribute('data-quick-msg');
      chatAttachPopover?.classList.remove('is-open');
      btnChatPlus?.classList.remove('is-active');
      if (qm) sendMessageText(qm);
    });
  });

  formSendMessage?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!chatMsgInput) return;
    const text = chatMsgInput.value.trim();
    if (!text) return;
    chatMsgInput.value = '';
    chatAttachPopover?.classList.remove('is-open');
    btnChatPlus?.classList.remove('is-active');
    sendMessageText(text);
  });

  // Global window exposure for triggers
  (window as unknown as { openInboxModal: () => void }).openInboxModal = openInboxModal;

  if (isApiConfigured()) {
    void messagingService
      .fetchConversations()
      .then((remoteConvs) => {
        if (remoteConvs) {
          activeConversations = remoteConvs;
          currentConv = activeConversations[0] || null;
          renderConversations();
          renderChatMessages();
          renderChatInfoPanel();
        }
      })
      .catch(() => {});
  }

  return {
    openChatForListing,
    openInboxModal,
    closeChatModal,
    modalMsg,
  };
}
