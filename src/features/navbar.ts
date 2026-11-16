export function initNavbar(): void {
  const topNavbarEl = document.getElementById('top-navbar');
  const navLinksEl = document.getElementById('nav-links');
  const navWaveSvg = document.getElementById('nav-wave-svg') as SVGSVGElement | null;
  const navWaveStroke = document.getElementById('nav-wave-stroke');
  const navWaveFill = document.getElementById('nav-wave-fill');
  const navItemEls = navLinksEl ? Array.from(navLinksEl.querySelectorAll<HTMLAnchorElement>('.nav-item')) : [];
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileNavLinks = mobileNavDrawer
    ? Array.from(mobileNavDrawer.querySelectorAll<HTMLAnchorElement>('.mobile-nav-link'))
    : [];
  const mobileBtnDash = document.getElementById('mobile-btn-dash');
  const mobileBtnLogin = document.getElementById('mobile-btn-login');
  const btnToggleDash = document.getElementById('btn-toggle-dash');
  const btnLogin = document.getElementById('btn-login');
  const navPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (topNavbarEl) {
    topNavbarEl.addEventListener('mousemove', (e) => {
      const rect = topNavbarEl.getBoundingClientRect();
      topNavbarEl.style.setProperty('--glow-x', `${(e.clientX - rect.left).toFixed(1)}px`);
      topNavbarEl.style.setProperty('--glow-y', `${(e.clientY - rect.top).toFixed(1)}px`);
    });
  }

  const setMobileMenuOpen = (open: boolean): void => {
    if (!mobileMenuBtn || !mobileNavDrawer) return;
    mobileNavDrawer.classList.toggle('is-open', open);
    mobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileNavDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMobileMenuOpen(!mobileNavDrawer.classList.contains('is-open'));
    });

    document.addEventListener('click', (e) => {
      const target = e.target as Node | null;
      if (
        mobileNavDrawer.classList.contains('is-open') &&
        target &&
        !mobileNavDrawer.contains(target) &&
        !mobileMenuBtn.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNavDrawer.classList.contains('is-open')) {
        setMobileMenuOpen(false);
      }
    });
  }

  if (mobileBtnDash) {
    mobileBtnDash.addEventListener('click', () => {
      setMobileMenuOpen(false);
      btnToggleDash?.click();
    });
  }

  if (mobileBtnLogin) {
    mobileBtnLogin.addEventListener('click', () => {
      setMobileMenuOpen(false);
      btnLogin?.click();
    });
  }

  if (navLinksEl && navWaveSvg && navWaveStroke && navWaveFill && navItemEls.length) {
    const sectionPairs = navItemEls
      .map((item) => {
        const href = item.getAttribute('href') || '';
        const el = href.startsWith('#') ? document.querySelector(href) : null;
        return el ? { href, item, el } : null;
      })
      .filter((pair): pair is { href: string; item: HTMLAnchorElement; el: Element } => pair !== null);

    let activeEl = navItemEls[0];
    let hoveredEl: HTMLAnchorElement | null = null;
    let currentActiveHref = '#stage';
    let clickLockHref: string | null = null;
    let clickLockTimer: number | undefined;

    let curX = 0;
    let curW = 0;
    let targetX = 0;
    let targetW = 0;
    let waveInitialized = false;
    let waveRafId = 0;
    let waveLastTs = 0;

    const drawWaveArch = (ax: number, aw: number): void => {
      const W = navLinksEl.clientWidth;
      const H = navLinksEl.clientHeight;
      if (W <= 0 || H <= 0 || aw <= 0) return;

      navWaveSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      const by = H - 2;
      const ty = 2.5;
      const span = Math.max(12, by - ty);
      const axL = Math.max(0, ax);
      const axR = Math.min(W, ax + aw);
      const widthClamped = Math.max(20, axR - axL);
      const fl = Math.min(18, widthClamped * 0.24);
      const flareL = Math.max(0, axL - fl);
      const flareR = Math.min(W, axR + fl);
      const shoulderY = ty + span * 0.44;
      const midX = axL + widthClamped * 0.5;
      const rTop = Math.min(widthClamped * 0.34, span * 0.44);

      const d =
        `M 0,${by.toFixed(1)} ` +
        `L ${flareL.toFixed(1)},${by.toFixed(1)} ` +
        `C ${(flareL + (axL - flareL) * 0.58).toFixed(1)},${by.toFixed(1)} ` +
        `${axL.toFixed(1)},${(by - (by - shoulderY) * 0.42).toFixed(1)} ` +
        `${axL.toFixed(1)},${shoulderY.toFixed(1)} ` +
        `C ${axL.toFixed(1)},${(ty + 1.5).toFixed(1)} ` +
        `${(axL + rTop * 0.55).toFixed(1)},${ty.toFixed(1)} ` +
        `${midX.toFixed(1)},${ty.toFixed(1)} ` +
        `C ${(axR - rTop * 0.55).toFixed(1)},${ty.toFixed(1)} ` +
        `${axR.toFixed(1)},${(ty + 1.5).toFixed(1)} ` +
        `${axR.toFixed(1)},${shoulderY.toFixed(1)} ` +
        `C ${axR.toFixed(1)},${(by - (by - shoulderY) * 0.42).toFixed(1)} ` +
        `${(axR + (flareR - axR) * 0.42).toFixed(1)},${by.toFixed(1)} ` +
        `${flareR.toFixed(1)},${by.toFixed(1)} ` +
        `L ${W.toFixed(1)},${by.toFixed(1)}`;

      navWaveStroke.setAttribute('d', d);
      navWaveFill.setAttribute('d', d);
    };

    const stepWaveArch = (ts: number): void => {
      const dt = waveLastTs ? Math.min(0.05, (ts - waveLastTs) / 1000) : 0.016;
      waveLastTs = ts;
      const alpha = 1 - Math.exp(-16 * dt);
      curX += (targetX - curX) * alpha;
      curW += (targetW - curW) * alpha;

      if (Math.abs(targetX - curX) < 0.12 && Math.abs(targetW - curW) < 0.12) {
        curX = targetX;
        curW = targetW;
        drawWaveArch(curX, curW);
        waveRafId = 0;
        waveLastTs = 0;
        return;
      }

      drawWaveArch(curX, curW);
      waveRafId = requestAnimationFrame(stepWaveArch);
    };

    const syncArchFocus = (immediate = false): void => {
      const focusEl = hoveredEl || activeEl;
      if (!focusEl) return;

      navItemEls.forEach((el) => {
        el.classList.toggle('is-arch-focus', el === focusEl);
      });

      const x = focusEl.offsetLeft;
      const w = focusEl.offsetWidth;
      if (w <= 0) return;

      targetX = x;
      targetW = w;

      if (!waveInitialized || immediate || navPrefersReducedMotion) {
        waveInitialized = true;
        curX = targetX;
        curW = targetW;
        if (waveRafId) {
          cancelAnimationFrame(waveRafId);
          waveRafId = 0;
          waveLastTs = 0;
        }
        drawWaveArch(curX, curW);
        return;
      }

      if (!waveRafId) {
        waveLastTs = 0;
        waveRafId = requestAnimationFrame(stepWaveArch);
      }
    };

    navItemEls.forEach((item) => {
      item.addEventListener('mouseenter', () => {
        hoveredEl = item;
        syncArchFocus(false);
      });
      item.addEventListener('focus', () => {
        hoveredEl = item;
        syncArchFocus(false);
      });
      item.addEventListener('blur', () => {
        requestAnimationFrame(() => {
          if (!navLinksEl.contains(document.activeElement) && !navLinksEl.matches(':hover')) {
            hoveredEl = null;
            syncArchFocus(false);
          }
        });
      });
    });

    navLinksEl.addEventListener('mouseleave', () => {
      hoveredEl = null;
      syncArchFocus(false);
    });

    const setActiveNavItem = (targetHref: string, immediate = false): void => {
      const match = sectionPairs.find((p) => p.href === targetHref) || sectionPairs[0];
      if (!match) return;

      currentActiveHref = match.href;
      activeEl = match.item;
      navItemEls.forEach((el) => {
        el.classList.toggle('is-active', el === match.item);
      });
      mobileNavLinks.forEach((el) => {
        el.classList.toggle('is-active', el.getAttribute('href') === match.href);
      });

      syncArchFocus(immediate);
    };

    const updateActiveSection = (): void => {
      if (clickLockHref) {
        setActiveNavItem(clickLockHref);
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY < 140) {
        setActiveNavItem('#stage');
        return;
      }

      const probeY = scrollY + Math.min(window.innerHeight * 0.34, 280);
      const topSections = sectionPairs
        .map((p) => ({
          href: p.href,
          top: p.el.getBoundingClientRect().top + scrollY,
        }))
        .sort((a, b) => a.top - b.top);

      let detectedHref = '#stage';
      for (const sec of topSections) {
        if (probeY >= sec.top - 40) {
          detectedHref = sec.href;
        }
      }

      if (detectedHref !== currentActiveHref || !waveInitialized) {
        setActiveNavItem(detectedHref);
      }
    };

    navItemEls.forEach((item) => {
      item.addEventListener('click', () => {
        const href = item.getAttribute('href');
        if (!href) return;
        clickLockHref = href;
        setActiveNavItem(href);
        window.clearTimeout(clickLockTimer);
        clickLockTimer = window.setTimeout(() => {
          clickLockHref = null;
          updateActiveSection();
        }, 850);
      });
    });

    mobileNavLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href');
        setMobileMenuOpen(false);
        if (!href) return;
        clickLockHref = href;
        setActiveNavItem(href);
        window.clearTimeout(clickLockTimer);
        clickLockTimer = window.setTimeout(() => {
          clickLockHref = null;
          updateActiveSection();
        }, 850);
      });
    });

    let scrollTicking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!scrollTicking) {
          scrollTicking = true;
          requestAnimationFrame(() => {
            scrollTicking = false;
            updateActiveSection();
          });
        }
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) {
        setMobileMenuOpen(false);
      }
      syncArchFocus(true);
      updateActiveSection();
    });

    requestAnimationFrame(() => {
      setActiveNavItem('#stage', true);
      updateActiveSection();
    });
  }
}
