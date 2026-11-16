import { CAROUSEL_ITEMS } from '../data/marketplaceSeed';

interface CarouselCardEntry {
  el: HTMLDivElement;
  clipId: string;
  clipPathEl: SVGPathElement | null;
  isHovered: boolean;
  hoverProgress: number;
}

export function initHeroCarousel(): void {
  const CARD_COUNT = CAROUSEL_ITEMS.length;
  const PITCH = 196;
  const TOTAL_SPAN = CARD_COUNT * PITCH; // 2352u
  const AUTO_SPEED = 50; // 50u per second

  const stage = document.getElementById('stage');
  const track = document.getElementById('carousel-track');
  const svgDefs = document.getElementById('svg-defs-container');

  if (!stage || !track || !svgDefs) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsCssClipPath =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('clip-path', 'path("M 0,0 L 10,10 Z")');

  const cards: CarouselCardEntry[] = [];

  for (let i = 0; i < CARD_COUNT; i++) {
    const item = CAROUSEL_ITEMS[i];
    const card = document.createElement('div');
    card.className = 'carousel-card';
    card.id = 'card-' + i;
    card.style.backgroundColor = item.bg;

    const clipId = 'card-clip-' + i;
    if (!supportsCssClipPath) {
      card.style.clipPath = `url(#${clipId})`;
      card.style.setProperty('-webkit-clip-path', `url(#${clipId})`);
    }

    const wrap = document.createElement('div');
    wrap.className = 'card-media-wrap';

    const tag = document.createElement('div');
    tag.className = 'card-category-tag';
    tag.textContent = item.name;
    wrap.appendChild(tag);

    const img = document.createElement('img');
    img.className = 'media-layer';
    img.src = item.src;
    img.alt = item.name;
    img.loading = 'eager';
    img.decoding = 'async';
    img.draggable = false;
    wrap.appendChild(img);

    card.appendChild(wrap);
    track.appendChild(card);

    let pathElem: SVGPathElement | null = null;
    if (!supportsCssClipPath) {
      const clipElem = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clipElem.id = clipId;
      clipElem.setAttribute('clipPathUnits', 'userSpaceOnUse');

      pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      clipElem.appendChild(pathElem);
      svgDefs.appendChild(clipElem);
    }

    const cardObj: CarouselCardEntry = {
      el: card,
      clipId,
      clipPathEl: pathElem,
      isHovered: false,
      hoverProgress: 0,
    };

    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      cardObj.isHovered = true;
      card.classList.add('is-hovered');
    });

    card.addEventListener('pointerleave', () => {
      cardObj.isHovered = false;
      card.classList.remove('is-hovered');
    });

    cards.push(cardObj);
  }

  let animClock: Animation | null = null;
  try {
    animClock = document.documentElement.animate([], { duration: 1e9 });
  } catch {
    animClock = null;
  }

  function getTimeMs(): number {
    if (animClock && animClock.currentTime != null) {
      return Number(animClock.currentTime);
    }
    return performance.now();
  }

  let scrollOffset = 0;
  let velocity = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let releaseVelocity = 0;

  function getUnitScale(): number {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw <= 820) {
      return Math.min(Math.max(Math.min(vw / 480, vh / 860), 0.68), 1.04);
    }
    const raw = Math.min(vw / 1440, vh / 960);
    return Math.min(Math.max(raw, 0.72), 1.18);
  }

  track.addEventListener('pointerdown', (e) => {
    isDragging = true;
    track.classList.add('is-dragging');
    dragStartX = e.clientX;
    dragStartOffset = scrollOffset;
    lastPointerX = e.clientX;
    lastPointerTime = getTimeMs();
    releaseVelocity = 0;
    velocity = 0;
    try {
      track.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors on synthetic pointer events.
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const uScale = getUnitScale();
    const deltaPx = e.clientX - dragStartX;
    const deltaU = deltaPx / uScale;
    scrollOffset = dragStartOffset - deltaU;

    const now = getTimeMs();
    const dt = (now - lastPointerTime) / 1000;
    if (dt > 0.008) {
      const instVelocity = -(e.clientX - lastPointerX) / uScale / dt;
      releaseVelocity = releaseVelocity * 0.35 + instVelocity * 0.65;
      lastPointerX = e.clientX;
      lastPointerTime = now;
    }
  });

  function endDrag(): void {
    if (!isDragging) return;
    isDragging = false;
    track?.classList.remove('is-dragging');
    velocity = Math.max(-1800, Math.min(1800, releaseVelocity));
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function buildRoundedQuadPath(
    W: number,
    _maxH: number,
    ytl: number,
    ybl: number,
    ytr: number,
    ybr: number,
    R: number,
    scale: number
  ): string {
    const sW = W * scale;
    const sYtl = ytl * scale;
    const sYbl = ybl * scale;
    const sYtr = ytr * scale;
    const sYbr = ybr * scale;
    const sR = Math.min(R * scale, sW * 0.45, (sYbl - sYtl) * 0.38, (sYbr - sYtr) * 0.38);

    const dxTop = sW;
    const dyTop = sYtr - sYtl;
    const lenTop = Math.hypot(dxTop, dyTop);
    const uxTop = dxTop / lenTop;
    const uyTop = dyTop / lenTop;

    const dxBot = -sW;
    const dyBot = sYbl - sYbr;
    const lenBot = Math.hypot(dxBot, dyBot);
    const uxBot = dxBot / lenBot;
    const uyBot = dyBot / lenBot;

    return (
      `M 0,${(sYtl + sR).toFixed(1)} ` +
      `Q 0,${sYtl.toFixed(1)} ${(sR * uxTop).toFixed(1)},${(sYtl + sR * uyTop).toFixed(1)} ` +
      `L ${(sW - sR * uxTop).toFixed(1)},${(sYtr - sR * uyTop).toFixed(1)} ` +
      `Q ${sW.toFixed(1)},${sYtr.toFixed(1)} ${sW.toFixed(1)},${(sYtr + sR).toFixed(1)} ` +
      `L ${sW.toFixed(1)},${(sYbr - sR).toFixed(1)} ` +
      `Q ${sW.toFixed(1)},${sYbr.toFixed(1)} ${(sW + sR * uxBot).toFixed(1)},${(sYbr + sR * uyBot).toFixed(1)} ` +
      `L ${(-sR * uxBot).toFixed(1)},${(sYbl - sR * uyBot).toFixed(1)} ` +
      `Q 0,${sYbl.toFixed(1)} 0,${(sYbl - sR).toFixed(1)} Z`
    );
  }

  let lastFrameTime = getTimeMs();

  function renderFrame(): void {
    const now = getTimeMs();
    let dt = (now - lastFrameTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastFrameTime = now;

    const anyHovered = !isDragging && cards.some((c) => c.isHovered);
    const targetAutoSpeed = anyHovered ? 10 : AUTO_SPEED;

    if (!isDragging && !prefersReducedMotion) {
      const blendRate = anyHovered ? 5.2 : 3.2;
      if (Math.abs(velocity - targetAutoSpeed) > 0.05) {
        const blend = Math.exp(-blendRate * dt);
        velocity = targetAutoSpeed + (velocity - targetAutoSpeed) * blend;
      } else {
        velocity = targetAutoSpeed;
      }
      scrollOffset += velocity * dt;
    }

    const uScale = getUnitScale();
    const isMobile = window.innerWidth <= 820;

    const stageWidthPx = stage!.clientWidth || window.innerWidth;
    const stageCenterUnit = isMobile ? 720 : stageWidthPx / 2 / uScale;
    const spread = isMobile ? 706 : Math.max(706, stageCenterUnit * 0.98);
    const trackHeightPx = isMobile ? track!.clientHeight || 376 * uScale : 0;
    const baseCenterY = isMobile ? trackHeightPx / 2 / uScale : 687;

    const hoverLerp = 1 - Math.exp(-10.5 * dt);

    cards.forEach((cardObj, i) => {
      const card = cardObj.el;
      const clipPathEl = cardObj.clipPathEl;

      const hoverTarget = !isDragging && cardObj.isHovered ? 1 : 0;
      cardObj.hoverProgress += (hoverTarget - cardObj.hoverProgress) * hoverLerp;
      const hp = cardObj.hoverProgress;

      const nominalT = i * PITCH - scrollOffset;
      let t = ((nominalT % TOTAL_SPAN) + TOTAL_SPAN) % TOTAL_SPAN;
      if (t >= TOTAL_SPAN / 2) {
        t -= TOTAL_SPAN;
      }

      const tNorm = t / spread;
      const x = stageCenterUnit + t * (1 + 0.083 * tNorm * tNorm);
      const d = Math.abs(x - stageCenterUnit) / spread;

      const W = 170 + 48 * d * d;
      const Yc = baseCenterY - 12 * d * d;

      const xLeft = x - W / 2;
      const xRight = x + W / 2;
      const qLeft = Math.abs(xLeft - stageCenterUnit) / spread;
      const qRight = Math.abs(xRight - stageCenterUnit) / spread;

      const HLeft = 280 + 92 * Math.pow(qLeft, 2.6);
      const HRight = 280 + 92 * Math.pow(qRight, 2.6);

      const maxH = Math.max(HLeft, HRight);
      const ytl = (maxH - HLeft) / 2;
      const ybl = (maxH + HLeft) / 2;
      const ytr = (maxH - HRight) / 2;
      const ybr = (maxH + HRight) / 2;

      const pathD = buildRoundedQuadPath(W, maxH, ytl, ybl, ytr, ybr, 15, uScale);
      if (supportsCssClipPath) {
        const pathClip = `path("${pathD}")`;
        card.style.clipPath = pathClip;
        card.style.setProperty('-webkit-clip-path', pathClip);
      } else if (clipPathEl) {
        clipPathEl.setAttribute('d', pathD);
      }

      card.style.width = (W * uScale).toFixed(1) + 'px';
      card.style.height = (maxH * uScale).toFixed(1) + 'px';

      const mobileX = isMobile ? stageWidthPx / 2 + (x - 720) * uScale : 0;
      const targetX = isMobile ? mobileX - (W / 2) * uScale : (x - W / 2) * uScale;
      const liftPx = hp * 7 * uScale;
      const targetY = (Yc - maxH / 2) * uScale - liftPx;
      const cardScale = 1 + hp * 0.045;

      card.style.transform = `translate3d(${targetX.toFixed(2)}px, ${targetY.toFixed(2)}px, 0) scale(${cardScale.toFixed(4)})`;
    });

    requestAnimationFrame(renderFrame);
  }

  requestAnimationFrame(renderFrame);

  if (!prefersReducedMotion) {
    const badge = document.getElementById('badge');
    const hLine1 = document.getElementById('headline-line-1');
    const hLine2 = document.getElementById('headline-line-2');
    const subline = document.getElementById('subline');
    const carouselTrack = document.getElementById('carousel-track');
    const heroActions = document.getElementById('hero-action-buttons');
    const isMobileHero = window.innerWidth <= 820;

    function playHeroEntrance(
      el: HTMLElement | null,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ): void {
      if (!el) return;
      try {
        const anim = el.animate(keyframes, { ...options, fill: 'forwards' });
        anim.onfinish = () => {
          el.style.opacity = '1';
          anim.cancel();
        };
      } catch {
        el.style.opacity = '1';
      }
    }

    playHeroEntrance(
      badge,
      isMobileHero
        ? [
            { transform: 'translateY(12px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ]
        : [
            { transform: 'translateX(-50%) translateY(14px)', opacity: 0 },
            { transform: 'translateX(-50%) translateY(0)', opacity: 1 },
          ],
      { delay: 140, duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );

    playHeroEntrance(
      hLine1,
      [
        { transform: 'translateY(32px)', filter: 'blur(8px)', opacity: 0 },
        { transform: 'translateY(0)', filter: 'blur(0px)', opacity: 1 },
      ],
      { delay: 240, duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );

    playHeroEntrance(
      hLine2,
      [
        { transform: 'translateY(32px)', filter: 'blur(8px)', opacity: 0 },
        { transform: 'translateY(0)', filter: 'blur(0px)', opacity: 1 },
      ],
      { delay: 380, duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );

    playHeroEntrance(
      subline,
      isMobileHero
        ? [
            { transform: 'translateY(20px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ]
        : [
            { transform: 'translateX(-50%) translateY(24px)', opacity: 0 },
            { transform: 'translateX(-50%) translateY(0)', opacity: 1 },
          ],
      { delay: 500, duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );

    playHeroEntrance(
      carouselTrack,
      [
        { transform: 'translateY(45px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { delay: 450, duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );

    playHeroEntrance(
      heroActions,
      isMobileHero
        ? [
            { transform: 'scale(0.92) translateY(16px)', opacity: 0 },
            { transform: 'scale(1) translateY(0)', opacity: 1 },
          ]
        : [
            { transform: 'translateX(-50%) scale(0.88)', opacity: 0 },
            { transform: 'translateX(-50%) scale(1)', opacity: 1 },
          ],
      { delay: 640, duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }
}
