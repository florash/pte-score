Pages.home = function () {
  const isLoggedIn = !!(window.AppAuth && AppAuth.isLoggedIn());
  const currentLang = getAppLang();

  // Calculate today's practice count and streak
  const allHistory = Object.values(Stats.get())
    .flatMap(s => s.history || []);
  const todayStr = new Date().toDateString();
  const todayCount = allHistory.filter(h => new Date(h.date).toDateString() === todayStr).length;

  // Streak: count consecutive days with at least 1 attempt
  const uniqueDays = [...new Set(allHistory.map(h => new Date(h.date).toDateString()))];
  let streak = 0;
  const d = new Date();
  while (true) {
    if (uniqueDays.includes(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else { break; }
  }

  const todayLabel = currentLang === 'zh' ? '今日已练' : 'Today';
  const streakLabel = currentLang === 'zh' ? '连续学习' : 'Streak';
  const questionsLabel = currentLang === 'zh' ? '题' : 'q';
  const daysLabel = currentLang === 'zh' ? '天' : 'd';

  const progressBanner = `
    <div class="home-progress-banner">
      <div class="home-progress-stat">
        <span class="home-progress-num">${todayCount}</span>
        <span class="home-progress-label">${todayLabel} ${questionsLabel}</span>
      </div>
      <div class="home-progress-divider"></div>
      <div class="home-progress-stat">
        <span class="home-progress-num">${streak}</span>
        <span class="home-progress-label">${streakLabel} ${daysLabel}</span>
      </div>
    </div>
  `;

  const moduleCards = [
    {
      icon: '🎤',
      title: t('label_speaking'),
      desc: t('home_module_speaking_desc'),
      mobileDesc: 'RA · RS · DI · RL · ASQ',
      page: 'practice-speaking',
      tone: 'speaking',
      stat: `${DB.readAloud.length + DB.repeatSentence.length + (getDiTemplates().length || DB.describeImage.length) + DB.retellLecture.length + DB.answerShort.length} ${t('practice_questions')}`,
    },
    {
      icon: '✍️',
      title: t('label_writing'),
      desc: t('home_module_writing_desc'),
      mobileDesc: 'SWT · WFD · Essay',
      page: 'practice-writing',
      tone: 'writing',
      stat: `${DB.summarizeWritten.length + DB.writeEssay.length} ${t('practice_questions')}`,
    },
    {
      icon: '📖',
      title: t('label_reading'),
      desc: t('home_module_reading_desc'),
      mobileDesc: 'RO · MCQ · FIB',
      page: 'practice-reading',
      tone: 'reading',
      stat: `${DB.rwFillBlanks.length + DB.mcSingleReading.length + DB.mcMultipleReading.length + DB.reorderParagraphs.length + DB.rFillBlanks.length} ${t('practice_questions')}`,
    },
    {
      icon: '🎧',
      title: t('label_listening'),
      desc: t('home_module_listening_desc'),
      mobileDesc: 'SST · MCM · FIB · HIW',
      page: 'practice-listening',
      tone: 'listening',
      stat: `${DB.summarizeSpoken.length + DB.mcSingleListening.length + DB.mcMultipleListening.length + DB.fillBlanksListening.length + DB.highlightSummary.length + DB.selectMissing.length + DB.highlightIncorrect.length + DB.writeDictation.length} ${t('practice_questions')}`,
    },
  ];

  const smartCards = [
    { icon: '🔥', title: t('nav_prediction_bank'), desc: t('home_directory_prediction_desc'), mobileDesc: currentLang === 'zh' ? '最新考题预测' : 'Latest predictions', page: 'tools-prediction-bank' },
    { icon: '⬆️', title: t('nav_high_frequency'), desc: t('home_directory_high_frequency_desc'), mobileDesc: currentLang === 'zh' ? '高频必练题型' : 'Must-do questions', page: 'tools-high-frequency' },
    { icon: '📝', title: t('nav_mistakes'), desc: t('home_directory_mistakes_desc'), mobileDesc: currentLang === 'zh' ? '巩固薄弱项' : 'Review weak areas', page: 'tools-mistakes' },
    { icon: '🎙️', title: t('nav_audio_trainer'), desc: t('home_directory_audio_desc'), mobileDesc: currentLang === 'zh' ? '口语跟读训练' : 'Pronunciation drills', page: 'tools-audio-trainer' },
  ];

  const toolCards = [
    { icon: '🧪', title: t('nav_mock_test'), desc: t('home_directory_mock_desc'), mobileDesc: currentLang === 'zh' ? '全真模拟测试' : 'Full mock exam', page: 'mock-test' },
    { icon: '📊', title: t('nav_progress'), desc: t('home_directory_progress_desc'), mobileDesc: currentLang === 'zh' ? '学习数据报告' : 'Learning analytics', page: 'progress' },
    { icon: '🗓️', title: t('nav_study_plan'), desc: t('home_directory_plan_desc'), mobileDesc: currentLang === 'zh' ? '个性化备考计划' : 'Personalised plan', page: 'study-plan' },
  ];

  const renderCards = (items, variant = 'default') => items.map(item => `
    <article class="home-directory-card home-directory-card-${variant}${item.tone ? ` ${item.tone}` : ''}" onclick="navigate('${item.page}')">
      <div class="home-directory-card-main">
        <div class="home-directory-card-top">
          <div class="home-directory-card-icon">${item.icon}</div>
          <div>
            <h3>${item.title}</h3>
            ${item.stat ? `<div class="home-directory-card-stat">${item.stat}</div>` : ''}
            ${item.mobileDesc ? `<div class="home-directory-card-mini-desc">${item.mobileDesc}</div>` : ''}
          </div>
        </div>
        <p>${item.desc}</p>
      </div>
    </article>
  `).join('');

  const pageTitle = isLoggedIn ? t('home_title') : t('hero_title_guest').replace('\n', '<br>');
  const pageSubtitle = isLoggedIn ? t('home_directory_subtitle') : t('hero_subtitle_guest');

  const guestTeaser = !isLoggedIn ? `
    <section class="home-zone home-directory-teaser">
      <div class="login-teaser">
        <div class="login-teaser-title">${t('teaser_title')}</div>
        <div class="login-teaser-desc">${t('teaser_desc')}</div>
        <div class="login-teaser-actions">
          <button class="btn btn-primary" onclick="AuthUI.open('login')">${t('btn_sign_in_google')}</button>
          <button class="btn btn-outline" onclick="navigate('practice-speaking')">${t('btn_continue_guest')}</button>
        </div>
      </div>
    </section>
  ` : '';

  $('#page-container').innerHTML = `
<div class="home-dashboard-shell home-directory-shell">
  <div class="page-header home-dashboard-header dashboard-header home-directory-header">
    <div>
      <div class="eyebrow">${isLoggedIn ? t('home_header_eyebrow') : t('hero_eyebrow')}</div>
      <h1>${pageTitle}</h1>
      <p>${pageSubtitle}</p>
    </div>
    <div class="lang-toggle home-lang-desktop" role="tablist" aria-label="Language switcher">
      <button class="lang-btn ${currentLang === 'zh' ? 'active' : ''}" onclick="setAppLang('zh')">中文</button>
      <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" onclick="setAppLang('en')">EN</button>
    </div>
  </div>

  ${progressBanner}

  <section class="home-zone home-directory-section home-directory-section-hero">
    <div class="home-directory-section-heading">
      <div>
        <h2>${t('home_directory_modules_title')}</h2>
        <p>${t('home_directory_modules_copy')}</p>
      </div>
    </div>
    <div class="home-directory-grid home-directory-grid-primary">
      ${renderCards(moduleCards, 'primary')}
    </div>
  </section>

  <section class="home-zone home-directory-section">
    <div class="home-directory-section-heading">
      <div>
        <div class="eyebrow">${t('home_directory_smart_eyebrow')}</div>
        <h2>${t('home_directory_smart_title')}</h2>
        <p>${t('home_directory_smart_copy')}</p>
      </div>
    </div>
    <div class="home-directory-grid home-directory-grid-secondary">
      ${renderCards(smartCards, 'secondary')}
    </div>
  </section>

  <section class="home-zone home-directory-section">
    <div class="home-directory-section-heading">
      <div>
        <div class="eyebrow">${t('home_directory_tools_eyebrow')}</div>
        <h2>${t('home_directory_tools_title')}</h2>
        <p>${t('home_directory_tools_copy')}</p>
      </div>
    </div>
    <div class="home-directory-grid home-directory-grid-tools">
      ${renderCards(toolCards, 'tool')}
    </div>
  </section>

  ${guestTeaser}
</div>`;
};
