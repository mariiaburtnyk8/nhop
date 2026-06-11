/* ==========================================================================
   NHOP — Supabase client
   Initialises the shared DB client used by reserve.js and admin.html.
   ========================================================================== */
(function () {
  const SUPABASE_URL = "https://szlhpjempvggsijjvtgm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Wyy9TTJMOjROAbM6rLxw0g_8jFbylh6";
  if (window.supabase && window.supabase.createClient) {
    window._nhopDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("[NHOP] Supabase SDK not loaded — DB features disabled");
  }
})();
