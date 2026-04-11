// ── App Router ─────────────────────────────────────────────────────────────
// Pages is declared inline in index.html before page modules load

window.I18N = {
  zh: {
    nav_home: 'Home',
    nav_progress: 'Progress',
    nav_study_plan: 'Study Plan',
    nav_mock_test: '模拟考试',
    label_home: '主页',
    label_speaking: '口语 Speaking',
    label_writing: '写作 Writing',
    label_reading: '阅读 Reading',
    label_listening: '听力 Listening',
    label_mixed: '综合',
    theme_next_dark: '切换到深色模式',
    theme_next_pink: '切换到粉色模式',
    theme_next_black_pink: '切换到黑粉模式',
    theme_next_light: '切换到默认蓝色模式',
    page_not_found: '页面未找到',
    progress_title: '我的进度',
    progress_subtitle: '追踪你在所有 PTE 题型中的练习表现。',
    stats: 'Stats',
    total_attempts: '总练习次数',
    types_practiced: '已练题型',
    of_types: '共 19 种题型',
    overall_average: '平均分',
    est_pte_score: '预估 PTE 分数',
    pts_90: '/ 90 分',
    by_section: '按部分查看',
    practiced: '已练习',
    pts: '分',
    reset_all_stats: '重置全部数据',
    progress_reset: '进度已重置',
    all_types: '全部题型',
    study_plan_title: '学习计划',
    study_plan_subtitle: '一个轻量的学习计划页，帮助你安排每周 PTE 练习。',
    weekly_focus: '本周重点',
    best_fast_gain: '更适合快速提分',
    current_practice_load: '当前练习量',
    total_completed_sessions: '累计完成练习次数',
    suggested_session: '建议单次时长',
    speaking_listening_block: '2 个口语 + 1 个听力模块',
    recommended_daily_structure: '推荐每日练习结构',
    plan_step_1: '1. 先做一个口语热身：Read Aloud 或 Repeat Sentence',
    plan_step_2: '2. 接一个高准确率听力任务：Write From Dictation 或 Fill in the Blanks',
    plan_step_3: '3. 最后做一个长题：Summarize Written Text、Essay 或 Re-tell Lecture',
    back_dashboard: '返回首页',
    start_speaking_block: '开始口语训练',
  },
  en: {
    nav_home: 'Home',
    nav_progress: 'Progress',
    nav_study_plan: 'Study Plan',
    nav_mock_test: 'Mock Test',
    label_home: 'Home',
    label_speaking: 'Speaking',
    label_writing: 'Writing',
    label_reading: 'Reading',
    label_listening: 'Listening',
    label_mixed: 'Mixed',
    theme_next_dark: 'Switch to dark mode',
    theme_next_pink: 'Switch to pink mode',
    theme_next_black_pink: 'Switch to black pink mode',
    theme_next_light: 'Switch to default blue mode',
    page_not_found: 'Page not found',
    progress_title: 'My Progress',
    progress_subtitle: 'Track your performance across all PTE question types.',
    stats: 'Stats',
    total_attempts: 'Total Attempts',
    types_practiced: 'Types Practiced',
    of_types: 'of 19 types',
    overall_average: 'Overall Average',
    est_pte_score: 'Est. PTE Score',
    pts_90: '/ 90 pts',
    by_section: 'By Section',
    practiced: 'practiced',
    pts: 'pts',
    reset_all_stats: 'Reset All Stats',
    progress_reset: 'Progress reset',
    all_types: 'All Types',
    study_plan_title: 'Study Plan',
    study_plan_subtitle: 'A lightweight study planning view to help structure your weekly PTE practice.',
    weekly_focus: 'Weekly Focus',
    best_fast_gain: 'Best for fast score gain',
    current_practice_load: 'Current Practice Load',
    total_completed_sessions: 'Total completed sessions',
    suggested_session: 'Suggested Session',
    speaking_listening_block: '2 speaking + 1 listening block',
    recommended_daily_structure: 'Recommended Daily Structure',
    plan_step_1: '1. Warm up with one speaking item: Read Aloud or Repeat Sentence',
    plan_step_2: '2. Do one high-accuracy listening task: Write From Dictation or Fill in the Blanks',
    plan_step_3: '3. Finish with one longer task: Summarize Written Text, Essay, or Re-tell Lecture',
    back_dashboard: 'Back to Dashboard',
    start_speaking_block: 'Start Speaking Block',
  }
};

function t(key) {
  const lang = getAppLang();
  return (window.I18N[lang] && window.I18N[lang][key]) || (window.I18N.en && window.I18N.en[key]) || key;
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

function getPageSection(page) {
  const sections = {
    speaking: ['read-aloud','repeat-sentence','describe-image','retell-lecture','answer-short'],
    writing:  ['summarize-written','write-essay'],
    reading:  ['rw-fill-blanks','mc-single-reading','mc-multiple-reading','reorder-paragraphs','r-fill-blanks'],
    listening:['summarize-spoken','mc-single-listening','mc-multiple-listening','fill-blanks-listening','highlight-summary','select-missing','highlight-incorrect','write-dictation'],
  };
  for (const [section, pages] of Object.entries(sections)) {
    if (pages.includes(page)) return section;
  }
  return 'home';
}

function navigate(page) {
  // Update active nav item
  $$('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update bottom nav active tab
  const section = getPageSection(page);
  $$('.bottom-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  // Close drawer on mobile
  if (window.innerWidth <= 640) closeDrawer();

  // Stop any running speech
  if(window.speechSynthesis) window.speechSynthesis.cancel();

  // Render page
  const fn = Pages[page];
  if (fn) {
    fn();
  } else {
    $('#page-container').innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><p>${t('page_not_found')}: "${page}".</p></div>`;
  }

  // Store current page
  sessionStorage.setItem('pte_page', page);
  // Scroll to top
  document.getElementById('main').scrollTop = 0;
}

function refreshCurrentPage() {
  const currentPage = sessionStorage.getItem('pte_page') || 'home';
  const fn = Pages[currentPage];
  if (fn) fn();
}

function toggleDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('drawer-overlay');
  const isOpen = sidebar.classList.toggle('drawer-open');
  overlay.classList.toggle('visible', isOpen);
}

function closeDrawer() {
  document.getElementById('sidebar').classList.remove('drawer-open');
  document.getElementById('drawer-overlay').classList.remove('visible');
}

function getAppLang() {
  return localStorage.getItem('pte_lang') || 'zh';
}

function setAppLang(lang) {
  const next = lang === 'en' ? 'en' : 'zh';
  localStorage.setItem('pte_lang', next);
  document.documentElement.lang = next === 'en' ? 'en' : 'zh';
  applyStaticI18n();
  const theme = document.body.classList.contains('black-pink') ? 'black-pink' :
    document.body.classList.contains('pink') ? 'pink' :
    document.body.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(theme);
  const currentPage = sessionStorage.getItem('pte_page') || 'home';
  const fn = Pages[currentPage];
  if (fn) fn();
}

// ── Theme ──────────────────────────────────────────────────────────────────
const THEMES = ['light','pte-official','dark','ocean','forest','lavender','pink','black-pink','grey'];
const THEME_ICONS = { light:'🎓', 'pte-official':'🌙', dark:'🌊', ocean:'🌿', forest:'💜', lavender:'🌸', pink:'🖤', 'black-pink':'⬜', grey:'☀️' };
const THEME_LABELS = { light:'PTE官方', 'pte-official':'暗色', dark:'海洋', ocean:'森林', forest:'薰衣草', lavender:'淡粉 →', pink:'粉黑 →', 'black-pink':'灰白 →', grey:'默认 →' };

function applyTheme(theme) {
  document.body.classList.remove(...THEMES);
  if (theme !== 'light') document.body.classList.add(theme);
  localStorage.setItem('pte_theme', theme);
  const icon = THEME_ICONS[theme] || '🌙';
  const label = THEME_LABELS[theme] || 'Light';
  [document.getElementById('theme-toggle'), document.getElementById('theme-toggle-mobile')]
    .forEach(btn => { if (btn) { btn.textContent = icon; btn.title = `切换到 ${label}`; } });
}

function toggleTheme() {
  const current = THEMES.find(t => document.body.classList.contains(t)) || 'light';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if(window.MicAccess) MicAccess.syncPermissionState();

  // Apply saved theme
  const savedTheme = localStorage.getItem('pte_theme');
  const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  document.documentElement.lang = getAppLang() === 'en' ? 'en' : 'zh';
  applyStaticI18n();

  // Bind nav items
  $$('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  if (window.AuthUI) {
    AuthUI.ensureModal();
    AuthUI.renderTriggers();
  }
  if (window.AppAuth) await AppAuth.init();
  if (window.AuthUI) AuthUI.renderTriggers();

  // Restore last page or default to home
  const saved = sessionStorage.getItem('pte_page') || 'home';
  navigate(saved);

  if (window.MicAccess) MicAccess.preAuthorizeOnEntry();

  // Preload voices for TTS
  if(window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
});

window.requestMicPreauth = async function(redirectPage = '') {
  if (!window.MicAccess) return false;
  const ok = await MicAccess.preAuthorize();
  await MicAccess.syncPermissionState();
  if (ok) showToast('Microphone is ready for speaking practice.');
  const currentPage = redirectPage || sessionStorage.getItem('pte_page') || 'home';
  const fn = Pages[currentPage];
  if (fn) fn();
  return ok;
};
