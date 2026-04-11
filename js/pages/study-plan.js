Pages['study-plan'] = function() {
  const stats = Stats.get();
  const totals = Object.values(stats).reduce((sum, item) => sum + (item.attempts || 0), 0);

  $('#page-container').innerHTML = `
<div class="page-header">
  <h1>${t('study_plan_title')}</h1>
  <p>${t('study_plan_subtitle')}</p>
</div>

<div class="grid-3" style="margin-bottom:20px">
  <div class="stat-card stat-card-product">
    <div class="stat-label">${t('weekly_focus')}</div>
    <div class="stat-value stat-value-sm">Speaking + Dictation</div>
    <div class="stat-sub">${t('best_fast_gain')}</div>
  </div>
  <div class="stat-card stat-card-product">
    <div class="stat-label">${t('current_practice_load')}</div>
    <div class="stat-value">${totals}</div>
    <div class="stat-sub">${t('total_completed_sessions')}</div>
  </div>
  <div class="stat-card stat-card-product">
    <div class="stat-label">${t('suggested_session')}</div>
    <div class="stat-value">25 min</div>
    <div class="stat-sub">${t('speaking_listening_block')}</div>
  </div>
</div>

<div class="card">
  <div class="card-title">${t('recommended_daily_structure')}</div>
  <div class="insight-list">
    <span>${t('plan_step_1')}</span>
    <span>${t('plan_step_2')}</span>
    <span>${t('plan_step_3')}</span>
  </div>
  <div class="result-actions" style="margin-top:18px">
    <button class="btn btn-primary" onclick="navigate('home')">${t('back_dashboard')}</button>
    <button class="btn btn-outline" onclick="navigate('read-aloud')">${t('start_speaking_block')}</button>
  </div>
</div>`;
};
