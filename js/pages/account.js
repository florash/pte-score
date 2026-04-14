Pages['account-settings'] = function () {
  const isLoggedIn = !!(window.AppAuth && AppAuth.isLoggedIn());
  const userEmail = AppAuth?.user?.email || '—';
  const micLabel = window.MicAccess ? MicAccess.getStatusLabel() : 'Unknown';
  const micState = window.MicAccess ? MicAccess.permissionState : 'prompt';

  $('#page-container').innerHTML = `
<div class="page-header">
  <h1>${t('account_settings_title')}</h1>
  <p>${t('account_settings_subtitle')}</p>
</div>

<div class="grid-2 account-grid">
  <div class="card">
    <div class="eyebrow">${t('account_title')}</div>
    <div class="card-title" style="margin-bottom:10px">${isLoggedIn ? t('account_signed_in') : t('account_signed_out')}</div>
    <div style="display:grid;gap:10px;font-size:13.5px;color:var(--text-light);line-height:1.7">
      <div><strong style="color:var(--text)">${t('account_status_title')}</strong><br>${isLoggedIn ? t('account_signed_in') : t('account_signed_out')}</div>
      <div><strong style="color:var(--text)">${t('account_signed_in_as')}</strong><br>${isLoggedIn ? userEmail : '—'}</div>
    </div>
    <div class="btn-group" style="margin-top:16px">
      ${isLoggedIn
        ? `<button class="btn btn-outline" onclick="AppAuth.requestLogout()">${t('btn_logout')}</button>`
        : `<button class="btn btn-primary" onclick="AuthUI.open('login')">${t('btn_sign_in')}</button>`}
    </div>
  </div>

  <div class="card">
    <div class="eyebrow">${t('account_sync_title')}</div>
    <div class="card-title" style="margin-bottom:10px">${t('account_sync_title')}</div>
    <p style="font-size:13.5px;color:var(--text-light);line-height:1.7">
      ${isLoggedIn ? t('account_sync_copy_in') : t('account_sync_copy_out')}
    </p>
  </div>
</div>

<div class="grid-2 settings-grid" style="margin-top:16px">
  <div class="card settings-card">
    <div class="eyebrow">${t('app_settings_title')}</div>
    <div class="card-title" style="margin-bottom:10px">${t('account_settings_language')}</div>
    <div class="lang-toggle" role="tablist" aria-label="Language switcher">
      <button class="lang-btn ${getAppLang() === 'zh' ? 'active' : ''}" onclick="setAppLang('zh')">中文</button>
      <button class="lang-btn ${getAppLang() === 'en' ? 'active' : ''}" onclick="setAppLang('en')">EN</button>
    </div>
  </div>

  <div class="card settings-card">
    <div class="eyebrow">${t('app_settings_title')}</div>
    <div class="card-title" style="margin-bottom:10px">${t('account_settings_mic_simple')}</div>
    <p style="font-size:13.5px;color:var(--text-light);line-height:1.7;margin-bottom:14px">
      ${t('mic_status_label')}: <strong style="color:var(--text)">${micLabel}</strong>
    </p>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="requestMicPreauth('account-settings')" ${micState === 'granted' ? 'disabled' : ''}>${t('btn_enable_mic')}</button>
      ${micState === 'granted' ? `<span style="font-size:12.5px;color:var(--success)">${t('mic_already_enabled')}</span>` : ''}
    </div>
  </div>
</div>`;
};

Pages['account'] = function () {
  navigate('account-settings', { replace: true });
};
