const AppAuth = {
  user: null,
  session: null,
  ready: false,
  listeners: [],
  authMessageKey: '',

  consumePendingMessage() {
    const key = this.authMessageKey || sessionStorage.getItem('pte_auth_message') || '';
    this.authMessageKey = '';
    if (key) sessionStorage.removeItem('pte_auth_message');
    return key;
  },

  setPendingMessage(messageKey = '') {
    this.authMessageKey = messageKey || '';
    if (messageKey) {
      sessionStorage.setItem('pte_auth_message', messageKey);
    } else {
      sessionStorage.removeItem('pte_auth_message');
    }
  },

  clearAuthParamsFromUrl() {
    const url = new URL(window.location.href);
    ['code', 'token_hash', 'type', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type'].forEach(key => {
      url.searchParams.delete(key);
    });
    if (url.hash && /(access_token|refresh_token|type|error)=/i.test(url.hash)) {
      url.hash = '';
    }
    const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
    window.history.replaceState({}, document.title, cleanUrl);
  },

  async handleEmailConfirmation() {
    const client = SupabaseService.getClient();
    if (!client) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const hasHashTokens = typeof window.location.hash === 'string' && /(access_token|refresh_token)=/i.test(window.location.hash);

    if (!code && !(tokenHash && type) && !hasHashTokens) return;

    try {
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        this.setPendingMessage('auth_confirmed_success');
      } else if (tokenHash && type) {
        const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;
        this.setPendingMessage('auth_confirmed_success');
      } else if (hasHashTokens) {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (data?.session) this.setPendingMessage('auth_confirmed_success');
      }
    } catch (error) {
      console.error('[Auth] Failed to confirm email sign-up.', error);
      this.setPendingMessage('auth_confirmed_error');
    } finally {
      this.clearAuthParamsFromUrl();
    }
  },

  async init() {
    const client = SupabaseService.getClient();
    if (!client) {
      this.ready = true;
      this.notify();
      return null;
    }

    await this.handleEmailConfirmation();

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
    const messageKey = this.consumePendingMessage();
    if (messageKey && typeof showToast === 'function') {
      showToast(t(messageKey));
    }
    return this.user;
  },

  isLoggedIn() {
    return !!this.user;
  },

  async getAccessToken() {
    if (this.session?.access_token) return this.session.access_token;
    const client = SupabaseService.getClient();
    if (!client) return '';
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    this.session = data.session || null;
    this.user = data.session?.user || null;
    return this.session?.access_token || '';
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
    const emailRedirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
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
    if ($('#auth-modal-overlay')) { this.refreshModalText(); return; }
    const html = `
<div id="auth-modal-overlay" class="auth-modal-overlay hidden" onclick="AuthUI.handleOverlayClick(event)">
  <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
    <button class="auth-modal-close" type="button" onclick="AuthUI.close()" aria-label="Close">×</button>
    <div class="auth-modal-header">
      <div class="eyebrow" id="auth-eyebrow">${t('auth_modal_eyebrow')}</div>
      <h2 id="auth-modal-title">${t('auth_modal_title_login')}</h2>
      <p id="auth-modal-copy">${t('auth_modal_copy_login')}</p>
    </div>
    <button class="btn google-login-btn" type="button" onclick="AuthUI.signInWithGoogle()">
      <svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      <span id="auth-google-text">${t('auth_google_btn')}</span>
    </button>
    <div class="auth-divider"><span id="auth-divider-text">${t('auth_divider')}</span></div>
    <div class="auth-tabs">
      <button id="auth-tab-login" class="auth-tab active" type="button" onclick="AuthUI.switchTab('login')">${t('auth_tab_login')}</button>
      <button id="auth-tab-signup" class="auth-tab" type="button" onclick="AuthUI.switchTab('signup')">${t('auth_tab_signup')}</button>
    </div>
    <form id="auth-form" class="auth-form" onsubmit="AuthUI.submit(event)">
      <label class="auth-label" for="auth-email" id="auth-email-label">${t('auth_email_label')}</label>
      <input id="auth-email" class="auth-input" type="email" autocomplete="email" required>
      <label class="auth-label" for="auth-password" id="auth-password-label">${t('auth_password_label')}</label>
      <input id="auth-password" class="auth-input" type="password" autocomplete="current-password" required minlength="6">
      <div id="auth-error" class="auth-message error hidden"></div>
      <div id="auth-success" class="auth-message success hidden"></div>
      <button id="auth-submit" class="btn btn-primary auth-submit" type="submit">${t('auth_btn_login')}</button>
    </form>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  refreshModalText() {
    const modal = $('#auth-modal-overlay');
    if (!modal) return;
    const eyebrow = $('#auth-eyebrow');
    if (eyebrow) eyebrow.textContent = t('auth_modal_eyebrow');
    const googleText = $('#auth-google-text');
    if (googleText) googleText.textContent = t('auth_google_btn');
    const dividerText = $('#auth-divider-text');
    if (dividerText) dividerText.textContent = t('auth_divider');
    const tabLogin = $('#auth-tab-login');
    if (tabLogin) tabLogin.textContent = t('auth_tab_login');
    const tabSignup = $('#auth-tab-signup');
    if (tabSignup) tabSignup.textContent = t('auth_tab_signup');
    const emailLabel = $('#auth-email-label');
    if (emailLabel) emailLabel.textContent = t('auth_email_label');
    const pwLabel = $('#auth-password-label');
    if (pwLabel) pwLabel.textContent = t('auth_password_label');
    this.switchTab(this.tab);
  },

  tab: 'login',

  open(tab = 'login') {
    this.ensureModal();
    this.switchTab(tab);
    $('#auth-modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    const messageKey = AppAuth.consumePendingMessage();
    if (messageKey) this.setSuccess(t(messageKey));
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
    $('#auth-modal-title').textContent = this.tab === 'login' ? t('auth_modal_title_login') : t('auth_modal_title_signup');
    $('#auth-modal-copy').textContent = this.tab === 'login' ? t('auth_modal_copy_login') : t('auth_modal_copy_signup');
    $('#auth-submit').textContent = this.tab === 'login' ? t('auth_btn_login') : t('auth_btn_signup');
    $('#auth-password')?.setAttribute('autocomplete', this.tab === 'login' ? 'current-password' : 'new-password');
    this.resetMessages();
  },

  setLoading(isLoading) {
    const btn = $('#auth-submit');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading
      ? (this.tab === 'login' ? t('auth_btn_logging_in') : t('auth_btn_creating'))
      : (this.tab === 'login' ? t('auth_btn_login') : t('auth_btn_signup'));
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
        AppAuth.setPendingMessage('');
        if (result.user && !result.session) {
          this.setSuccess(t('auth_success_verify'));
        } else {
          this.setSuccess(t('auth_success_created'));
          this.close();
        }
      }
    } catch (error) {
      this.setError(error.message || t('auth_error_fields'));
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
        if (id === 'auth-slot-mobile') {
          el.innerHTML = `
<div class="auth-user-chip auth-user-chip-mobile">
  <button class="auth-avatar" type="button" onclick="AppAuth.toggleMobileMenu(event)" title="${safeEmail} — ${t('auth_avatar_title')}">${initial}</button>
  <div class="auth-dropdown-menu" onclick="event.stopPropagation()">
    <button class="auth-dropdown-item" type="button" onclick="AppAuth.openProfile()">${t('nav_account_settings')}</button>
    <div class="auth-dropdown-lang">
      <button class="auth-dropdown-mini ${getAppLang() === 'en' ? 'active' : ''}" type="button" onclick="AppAuth.setMenuLang('en')">EN</button>
      <button class="auth-dropdown-mini ${getAppLang() === 'zh' ? 'active' : ''}" type="button" onclick="AppAuth.setMenuLang('zh')">中文</button>
    </div>
    <button class="auth-dropdown-item" type="button" onclick="AppAuth.requestLogout()">${t('btn_logout')}</button>
  </div>
</div>`;
        } else {
          el.innerHTML = `
<div class="auth-user-chip">
  <button class="auth-avatar" onclick="AppAuth.requestLogout()" title="${safeEmail} — ${t('auth_avatar_title')}">${initial}</button>
</div>`;
        }
      } else {
        if (id === 'auth-slot-mobile') {
          el.innerHTML = `
<div class="auth-user-chip auth-user-chip-mobile">
  <button class="auth-avatar auth-avatar-guest" type="button" onclick="AppAuth.toggleMobileMenu(event)" title="${t('auth_login_btn')}" aria-label="${t('auth_login_btn')}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
      <path d="M5 20c1.8-3.4 4.1-5 7-5s5.2 1.6 7 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  </button>
  <div class="auth-dropdown-menu" onclick="event.stopPropagation()">
    <button class="auth-dropdown-item" type="button" onclick="AuthUI.open('login'); AppAuth.closeMobileMenu()">${t('auth_login_btn')}</button>
    <div class="auth-dropdown-lang">
      <button class="auth-dropdown-mini ${getAppLang() === 'en' ? 'active' : ''}" type="button" onclick="AppAuth.setMenuLang('en')">EN</button>
      <button class="auth-dropdown-mini ${getAppLang() === 'zh' ? 'active' : ''}" type="button" onclick="AppAuth.setMenuLang('zh')">中文</button>
    </div>
  </div>
</div>`;
        } else {
          el.innerHTML = `<button class="btn btn-outline auth-login-btn" type="button" onclick="AuthUI.open('login')">${t('auth_login_btn')}</button>`;
        }
      }
    });
  },
};

const LogoutDialog = {
  ensureModal() {
    if ($('#logout-dialog-overlay')) return;
    const html = `
<div id="logout-dialog-overlay" class="logout-dialog-overlay hidden" onclick="LogoutDialog.handleOverlayClick(event)">
  <div id="logout-dialog" class="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-copy" tabindex="-1">
    <button class="logout-dialog-close" type="button" onclick="LogoutDialog.close()" aria-label="Close">×</button>
    <div class="logout-dialog-body">
      <h2 id="logout-dialog-title" class="logout-dialog-title">${t('auth_logout_dialog_title')}</h2>
      <p id="logout-dialog-copy" class="logout-dialog-copy">${t('auth_logout_dialog_copy')}</p>
    </div>
    <div class="logout-dialog-actions">
      <button id="logout-dialog-cancel" class="btn btn-secondary" type="button" onclick="LogoutDialog.close()">${t('btn_cancel')}</button>
      <button id="logout-dialog-confirm" class="btn btn-primary" type="button" onclick="LogoutDialog.confirm()">${t('btn_logout')}</button>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  refreshText() {
    if (!$('#logout-dialog-overlay')) return;
    const title = $('#logout-dialog-title');
    const copy = $('#logout-dialog-copy');
    const cancel = $('#logout-dialog-cancel');
    const confirm = $('#logout-dialog-confirm');
    if (title) title.textContent = t('auth_logout_dialog_title');
    if (copy) copy.textContent = t('auth_logout_dialog_copy');
    if (cancel) cancel.textContent = t('btn_cancel');
    if (confirm) confirm.textContent = t('btn_logout');
  },

  open() {
    this.ensureModal();
    this.refreshText();
    $('#logout-dialog-overlay')?.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => $('#logout-dialog')?.focus(), 20);
  },

  close() {
    $('#logout-dialog-overlay')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
  },

  handleOverlayClick(event) {
    if (event.target?.id === 'logout-dialog-overlay') this.close();
  },

  async confirm() {
    this.close();
    await AppAuth.handleLogout();
  },

  handleKeydown(event) {
    const overlay = $('#logout-dialog-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  },
};

AppAuth.toggleMobileMenu = function(event) {
  event?.stopPropagation();
  const chip = document.querySelector('#auth-slot-mobile .auth-user-chip-mobile');
  if (!chip) return;
  chip.classList.toggle('is-open');
};

AppAuth.closeMobileMenu = function() {
  const chip = document.querySelector('#auth-slot-mobile .auth-user-chip-mobile');
  if (!chip) return;
  chip.classList.remove('is-open');
};

AppAuth.openProfile = function() {
  AppAuth.closeMobileMenu();
  if (typeof navigate === 'function') navigate('account-settings');
};

AppAuth.setMenuLang = function(lang) {
  AppAuth.closeMobileMenu();
  if (typeof setAppLang === 'function') setAppLang(lang);
};

AppAuth.requestLogout = async function() {
  AppAuth.closeMobileMenu();
  LogoutDialog.open();
};

AppAuth.handleLogout = async function() {
  try {
    await AppAuth.signOut();
    showToast(t('auth_logout_toast'));
  } catch (error) {
    showToast(error.message || t('auth_logout_toast'));
  }
};

window.AppAuth = AppAuth;
window.AuthUI = AuthUI;
window.LogoutDialog = LogoutDialog;

document.addEventListener('click', () => {
  if (window.AppAuth && typeof AppAuth.closeMobileMenu === 'function') AppAuth.closeMobileMenu();
});

document.addEventListener('keydown', event => {
  if (window.LogoutDialog && typeof LogoutDialog.handleKeydown === 'function') LogoutDialog.handleKeydown(event);
});
