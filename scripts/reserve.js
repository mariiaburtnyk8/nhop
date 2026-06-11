/* ==========================================================================
   NHOP — reserve.js  (game-format wizard)
   4 scenes:
     1) Name      — big handwritten input
     2) Date/Time — day chips → time chips → optional custom time
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
    phone:  "",
    email:  "",
    notes:  ""
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
    // Update mobile text counter
    const stepCurrent = form.closest("section")?.querySelector(".reserve__step-current");
    if (stepCurrent) stepCurrent.textContent = step;
  }

  /* ---------- Navigate ---------- */
  function goTo(target) {
    form.querySelectorAll(".reserve__scene").forEach(s => s.classList.remove("is-visible"));
    const next = form.querySelector(`[data-scene="${target}"]`);
    if (!next) return;
    next.classList.add("is-visible");
    if (target === "done") {
      form.querySelectorAll(".reserve__prog-dot").forEach(d => d.classList.add("is-done"));
      form.querySelectorAll(".reserve__prog-line").forEach(l => {
        l.style.background = "var(--color-burgundy)";
      });
    } else {
      state.step = Number(target);
      updateProgress(state.step);
    }
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
    if (step === 5) {
      state.email = form.querySelector("#r-email")?.value.trim() || "";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email);
    }
    if (step === 6) return true; // notes are optional
    return true;
  }

  /* ============================================================
     SCENE 2 — Day chips
     Always shows exactly 7 consecutive days starting from startDate.
     When startDate is omitted, starts from today.
     ============================================================ */
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];

  const DAY_COUNT = () => window.innerWidth <= 640 ? 4 : 7;

  function buildDayChips(startDate) {
    const row = form.querySelector("[data-picker='day']");
    if (!row) return;
    row.innerHTML = ""; // always rebuild fresh — never append

    const todayMid = new Date(); todayMid.setHours(0,0,0,0);
    const base = startDate ? new Date(startDate) : new Date(todayMid);
    base.setHours(0,0,0,0);
    // Never go before today
    if (base < todayMid) base.setTime(todayMid.getTime());

    for (let i = 0; i < DAY_COUNT(); i++) {
      const d   = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

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
        // Reveal time row and custom time input
        const timeRow = form.querySelector("[data-picker='time']");
        if (timeRow) timeRow.style.display = "flex";
        const customWrap = form.querySelector(".custom-time-wrap");
        if (customWrap) customWrap.style.display = "flex";
        // Reset time selection
        state.time = "";
        timeRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
        const customInput = form.querySelector("#customTime");
        if (customInput) customInput.value = "";
      });
      row.appendChild(btn);
    }
  }

  /* ============================================================
     SCENE 2 — Custom time input (below time chips)
     Lets guests enter any time (e.g. 2:30 PM) not in the chip list.
     step="1800" = 30-minute increments in native mobile picker.
     ============================================================ */
  function buildCustomTimeInput() {
    const datePicker = form.querySelector(".date-picker");
    if (!datePicker || datePicker.querySelector("#customTime")) return;

    const wrap = document.createElement("div");
    wrap.className = "custom-time-wrap";
    wrap.innerHTML = `
      <span class="custom-time-label">or enter a time</span>
      <input type="time" id="customTime" class="custom-time-input"
             min="08:00" max="22:00" step="1800" />
    `;
    datePicker.appendChild(wrap);

    const input = wrap.querySelector("#customTime");
    input.addEventListener("change", () => {
      if (!input.value) return;
      state.time = input.value;
      // Deselect all time chips
      form.querySelectorAll("[data-picker='time'] .chip")
          .forEach(c => c.classList.remove("is-active"));
    });
  }

  /* Time chip clicks — also clear the custom input */
  form.addEventListener("click", e => {
    const chip = e.target.closest("[data-time]");
    if (!chip) return;
    form.querySelectorAll("[data-picker='time'] .chip")
        .forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    state.time = chip.dataset.time;
    const customInput = form.querySelector("#customTime");
    if (customInput) customInput.value = "";
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

    // Restore span if an inline input is currently active (click-to-edit)
    const countEl = form.querySelector("[data-party-count]");
    if (countEl) {
      if (countEl.tagName === "INPUT") {
        const span = document.createElement("span");
        span.className = "party-count";
        span.setAttribute("data-party-count", "");
        span.textContent = state.guests;
        countEl.replaceWith(span);
      } else {
        countEl.textContent = state.guests;
      }
    }
  }

  form.addEventListener("click", e => {
    const btn = e.target.closest("[data-guests-change]");
    if (!btn) return;
    const delta = parseInt(btn.dataset.guestsChange, 10);
    state.guests = Math.max(1, Math.min(12, state.guests + delta));
    buildPartyTable();
  });

  /* ── Guest count: click the number to type a custom value ── */
  form.addEventListener("click", e => {
    const countEl = e.target.closest("[data-party-count]");
    if (!countEl || countEl.tagName === "INPUT") return;

    // Swap span → input
    const input = document.createElement("input");
    input.type      = "number";
    input.min       = "1";
    input.max       = "99";
    input.value     = state.guests;
    input.className = "party-count-input";
    input.setAttribute("data-party-count", "");
    countEl.replaceWith(input);
    input.select();

    function commit() {
      const val = parseInt(input.value, 10);
      state.guests = isNaN(val) ? state.guests : Math.max(1, Math.min(99, val));
      buildPartyTable(); // rebuilds display span + pancakes
    }

    input.addEventListener("blur",    commit, { once: true });
    input.addEventListener("keydown", ev => {
      if (ev.key === "Enter")  { input.blur(); }
      if (ev.key === "Escape") { input.value = state.guests; input.blur(); }
    });
  });

  /* ============================================================
     SCENE 4 — Phone keypad + direct typing
     ============================================================ */

  /* Format state.phone digits into "555–555–5555" display string */
  function formatPhone(d) {
    if (d.length === 0)      return "";
    if (d.length <= 3)       return d;
    if (d.length <= 6)       return d.slice(0,3) + "–" + d.slice(3);
    return d.slice(0,3) + "–" + d.slice(3,6) + "–" + d.slice(6);
  }

  function updatePhoneDisplay() {
    const display = form.querySelector("[data-phone-display]");
    if (!display) return;
    const formatted = formatPhone(state.phone);
    if (display.tagName === "INPUT") {
      // Only reformat when the field is not focused (don't stomp user's cursor)
      if (document.activeElement !== display) {
        display.value = formatted;
        display.placeholder = "_ _ _–_ _ _ _";
      }
    } else {
      display.textContent = formatted || "_ _ _–_ _ _ _";
    }
  }

  /* Replace the static [data-phone-display] span with a real <input> so users
     can type directly instead of (or alongside) tapping the keypad. */
  function setupPhoneInput() {
    const span = form.querySelector("[data-phone-display]");
    if (!span || span.tagName === "INPUT") return;

    const input = document.createElement("input");
    input.type         = "tel";
    input.className    = "phone-number phone-number--editable";
    input.placeholder  = "_ _ _–_ _ _ _";
    input.maxLength    = 13; // "555–555–5555" = 12 chars + 1 slack
    input.autocomplete = "tel";
    input.setAttribute("data-phone-display", "");
    span.replaceWith(input);

    input.addEventListener("input", () => {
      // Strip everything except digits and clamp to 10
      const digits = input.value.replace(/\D/g, "").slice(0, 10);
      state.phone = digits;
      // Reformat value, preserve cursor position at end
      const formatted = formatPhone(digits);
      input.value = formatted;
    });

    // On blur, ensure the display is in sync
    input.addEventListener("blur", updatePhoneDisplay);

    // Make the whole phone-display div a click target that focuses the input
    const wrap = input.closest(".phone-display");
    if (wrap) wrap.style.cursor = "text";
  }

  /* Keypad clicks — update state AND the direct input */
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
      Object.assign(state, { step:1, name:"", date:"", time:"", guests:2, phone:"", email:"", notes:"" });
      const nameIn = form.querySelector("#r-name");
      if (nameIn) nameIn.value = "";
      const emailIn = form.querySelector("#r-email");
      if (emailIn) emailIn.value = "";
      const notesIn = form.querySelector("#r-notes");
      if (notesIn) notesIn.value = "";
      form.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      const timeRow = form.querySelector("[data-picker='time']");
      if (timeRow) timeRow.style.display = "none";
      const customWrap = form.querySelector(".custom-time-wrap");
      if (customWrap) customWrap.style.display = "none";
      const customInput = form.querySelector("#customTime");
      if (customInput) customInput.value = "";
      updatePhoneDisplay();
      buildPartyTable();
      goTo(1);
    }
  });

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    // Notes are optional — no validation needed
    state.notes = form.querySelector("#r-notes")?.value.trim() || "";

    // Disable submit button while saving
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Booking…"; }

    // Save to Supabase
    if (window._nhopDB) {
      const { error } = await window._nhopDB
        .from("reservations")
        .insert({
          name:   state.name,
          date:   state.date,
          time:   state.time,
          guests: state.guests,
          phone:  state.phone,
          email:  state.email,
          notes:  state.notes,
          status: "pending"
        });
      if (error) console.error("[NHOP] reservation save failed:", error.message);
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Book my table →"; }

    const [h, m] = state.time.split(":").map(Number);
    const ampm   = h >= 12 ? "PM" : "AM";
    const h12    = ((h + 11) % 12) + 1;
    const timeStr = `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
    const dateStr = new Date(state.date + "T12:00:00")
      .toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

    const nameEl  = form.querySelector("[data-confirm='name']");
    const metaEl  = form.querySelector("[data-confirm='meta']");
    const emailEl = form.querySelector("[data-confirm='email']");
    if (nameEl)  nameEl.textContent  = state.name;
    if (metaEl)  metaEl.textContent  =
      `${state.guests} ${state.guests === 1 ? "guest" : "guests"} · ${dateStr} at ${timeStr}`;
    if (emailEl) emailEl.textContent = state.email;

    goTo("done");
  });

  /* ============================================================
     SCENE 2 — Calendar picker: rebuilds the 7-day row
     centred ±3 days around the selected date.
     ============================================================ */
  const calPicker = form.querySelector("#calPicker");
  if (calPicker) {
    const _t = new Date();
    calPicker.min = _t.getFullYear() + '-' +
      String(_t.getMonth() + 1).padStart(2, '0') + '-' +
      String(_t.getDate()).padStart(2, '0');

    /* Open the native date picker.
       - Touch (iOS/Android): the input sits on top of the button with
         pointer-events:auto, so a physical tap opens the native picker by
         default — the most reliable path on iOS, where showPicker() on a
         hidden input is flaky. Don't also call showPicker() there or it can
         double-fire.
       - Desktop: a plain click on an opacity:0 date input won't open the
         picker, so force it with showPicker(). Listen on BOTH the input and
         the wrapping button so any click on "Other dates" works regardless of
         which element the gesture lands on (the input nested in a <button> is
         invalid HTML that some engines hit-test inconsistently). */
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const openPicker = () => {
      if (isCoarse) return; // touch: native tap already handles it
      try { calPicker.showPicker(); } catch (_) { /* unsupported — native click opens it */ }
    };
    calPicker.addEventListener("click", openPicker);
    const calBtn = calPicker.closest(".cal-btn-wrap");
    if (calBtn) calBtn.addEventListener("click", openPicker);

    calPicker.addEventListener("change", () => {
      const iso = calPicker.value;
      if (!iso) return;

      // Compute window start: centre selected date in the visible window
      const selected  = new Date(iso + "T12:00:00");
      const half      = Math.floor(DAY_COUNT() / 2); // 2 on mobile, 3 on desktop
      const start     = new Date(selected);
      start.setDate(selected.getDate() - half);

      // Rebuild the 7-day row around the selected date
      buildDayChips(start);

      // Activate the selected date chip (it is guaranteed to exist after rebuild)
      const dayRow = form.querySelector("[data-picker='day']");
      const chip   = dayRow?.querySelector(`[data-date="${iso}"]`);
      dayRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      if (chip) {
        chip.classList.add("is-active");
        state.date = iso;
      }

      // Reveal time row + custom input, reset time selection
      const timeRow = form.querySelector("[data-picker='time']");
      if (timeRow) timeRow.style.display = "flex";
      const customWrap = form.querySelector(".custom-time-wrap");
      if (customWrap) customWrap.style.display = "flex";
      state.time = "";
      timeRow?.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      const customInput = form.querySelector("#customTime");
      if (customInput) customInput.value = "";

      calPicker.value = ""; // reset so same date can be re-picked
    });
  }

  /* ---------- Init ---------- */
  buildDayChips();         // 5 or 7 days from today depending on screen width
  buildCustomTimeInput();  // inject custom-time row into .date-picker
  setupPhoneInput();       // make phone display directly editable
  buildPartyTable();
  updatePhoneDisplay();
  goTo(1);

  // Rebuild day chips when screen rotates / resizes (portrait ↔ landscape)
  let _lastDayCount = DAY_COUNT();
  window.addEventListener("resize", () => {
    const count = DAY_COUNT();
    if (count !== _lastDayCount) {
      _lastDayCount = count;
      buildDayChips(); // rebuild with new count; preserves active selection if visible
    }
  }, { passive: true });

  // Mobile keyboard: scroll form into view only on the first keyboard open per
  // step, and only if the form-side top is actually below the visible viewport.
  // Avoids the aggressive jump that fired on every visualViewport resize event.
  if (window.visualViewport) {
    const formSide = form.closest(".reserve__form-side");
    let keyboardOpen = false;

    window.visualViewport.addEventListener("resize", () => {
      const vvHeight = window.visualViewport.height;
      const nowOpen  = vvHeight < window.innerHeight * 0.75;

      if (nowOpen && !keyboardOpen && formSide && form.contains(document.activeElement)) {
        keyboardOpen = true;
        // Only scroll if the form-side top is not already near the viewport top
        setTimeout(() => {
          const formTop = formSide.getBoundingClientRect().top;
          if (formTop > 48) {
            // Form is below the safe zone — scroll it into view gently
            const top = formSide.getBoundingClientRect().top + window.scrollY - 16;
            window.scrollTo({ top, behavior: "smooth" });
          }
        }, 120);
      } else if (!nowOpen) {
        keyboardOpen = false;
      }
    }, { passive: true });
  }

})();
