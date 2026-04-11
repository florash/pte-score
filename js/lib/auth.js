const AppAuth = {
  user: null,
  session: null,
  ready: false,
  listeners: [],

  async init() {
    const client = SupabaseService.getClient();
    if (!client) {
      this.ready = true;
      this.notify();
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (!error) {
      this.session = data.session || null;
      this.user = data.session?.user || null;
    }

    client.auth.onAuthStateChange((_event, session) => {
      this.session = session || null;
      this.user = session?.user || null;
      this.notify();
      AuthUI.renderTriggers();
      if (typeof refreshCurrentPage === 'function') refreshCurrentPage();
    });

    this.ready = true;
    this.notify();
    return this.user;
  },

  isLoggedIn() {
    return !!this.user;
  },

  onChange(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.listeners.forEach(listener => {
      try { listener({ user: this.user, session: this.session, ready: this.ready }); } catch (e) {}
    });
  },

  async signUp(email, password) {
    if (!SupabaseService.hasConfig()) throw new Error(SupabaseService.getMissingMessage());
    const client = SupabaseService.getClient();
    if (!client) throw new Error(SupabaseService.getLibraryMessage());
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (!SupabaseService.hasConfig()) throw new Error(SupabaseService.getMissingMessage());
    const client = SupabaseService.getClient();
    if (!client) throw new Error(SupabaseService.getLibraryMessage());
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = SupabaseService.getClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async signInWithGoogle() {
    if (!SupabaseService.hasConfig()) throw new Error(SupabaseService.getMissingMessage());
    const client = SupabaseService.getClient();
    if (!client) throw new Error(SupabaseService.getLibraryMessage());
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  },
};

const AuthUI = {
  ensureModal() {
    if ($('#auth-modal-overlay')) return;
    const html = `
<div id="auth-modal-overlay" class="auth-modal-overlay hidden" onclick="AuthUI.handleOverlayClick(event)">
  <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
    <button class="auth-modal-close" type="button" onclick="AuthUI.close()" aria-label="Close">×</button>
    <div class="auth-modal-header">
      <div class="eyebrow">Account</div>
      <h2 id="auth-modal-title">Welcome back</h2>
      <p id="auth-modal-copy">Log in or create an account to save your progress.</p>
    </div>
    <button class="btn google-login-btn" type="button" onclick="AuthUI.signInWithGoogle()">
      <svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continue with Google
    </button>
    <div class="auth-divider"><span>or</span></div>
    <div class="auth-tabs">
      <button id="auth-tab-login" class="auth-tab active" type="button" onclick="AuthUI.switchTab('login')">Log in</button>
      <button id="auth-tab-signup" class="auth-tab" type="button" onclick="AuthUI.switchTab('signup')">Sign up</button>
    </div>
    <form id="auth-form" class="auth-form" onsubmit="AuthUI.submit(event)">
      <label class="auth-label" for="auth-email">Email</label>
      <input id="auth-email" class="auth-input" type="email" autocomplete="email" required>
      <label class="auth-label" for="auth-password">Password</label>
      <input id="auth-password" class="auth-input" type="password" autocomplete="current-password" required minlength="6">
      <div id="auth-error" class="auth-message error hidden"></div>
      <div id="auth-success" class="auth-message success hidden"></div>
      <button id="auth-submit" class="btn btn-primary auth-submit" type="submit">Log in</button>
    </form>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  tab: 'login',

  open(tab = 'login') {
    this.ensureModal();
    this.switchTab(tab);
    $('#auth-modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => $('#auth-email')?.focus(), 30);
  },

  close() {
    const overlay = $('#auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this.resetMessages();
  },

  handleOverlayClick(event) {
    if (event.target.id === 'auth-modal-overlay') this.close();
  },

  switchTab(tab) {
    this.tab = tab === 'signup' ? 'signup' : 'login';
    $('#auth-tab-login')?.classList.toggle('active', this.tab === 'login');
    $('#auth-tab-signup')?.classList.toggle('active', this.tab === 'signup');
    $('#auth-modal-title').textContent = this.tab === 'login' ? 'Welcome back' : 'Create your account';
    $('#auth-modal-copy').textContent = this.tab === 'login'
      ? 'Log in to sync your practice progress.'
      : 'Sign up with email and password to save progress across sessions.';
    $('#auth-submit').textContent = this.tab === 'login' ? 'Log in' : 'Create account';
    $('#auth-password')?.setAttribute('autocomplete', this.tab === 'login' ? 'current-password' : 'new-password');
    this.resetMessages();
  },

  setLoading(isLoading) {
    const btn = $('#auth-submit');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading
      ? (this.tab === 'login' ? 'Logging in...' : 'Creating account...')
      : (this.tab === 'login' ? 'Log in' : 'Create account');
  },

  resetMessages() {
    ['auth-error', 'auth-success'].forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.textContent = '';
      el.classList.add('hidden');
    });
  },

  setError(message) {
    const el = $('#auth-error');
    if (!el) return;
    this.resetMessages();
    el.textContent = message;
    el.classList.remove('hidden');
  },

  setSuccess(message) {
    const el = $('#auth-success');
    if (!el) return;
    this.resetMessages();
    el.textContent = message;
    el.classList.remove('hidden');
  },

  async signInWithGoogle() {
    try {
      await AppAuth.signInWithGoogle();
      // page will redirect to Google — no need to close modal
    } catch (error) {
      this.ensureModal();
      this.setError(error.message || 'Google login failed. Please try again.');
    }
  },

  async submit(event) {
    event.preventDefault();
    this.resetMessages();

    const email = ($('#auth-email')?.value || '').trim();
    const password = ($('#auth-password')?.value || '').trim();
    if (!email || !password) {
      this.setError('Please enter both email and password.');
      return;
    }

    this.setLoading(true);
    try {
      if (this.tab === 'login') {
        await AppAuth.signIn(email, password);
        this.close();
      } else {
        const result = await AppAuth.signUp(email, password);
        if (result.user && !result.session) {
          this.setSuccess('Account created. Check your email to confirm your account, then log in.');
        } else {
          this.setSuccess('Account created successfully. You are now logged in.');
          this.close();
        }
      }
    } catch (error) {
      this.setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      this.setLoading(false);
    }
  },

  renderTriggers() {
    const slots = ['auth-slot-desktop', 'auth-slot-mobile'];
    slots.forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      if (AppAuth.isLoggedIn()) {
        const email = AppAuth.user.email || 'Account';
        const safeEmail = typeof Scorer !== 'undefined' ? Scorer.escapeHtml(email) : email;
        const initial = email.charAt(0).toUpperCase();
        el.innerHTML = `
<div class="auth-user-chip">
  <button class="auth-avatar" onclick="AppAuth.handleLogout()" title="${safeEmail} — 点击退出登录">${initial}</button>
</div>`;
      } else {
        el.innerHTML = `<button class="btn btn-outline auth-login-btn" type="button" onclick="AuthUI.open('login')">Log in</button>`;
      }
    });
  },
};

AppAuth.handleLogout = async function() {
  try {
    await AppAuth.signOut();
    showToast('Logged out successfully.');
  } catch (error) {
    showToast(error.message || 'Logout failed.');
  }
};

window.AppAuth = AppAuth;
window.AuthUI = AuthUI;
