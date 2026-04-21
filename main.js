/* ==========================================================================
   NHOP — main.js
   Skeleton JS: custom cursor, sticky nav, entrance reveals.
   3D pancake stack (Three.js / React Three Fiber) wires in as a later step.
   Kept vanilla for the first pass so the site runs without a bundler.
   ========================================================================== */

/* ---------- Custom cursor ----------
   Only activates on fine-pointer devices. Sets body class so CSS takes over;
   if this script fails to load, the native cursor stays visible — guaranteed.
*/
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

  const render = () => {
    // simple lerp for butter-smooth follow
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    cursor.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  };
  render();

  // Grow cursor over interactive elements
  const interactiveSelector = '[data-cursor], a, button';
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest(interactiveSelector)) cursor.classList.add("cursor--hover");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest(interactiveSelector)) cursor.classList.remove("cursor--hover");
  });
})();

/* ---------- Sticky nav background on scroll ---------- */
(() => {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add("nav--scrolled");
    else nav.classList.remove("nav--scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ---------- Entrance reveals via IntersectionObserver ---------- */
(() => {
  const targets = document.querySelectorAll(
    ".hero__copy, .dish-card, .review-card, .merch-card, .popular__head, .merch__copy, .reserve__title, .reserve__form-preview"
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

/* ---------- Layers section — exploded pancake ----------
   State: "exploded" (default) ↔ "stacked" (via button).
   When exploded: --offset on the stage lerps from 0 → SPREAD as the section
   enters the viewport, giving a scroll-driven "pull apart" feel.
   Scroll handler is only attached while the section is in/near viewport
   (via IntersectionObserver), so the rest of the page scrolls cheap.
*/
(() => {
  const stage = document.querySelector(".layers__stage");
  if (!stage) return;

  const stack  = stage.querySelector(".layers__stack");
  const btn    = stage.querySelector("[data-layers-toggle]");
  const SPREAD = 44; // px per index step when fully exploded

  let ticking = false;
  const updateSpread = () => {
    if (stage.dataset.layersState !== "exploded") {
      stage.style.setProperty("--offset", "0px");
      ticking = false;
      return;
    }
    const rect = stack.getBoundingClientRect();
    const vh   = window.innerHeight || 800;
    const raw  = 1 - (rect.top / vh);
    const p    = Math.max(0, Math.min(1, raw));
    stage.style.setProperty("--offset", `${p * SPREAD}px`);
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateSpread);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          window.addEventListener("scroll", onScroll, { passive: true });
          updateSpread();
        } else {
          window.removeEventListener("scroll", onScroll);
        }
      });
    }, { rootMargin: "100px" });
    io.observe(stage);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    updateSpread();
  }

  if (btn) {
    btn.addEventListener("click", () => {
      const isStacked = stage.dataset.layersState === "stacked";
      stage.dataset.layersState = isStacked ? "exploded" : "stacked";
      btn.setAttribute("aria-pressed", String(!isStacked));
      btn.textContent = isStacked ? "Stack it up" : "Pull it apart";
      updateSpread();
    });
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

  const measure = () => {
    if (!shouldPin()) {
      section.classList.remove("is-pinned");
      section.style.height = "";
      section.style.removeProperty("--reel-progress");
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
