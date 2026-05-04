/* ==========================================================================
   NHOP — reserve.js  (game-format wizard)
   4 scenes:
     1) Name      — big handwritten input
     2) Date/Time — day chips → time chips
     3) Guests    — party-table with plates + +/− buttons
     4) Phone     — circular keypad
     → Confirmation
   ========================================================================== */

(() => {
  const form = document.getElementById("reserveForm");
  if (!form) return;

  /* ---------- State ---------- */
  const state = {
    step:   1,
    name:   "",
    date:   "",   // "YYYY-MM-DD"
    time:   "",   // "HH:MM"
    guests: 2,
    phone:  ""
  };

  /* ---------- Progress bar ---------- */
  function updateProgress(step) {
    const dots  = form.querySelectorAll(".reserve__prog-dot");
    const lines = form.querySelectorAll(".reserve__prog-line");
    dots.forEach(d => {
      const n = Number(d.dataset.step);
      d.classList.toggle("is-active", n === step);
      d.classList.toggle("is-done",   n < step);
    });
    lines.forEach((l, i) => {
      l.style.background = i < step - 1
        ? "var(--color-burgundy)"
        : "";
    });
  }

  /* ---------- Navigate ---------- */
  function goTo(target) {
    form.querySelectorAll(".reserve__scene").forEach(s => s.classList.remove("is-visible"));
    const next = form.querySelector(`[data-scene="${target}"]`);
    if (!next) return;
    next.classList.add("is-visible");
    if (target === "done") {
      // All dots filled on completion
      form.querySelectorAll(".reserve__prog-dot").forEach(d => d.classList.add("is-done"));
      form.querySelectorAll(".reserve__prog-line").forEach(l => {
        l.style.background = "var(--color-burgundy)";
      });
    } else {
      state.step = Number(target);
      updateProgress(state.step);
    }
    // auto-focus first focusable el
    setTimeout(() => {
      const el = next.querySelector("input, button:not([data-prev]):not([data-next])");
      if (el) el.focus({ preventScroll: true });
    }, 200);
  }

  /* ---------- Shake ---------- */
  function shake(sceneEl) {
    sceneEl.classList.remove("is-invalid");
    void sceneEl.offsetWidth;
    sceneEl.classList.add("is-invalid");
    sceneEl.addEventListener("animationend",
      () => sceneEl.classList.remove("is-invalid"), { once: true });
  }

  /* ---------- Validate ---------- */
  function validate(step) {
    if (step === 1) {
      state.name = form.querySelector("#r-name")?.value.trim() || "";
      return state.name.length >= 1;
    }
    if (step === 2) return Boolean(state.date && state.time);
    if (step === 3) return state.guests >= 1;
    if (step === 4) return state.phone.length >= 7;
    return true;
  }

  /* ============================================================
     SCENE 2 — Day chips (built dynamically for next 7 days)
     ============================================================ */
  function buildDayChips() {
    const row = form.querySelector("[data-picker='day']");
    if (!row || row.children.length) return;

    const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"];
    const today  = new Date();

    for (let i = 0; i < 6; i++) {
      const d   = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split("T")[0];

      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "chip chip--day";
      btn.dataset.date = iso;
      btn.innerHTML = `
        <span class="chip__weekday">${DAYS[d.getDay()]}</span>
        <span class="chip__num">${d.getDate()}</span>
        <span class="chip__month">${MONTHS[d.getMonth()]}</span>
      `;
      btn.addEventListener("click", () => {
        row.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.date = iso;
        // Reveal time row & reset selection
        const timeRow = form.querySelector("[data-picker='time']");
        if (timeRow) { timeRow.style.display = "flex"; }
        state.time = "";
        timeRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      });
      row.appendChild(btn);
    }
  }

  /* Time chip clicks */
  form.addEventListener("click", e => {
    const chip = e.target.closest("[data-time]");
    if (!chip) return;
    form.querySelectorAll("[data-picker='time'] .chip")
        .forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    state.time = chip.dataset.time;
  });

  /* ============================================================
     SCENE 3 — Party table
     ============================================================ */
  const PANCAKE_IMG = "https://res.cloudinary.com/dksohsy0i/image/upload/v1777470487/single_pancake_idjjli.png";

  function buildPartyTable() {
    const table = form.querySelector("[data-party-table]");
    if (!table) return;
    table.innerHTML = "";

    const count = Math.min(state.guests, 10);
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.className = "plate";
      img.src = PANCAKE_IMG;
      img.alt = "";
      img.loading = "lazy";
      table.appendChild(img);
    }

    const countEl = form.querySelector("[data-party-count]");
    if (countEl) countEl.textContent = state.guests;
  }

  form.addEventListener("click", e => {
    const btn = e.target.closest("[data-guests-change]");
    if (!btn) return;
    const delta = parseInt(btn.dataset.guestsChange, 10);
    state.guests = Math.max(1, Math.min(12, state.guests + delta));
    buildPartyTable();
  });

  /* ============================================================
     SCENE 4 — Phone keypad
     ============================================================ */
  function updatePhoneDisplay() {
    const display = form.querySelector("[data-phone-display]");
    if (!display) return;
    const d = state.phone;
    let out = "";
    if (d.length === 0)      out = "_ _ _–_ _ _ _";
    else if (d.length <= 3)  out = d + " _ ".repeat(3 - d.length).trim();
    else if (d.length <= 6)  out = d.slice(0,3) + "–" + d.slice(3);
    else                     out = d.slice(0,3) + "–" + d.slice(3,6) + "–" + d.slice(6);
    display.textContent = out;
  }

  form.addEventListener("click", e => {
    const key = e.target.closest("[data-key]");
    if (!key) return;
    const k = key.dataset.key;

    if      (k === "back")  state.phone = state.phone.slice(0, -1);
    else if (k === "clear") state.phone = "";
    else if (/^\d$/.test(k) && state.phone.length < 10) {
      state.phone += k;
      key.classList.add("is-pressed");
      key.addEventListener("animationend",
        () => key.classList.remove("is-pressed"), { once: true });
    }
    updatePhoneDisplay();
  });

  /* ============================================================
     Navigation — Next / Back / Submit / Restart
     ============================================================ */
  form.addEventListener("click", e => {
    if (e.target.closest("[data-next]")) {
      const scene = form.querySelector(".reserve__scene.is-visible");
      if (!validate(state.step)) { shake(scene); return; }
      if (state.step === 2) buildPartyTable();
      goTo(state.step + 1);
    }

    if (e.target.closest("[data-prev]")) {
      if (state.step > 1) goTo(state.step - 1);
    }

    if (e.target.closest("[data-restart]")) {
      Object.assign(state, { step:1, name:"", date:"", time:"", guests:2, phone:"" });
      const nameIn = form.querySelector("#r-name");
      if (nameIn) nameIn.value = "";
      form.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      const timeRow = form.querySelector("[data-picker='time']");
      if (timeRow) timeRow.style.display = "none";
      updatePhoneDisplay();
      buildPartyTable();
      goTo(1);
    }
  });

  /* ---------- Submit ---------- */
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate(4)) {
      shake(form.querySelector(".reserve__scene.is-visible"));
      return;
    }
    const [h, m] = state.time.split(":").map(Number);
    const ampm   = h >= 12 ? "PM" : "AM";
    const h12    = ((h + 11) % 12) + 1;
    const timeStr = `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
    const dateStr = new Date(state.date + "T12:00:00")
      .toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

    const nameEl = form.querySelector("[data-confirm='name']");
    const metaEl = form.querySelector("[data-confirm='meta']");
    if (nameEl) nameEl.textContent = state.name;
    if (metaEl) metaEl.textContent =
      `${state.guests} ${state.guests === 1 ? "guest" : "guests"} · ${dateStr} at ${timeStr}`;

    goTo("done");
  });

  /* ============================================================
     SCENE 2 — Calendar picker (OS native) for custom date
     ============================================================ */
  const calPicker = form.querySelector("#calPicker");
  if (calPicker) {
    // Set min to today
    calPicker.min = new Date().toISOString().split("T")[0];

    calPicker.addEventListener("change", () => {
      const iso = calPicker.value;
      if (!iso) return;

      const dayRow  = form.querySelector("[data-picker='day']");
      const timeRow = form.querySelector("[data-picker='time']");

      // Deactivate all existing chips
      dayRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));

      // Re-use existing chip for this date or create a new one
      let chip = dayRow?.querySelector(`[data-date="${iso}"]`);
      if (!chip && dayRow) {
        const d = new Date(iso + "T12:00:00");
        const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];
        chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip chip--day";
        chip.dataset.date = iso;
        chip.innerHTML = `
          <span class="chip__weekday">${DAYS[d.getDay()]}</span>
          <span class="chip__num">${d.getDate()}</span>
          <span class="chip__month">${MONTHS[d.getMonth()]}</span>
        `;
        chip.addEventListener("click", () => {
          dayRow.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
          chip.classList.add("is-active");
          state.date = iso;
          if (timeRow) { timeRow.style.display = "flex"; }
          state.time = "";
          timeRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
        });
        dayRow.appendChild(chip);
      }

      chip?.classList.add("is-active");
      state.date = iso;

      // Show time row & reset selection
      if (timeRow) { timeRow.style.display = "flex"; }
      state.time = "";
      timeRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));

      // Reset so the same date can be re-picked next time
      calPicker.value = "";
    });
  }

  /* ---------- Init ---------- */
  buildDayChips();
  buildPartyTable();
  updatePhoneDisplay();
  goTo(1);

})();
