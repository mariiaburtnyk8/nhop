/* ==========================================================================
   NHOP — main.js
   Skeleton JS: custom cursor, sticky nav, entrance reveals.
   3D pancake stack (Three.js / React Three Fiber) wires in as a later step.
   Kept vanilla for the first pass so the site runs without a bundler.
   ========================================================================== */

/* ---------- Custom cursor ----------
   Only activates on fine-pointer devices. Sets body class so CSS takes over;
   if this script fails to load, the native cursor stays visible — guaranteed.
   window.__nhopCursorDark is shared with the ribbon trail IIFE below.
*/
window.__nhopCursorDark = false;

(() => {
  const cursor = document.querySelector(".cursor");
  if (!cursor) return;

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;

  document.body.classList.add("has-custom-cursor");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  window.addEventListener("pointermove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  }, { passive: true });

  const navEl = document.getElementById('nav');

  /* Returns true when the visual cursor dot is over a pink zone.
     Checked at VISUAL position each rAF frame → zero lag, exact boundary crossing.
     Uses specific selectors (not .footer) to avoid false-positives on
     the dark blob/arch at the top of the footer. */
  const isDarkZone = (el) => {
    if (!el) return false;
    return !!el.closest('.footer__info') ||         // pink footer info strip
           !!el.closest('.footer__about') ||         // pink footer about section
           !!el.closest('.item-card__fill') ||       // menu page pink fill blocks
           !!el.closest('.menu-card--pink') ||       // homepage favorites pink cards
           !!el.closest('[data-cursor-zone="light"]') ||
           document.body.classList.contains('cursor-zone--light') ||
           (!!el.closest('.nav__links a') && navEl?.classList.contains('nav--scrolled'));
  };

  const render = () => {
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    cursor.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;

    /* Color zone check at the VISUAL cursor position — instant, no pointerover lag.
       elementsFromPoint returns all stacked elements; we skip the cursor div itself
       (elementFromPoint returns the cursor since it sits at those coords). */
    const stack = document.elementsFromPoint(Math.round(currentX), Math.round(currentY));
    const el = stack.find(e => e !== cursor) || null;
    const dark = isDarkZone(el);
    if (dark !== window.__nhopCursorDark) {
      cursor.classList.toggle("cursor--dark", dark);
      window.__nhopCursorDark = dark;
    }

    requestAnimationFrame(render);
  };
  render();

  /* Hover: only for opacity fade — keep in pointerover (real pointer position is fine here) */
  const interactiveSelector = '[data-cursor], a, button';
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest(interactiveSelector)) cursor.classList.add("cursor--hover");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest(interactiveSelector)) cursor.classList.remove("cursor--hover");
  });
})();

/* ---------- Cursor ribbon trail ----------
   Chain of honey-colored dots that follow the cursor with a lerp delay.
*/
(() => {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;

  const TRAIL_COUNT = 18;
  const LERP        = 0.22;

  const dots = Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const el = document.createElement("div");
    el.className = "ribbon-dot";
    const t = 1 - i / TRAIL_COUNT;
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9998;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      width:  ${6 + t * 8}px;
      height: ${6 + t * 8}px;
      background: #FFA5D7;
      opacity: 0;
      transition: opacity 120ms ease;
    `;
    document.body.appendChild(el);
    return { el, x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let active = false;

  window.addEventListener("pointermove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!active) {
      active = true;
      dots.forEach(d => { d.el.style.opacity = "1"; });
    }
  }, { passive: true });

  const render = () => {
    let px = mouseX, py = mouseY;
    const dark = window.__nhopCursorDark;
    dots.forEach((d, i) => {
      d.x += (px - d.x) * LERP;
      d.y += (py - d.y) * LERP;
      const t = 1 - i / TRAIL_COUNT;
      d.el.style.left       = d.x + "px";
      d.el.style.top        = d.y + "px";
      d.el.style.opacity    = String(t * 0.55);
      d.el.style.background = dark ? '#390219' : '#FFA5D7';
      px = d.x;
      py = d.y;
    });
    requestAnimationFrame(render);
  };
  render();
})();

/* ---------- Burger menu — Bubble Menu (mobile only, GSAP-powered) ---------- */
(() => {
  const burger  = document.querySelector('.nav__burger');
  const overlay = document.getElementById('bubble-overlay');
  if (!burger || !overlay) return;

  const nav    = document.getElementById('nav');
  const pills  = [...overlay.querySelectorAll('.bubble-pill')];
  const labels = [...overlay.querySelectorAll('.bubble-pill__label')];
  let isOpen   = false;

  const openMenu = () => {
    isOpen = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (nav) {
      nav.classList.add('menu-is-open');
      // Force fixed so nav stays on top of overlay even when page JS
      // has set position:sticky via inline style (menu.html, about.html, etc.)
      nav.style.setProperty('position', 'fixed', 'important');
      nav.style.setProperty('top', '0', 'important');
      nav.style.setProperty('left', '0', 'important');
      nav.style.setProperty('right', '0', 'important');
    }

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([...pills, ...labels]);
      gsap.set(pills,  { scale: 0 });
      gsap.set(labels, { y: 28, autoAlpha: 0 });
      pills.forEach((pill, i) => {
        const delay = i * 0.11 + gsap.utils.random(-0.03, 0.03);
        gsap.to(pill,     { scale: 1, duration: 0.48, ease: 'back.out(1.5)', delay });
        gsap.to(labels[i],{ y: 0, autoAlpha: 1, duration: 0.38, ease: 'power3.out', delay: delay + 0.06 });
      });
    }
  };

  const closeMenu = () => {
    isOpen = false;
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');

    const finish = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (nav) {
        nav.classList.remove('menu-is-open');
        // Remove the fixed override — page-level JS / CSS will restore sticky
        nav.style.removeProperty('position');
        nav.style.removeProperty('top');
        nav.style.removeProperty('left');
        nav.style.removeProperty('right');
      }
    };

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([...pills, ...labels]);
      gsap.to(labels, { y: 24, autoAlpha: 0, duration: 0.16, ease: 'power3.in' });
      gsap.to(pills,  { scale: 0, duration: 0.20, ease: 'power3.in', onComplete: finish });
    } else {
      finish();
    }
  };

  burger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());

  // Close when a pill link is clicked
  pills.forEach(pill => pill.addEventListener('click', closeMenu));

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });
})();

/* ---------- Sticky nav background on scroll ---------- */
(() => {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const onScroll = () => {
    nav.classList.add("nav--scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ---------- PillNav desktop hover animation ---------- */
(() => {
  if (typeof gsap === 'undefined') return;
  const navLinks = document.querySelector('.nav__links');
  if (!navLinks) return;

  const EASE = 'power3.out';
  const pills = [...navLinks.querySelectorAll('a')];
  const tlRefs = [];
  const activeTweenRefs = [];

  function layout() {
    if (window.innerWidth <= 768) return;
    pills.forEach((pill, i) => {
      const circle = pill.querySelector('.hover-circle');
      if (!circle) return;
      const rect = pill.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      if (!w || !h) return;

      const R      = ((w * w) / 4 + h * h) / (2 * h);
      const D      = Math.ceil(2 * R) + 2;
      const delta  = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width  = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

      const label = pill.querySelector('.pill-label');
      const hover = pill.querySelector('.pill-label-hover');
      if (label) gsap.set(label, { y: 0 });
      if (hover) gsap.set(hover, { y: Math.ceil(h + 100), opacity: 0 });

      tlRefs[i]?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease: EASE, overwrite: 'auto' }, 0);
      if (label) tl.to(label, { y: -(h + 8), duration: 2, ease: EASE, overwrite: 'auto' }, 0);
      if (hover) tl.to(hover, { y: 0, opacity: 1, duration: 2, ease: EASE, overwrite: 'auto' }, 0);
      tlRefs[i] = tl;
    });
  }

  pills.forEach((pill, i) => {
    pill.addEventListener('mouseenter', () => {
      if (window.innerWidth <= 768) return;
      const tl = tlRefs[i];
      if (!tl) return;
      activeTweenRefs[i]?.kill();
      activeTweenRefs[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease: EASE, overwrite: 'auto' });
    });
    pill.addEventListener('mouseleave', () => {
      const tl = tlRefs[i];
      if (!tl) return;
      activeTweenRefs[i]?.kill();
      activeTweenRefs[i] = tl.tweenTo(0, { duration: 0.2, ease: EASE, overwrite: 'auto' });
    });
  });

  layout();
  window.addEventListener('resize', layout);
  if (document.fonts?.ready) document.fonts.ready.then(layout).catch(() => {});
})();

/* ---------- Entrance reveals via IntersectionObserver ---------- */
/* Skips .menu-card — menu cards have their own staggered reveal below. */
(() => {
  const targets = document.querySelectorAll(
    ".hero__copy, .review-card, .merch-card, .menu__head, .merch__copy, .reserve__title, .reserve__form-preview"
  );
  if (!("IntersectionObserver" in window) || !targets.length) return;

  targets.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 800ms var(--ease-out-soft), transform 800ms var(--ease-out-soft)";
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach((el) => io.observe(el));
})();

/* ---------- Menu cards — staggered entrance ----------
   Crumbl-style horizontal cards. CSS reads --i to offset transition-delay,
   so the IO just toggles .is-in. Hover wobble is pure CSS now.
*/
(() => {
  const cards = document.querySelectorAll(".menu-card");
  if (!cards.length) return;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

    cards.forEach((card) => io.observe(card));
  } else {
    cards.forEach((card) => card.classList.add("is-in"));
  }

  // Mobile: show color when card is in view, hide when out of view
  if (window.innerWidth <= 860) {
    const ioColor = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        e.target.classList.toggle("is-in-view", e.isIntersecting);
      });
    }, { threshold: 0.5 });
    cards.forEach(c => ioColor.observe(c));
  }
})();

/* ---------- Reel — pinned horizontal-scroll polaroid reel ----------
   Lives inside #reviews (the pink section). Mechanics:
   · JS sets section height = viewportHeight + horizontal travel distance.
   · .reel__pin is position: sticky; top: 0; height: 100vh. It stays locked
     to the viewport for the full travel distance, then releases.
   · A scroll listener writes progress (pixels scrolled into the section,
     clamped to travel) into the CSS variable `--reel-progress`.
   · The .is-pinned CSS rule reads that variable and translates the track.
   · IntersectionObserver gates the scroll listener so idle pages are cheap.
   · Pauses videos that aren't in view to save CPU/battery.
   · Falls back to native horizontal scroll on narrow viewports and for
     users with prefers-reduced-motion.
*/
(() => {
  const section  = document.querySelector(".reel");
  if (!section) return;
  const pin      = section.querySelector(".reel__pin");
  const viewport = section.querySelector(".reel__viewport");
  const track    = section.querySelector("[data-reel-track]");
  if (!pin || !viewport || !track) return;

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowQuery  = window.matchMedia("(max-width: 860px)");

  let travel = 0;      // px the track needs to pan
  let ticking = false;
  let listening = false;

  const shouldPin = () => !reducedQuery.matches && !narrowQuery.matches;

  // Hard mobile check — belt-and-suspenders on top of narrowQuery
  const isMobileViewport = () => window.innerWidth <= 860;

  const resetMobile = () => {
    section.classList.remove("is-pinned");
    section.style.removeProperty("height");
    pin.style.removeProperty("height");
    viewport.style.removeProperty("height");
    section.style.removeProperty("--reel-progress");
  };

  const measure = () => {
    if (!shouldPin() || isMobileViewport()) {
      resetMobile();
      return;
    }
    // Temporarily clear the forced height so scrollWidth is correct
    section.style.height = "";
    const vpWidth    = viewport.clientWidth;
    const trackWidth = track.scrollWidth;
    travel = Math.max(0, trackWidth - vpWidth);
    if (travel === 0) {
      // Nothing to pan — don't pin, fall through to static layout
      section.classList.remove("is-pinned");
      return;
    }
    const sectionH = window.innerHeight + travel;
    section.style.height = `${sectionH}px`;
    section.classList.add("is-pinned");
    update();
  };

  const update = () => {
    ticking = false;
    if (!section.classList.contains("is-pinned")) return;
    const rect = section.getBoundingClientRect();
    // `rect.top` is the distance from viewport top to section top.
    // When top = 0 we've just hit the pin; when top = -travel we've
    // scrolled the full horizontal distance. Clamp to [0, travel].
    const scrolled = Math.min(travel, Math.max(0, -rect.top));
    section.style.setProperty("--reel-progress", scrolled.toFixed(2));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  const attach = () => {
    if (listening) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    listening = true;
  };
  const detach = () => {
    if (!listening) return;
    window.removeEventListener("scroll", onScroll);
    listening = false;
  };

  // Re-measure on resize / orientation / font load
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  }, { passive: true });
  reducedQuery.addEventListener?.("change", measure);
  narrowQuery.addEventListener?.("change", measure);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }
  window.addEventListener("load", measure);

  measure();

  // Extra safety: after fonts + images settle, force-reset on mobile
  window.addEventListener("load", () => {
    if (isMobileViewport()) requestAnimationFrame(resetMobile);
  }, { once: true });

  // MutationObserver: prevent is-pinned class from ever sticking on mobile
  if ("MutationObserver" in window) {
    const mo = new MutationObserver(() => {
      if (isMobileViewport() && section.classList.contains("is-pinned")) {
        resetMobile();
      }
    });
    mo.observe(section, { attributes: true, attributeFilter: ["class"] });
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? attach() : detach());
    }, { rootMargin: "300px" });
    io.observe(section);
  } else {
    attach();
  }

  // Pause videos that aren't on screen — saves CPU/battery
  const videos = section.querySelectorAll("video");
  if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.15 });
    videos.forEach((v) => vio.observe(v));
  }
})();

/* ---------- Hero dish card — cycles through 3 dishes every 4 s ---------- */
(() => {
  const dishes = [
    { tag: 'Now serving',  name: 'Red Velvet Stack',  sub: 'Strawberry · whipped cream · velvet batter' },
    { tag: 'Fan favorite', name: 'Wildberry Stack',   sub: 'Blueberry · raspberry · lemon cream' },
    { tag: 'Must try',     name: 'S\'mores Soirée',   sub: 'Toasted marshmallow · graham · ganache' },
  ];

  const dish   = document.querySelector('.hero__dish');
  if (!dish) return;
  const tagEl  = dish.querySelector('.hero__dish-tag');
  const nameEl = dish.querySelector('.hero__dish-name');
  const subEl  = dish.querySelector('.hero__dish-sub');

  let current = 0;

  // fx-fade uses animation-fill-mode:forwards, которая удерживает opacity:1
  // через анимацию — это блокирует CSS transition. Сбрасываем анимацию
  // после её завершения и устанавливаем явное inline-значение, чтобы
  // transition работал корректно.
  dish.addEventListener('animationend', () => {
    dish.style.animation = 'none';
    dish.style.opacity   = '1';
    dish.style.transform = 'translateY(0)';
  }, { once: true });

  const next = () => {
    current = (current + 1) % dishes.length;
    const d = dishes[current];

    // fade out + slide down
    dish.style.opacity   = '0';
    dish.style.transform = 'translateY(10px)';

    setTimeout(() => {
      tagEl.textContent  = d.tag;
      nameEl.textContent = d.name;
      subEl.textContent  = d.sub;
      // fade back in
      dish.style.opacity   = '1';
      dish.style.transform = 'translateY(0)';
    }, 420);
  };

  setInterval(next, 4000);
})();

/* ---------- Footer wave: 3 wide bumps on mobile, 6 narrow on desktop ----------
   CSS clip-path: polygon() creates sharp triangles, so we swap the SVG path
   directly — cubic beziers keep the bumps round on any screen width.
*/
(() => {
  const paths = Array.from(document.querySelectorAll('.footer__blob-svg path'));
  if (!paths.length) return;

  // Original 6-bump desktop path
  const d6 = "M0,0 H1440 V330 C1360,440 1280,440 1200,330 C1120,440 1040,440 960,330 C880,440 800,440 720,330 C640,440 560,440 480,330 C400,440 320,440 240,330 C160,440 80,440 0,330 Z";
  // 3 wide bumps for mobile
  const d3 = "M0,0 H1440 V300 C1360,430 1040,430 960,300 C880,430 560,430 480,300 C400,430 80,430 0,300 Z";

  const apply = () => {
    const d = window.innerWidth <= 760 ? d3 : d6;
    paths.forEach(p => p.setAttribute('d', d));
  };

  apply();
  window.addEventListener('resize', apply, { passive: true });
})();

/* ---------- 3D pancake stack mount point ----------
   Next iteration plugs in React Three Fiber here.
   For now we just mark the canvas as "ready" so CSS can hide the placeholder
   once the WebGL scene is mounted.
*/
(() => {
  const canvas = document.getElementById("pancake-canvas");
  if (!canvas) return;
  canvas.dataset.status = "pending";
})();

/* ---------- Reel v2 — oryzo.ai center-card active state ----------
   On every scroll tick, finds the card whose horizontal center is
   closest to the viewport's horizontal midpoint and marks it .is-active.
   CSS handles the scale + opacity + dashed-border transitions.
   Runs only while the reel section is in the IntersectionObserver rootMargin.
*/
(() => {
  const section = document.querySelector(".reel");
  if (!section) return;
  const track = section.querySelector("[data-reel-track]");
  if (!track) return;

  const setActive = () => {
    const cards = track.querySelectorAll(".reel-card");
    if (!cards.length) return;
    const cx = window.innerWidth / 2;
    let best = null, bestDist = Infinity;
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - cx);
      if (dist < bestDist) { bestDist = dist; best = c; }
    });
    cards.forEach((c) => c.classList.remove("is-active"));
    if (best) best.classList.add("is-active");
  };

  let tick = false;
  const onScroll = () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => { setActive(); tick = false; });
  };

  let listening = false;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !listening) {
            window.addEventListener("scroll", onScroll, { passive: true });
            listening = true;
          } else if (!e.isIntersecting && listening) {
            window.removeEventListener("scroll", onScroll);
            listening = false;
          }
        });
      },
      { rootMargin: "200px" }
    );
    io.observe(section);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  window.addEventListener("load", setActive, { once: true });
  setActive();
})();

/* ---------- Testimonials — sequential card reveal (jeton.com-style) ----------
   Watch the SECTION (not individual cards). The moment the section
   enters the viewport, we fire cards one-by-one via setTimeout with
   CARD_DELAY ms between each. 2-column CSS grid means order alternates
   left → right naturally: card 0 (L), card 1 (R), card 2 (L), …
   The 700 ms CSS transition (cubic-bezier 0.16 1 0.3 1 = "expo out")
   gives each card a snappy-yet-smooth rise from translateY(72px).
*/
(() => {
  const section = document.querySelector(".testimonials");
  if (!section) return;

  const cards = Array.from(section.querySelectorAll(".t-card"));
  if (!cards.length) return;

  const CARD_DELAY = 200; /* ms between each card appearing */
  let fired = false;

  const reveal = () => {
    if (fired) return;
    fired = true;
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add("is-in"), i * CARD_DELAY);
    });
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(section);
  } else {
    reveal(); /* fallback — no IO support */
  }
})();

/* ---------- Drop scene — scroll-pinned pancake → menu transition ----------
   The .drop-scene section is 350 vh tall.
   Travel = 350 – 100 = 250 vh — cinematic, never feels rushed.
   Progress 0 → 1 maps to that 250 vh of scroll.

   Timeline
   ──────────────────────────────────────────────────────────
   0.00 → 0.50  Pancake falls in (cubic-out, gravity feel).
   0.35 → 0.85  Cream reveal rises (cubic-in-out, smooth).
   0.65 → 0.90  Pancake fades under rising cream.
   ──────────────────────────────────────────────────────────
   On narrow / reduced-motion viewports the section is display:none so
   this code bails out immediately — no wasted cycles.
*/
(() => {
  const scene = document.querySelector(".drop-scene");
  if (!scene || getComputedStyle(scene).display === "none") return;

  const pancake = scene.querySelector(".drop-scene__pancake");
  const reveal  = scene.querySelector(".drop-scene__reveal");
  if (!pancake || !reveal) return;

  /* Skip if user prefers reduced motion */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /* Easing helpers */
  const easeOutCubic   = t => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* clamp(value, min, max) shorthand */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* Normalize a sub-range of [0,1] progress into its own [0,1] */
  const sub = (p, start, end) => clamp((p - start) / (end - start), 0, 1);

  let travel = 0; /* = sectionHeight – viewportHeight, computed on measure() */

  const measure = () => {
    travel = scene.offsetHeight - window.innerHeight;
  };

  const update = () => {
    const scrolled = clamp(-scene.getBoundingClientRect().top, 0, travel);
    if (travel <= 0) return;
    const p = scrolled / travel; /* 0 → 1 */

    /* -- Pancake --
       Starts 120 vh above screen, lands centred.
       Sub 0→0.50 = falls over first 125 vh of travel. */
    const panP  = easeOutCubic(sub(p, 0, 0.50));
    const panY  = window.innerHeight * (-1.2 + 1.2 * panP); /* -120vh → 0 */
    const panDeg = 8 * (1 - panP); /* gentle clockwise wobble */
    pancake.style.transform = `translateY(${panY.toFixed(1)}px) rotate(${panDeg.toFixed(1)}deg)`;

    /* Fade out as cream covers it */
    const panFade = 1 - sub(p, 0.65, 0.90);
    pancake.style.opacity = panFade.toFixed(3);

    /* -- Cream reveal --
       height: 100% of stage → translateY(100%) = fully below.
       Rises from 100% → 0% over sub 0.35→0.85. */
    const revP = easeInOutCubic(sub(p, 0.35, 0.85));
    reveal.style.transform = `translateY(${((1 - revP) * 100).toFixed(2)}%)`;
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };

  /* Re-measure on resize */
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measure(); update(); }, 120);
  }, { passive: true });

  /* Gate the scroll listener with IntersectionObserver (perf) */
  let listening = false;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !listening) {
          window.addEventListener("scroll", onScroll, { passive: true });
          listening = true;
        } else if (!entry.isIntersecting && listening) {
          window.removeEventListener("scroll", onScroll);
          listening = false;
        }
      });
    }, { rootMargin: "300px" });
    io.observe(scene);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Kick off on load */
  window.addEventListener("load", () => { measure(); update(); }, { once: true });
  measure();
  update();
})();

/* ---------- Section heading — word-by-word slide-up reveal ----------
   Targets: testimonials title + reel "See it on the plate" heading.
   Splits text into words, wraps each in an overflow:hidden clip-span,
   then triggers when the heading enters the viewport.
*/
(() => {
  const SELECTORS = '.testimonials__title, .reel__head-copy h2';
  const headings  = document.querySelectorAll(SELECTORS);
  if (!headings.length) return;

  headings.forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((word, i) =>
      `<span class="reveal-word-wrap"><span class="reveal-word" style="transition-delay:${i * 72}ms">${word}</span></span>`
    ).join(' ');
  });

  const reveal = (el) =>
    el.querySelectorAll('.reveal-word').forEach(w => w.classList.add('is-in'));

  if (!('IntersectionObserver' in window)) {
    headings.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  headings.forEach(el => io.observe(el));
})();

/* ==========================================================================
   Legal Modal — content from window.__nhopLegal (legal-content.js)
   ========================================================================== */
(() => {
  const modal   = document.getElementById('legal-modal');
  if (!modal) return;

  const overlay = modal.querySelector('.legal-modal__overlay');
  const closeBtn= modal.querySelector('.legal-modal__close');
  const titleEl = document.getElementById('legal-modal-title');
  const bodyEl  = document.getElementById('legal-modal-body');

  function openModal(type) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    titleEl.textContent = type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
    const content = window.__nhopLegal && window.__nhopLegal[type];
    bodyEl.innerHTML = content || '';
    bodyEl.scrollTop = 0;
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  document.querySelectorAll('[data-legal]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      openModal(link.dataset.legal);
    });
  });
})();
