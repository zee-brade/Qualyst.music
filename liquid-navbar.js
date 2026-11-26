
(() => {
  function initTrazeelLiquidNavbar() {
    const navbarEl = document.querySelector('.bottom-nav');
    if (!navbarEl || navbarEl.dataset.liquidReady === '1') return;

    const tabButtons = Array.from(navbarEl.querySelectorAll('.nav-item'));
    if (tabButtons.length < 2) return;
    navbarEl.dataset.liquidReady = '1';

    const LiquidAudio = (() => {
      let ctx = null;
      let masterBus = null;
      let enabled = true;
      let lastSoundTime = 0;
      const PITCH_SCALE = [0.94, 1.0, 1.07, 1.14, 1.22];

      function unlock() {
        if (!enabled) return null;
        try {
          if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            ctx = new AudioCtx();

            const gain = ctx.createGain();
            gain.gain.value = 0.85;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1350;
            filter.Q.value = 0.7;

            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.knee.value = 12;
            comp.ratio.value = 4;
            comp.attack.value = 0.003;
            comp.release.value = 0.08;

            gain.connect(filter);
            filter.connect(comp);
            comp.connect(ctx.destination);
            masterBus = gain;
          }
          if (ctx.state === 'suspended') ctx.resume();
        } catch (_) {
          return null;
        }
        return ctx;
      }

      function tone(audio, freqStart, freqEnd, start, dur, peak) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqStart, start);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur * 0.6);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(masterBus);
        osc.start(start);
        osc.stop(start + dur + 0.01);
      }

      return {
        unlock,
        playTap(index = 2) {
          const audio = unlock();
          if (!audio || !masterBus || audio.state !== 'running') return;
          const now = audio.currentTime;
          if (now - lastSoundTime < 0.025) return;
          lastSoundTime = now;
          const p = PITCH_SCALE[index] || 1.0;
          tone(audio, 275 * p, 590 * p, now, 0.115, 0.65);
          tone(audio, 420 * p, 720 * p, now + 0.016, 0.09, 0.32);
        },
        playGlide(index = 2, speedPx = 0) {
          const audio = unlock();
          if (!audio || !masterBus || audio.state !== 'running') return;
          const now = audio.currentTime;
          if (now - lastSoundTime < 0.032) return;
          lastSoundTime = now;
          const p = (PITCH_SCALE[index] || 1.0) * (1 + Math.min(Math.abs(speedPx) / 2400, 0.16));
          tone(audio, 375 * p, 670 * p, now, 0.075, 0.52);
        },
        playSettle(index = 2) {
          const audio = unlock();
          if (!audio || !masterBus || audio.state !== 'running') return;
          const p = PITCH_SCALE[index] || 1.0;
          tone(audio, 440 * p, 710 * p, audio.currentTime, 0.092, 0.42);
        },
        setEnabled(v) { enabled = Boolean(v); },
        isEnabled() { return enabled; }
      };
    })();

    const DEFAULT_D =
      'M 0 96 L 0 40 A 16 16 0 0 1 16 24 L 155.537 24 A 16 16 0 0 1 171.526 39.413 A 38.5 38.5 0 0 0 248.474 39.413 A 16 16 0 0 1 264.463 24 L 404 24 A 16 16 0 0 1 420 40 L 420 96 Z';

    navbarEl.insertAdjacentHTML(
      'afterbegin',
      `
      <svg class="liquid-navbar__defs" aria-hidden="true">
        <defs>
          <clipPath id="liquid-bar-clip" clipPathUnits="userSpaceOnUse">
            <path id="liquid-bar-clip-path" d="${DEFAULT_D}" />
          </clipPath>
        </defs>
      </svg>
      <div class="liquid-navbar__bar-shadow" aria-hidden="true">
        <div class="liquid-navbar__bar-glass">
          <svg id="liquid-bar-rim-svg" class="liquid-navbar__bar-rim" viewBox="0 0 420 96" preserveAspectRatio="none">
            <defs>
              <clipPath id="liquid-bar-rim-clip">
                <path id="liquid-bar-rim-clip-path" d="${DEFAULT_D}" />
              </clipPath>
              <linearGradient id="glass-rim-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#EAF4FF" stop-opacity="0.48" />
                <stop offset="35%" stop-color="#ffffff" stop-opacity="0.18" />
                <stop offset="72%" stop-color="#ffffff" stop-opacity="0.06" />
                <stop offset="100%" stop-color="#9CCBFF" stop-opacity="0.26" />
              </linearGradient>
              <linearGradient id="glass-cushion-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#EAF4FF" stop-opacity="0.22" />
                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.03" />
                <stop offset="100%" stop-color="#9CCBFF" stop-opacity="0.14" />
              </linearGradient>
            </defs>
            <g clip-path="url(#liquid-bar-rim-clip)">
              <path id="liquid-bar-cushion-path" d="${DEFAULT_D}" fill="none" stroke="url(#glass-cushion-grad)" stroke-width="7" stroke-linejoin="round" />
              <path id="liquid-bar-rim-path" d="${DEFAULT_D}" fill="none" stroke="url(#glass-rim-grad)" stroke-width="2.2" stroke-linejoin="round" />
            </g>
          </svg>
        </div>
      </div>
      <div id="liquid-bubble" class="liquid-navbar__bubble" aria-hidden="true">
        <div class="liquid-navbar__bubble-glass">
          <svg class="liquid-navbar__bubble-rim" viewBox="0 0 62 62">
            <defs>
              <clipPath id="liquid-bubble-rim-clip">
                <circle cx="31" cy="31" r="31" />
              </clipPath>
            </defs>
            <g clip-path="url(#liquid-bubble-rim-clip)">
              <circle cx="31" cy="31" r="31" fill="none" stroke="url(#glass-cushion-grad)" stroke-width="7" />
              <circle cx="31" cy="31" r="31" fill="none" stroke="url(#glass-rim-grad)" stroke-width="2.2" />
            </g>
          </svg>
        </div>
      </div>
      `
    );

    const rimSvgEl = navbarEl.querySelector('#liquid-bar-rim-svg');
    const clipPathEl = navbarEl.querySelector('#liquid-bar-clip-path');
    const rimClipPathEl = navbarEl.querySelector('#liquid-bar-rim-clip-path');
    const rimPathEl = navbarEl.querySelector('#liquid-bar-rim-path');
    const cushionPathEl = navbarEl.querySelector('#liquid-bar-cushion-path');
    const bubbleEl = navbarEl.querySelector('#liquid-bubble');
    const rimStops = Array.from(navbarEl.querySelectorAll('#glass-rim-grad stop'));
    const cushionStops = Array.from(navbarEl.querySelectorAll('#glass-cushion-grad stop'));

    const iconWraps = tabButtons.map((btn) => {
      let wrap = btn.querySelector('.nav-icon');
      if (!wrap) {
        wrap = document.createElement('span');
        wrap.className = 'nav-icon';
        const svg = btn.querySelector('svg');
        if (svg) wrap.appendChild(svg);
        btn.prepend(wrap);
      }
      return wrap;
    });
    const icons = iconWraps.map((w) => w.querySelector('svg'));

    const BASE = {
      barTop: 24,
      barHeight: 72,
      barRadius: 16,
      rBubble: 31,
      bubbleY: 38,
      cavityR: 38.5,
      filletR: 16.0,
      designW: 420
    };

    const THEME_COLORS = {
      dark: {
        inactive: { r: 222, g: 235, b: 250, a: 0.58 },
        active: { r: 156, g: 203, b: 255, a: 1 }
      },
      light: {
        inactive: { r: 35, g: 31, b: 25, a: 0.56 },
        active: { r: 156, g: 203, b: 255, a: 1 }
      }
    };

    let currentTheme = document.body.dataset.theme === 'light' ? 'light' : 'dark';
    const lastIconCache = tabButtons.map(() => '');
    let lastBubbleCache = '';

    function syncThemeGradients() {
      currentTheme = document.body.dataset.theme === 'light' ? 'light' : 'dark';
      if (currentTheme === 'light') {
        const r = [['#EAF4FF', '0.88'], ['#FFFFFF', '0.42'], ['#FFFFFF', '0.20'], ['#9CCBFF', '0.54']];
        const c = [['#EAF4FF', '0.42'], ['#FFFFFF', '0.08'], ['#9CCBFF', '0.30']];
        rimStops.forEach((s, i) => { s.setAttribute('stop-color', r[i][0]); s.setAttribute('stop-opacity', r[i][1]); });
        cushionStops.forEach((s, i) => { s.setAttribute('stop-color', c[i][0]); s.setAttribute('stop-opacity', c[i][1]); });
      } else {
        const r = [['#EAF4FF', '0.48'], ['#ffffff', '0.18'], ['#ffffff', '0.06'], ['#9CCBFF', '0.26']];
        const c = [['#EAF4FF', '0.22'], ['#ffffff', '0.03'], ['#9CCBFF', '0.14']];
        rimStops.forEach((s, i) => { s.setAttribute('stop-color', r[i][0]); s.setAttribute('stop-opacity', r[i][1]); });
        cushionStops.forEach((s, i) => { s.setAttribute('stop-color', c[i][0]); s.setAttribute('stop-opacity', c[i][1]); });
      }
      lastIconCache.fill('');
    }

    new MutationObserver(syncThemeGradients).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    syncThemeGradients();

    let initialIdx = tabButtons.findIndex((btn) => btn.classList.contains('active'));
    if (initialIdx < 0) initialIdx = 0;

    const metrics = {
      width: BASE.designW,
      scale: 1,
      barTop: BASE.barTop,
      barHeight: BASE.barHeight,
      barBottom: BASE.barTop + BASE.barHeight,
      barRadius: BASE.barRadius,
      barCenterY: BASE.barTop + BASE.barHeight * 0.5,
      rBubble: BASE.rBubble,
      bubbleCenterY: BASE.bubbleY,
      cavityR: BASE.cavityR,
      filletR: BASE.filletR,
      padX: 72,
      tabX: tabButtons.map((_, i) => 72 + i * 69)
    };

    const iconPhysics = tabButtons.map((_, i) => ({
      prevRawP: i === initialIdx ? 1 : 0,
      recoil: 0,
      recoilVel: 0
    }));

    const state = {
      activeIndex: initialIdx,
      hoveredIndex: -1,
      bubbleX: 210,
      bubbleVelX: 0,
      elasticity: 0,
      isPointerDown: false,
      isScrubbing: false,
      pointerId: null,
      pointerDownClientX: 0,
      lastScrubTime: 0,
      lastRenderedKey: '',
      lastTime: performance.now()
    };

    function syncViewportMetrics() {
      const rectW = navbarEl.getBoundingClientRect().width;
      const w = Math.max(260, Math.round(rectW || navbarEl.offsetWidth || BASE.designW));
      const prevTabX = metrics.tabX[state.activeIndex] || w * 0.5;
      const s = Math.max(0.80, Math.min(1, w / 390));

      metrics.width = w;
      metrics.scale = s;
      metrics.barTop = BASE.barTop * s;
      metrics.barHeight = BASE.barHeight * s;
      metrics.barBottom = metrics.barTop + metrics.barHeight;
      metrics.barRadius = BASE.barRadius * s;
      metrics.barCenterY = metrics.barTop + metrics.barHeight * 0.5;
      metrics.rBubble = BASE.rBubble * s;
      metrics.bubbleCenterY = BASE.bubbleY * s;
      metrics.cavityR = BASE.cavityR * s;
      metrics.filletR = BASE.filletR * s;

      const barH = metrics.barBottom;
      const nextBarH = `${barH.toFixed(2)}px`;
      if (navbarEl.style.height !== nextBarH) {
        navbarEl.style.height = nextBarH;
      }

      const bubbleDia = metrics.rBubble * 2;
      bubbleEl.style.width = `${bubbleDia.toFixed(2)}px`;
      bubbleEl.style.height = `${bubbleDia.toFixed(2)}px`;
      bubbleEl.style.transformOrigin = `${metrics.rBubble.toFixed(2)}px ${metrics.rBubble.toFixed(2)}px`;

      const restSumR = metrics.cavityR + metrics.filletR;
      const restDy = metrics.barTop + metrics.filletR - metrics.bubbleCenterY;
      const dx1 = Math.sqrt(Math.max(0, restSumR * restSumR - restDy * restDy));

      metrics.padX = Math.max(metrics.barRadius + dx1 + 2, Math.min(84, w * 0.13));

      const step = Math.max(0, w - 2 * metrics.padX) / (tabButtons.length - 1);
      const hitWidth = Math.max(44, Math.min(72, step * 0.94));
      const iconPx = Math.max(19, Math.round(22 * s));

      for (let i = 0; i < tabButtons.length; i++) {
        const tx = metrics.padX + i * step;
        metrics.tabX[i] = tx;
        tabButtons[i].style.setProperty('left', `${tx.toFixed(2)}px`, 'important');
        tabButtons[i].style.setProperty('height', nextBarH, 'important');
        tabButtons[i].style.setProperty('width', `${hitWidth.toFixed(2)}px`, 'important');
        tabButtons[i].style.setProperty('margin-left', `${(-hitWidth * 0.5).toFixed(2)}px`, 'important');
        if (icons[i]) {
          icons[i].style.width = `${iconPx}px`;
          icons[i].style.height = `${iconPx}px`;
        }
      }

      rimSvgEl.setAttribute('viewBox', `0 0 ${w} ${barH.toFixed(2)}`);

      if (!state.isScrubbing) {
        state.bubbleX += metrics.tabX[state.activeIndex] - prevTabX;
      }
      state.lastRenderedKey = '';
      lastBubbleCache = '';
      lastIconCache.fill('');
    }

    function buildLiquidMeniscusPath(bx, Rc, Rf) {
      const W = metrics.width;
      const r = metrics.barRadius;
      const barTop = metrics.barTop;
      const barBottom = metrics.barBottom;
      const cy = metrics.bubbleCenterY;

      const maxDxF = Math.max(14, Math.min(bx - (r + 2), W - r - 2 - bx));
      const dyBase = barTop - cy;

      let effectiveRf = Rf;
      let yf = barTop + effectiveRf;
      let sumR = Rc + effectiveRf;
      let dxF = Math.sqrt(Math.max(0, sumR * sumR - (yf - cy) * (yf - cy)));

      if (dxF > maxDxF) {
        const solvedRf = (maxDxF * maxDxF - (Rc * Rc - dyBase * dyBase)) / Math.max(1, 2 * (Rc - dyBase));
        effectiveRf = Math.max(4, solvedRf);
        yf = barTop + effectiveRf;
        sumR = Rc + effectiveRf;
        dxF = Math.sqrt(Math.max(0, sumR * sumR - (yf - cy) * (yf - cy)));
      }

      const xfL = bx - dxF;
      const xfR = bx + dxF;
      const t = effectiveRf / sumR;
      const p2x = xfL + t * (bx - xfL);
      const p2y = yf + t * (cy - yf);
      const p3x = xfR + t * (bx - xfR);
      const f = (v) => v.toFixed(3);

      return (
        `M 0 ${f(barBottom)} L 0 ${f(barTop + r)} ` +
        `A ${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(barTop)} ` +
        `L ${f(xfL)} ${f(barTop)} ` +
        `A ${f(effectiveRf)} ${f(effectiveRf)} 0 0 1 ${f(p2x)} ${f(p2y)} ` +
        `A ${f(Rc)} ${f(Rc)} 0 0 0 ${f(p3x)} ${f(p2y)} ` +
        `A ${f(effectiveRf)} ${f(effectiveRf)} 0 0 1 ${f(xfR)} ${f(barTop)} ` +
        `L ${f(W - r)} ${f(barTop)} ` +
        `A ${f(r)} ${f(r)} 0 0 1 ${f(W)} ${f(barTop + r)} ` +
        `L ${f(W)} ${f(barBottom)} Z`
      );
    }

    function stepSpring(current, velocity, target, omega, dt) {
      const offset = current - target;
      const exp = Math.exp(-omega * dt);
      return [
        target + (offset + (velocity + omega * offset) * dt) * exp,
        (velocity - omega * (velocity + omega * offset) * dt) * exp
      ];
    }

    function setActiveTab(index, { soundType = 'tap', triggerTrazeelClick = false } = {}) {
      const count = tabButtons.length;
      const normalized = ((Math.round(index) % count) + count) % count;
      const changed = normalized !== state.activeIndex;
      state.activeIndex = normalized;

      if (soundType === 'glide' && changed) LiquidAudio.playGlide(normalized, state.bubbleVelX);
      else if (soundType === 'tap') LiquidAudio.playTap(normalized);

      if (triggerTrazeelClick && !tabButtons[normalized].classList.contains('active')) {
        tabButtons[normalized].click();
      }
    }

    const tabObserver = new MutationObserver(() => {
      const activeIdx = tabButtons.findIndex((btn) => btn.classList.contains('active'));
      if (activeIdx !== -1 && activeIdx !== state.activeIndex && !state.isScrubbing) {
        state.activeIndex = activeIdx;
      }
    });
    tabButtons.forEach((btn) => {
      tabObserver.observe(btn, { attributes: true, attributeFilter: ['class', 'aria-selected'] });
    });

    function clientXToLocalX(clientX) {
      const localX = clientX - navbarEl.getBoundingClientRect().left;
      return Math.max(metrics.tabX[0], Math.min(metrics.tabX[metrics.tabX.length - 1], localX));
    }

    function nearestTabIndex(localX) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < metrics.tabX.length; i++) {
        const d = Math.abs(localX - metrics.tabX[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    navbarEl.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      LiquidAudio.unlock();
      state.isPointerDown = true;
      state.isScrubbing = false;
      state.pointerId = e.pointerId;
      state.pointerDownClientX = e.clientX;
      state.lastScrubTime = performance.now();
    });

    window.addEventListener('pointermove', (e) => {
      if (!state.isPointerDown || e.pointerId !== state.pointerId) return;

      if (!state.isScrubbing && Math.abs(e.clientX - state.pointerDownClientX) >= 6) {
        state.isScrubbing = true;
        navbarEl.classList.add('is-scrubbing');
      }

      if (state.isScrubbing) {
        const now = performance.now();
        const dt = Math.max(0.004, (now - state.lastScrubTime) / 1000);
        const nextX = clientXToLocalX(e.clientX);
        state.bubbleVelX = (nextX - state.bubbleX) / dt;
        state.bubbleX = nextX;
        state.lastScrubTime = now;

        const nearest = nearestTabIndex(nextX);
        if (nearest !== state.activeIndex) {
          setActiveTab(nearest, { soundType: 'glide', triggerTrazeelClick: true });
        }
      }
    });

    function endPointerScrub(e) {
      if (!state.isPointerDown || e.pointerId !== state.pointerId) return;
      if (state.isScrubbing) {
        const nearest = nearestTabIndex(state.bubbleX);
        setActiveTab(nearest, { soundType: 'none', triggerTrazeelClick: true });
        LiquidAudio.playSettle(nearest);
      }
      state.isPointerDown = false;
      state.isScrubbing = false;
      state.pointerId = null;
      navbarEl.classList.remove('is-scrubbing');
    }

    window.addEventListener('pointerup', endPointerScrub);
    window.addEventListener('pointercancel', endPointerScrub);

    tabButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        setActiveTab(idx, { soundType: 'tap', triggerTrazeelClick: false });
      });
      btn.addEventListener('pointerenter', () => { state.hoveredIndex = idx; });
      btn.addEventListener('pointerleave', () => { if (state.hoveredIndex === idx) state.hoveredIndex = -1; });
    });

    if (typeof ResizeObserver !== 'undefined') {
      let resizeRaf = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(syncViewportMetrics);
      }).observe(navbarEl);
    }
    window.addEventListener('resize', syncViewportMetrics);
    window.addEventListener('orientationchange', syncViewportMetrics);

    function renderFrame(dt) {
      const targetX = metrics.tabX[state.activeIndex];

      if (!state.isScrubbing) {
        [state.bubbleX, state.bubbleVelX] = stepSpring(state.bubbleX, state.bubbleVelX, targetX, 15.5, dt);
      } else {
        state.bubbleVelX *= Math.exp(-18 * dt);
      }

      const rawSpeedNorm = Math.min(Math.abs(state.bubbleVelX) / 980, 1);
      state.elasticity += (rawSpeedNorm - state.elasticity) * (1 - Math.exp(-22 * dt));

      const dynRc = metrics.cavityR + 2.6 * metrics.scale * state.elasticity;
      const dynRf = metrics.filletR + 3.4 * metrics.scale * state.elasticity;

      const renderKey = `${metrics.width}_${metrics.barBottom.toFixed(2)}_${state.bubbleX.toFixed(2)}_${dynRc.toFixed(2)}_${dynRf.toFixed(2)}`;
      if (renderKey !== state.lastRenderedKey) {
        const d = buildLiquidMeniscusPath(state.bubbleX, dynRc, dynRf);
        clipPathEl.setAttribute('d', d);
        rimClipPathEl.setAttribute('d', d);
        rimPathEl.setAttribute('d', d);
        cushionPathEl.setAttribute('d', d);
        state.lastRenderedKey = renderKey;
      }

      const tx = (state.bubbleX - metrics.rBubble).toFixed(2);
      const ty = (metrics.bubbleCenterY - metrics.rBubble).toFixed(2);
      const scaleX = (1 + 0.11 * state.elasticity).toFixed(4);
      const scaleY = (1 / (1 + 0.11 * state.elasticity)).toFixed(4);
      const nextBubble = `translate3d(${tx}px, ${ty}px, 0) scale(${scaleX}, ${scaleY})`;
      if (nextBubble !== lastBubbleCache) {
        bubbleEl.style.transform = nextBubble;
        lastBubbleCache = nextBubble;
      }

      const palette = THEME_COLORS[currentTheme] || THEME_COLORS.dark;
      const influenceRadius = Math.max(44, (metrics.tabX[1] - metrics.tabX[0]) * 0.92);
      const SNAP_THRESHOLD = 0.36;

      for (let i = 0; i < iconWraps.length; i++) {
        const wrap = iconWraps[i];
        const phys = iconPhysics[i];
        const dx = state.bubbleX - metrics.tabX[i];
        const absDx = Math.abs(dx);

        const rawP = Math.max(0, Math.min(1, 1 - absDx / influenceRadius));
        const p = rawP * rawP * (3 - 2 * rawP);

        if (phys.prevRawP >= SNAP_THRESHOLD && rawP < SNAP_THRESHOLD) phys.recoilVel -= 3.1;
        else if (phys.prevRawP < SNAP_THRESHOLD && rawP >= SNAP_THRESHOLD) phys.recoilVel += 2.1;
        phys.prevRawP = rawP;

        const omega = 28;
        const zeta = 0.56;
        phys.recoilVel += (-2 * zeta * omega * phys.recoilVel - omega * omega * phys.recoil) * dt;
        phys.recoil += phys.recoilVel * dt;

        const bridgeTension = Math.pow(Math.sin(Math.PI * Math.pow(rawP, 0.82)), 1.3);
        const hoverLift = i === state.hoveredIndex && p < 0.2 ? -2.0 : 0.0;
        const iconCenterY = metrics.barCenterY + (metrics.bubbleCenterY - metrics.barCenterY) * p + hoverLift * (1 - p);

        const baseScale = 1 + 0.10 * p;
        const stretch = bridgeTension * 0.26 + phys.recoil;
        const iconScaleX = baseScale * (1 + stretch);
        const iconScaleY = baseScale * Math.max(0.68, 1 - stretch * 0.82);

        const dir = absDx > 0.5 ? Math.sign(dx) : 0;
        const pullX = dir * bridgeTension * 6.0 * metrics.scale;

        const r = Math.round(palette.inactive.r + (palette.active.r - palette.inactive.r) * p);
        const g = Math.round(palette.inactive.g + (palette.active.g - palette.inactive.g) * p);
        const b = Math.round(palette.inactive.b + (palette.active.b - palette.inactive.b) * p);
        const a = (palette.inactive.a + (palette.active.a - palette.inactive.a) * p).toFixed(3);

        const transformStr = `translate3d(${pullX.toFixed(2)}px, ${iconCenterY.toFixed(2)}px, 0) scale(${iconScaleX.toFixed(4)}, ${iconScaleY.toFixed(4)})`;
        const colorStr = `rgba(${r}, ${g}, ${b}, ${a})`;
        const cacheKey = `${transformStr}|${colorStr}`;

        if (lastIconCache[i] !== cacheKey) {
          wrap.style.setProperty('transform', transformStr, 'important');
          wrap.style.setProperty('color', colorStr, 'important');
          lastIconCache[i] = cacheKey;
        }
      }
    }

    function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - state.lastTime) / 1000, 0.05);
      state.lastTime = now;
      renderFrame(dt);
    }

    window.LiquidGlassNavbar = {
      setActive: (index) => setActiveTab(Number(index) || 0, { soundType: 'tap', triggerTrazeelClick: true }),
      getActive: () => state.activeIndex,
      setSoundEnabled: (enabled) => LiquidAudio.setEnabled(enabled),
      isSoundEnabled: () => LiquidAudio.isEnabled()
    };

    syncViewportMetrics();
    state.bubbleX = metrics.tabX[initialIdx];
    renderFrame(0.016);
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrazeelLiquidNavbar);
  } else {
    initTrazeelLiquidNavbar();
  }
})();
