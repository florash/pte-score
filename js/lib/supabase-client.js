const SupabaseService = {
  client: null,
  config: window.SUPABASE_CONFIG || {},

  hasConfig() {
    return !!(this.config.url && this.config.anonKey);
  },

  getMissingMessage() {
    return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in js/config/supabase-config.js.';
  },

  getLibraryMessage() {
    return 'Supabase client library did not load. Check the @supabase/supabase-js script in index.html.';
  },

  init() {
    if (this.client) return this.client;
    if (!window.supabase) return null;
    if (!this.hasConfig()) return null;
    this.client = window.supabase.createClient(this.config.url, this.config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return this.client;
  },

  getClient() {
    return this.client || this.init();
  },
};

window.SupabaseService = SupabaseService;
