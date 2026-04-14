Pages['progress'] = function () {
  if (isGuestUser()) {
    $('#page-container').innerHTML = renderProtectedFeatureGate('progress_guest_title', 'progress_guest_copy');
    return;
  }

  const stats = Stats.get();

  const taskMeta = [
    { key: 'readAloud', title: t('ra_title'), cat: t('label_speaking'), icon: '📖' },
    { key: 'repeatSentence', title: t('rs_title'), cat: t('label_speaking'), icon: '🔁' },
    { key: 'describeImage', title: t('di_title'), cat: t('label_speaking'), icon: '🖼️' },
    { key: 'retellLecture', title: t('rl_title'), cat: t('label_speaking'), icon: '🎙️' },
    { key: 'answerShort', title: t('asq_title'), cat: t('label_speaking'), icon: '❓' },
    { key: 'summarizeWritten', title: t('swt_title'), cat: t('label_writing'), icon: '📝' },
    { key: 'writeEssay', title: t('we_title'), cat: t('label_writing'), icon: '✍️' },
    { key: 'rwFillBlanks', title: t('rwfb_title'), cat: t('label_reading'), icon: '🔤' },
    { key: 'mcSingleReading', title: t('mcsr_title'), cat: t('label_reading'), icon: '🔘' },
    { key: 'mcMultipleReading', title: t('mcmr_title'), cat: t('label_reading'), icon: '☑️' },
    { key: 'reorderParagraphs', title: t('reorder_title'), cat: t('label_reading'), icon: '🔀' },
    { key: 'rFillBlanks', title: t('rfb_title'), cat: t('label_reading'), icon: '📋' },
    { key: 'summarizeSpoken', title: t('sst_title'), cat: t('label_listening'), icon: '🎧' },
    { key: 'mcSingleListening', title: t('mcsl_title'), cat: t('label_listening'), icon: '🔘' },
    { key: 'mcMultipleListening', title: t('mcml_title'), cat: t('label_listening'), icon: '☑️' },
    { key: 'fillBlanksListening', title: t('fbl_title'), cat: t('label_listening'), icon: '🎵' },
    { key: 'highlightSummary', title: t('hcs_title'), cat: t('label_listening'), icon: '💡' },
    { key: 'selectMissing', title: t('smw_title'), cat: t('label_listening'), icon: '🔍' },
    { key: 'highlightIncorrect', title: t('hi_title'), cat: t('label_listening'), icon: '❌' },
    { key: 'writeDictation', title: t('wfd_title'), cat: t('label_listening'), icon: '✏️' },
  ];

  const history = taskMeta.flatMap(item =>
    (stats[item.key]?.history || []).map(row => ({ ...row, ...item }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const scored = history.filter(item => typeof item.score === 'number');
  const avgScore = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : null;
  const typeCount = new Set(history.map(item => item.key)).size;

  function relTime(dateStr) {
    const mins = Math.max(1, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (mins < 60) return t('time_minutes_ago').replace('${n}', mins);
    if (mins < 1440) return t('time_hours_ago').replace('${n}', Math.round(mins / 60));
    return t('time_days_ago').replace('${n}', Math.round(mins / 1440));
  }

  const chartPoints = scored.slice(0, 8).reverse();
  const chartHtml = chartPoints.length
    ? `<div class="trend-chart-wrap"><div class="trend-chart-bars"><div class="trend-baseline"></div>${
        chartPoints.map(item => `
<div class="trend-bar-col">
  <div class="trend-bar-val">${item.score}</div>
  <div class="trend-bar" style="height:${Math.max(8, Math.round(item.score / 90 * 72))}px;background:${Scorer.gradeColor(item.score)}"></div>
  <div class="trend-bar-date">${new Date(item.date).toLocaleDateString(getAppLang() === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' })}</div>
</div>`).join('')
      }</div></div>`
    : `<div class="prog-empty"><div class="prog-empty-icon">📈</div><div class="prog-empty-desc">${t('progress_chart_empty')}</div></div>`;

  const historyHtml = history.slice(0, 10).map(item => `
<div class="prog-attempt-row">
  <div class="prog-attempt-left">
    <div class="prog-attempt-icon">${item.icon}</div>
    <div>
      <div class="prog-attempt-name">${item.title}</div>
      <div class="prog-attempt-meta">${item.cat} · ${relTime(item.date)}</div>
    </div>
  </div>
  <div class="prog-attempt-score">
    <div class="prog-score-big" style="color:${typeof item.score === 'number' ? Scorer.gradeColor(item.score) : 'var(--text-light)'}">${item.score ?? '—'}</div>
    <div class="prog-score-denom">/ 90</div>
  </div>
</div>`).join('');

  const focus = taskMeta
    .map(item => ({ ...item, avg: Stats.getAvg(item.key), attempts: stats[item.key]?.attempts || 0 }))
    .filter(item => typeof item.avg === 'number' && item.attempts > 0)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3);

  const focusHtml = focus.length ? focus.map(item => `
<div class="prog-focus-item">
  <div class="prog-focus-row">
    <div class="prog-focus-name">${item.title}</div>
    <div class="prog-focus-score" style="color:${Scorer.gradeColor(item.avg)}">${item.avg}</div>
  </div>
  <div class="prog-focus-hint">${item.cat} · ${item.attempts}</div>
  <div class="prog-focus-bar"><div class="prog-focus-bar-fill" style="width:${Math.round(item.avg / 90 * 100)}%;background:${Scorer.gradeColor(item.avg)}"></div></div>
</div>`).join('') : `<div class="prog-empty"><div class="prog-empty-icon">🎯</div><div class="prog-empty-desc">${t('progress_focus_empty')}</div></div>`;

  $('#page-container').innerHTML = `
<div class="progress-page">
  <div class="page-header">
    <h1>${t('progress_title')}</h1>
    <p>${t('progress_subtitle')}</p>
  </div>

  <div class="prog-stats-grid">
    <div class="prog-stat-card">
      <span class="prog-stat-icon">⭐</span>
      <div class="prog-stat-value">${avgScore ?? '--'}</div>
      <div class="prog-stat-label">${t('overall_average')}</div>
    </div>
    <div class="prog-stat-card">
      <span class="prog-stat-icon">📚</span>
      <div class="prog-stat-value">${history.length}</div>
      <div class="prog-stat-label">${t('total_attempts')}</div>
    </div>
    <div class="prog-stat-card">
      <span class="prog-stat-icon">🧩</span>
      <div class="prog-stat-value">${typeCount}</div>
      <div class="prog-stat-label">${t('types_practiced')}</div>
    </div>
    <div class="prog-stat-card">
      <span class="prog-stat-icon">🕒</span>
      <div class="prog-stat-value">${history[0] ? relTime(history[0].date) : '--'}</div>
      <div class="prog-stat-label">${t('progress_recent_meta')}</div>
    </div>
  </div>

  <div class="prog-grid-2" style="margin-top:18px">
    <div>
      <div class="prog-card">
        <div class="prog-card-header">
          <div class="prog-card-title">${t('progress_chart_title')}</div>
        </div>
        ${chartHtml}
      </div>

      <div class="prog-card" style="margin-top:16px">
        <div class="prog-card-header">
          <div class="prog-card-title">${t('progress_history_title')}</div>
          <div class="prog-card-meta">${history.length} ${t('progress_latest_count')}</div>
        </div>
        ${historyHtml || `<div class="prog-empty"><div class="prog-empty-icon">📝</div><div class="prog-empty-desc">${t('progress_history_empty')}</div></div>`}
      </div>
    </div>

    <div>
      <div class="prog-card">
        <div class="prog-card-header">
          <div class="prog-card-title">${t('progress_focus_title')}</div>
        </div>
        ${focusHtml}
      </div>

      <div class="prog-card" style="margin-top:16px">
        <div class="prog-card-header">
          <div class="prog-card-title">${t('progress_plan_title')}</div>
        </div>
        <div class="prog-plan-list">
          <div class="prog-plan-item"><div class="prog-plan-dot"></div><div class="prog-plan-text">${t('plan_step_1')}</div></div>
          <div class="prog-plan-item"><div class="prog-plan-dot"></div><div class="prog-plan-text">${t('plan_step_2')}</div></div>
          <div class="prog-plan-item"><div class="prog-plan-dot"></div><div class="prog-plan-text">${t('plan_step_3')}</div></div>
        </div>
        <div class="btn-group" style="margin-top:16px">
          <button class="btn btn-outline" onclick="navigate('study-plan')">${t('nav_study_plan')}</button>
          <button class="btn btn-primary" onclick="navigate('practice')">${t('nav_practice')}</button>
        </div>
      </div>
    </div>
  </div>

  <div style="padding:20px 0 24px;text-align:right">
    <button class="btn-link" style="font-size:12px" onclick="if(confirm('${t('progress_reset')}?')){Stats.save({});navigate('progress');showToast('${t('progress_reset')}')}">${t('progress_reset_local')}</button>
  </div>
</div>`;
};
