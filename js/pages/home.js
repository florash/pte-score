Pages.home = function() {
  const stats = Stats.get();
  const lang = window.getAppLang ? getAppLang() : 'zh';
  const isEn = lang === 'en';
  const micState = window.MicAccess ? MicAccess.permissionState : 'prompt';
  const micLabel = window.MicAccess ? MicAccess.getStatusLabel() : 'Unknown';
  const copy = {
    appSubtitle: isEn ? 'Smart practice for PTE Academic.' : '覆盖全部题型，AI 评分，系统提分。',
    langZh: '中',
    langEn: 'EN',
    continueEyebrow: isEn ? 'Continue Practice' : '继续练习',
    continueTitle: isEn ? 'Continue:' : '继续：',
    lastScore: isEn ? 'Last score' : '上次分数',
    lastPracticed: isEn ? 'Last practiced' : '上次练习',
    startFirst: isEn ? 'Start your first practice session' : '开始第一次练习',
    continueCta: isEn ? 'Continue Practice' : '继续练习',
    todayGoal: isEn ? "Today's Goal" : '今日目标',
    completed: isEn ? 'complete' : '已完成',
    resume: isEn ? 'Resume' : '继续',
    weakArea: isEn ? 'Weak Area' : '薄弱项',
    notEnoughData: isEn ? 'Not enough data yet' : '数据不足',
    focusNext: isEn ? 'Focus on this next' : '建议下一步重点练这个',
    unlockInsight: isEn ? 'Practice a few modules to unlock insight.' : '先完成几组练习再解锁薄弱项分析。',
    streak: isEn ? 'Streak' : '连续练习',
    avgSpeaking: isEn ? 'Avg Speaking Score' : '口语均分',
    weakestSkill: isEn ? 'Weakest Skill' : '最弱技能',
    questionsWeek: isEn ? 'Questions This Week' : '本周题量',
    noDataYet: isEn ? 'No data yet' : '暂无数据',
    practiceModules: isEn ? 'Practice Modules' : '练习模块',
    practiceSubtitle: isEn ? 'Choose a module and keep moving your score forward.' : '选择一个模块继续推进你的分数。',
    items: isEn ? 'items' : '题',
    lastScoreShort: isEn ? 'Last score' : '上次分数',
    newModule: isEn ? 'New module' : '新模块',
    start: isEn ? 'Start' : '开始练习',
    minsAgo: isEn ? 'mins ago' : '分钟前',
    hoursAgo: isEn ? 'hours ago' : '小时前',
    daysAgo: isEn ? 'days ago' : '天前',
    micTitle: isEn ? 'Microphone Access' : '麦克风权限',
    micReady: isEn ? 'Microphone is already enabled for this site.' : '这个站点的麦克风已经启用。',
    micNeeded: isEn ? 'Enable microphone once when you enter the app so speaking practice can start without extra prompts.' : '进入应用后先授权一次麦克风，这样口语练习时会少很多弹窗。',
    micButton: isEn ? 'Enable Microphone' : '预授权麦克风',
    micStatus: isEn ? 'Status' : '当前状态',
  };
  const moduleMeta = {
    readAloud: { icon:'📖', title:'Read Aloud', desc:'Read text aloud clearly and fluently', page:'read-aloud', badge:'speaking', count: DB.readAloud.length, focus:'Pronunciation and pacing' },
    repeatSentence: { icon:'🔁', title:'Repeat Sentence', desc:'Listen and repeat the sentence exactly', page:'repeat-sentence', badge:'speaking', count: DB.repeatSentence.length, focus:'Fluency and sentence stress' },
    describeImage: { icon:'🖼️', title:'Describe Image', desc:'Describe charts, graphs and images', page:'describe-image', badge:'speaking', count: DB.describeImage.length, focus:'Structure and key data points' },
    retellLecture: { icon:'🎙️', title:'Re-tell Lecture', desc:'Listen and retell the key points', page:'retell-lecture', badge:'speaking', count: DB.retellLecture.length, focus:'Content recall and coherence' },
    answerShort: { icon:'❓', title:'Answer Short Question', desc:'Answer in one or a few words', page:'answer-short', badge:'speaking', count: DB.answerShort.length, focus:'Accuracy and fast recall' },
    summarizeWritten: { icon:'📝', title:'Summarize Written Text', desc:'Summarize a passage in one sentence', page:'summarize-written', badge:'writing', count: DB.summarizeWritten.length, focus:'Content relevance and form' },
    writeEssay: { icon:'✍️', title:'Write Essay', desc:'Write an argumentative or discussion essay', page:'write-essay', badge:'writing', count: DB.writeEssay.length, focus:'Development and coherence' },
    rwFillBlanks: { icon:'🔤', title:'R&W Fill in Blanks', desc:'Select words from dropdowns to complete text', page:'rw-fill-blanks', badge:'reading', count: DB.rwFillBlanks.length, focus:'Collocation and context' },
    mcSingleReading: { icon:'🔘', title:'MC Single Answer (R)', desc:'Choose the best answer for a passage', page:'mc-single-reading', badge:'reading', count: DB.mcSingleReading.length, focus:'Main idea recognition' },
    mcMultipleReading: { icon:'☑️', title:'MC Multiple Answer (R)', desc:'Select all correct answers', page:'mc-multiple-reading', badge:'reading', count: DB.mcMultipleReading.length, focus:'Evidence selection' },
    reorderParagraphs: { icon:'🔀', title:'Re-order Paragraphs', desc:'Arrange sentences into logical order', page:'reorder-paragraphs', badge:'reading', count: DB.reorderParagraphs.length, focus:'Logical flow and cohesion' },
    rFillBlanks: { icon:'📋', title:'Reading Fill Blanks', desc:'Type the missing word from context', page:'r-fill-blanks', badge:'reading', count: DB.rFillBlanks.length, focus:'Vocabulary precision' },
    summarizeSpoken: { icon:'🎧', title:'Summarize Spoken Text', desc:'Listen and write a summary', page:'summarize-spoken', badge:'listening', count: DB.summarizeSpoken.length, focus:'Listening for main ideas' },
    fillBlanksListening: { icon:'🎵', title:'Fill in Blanks (L)', desc:'Listen and type the missing words', page:'fill-blanks-listening', badge:'listening', count: DB.fillBlanksListening.length, focus:'Detail listening' },
    highlightSummary: { icon:'💡', title:'Highlight Correct Summary', desc:'Choose the best summary of what you heard', page:'highlight-summary', badge:'listening', count: DB.highlightSummary.length, focus:'Summary selection' },
    selectMissing: { icon:'🔍', title:'Select Missing Word', desc:'Choose the word that completes the recording', page:'select-missing', badge:'listening', count: DB.selectMissing.length, focus:'Prediction and context' },
    highlightIncorrect: { icon:'❌', title:'Highlight Incorrect Words', desc:'Find words that differ from the audio', page:'highlight-incorrect', badge:'listening', count: DB.highlightIncorrect.length, focus:'Careful listening' },
    writeDictation: { icon:'✏️', title:'Write From Dictation', desc:'Listen and type the exact sentence', page:'write-dictation', badge:'listening', count: DB.writeDictation.length, focus:'Accuracy under pressure' },
  };
  const badgeColors = { speaking:'badge-speaking', writing:'badge-writing', reading:'badge-reading', listening:'badge-listening' };
  const moduleOrder = Object.keys(moduleMeta);
  const speakingKeys = ['readAloud', 'repeatSentence', 'describeImage', 'retellLecture', 'answerShort'];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  function getHistory(key) {
    return (stats[key] && stats[key].history) ? stats[key].history : [];
  }

  function formatRelative(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.max(1, Math.round(diffMs / 60000));
    if (diffMin < 60) return `${diffMin} ${copy.minsAgo}`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${copy.hoursAgo}`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ${copy.daysAgo}`;
  }

  function avgFor(keys) {
    const vals = keys.map(k => Stats.getAvg(k)).filter(v => typeof v === 'number');
    if (!vals.length) return null;
    return Math.round(vals.reduce((sum, n) => sum + n, 0) / vals.length);
  }

  function findLatestActivity() {
    const all = [];
    Object.keys(moduleMeta).forEach(key => {
      getHistory(key).forEach(item => all.push({ key, ...item }));
    });
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    return all[0] || null;
  }

  function getPracticeStreak() {
    const days = new Set();
    Object.keys(moduleMeta).forEach(key => {
      getHistory(key).forEach(item => days.add(new Date(item.date).toISOString().slice(0, 10)));
    });
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const day = cursor.toISOString().slice(0, 10);
      if (!days.has(day)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function estimateMinutes(entry) {
    const key = entry.key;
    if (['writeEssay'].includes(key)) return 20;
    if (['summarizeWritten', 'summarizeSpoken'].includes(key)) return 10;
    if (['readAloud', 'repeatSentence', 'describeImage', 'retellLecture', 'answerShort'].includes(key)) return 3;
    return 2;
  }

  const latest = findLatestActivity();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = [];
  let weeklyQuestions = 0;
  Object.keys(moduleMeta).forEach(key => {
    getHistory(key).forEach(item => {
      const itemDay = new Date(item.date).toISOString().slice(0, 10);
      if (itemDay === todayKey) todaySessions.push({ key, ...item });
      if (new Date(item.date).getTime() >= weekAgo) weeklyQuestions++;
    });
  });
  const completedMins = todaySessions.reduce((sum, item) => sum + estimateMinutes(item), 0);
  const targetMins = 20;
  const goalPct = Math.min(100, Math.round((completedMins / targetMins) * 100));

  const rankedSkills = moduleOrder
    .map(key => ({ key, avg: Stats.getAvg(key), attempts: stats[key]?.attempts || 0 }))
    .filter(item => item.attempts > 0 && typeof item.avg === 'number')
    .sort((a, b) => a.avg - b.avg);
  const weakest = rankedSkills[0] || null;
  const speakingAvg = avgFor(speakingKeys);
  const weakestSkillTitle = weakest ? moduleMeta[weakest.key].title : 'No data yet';
  const continueMeta = latest ? moduleMeta[latest.key] : moduleMeta.repeatSentence;

  const cards = moduleOrder.map(key => {
    const meta = moduleMeta[key];
    const avg = Stats.getAvg(key);
    const last = getHistory(key).slice(-1)[0];
    const cta = last ? copy.resume : copy.start;
    return `
    <div class="module-card">
      <div class="module-head">
        <div class="module-icon">${meta.icon}</div>
        <div class="module-meta">
          <div class="module-title-row">
            <div class="module-title">${meta.title}</div>
            <span class="badge ${badgeColors[meta.badge]}">${meta.badge}</span>
          </div>
          <div class="module-desc">${meta.desc}</div>
        </div>
      </div>
      <div class="module-count">${meta.count} ${copy.items}</div>
      <div class="module-stats">${last ? `${copy.lastScoreShort}: ${avg ?? '--'}` : copy.newModule}</div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="navigate('${meta.page}')">${cta}</button>
      </div>
    </div>`;
  }).join('');

  $('#page-container').innerHTML = `
<div class="page-header dashboard-header">
  <div>
    <h1>PTE Academic</h1>
    <p>${copy.appSubtitle}</p>
  </div>
  <div class="lang-toggle" role="tablist" aria-label="Language switcher">
    <button class="lang-btn ${!isEn ? 'active' : ''}" onclick="setAppLang('zh')" aria-selected="${!isEn}">${copy.langZh}</button>
    <button class="lang-btn ${isEn ? 'active' : ''}" onclick="setAppLang('en')" aria-selected="${isEn}">${copy.langEn}</button>
  </div>
</div>

<section class="dashboard-section">
  <div class="insight-card compact-card">
    <div class="eyebrow">${copy.micTitle}</div>
    <div class="insight-title">${copy.micStatus}: ${micLabel}</div>
    <div class="insight-sub">${micState === 'granted' ? copy.micReady : copy.micNeeded}</div>
    ${micState === 'granted' ? '' : `<div style="margin-top:14px"><button class="btn btn-primary" onclick="requestMicPreauth('home')">${copy.micButton}</button></div>`}
  </div>
</section>

<section class="dashboard-section hero-grid">
  <div class="continue-card hero-main">
    <div class="eyebrow">${copy.continueEyebrow}</div>
    <div class="continue-title">${copy.continueTitle} ${continueMeta.title}</div>
    <div class="continue-meta">${copy.lastScore}: <strong>${latest ? latest.score : '--'}</strong> <span>•</span> ${latest ? `${copy.lastPracticed}: ${formatRelative(latest.date)}` : copy.startFirst}</div>
    <div class="continue-actions">
      <button class="btn btn-primary" onclick="navigate('${continueMeta.page}')">${copy.continueCta}</button>
    </div>
  </div>
  <div class="hero-side">
    <div class="insight-card compact-card">
      <div class="eyebrow">${copy.todayGoal}</div>
      <div class="insight-title">${completedMins} / ${targetMins} mins</div>
      <div class="goal-progress"><div class="goal-progress-fill" style="width:${goalPct}%"></div></div>
      <div class="insight-footer">
        <span>${copy.completed} ${goalPct}%</span>
        <button class="btn btn-outline" onclick="navigate('${continueMeta.page}')">${copy.resume}</button>
      </div>
    </div>
    <div class="insight-card compact-card">
      <div class="eyebrow">${copy.weakArea}</div>
      <div class="insight-title">${weakest ? moduleMeta[weakest.key].title : copy.notEnoughData}</div>
      <div class="insight-sub">${weakest ? `${moduleMeta[weakest.key].focus} · ${copy.focusNext}` : copy.unlockInsight}</div>
    </div>
  </div>
</section>

<section class="dashboard-section">
  <div class="stats-bar">
    <div class="stats-bar-item">
      <span class="stat-label">${copy.streak}</span>
      <strong class="stats-bar-value">${getPracticeStreak()}</strong>
    </div>
    <div class="stats-bar-item">
      <span class="stat-label">${copy.avgSpeaking}</span>
      <strong class="stats-bar-value">${speakingAvg ?? '--'}</strong>
    </div>
    <div class="stats-bar-item">
      <span class="stat-label">${copy.weakestSkill}</span>
      <strong class="stats-bar-value stats-bar-text">${weakest ? weakestSkillTitle : copy.noDataYet}</strong>
    </div>
    <div class="stats-bar-item">
      <span class="stat-label">${copy.questionsWeek}</span>
      <strong class="stats-bar-value">${weeklyQuestions}</strong>
    </div>
  </div>
</section>

<section class="dashboard-section">
  <div class="section-head">
    <div>
      <div class="section-title">${copy.practiceModules}</div>
      <div class="section-subtitle">${copy.practiceSubtitle}</div>
    </div>
  </div>
  <div class="module-grid">
    ${cards}
  </div>
</section>`;
};
