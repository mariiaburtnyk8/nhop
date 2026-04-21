/* ==========================================================================
   NHOP — reserve.js
   Interactive 5-step reservation mini-game:
     1) Party size    — animated plates on a table
     2) Date & time   — flip-clock + chip pickers
     3) Name          — handwritten-style input
     4) Phone         — retro keypad with ripple
     5) Wishes        — waiter notepad that nods on focus
     → Confirmation   — landing reservation card

   Vanilla JS, no bundler. All animations are CSS; JS just toggles state.
   ========================================================================== */

(() => {
  const root = document.querySelector(".reserve__game");
  if (!root) return;

  /* ---------- State ---------- */
  const state = {
    step: 1,
    party: 2,
    day: "12",
    month: "MAY",
    weekday: "TUE",
    time: "09:30",
    name: "",
    phone: "",
    wish: "",
  };

  const MAX_PARTY = 12;
  const MIN_PARTY = 1;
  const PHONE_MAX = 10;

  /* ---------- DOM refs ---------- */
  const scenes       = root.querySelectorAll(".reserve__scene");
  const dots         = root.querySelectorAll(".reserve__dot");
  const partyTable   = root.querySelector(".party-table");
  const partyCount   = root.querySelector(".party-count");
  const dayPicker    = root.querySelector('[data-picker="day"]');
  const timePicker   = root.querySelector('[data-picker="time"]');
  const flipDay      = root.querySelector('[data-flip="day"]');
  const flipMonth    = root.querySelector('[data-flip="month"]');
  const flipTime     = root.querySelector('[data-flip="time"]');
  const nameInput    = root.querySelector('[data-reserve-field="name"]');
  const phoneDisplay = root.querySelector('[data-reserve-field="phone"]');
  const wishInput    = root.querySelector('[data-reserve-field="wish"]');
  const wishField    = root.querySelector(".wish-field");
  const confirmName  = root.querySelector('[data-confirm="name"]');
  const confirmMeta  = root.querySelector('[data-confirm="meta"]');
  const confirmWish  = root.querySelector('[data-confirm="wish"]');

  /* ==========================================================================
     STEP 1 — Party plates
     ========================================================================== */

  function renderPlates() {
    if (!partyTable) return;

    const existing = partyTable.querySelectorAll(".plate");
    const current  = existing.length;
    const target   = state.party;

    if (target > current) {
      // add plates with pop-in animation
      for (let i = current; i < target; i++) {
        const plate = document.createElement("span");
        plate.className = "plate";
        plate.style.setProperty("--i", i);
        plate.setAttribute("aria-hidden", "true");
        // tiny syrup-drop dot on each plate for playfulness
        plate.innerHTML = '<span class="plate__drop"></span>';
        partyTable.appendChild(plate);
      }
    } else if (target < current) {
      // remove plates with leave animation
      for (let i = current - 1; i >= target; i--) {
        const plate = existing[i];
        plate.classList.add("is-removing");
        plate.addEventListener("animationend", () => plate.remove(), { once: true });
      }
    }

    partyTable.dataset.partyCount = target;
    if (partyCount) partyCount.textContent = target;
  }

  function changeParty(delta) {
    const next = Math.max(MIN_PARTY, Math.min(MAX_PARTY, state.party + delta));
    if (next === state.party) return;
    state.party = next;
    renderPlates();
  }

  root.querySelectorAll("[data-party]").forEach((btn) => {
    btn.addEventListener("click", () => {
      changeParty(btn.dataset.party === "+" ? 1 : -1);
    });
  });

  // also allow clicking an existing plate to add another (cute)
  if (partyTable) {
    partyTable.addEventListener("click", (e) => {
      if (e.target.closest(".plate")) changeParty(1);
    });
  }

  /* ==========================================================================
     STEP 2 — Flip clock + day/time chips
     ========================================================================== */

  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const WEEK   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

  function buildDayChips() {
    if (!dayPicker) return;
    const today = new Date(); // uses user's local "today"
    const frag  = document.createDocumentFragment();

    for (let offset = 0; offset < 14; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);

      const day     = String(d.getDate()).padStart(2, "0");
      const month   = MONTHS[d.getMonth()];
      const weekday = WEEK[d.getDay()];

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip--day";
      chip.dataset.day = day;
      chip.dataset.month = month;
      chip.dataset.weekday = weekday;
      chip.innerHTML = `
        <span class="chip__weekday">${weekday}</span>
        <span class="chip__num">${parseInt(day, 10)}</span>
        <span class="chip__month">${month}</span>
      `;
      if (offset === 0) chip.classList.add("is-active");
      frag.appendChild(chip);
    }

    dayPicker.appendChild(frag);

    // seed state from first chip so flip card matches
    const first = dayPicker.querySelector(".is-active");
    if (first) {
      state.day     = first.dataset.day;
      state.month   = first.dataset.month;
      state.weekday = first.dataset.weekday;
      updateFlip("day",   state.day);
      updateFlip("month", state.month);
    }
  }

  function updateFlip(which, value) {
    const el = which === "day" ? flipDay : which === "month" ? flipMonth : flipTime;
    if (!el) return;
    if (el.textContent === String(value)) return;
    el.textContent = value;
    el.classList.remove("flip-bump");
    // force reflow so the animation restarts
    void el.offsetWidth;
    el.classList.add("flip-bump");
  }

  if (dayPicker) {
    dayPicker.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip--day");
      if (!chip) return;
      dayPicker.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      state.day     = chip.dataset.day;
      state.month   = chip.dataset.month;
      state.weekday = chip.dataset.weekday;
      updateFlip("day",   state.day);
      updateFlip("month", state.month);
    });
  }

  if (timePicker) {
    timePicker.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || !chip.dataset.time) return;
      timePicker.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      state.time = chip.dataset.time;
      updateFlip("time", state.time);
    });
  }

  /* ==========================================================================
     STEP 3 — Name
     ========================================================================== */

  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      state.name = e.target.value;
    });
  }

  /* ==========================================================================
     STEP 4 — Phone keypad
     ========================================================================== */

  function formatPhone(digits) {
    // US-style XXX-XXX-XXXX, padded with underscores for empty slots
    const pad = digits.padEnd(PHONE_MAX, "_").split("");
    return `${pad.slice(0,3).join("")}-${pad.slice(3,6).join("")}-${pad.slice(6,10).join("")}`
      .replace(/_/g, "_"); // keep underscores visible
  }

  function renderPhone() {
    if (!phoneDisplay) return;
    phoneDisplay.textContent = formatPhone(state.phone);
  }

  function pressKey(key, btn) {
    if (key === "del") {
      state.phone = state.phone.slice(0, -1);
    } else if (key === "clear") {
      state.phone = "";
    } else if (/^[0-9]$/.test(key) && state.phone.length < PHONE_MAX) {
      state.phone += key;
    } else {
      return; // ignore out-of-range digit presses
    }

    renderPhone();

    if (btn) {
      btn.classList.remove("is-pressed");
      void btn.offsetWidth;
      btn.classList.add("is-pressed");
      btn.addEventListener("animationend", () => btn.classList.remove("is-pressed"), { once: true });
    }
  }

  root.querySelectorAll("[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => pressKey(btn.dataset.key, btn));
  });

  // keyboard fallback when step 4 is visible
  document.addEventListener("keydown", (e) => {
    if (state.step !== 4) return;
    if (/^[0-9]$/.test(e.key)) {
      const btn = root.querySelector(`[data-key="${e.key}"]`);
      pressKey(e.key, btn);
    } else if (e.key === "Backspace") {
      const btn = root.querySelector('[data-key="del"]');
      pressKey("del", btn);
    }
  });

  renderPhone(); // initial underscores

  /* ==========================================================================
     STEP 5 — Wishes + waiter nod
     ========================================================================== */

  if (wishInput && wishField) {
    let nodTimer = null;
    wishInput.addEventListener("input", (e) => {
      state.wish = e.target.value;
      wishField.classList.add("is-writing");
      clearTimeout(nodTimer);
      nodTimer = setTimeout(() => wishField.classList.remove("is-writing"), 450);
    });
  }

  /* ==========================================================================
     STEP NAVIGATION
     ========================================================================== */

  function validStep(n) {
    if (n === 1) return state.party >= MIN_PARTY;
    if (n === 2) return Boolean(state.time && state.day);
    if (n === 3) return state.name.trim().length >= 1;
    if (n === 4) return state.phone.length === PHONE_MAX;
    if (n === 5) return true;
    return true;
  }

  function showInvalid(n) {
    // briefly shake the current scene on invalid advance
    const scene = root.querySelector(`[data-scene="${n}"]`);
    if (!scene) return;
    scene.classList.remove("is-invalid");
    void scene.offsetWidth;
    scene.classList.add("is-invalid");
    scene.addEventListener("animationend", () => scene.classList.remove("is-invalid"), { once: true });
  }

  function goToStep(next) {
    // support numeric steps and "done"
    const targetKey = String(next);
    const currentScene = root.querySelector(".reserve__scene.is-visible");
    const nextScene    = root.querySelector(`[data-scene="${targetKey}"]`);
    if (!nextScene) return;

    if (currentScene) currentScene.classList.remove("is-visible");
    nextScene.classList.add("is-visible");

    if (targetKey === "done") {
      root.dataset.step = "done";
      dots.forEach((d) => d.classList.add("is-done"));
    } else {
      state.step = Number(targetKey);
      root.dataset.step = targetKey;
      dots.forEach((d) => {
        const dn = Number(d.dataset.step);
        d.classList.toggle("is-active", dn === state.step);
        d.classList.toggle("is-done", dn < state.step);
      });
    }

    // focus the first input in the new scene for keyboard users
    const firstField = nextScene.querySelector("input, textarea, button");
    if (firstField && targetKey !== "done") {
      // small delay so entrance animation doesn't fight focus
      setTimeout(() => firstField.focus({ preventScroll: true }), 250);
    }
  }

  root.querySelectorAll("[data-reserve-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!validStep(state.step)) {
        showInvalid(state.step);
        return;
      }
      if (state.step < 5) goToStep(state.step + 1);
    });
  });

  root.querySelectorAll("[data-reserve-prev]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.step > 1) goToStep(state.step - 1);
    });
  });

  /* ==========================================================================
     SUBMIT / RESTART
     ========================================================================== */

  function formatTime12(t24) {
    const [h, m] = t24.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12    = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  function populateConfirmation() {
    const safeName = state.name.trim() || "Friend";
    const guests   = `${state.party} ${state.party === 1 ? "guest" : "guests"}`;
    const when     = `${state.weekday}, ${parseInt(state.day, 10)} ${state.month} · ${formatTime12(state.time)}`;

    if (confirmName) confirmName.textContent = safeName;
    if (confirmMeta) confirmMeta.textContent = `${guests} · ${when}`;
    if (confirmWish) confirmWish.textContent = state.wish.trim() ? `"${state.wish.trim()}"` : "";
  }

  root.querySelectorAll("[data-reserve-submit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!validStep(5)) {
        showInvalid(5);
        return;
      }
      populateConfirmation();
      goToStep("done");
    });
  });

  root.querySelectorAll("[data-reserve-restart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.party = 2;
      state.name  = "";
      state.phone = "";
      state.wish  = "";

      renderPlates();
      if (nameInput)  nameInput.value  = "";
      if (wishInput)  wishInput.value  = "";
      renderPhone();

      goToStep(1);
    });
  });

  /* ==========================================================================
     PROGRESS DOT JUMP (only backwards, to steps already completed)
     ========================================================================== */
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const n = Number(dot.dataset.step);
      if (n < state.step) goToStep(n);
    });
    dot.style.cursor = "pointer";
  });

  /* ==========================================================================
     INIT
     ========================================================================== */
  renderPlates();
  buildDayChips();
})();
