Pages['practice'] = function () {
  const guest = isGuestUser();
  const currentPage = window.__currentPage || sessionStorage.getItem('pte_page') || 'practice-all';
  const practiceView = window.__practiceCategory
    || (currentPage === 'practice-speaking' ? 'speaking'
      : currentPage === 'practice-writing' ? 'writing'
      : currentPage === 'practice-reading' ? 'reading'
      : currentPage === 'practice-listening' ? 'listening'
      : (currentPage.startsWith('tools-') || currentPage.startsWith('smart-practice-')) ? 'prediction'
      : 'all');

  const predictionFilter = window.__practicePredictionFilter || false;
  const latestOnly = predictionFilter === 'latest';
  const highOnly = predictionFilter === 'high';

  const predictionCount = (key) => getPredictionBankActive(key, latestOnly, highOnly).length;
  const allPredictions = getPredictionBankActive('repeatSentence').length
    + getPredictionBankActive('writeFromDictation').length
    + getPredictionBankActive('answerShortQuestion').length
    + getPredictionBankActive('describeImage').length
    + getPredictionBankActive('retellLecture').length;
  const latestPredictions = getPredictionBankActive('repeatSentence', true).length
    + getPredictionBankActive('writeFromDictation', true).length
    + getPredictionBankActive('answerShortQuestion', true).length
    + getPredictionBankActive('describeImage', true).length
    + getPredictionBankActive('retellLecture', true).length;
  const highPredictions = getPredictionBankActive('repeatSentence', false, true).length
    + getPredictionBankActive('writeFromDictation', false, true).length
    + getPredictionBankActive('answerShortQuestion', false, true).length
    + getPredictionBankActive('describeImage', false, true).length
    + getPredictionBankActive('retellLecture', false, true).length;

  const taskGroups = [
    {
      title: t('label_speaking'),
      icon: '🎤',
      desc: t('practice_speaking_desc'),
      badge: t('badge_ai'),
      tasks: [
        { key: 'readAloud', title: t('ra_title'), page: 'read-aloud', icon: '📖', count: DB.readAloud.length },
        { key: 'repeatSentence', title: t('rs_title'), page: 'repeat-sentence', icon: '🔁', count: DB.repeatSentence.length },
        { key: 'describeImage', title: t('di_title'), page: 'describe-image', icon: '🖼️', count: getDiTemplates().length || DB.describeImage.length },
        { key: 'retellLecture', title: t('rl_title'), page: 'retell-lecture', icon: '🎙️', count: DB.retellLecture.length },
        { key: 'answerShort', title: t('asq_title'), page: 'answer-short', icon: '❓', count: DB.answerShort.length },
      ],
    },
    {
      title: t('label_writing'),
      icon: '✍️',
      desc: t('practice_writing_desc'),
      badge: t('badge_ai'),
      tasks: [
        { key: 'summarizeWritten', title: t('swt_title'), page: 'summarize-written', icon: '📝', count: DB.summarizeWritten.length },
        { key: 'writeEssay', title: t('we_title'), page: 'write-essay', icon: '✍️', count: DB.writeEssay.length },
      ],
    },
    {
      title: t('label_reading'),
      icon: '📖',
      desc: t('practice_reading_desc'),
      badge: '',
      tasks: [
        { key: 'rwFillBlanks', title: t('rwfb_title'), page: 'rw-fill-blanks', icon: '🔤', count: DB.rwFillBlanks.length },
        { key: 'mcSingleReading', title: t('mcsr_title'), page: 'mc-single-reading', icon: '🔘', count: DB.mcSingleReading.length },
        { key: 'mcMultipleReading', title: t('mcmr_title'), page: 'mc-multiple-reading', icon: '☑️', count: DB.mcMultipleReading.length },
        { key: 'reorderParagraphs', title: t('reorder_title'), page: 'reorder-paragraphs', icon: '🔀', count: DB.reorderParagraphs.length },
        { key: 'rFillBlanks', title: t('rfb_title'), page: 'r-fill-blanks', icon: '📋', count: DB.rFillBlanks.length },
      ],
    },
    {
      title: t('label_listening'),
      icon: '🎧',
      desc: t('practice_listening_desc'),
      badge: t('badge_ai'),
      tasks: [
        { key: 'summarizeSpoken', title: t('sst_title'), page: 'summarize-spoken', icon: '🎧', count: DB.summarizeSpoken.length },
        { key: 'mcSingleListening', title: t('mcsl_title'), page: 'mc-single-listening', icon: '🔘', count: DB.mcSingleListening.length },
        { key: 'mcMultipleListening', title: t('mcml_title'), page: 'mc-multiple-listening', icon: '☑️', count: DB.mcMultipleListening.length },
        { key: 'fillBlanksListening', title: t('fbl_title'), page: 'fill-blanks-listening', icon: '🎵', count: DB.fillBlanksListening.length },
        { key: 'highlightSummary', title: t('hcs_title'), page: 'highlight-summary', icon: '💡', count: DB.highlightSummary.length },
        { key: 'selectMissing', title: t('smw_title'), page: 'select-missing', icon: '🔍', count: DB.selectMissing.length },
        { key: 'highlightIncorrect', title: t('hi_title'), page: 'highlight-incorrect', icon: '❌', count: DB.highlightIncorrect.length },
        { key: 'writeDictation', title: t('wfd_title'), page: 'write-dictation', icon: '✏️', count: DB.writeDictation.length },
      ],
    },
  ];

  const intro = `
<div class="card" style="margin-bottom:18px">
  <div class="eyebrow">${t('practice_focus_title')}</div>
  <div class="card-title" style="margin-bottom:8px">${t('practice_heading')}</div>
  <p style="font-size:13.5px;color:var(--text-light);line-height:1.7">${t('practice_focus_copy')}</p>
</div>`;

  const predictionGroups = [
    {
      key: 'repeatSentence',
      page: 'repeat-sentence',
      title: t('prediction_type_repeat_sentence'),
      count: predictionCount('repeatSentence'),
      icon: '🔁',
    },
    {
      key: 'writeFromDictation',
      page: 'write-dictation',
      title: t('prediction_type_write_from_dictation'),
      count: predictionCount('writeFromDictation'),
      icon: '✏️',
    },
    {
      key: 'answerShortQuestion',
      page: 'answer-short',
      title: t('prediction_type_answer_short_question'),
      count: predictionCount('answerShortQuestion'),
      icon: '❓',
    },
    {
      key: 'describeImage',
      page: 'describe-image',
      title: t('prediction_type_describe_image'),
      count: predictionCount('describeImage'),
      icon: '🖼️',
    },
    {
      key: 'retellLecture',
      page: 'retell-lecture',
      title: t('prediction_type_retell_lecture'),
      count: predictionCount('retellLecture'),
      icon: '🎙️',
    },
  ];

  const visibleTaskGroups = practiceView === 'all'
    ? taskGroups
    : taskGroups.filter(group => {
        const label = group.title;
        return (practiceView === 'speaking' && label === t('label_speaking'))
          || (practiceView === 'writing' && label === t('label_writing'))
          || (practiceView === 'reading' && label === t('label_reading'))
          || (practiceView === 'listening' && label === t('label_listening'));
      });

  const groupsHtml = visibleTaskGroups.map(group => {
    const total = group.tasks.reduce((sum, item) => sum + item.count, 0);
    const tasksHtml = group.tasks.map(task => {
      const avg = Stats.getAvg(task.key);
      const scoreHtml = typeof avg === 'number'
        ? `<span style="color:${Scorer.gradeColor(avg)}">${avg}</span>`
        : `<span style="color:var(--text-light)">${t('practice_no_score')}</span>`;
      const previewCount = Math.min(GUEST_FREE_QUESTION_LIMIT, task.count);
      const guestMeta = guest
        ? `<div style="font-size:11px;color:var(--text-light);margin-top:6px">${t('practice_free_preview').replace('${count}', previewCount)}</div>
           ${task.count > previewCount ? `<button class="btn btn-outline" style="margin-top:10px;font-size:12px;padding:0 12px;height:32px" onclick="event.stopPropagation();openLoginPrompt()">${t('practice_locked_more')}</button>` : ''}`
        : '';

      const listPage = {
        'read-aloud': 'practice-read-aloud',
        'repeat-sentence': 'practice-repeat-sentence',
        'describe-image': 'practice-describe-image',
        'retell-lecture': 'practice-retell-lecture',
        'answer-short': 'practice-answer-short',
        'summarize-written': 'practice-summarize-written',
        'write-essay': 'practice-write-essay',
        'rw-fill-blanks': 'practice-rw-fill-blanks',
        'mc-single-reading': 'practice-mc-single-reading',
        'mc-multiple-reading': 'practice-mc-multiple-reading',
        'reorder-paragraphs': 'practice-reorder-paragraphs',
        'r-fill-blanks': 'practice-r-fill-blanks',
        'summarize-spoken': 'practice-summarize-spoken',
        'mc-single-listening': 'practice-mc-single-listening',
        'mc-multiple-listening': 'practice-mc-multiple-listening',
        'fill-blanks-listening': 'practice-fill-blanks-listening',
        'highlight-summary': 'practice-highlight-summary',
        'select-missing': 'practice-select-missing',
        'highlight-incorrect': 'practice-highlight-incorrect',
        'write-dictation': 'practice-write-dictation',
      }[task.page];
      const taskAction = listPage
        ? `openQuestionSet('${listPage}','default',false)`
        : `openQuestionSet('${task.page}','default',false)`;
      return `
<div class="practice-task-card" onclick="${taskAction}">
  <div class="practice-task-left">
    <div class="practice-task-icon">${task.icon}</div>
    <div>
      <div class="practice-task-name">${task.title}</div>
      <div class="practice-task-count">${task.count} ${t('practice_questions')}</div>
    </div>
  </div>
  <div class="practice-task-score">
    <div style="font-size:11px;color:var(--text-light);margin-bottom:4px">${t('practice_recent_score')}</div>
    <div>${scoreHtml}</div>
    ${guestMeta}
  </div>
</div>`;
    }).join('');

    return `
<section class="practice-section">
  <div class="practice-section-title">
    <span style="margin-right:8px">${group.icon}</span>${group.title}
    ${group.badge ? `<span class="mod-card-badge mod-badge-ai" style="margin-left:8px">${group.badge}</span>` : ''}
    <span>${total} ${t('practice_tasks')}</span>
  </div>
  <div style="font-size:13px;color:var(--text-light);margin-bottom:14px">${group.desc}</div>
  <div class="practice-tasks-grid">
    ${tasksHtml}
  </div>
</section>`;
  }).join('');

  const predictionCards = predictionGroups.map(group => {
    const count = group.count;
    const previewCount = Math.min(GUEST_FREE_QUESTION_LIMIT, count);
    const predictionListPage = {
      'repeat-sentence': 'practice-repeat-sentence',
      'describe-image': 'practice-describe-image',
      'retell-lecture': 'practice-retell-lecture',
      'answer-short': 'practice-answer-short',
      'write-dictation': 'practice-write-dictation',
    }[group.page];
    const openAction = count
      ? predictionListPage
        ? `openQuestionSet('${predictionListPage}','prediction',${latestOnly ? 'true' : 'false'})`
        : `openQuestionSet('${group.page}','prediction',${latestOnly ? 'true' : 'false'})`
      : 'return';

    return `
<div class="practice-task-card ${count ? '' : 'is-disabled'}" onclick="${openAction}">
  <div class="practice-task-left">
    <div class="practice-task-icon">${group.icon}</div>
    <div>
      <div class="practice-task-name">${group.title}</div>
      <div class="practice-task-count">${count} ${t('practice_questions')}</div>
      <div style="font-size:11px;color:var(--text-light);margin-top:4px">${t('prediction_high_badge')}</div>
    </div>
  </div>
  <div class="practice-task-score">
    <div style="font-size:11px;color:var(--text-light);margin-bottom:4px">${t('prediction_month_label')}</div>
    <div>${count ? t('prediction_card_open') : t('prediction_empty')}</div>
    ${guest && count ? `<div style="font-size:11px;color:var(--text-light);margin-top:6px">${t('practice_free_preview').replace('${count}', Math.min(previewCount, count))}</div>` : ''}
    ${guest && count > previewCount ? `<button class="btn btn-outline" style="margin-top:10px;font-size:12px;padding:0 12px;height:32px" onclick="event.stopPropagation();openLoginPrompt()">${t('practice_locked_more')}</button>` : ''}
  </div>
</div>`;
  }).join('');

  const predictionTotal = latestOnly ? latestPredictions : highOnly ? highPredictions : allPredictions;
  const predictionFilterButtons = (currentPage.startsWith('tools-') || currentPage.startsWith('smart-practice-'))
    ? `
  <div class="prediction-filter-bar" style="margin-bottom:14px">
    <button class="btn ${!predictionFilter ? 'btn-primary' : 'btn-outline'}" onclick="navigate('tools-prediction-bank')">${t('prediction_filter_bank')}</button>
    <button class="btn ${predictionFilter === 'high' ? 'btn-primary' : 'btn-outline'}" onclick="navigate('tools-high-frequency')">${t('prediction_filter_high')}</button>
    <button class="btn ${predictionFilter === 'latest' ? 'btn-primary' : 'btn-outline'}" onclick="window.__practicePredictionFilter='latest';setPredictionHighOnly(false);navigate('tools-prediction-bank')">${t('prediction_filter_latest')}</button>
  </div>`
    : '';

  const predictionHtml = `
<section class="practice-section" id="practice-prediction-section">
  <div class="practice-section-title">
    <span style="margin-right:8px">🔥</span>${t('prediction_bank_title')}
    <span>${predictionTotal} ${t('practice_tasks')}</span>
  </div>
  <div style="font-size:13px;color:var(--text-light);margin-bottom:14px">${t('prediction_bank_subtitle')}</div>
  ${predictionFilterButtons}
  ${predictionTotal ? `<div class="practice-tasks-grid">${predictionCards}</div>` : `<div class="prog-empty"><div class="prog-empty-icon">🔥</div><div class="prog-empty-desc">${t('prediction_empty')}</div><div class="prog-empty-desc" style="margin-top:6px">${t('prediction_review_note')}</div></div>`}
</section>`;

  $('#page-container').innerHTML = `
<div class="practice-page">
  <div class="page-header">
    <h1>${practiceView === 'prediction' ? t('prediction_bank_title') : t('practice_heading')}</h1>
    <p>${practiceView === 'prediction' ? t('prediction_bank_subtitle') : t('practice_subheading')}</p>
  </div>
  ${practiceView === 'prediction' ? '' : intro}
  ${practiceView === 'prediction' ? predictionHtml : groupsHtml}
</div>`;

  window.Practice_setTab = function(tab) {
    window.__practiceCategory = tab === 'prediction' ? 'prediction' : 'all';
    window.__practiceTab = tab;
    window.__practicePredictionFilter = false;
    setPredictionHighOnly(false);
    navigate(tab === 'prediction' ? 'tools-prediction-bank' : 'practice-all');
  };

  window.Practice_setPredictionMode = function(setLatest, setHigh) {
    window.__practiceCategory = 'prediction';
    window.__practiceTab = 'prediction';
    window.__practicePredictionFilter = setLatest ? 'latest' : setHigh ? 'high' : false;
    setPredictionHighOnly(!!setHigh);
    navigate(setHigh ? 'tools-high-frequency' : 'tools-prediction-bank');
  };
};
