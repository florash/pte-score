Pages['walkman'] = function() {
  // ── Build Playlist ────────────────────────────────────────────────────────
  const PLAYLIST = [];

  DB.writeDictation.forEach((q, i) => PLAYLIST.push({
    id: q.id, icon: '✏️', type: 'Write Dictation', cat: 'listening',
    title: `Dictation #${i+1}`, tag: q.tag || '', text: q.sentence,
  }));
  DB.readAloud.forEach((q, i) => PLAYLIST.push({
    id: q.id, icon: '📖', type: 'Read Aloud', cat: 'speaking',
    title: `Read Aloud #${i+1}`, tag: q.tag || '', text: q.text,
  }));
  DB.repeatSentence.forEach((q, i) => PLAYLIST.push({
    id: q.id, icon: '🔁', type: 'Repeat Sentence', cat: 'speaking',
    title: `Sentence #${i+1}`, tag: q.tag || '', text: q.text,
  }));

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIdx = 0;
  let isPlaying = false;
  let isLooping = true;
  let speed = 1.0;
  let filterCat = 'all';
  let progressTimer = null;
  let progressStart = 0;
  let estimatedDuration = 0;

  function filtered() {
    return filterCat === 'all' ? PLAYLIST : PLAYLIST.filter(q => q.cat === filterCat);
  }

  function currentItem() { return filtered()[currentIdx]; }

  function estDuration(text, spd) {
    return Math.max(2, Math.round(text.length / (14 * spd)));
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  function speak() {
    const item = currentItem();
    if (!item) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(item.text);
    utt.rate = speed;
    utt.lang = 'en-AU';
    estimatedDuration = estDuration(item.text, speed);
    progressStart = Date.now();
    startProgressTimer();
    utt.onend = () => {
      stopProgressTimer();
      setProgress(100);
      if (!isPlaying) return;
      setTimeout(() => {
        const list = filtered();
        if (currentIdx < list.length - 1) {
          currentIdx++;
        } else if (isLooping) {
          currentIdx = 0;
        } else {
          isPlaying = false;
          renderControls();
          return;
        }
        renderPlayer();
        speak();
      }, 600);
    };
    utt.onerror = () => { isPlaying = false; renderControls(); };
    window.speechSynthesis.speak(utt);
  }

  function pause() { window.speechSynthesis.pause(); stopProgressTimer(); }
  function resume() { window.speechSynthesis.resume(); startProgressTimer(); }

  function startProgressTimer() {
    stopProgressTimer();
    progressTimer = setInterval(() => {
      const elapsed = (Date.now() - progressStart) / 1000;
      const pct = Math.min(99, (elapsed / estimatedDuration) * 100);
      setProgress(pct);
    }, 200);
  }
  function stopProgressTimer() { clearInterval(progressTimer); progressTimer = null; }
  function setProgress(pct) {
    const bar = document.getElementById('wm-progress-fill');
    const time = document.getElementById('wm-time');
    if (bar) bar.style.width = pct + '%';
    if (time) {
      const elapsed = Math.min(estimatedDuration, Math.round((pct / 100) * estimatedDuration));
      time.textContent = fmtTime(elapsed) + ' / ' + fmtTime(estimatedDuration);
    }
  }
  function fmtTime(s) { return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderPlayer() {
    const item = currentItem();
    const np = document.getElementById('wm-now-playing');
    if (!np || !item) return;
    np.innerHTML = `
      <div class="wm-track-icon">${item.icon}</div>
      <div class="wm-track-info">
        <div class="wm-track-title">${item.title}</div>
        <div class="wm-track-meta">${item.type}${item.tag ? ' · ' + item.tag : ''}</div>
      </div>`;
    const txt = document.getElementById('wm-text-preview');
    if (txt) txt.textContent = item.text;
    renderControls();
    renderList();
    setProgress(0);
    progressStart = Date.now();
    estimatedDuration = estDuration(item.text, speed);
    setProgress(0);
  }

  function renderControls() {
    const playBtn = document.getElementById('wm-play-btn');
    const loopBtn = document.getElementById('wm-loop-btn');
    if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶';
    if (loopBtn) { loopBtn.textContent = '🔁'; loopBtn.style.opacity = isLooping ? '1' : '0.35'; }
    const speeds = document.querySelectorAll('.wm-speed-btn');
    speeds.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.speed) === speed));
  }

  function renderList() {
    const list = filtered();
    const container = document.getElementById('wm-list');
    if (!container) return;
    container.innerHTML = list.map((item, i) => `
      <div class="wm-list-item ${i === currentIdx ? 'active' : ''}" onclick="WM_goto(${i})">
        <span class="wm-li-icon">${item.icon}</span>
        <div class="wm-li-info">
          <div class="wm-li-title">${item.title}</div>
          <div class="wm-li-meta">${item.type}${item.tag ? ' · ' + item.tag : ''}</div>
        </div>
        <span class="wm-li-dur">${fmtTime(estDuration(item.text, speed))}</span>
      </div>`).join('');
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  window.WM_play = function() {
    if (isPlaying) {
      isPlaying = false;
      pause();
    } else {
      isPlaying = true;
      if (window.speechSynthesis.paused) resume();
      else speak();
    }
    renderControls();
  };
  window.WM_prev = function() {
    stopProgressTimer(); window.speechSynthesis.cancel();
    currentIdx = Math.max(0, currentIdx - 1);
    renderPlayer();
    if (isPlaying) speak();
  };
  window.WM_next = function() {
    stopProgressTimer(); window.speechSynthesis.cancel();
    const list = filtered();
    currentIdx = isLooping ? (currentIdx + 1) % list.length : Math.min(list.length - 1, currentIdx + 1);
    renderPlayer();
    if (isPlaying) speak();
  };
  window.WM_loop = function() {
    isLooping = !isLooping;
    renderControls();
  };
  window.WM_setSpeed = function(s) {
    speed = parseFloat(s);
    renderControls();
    if (isPlaying) { window.speechSynthesis.cancel(); speak(); }
  };
  window.WM_goto = function(i) {
    stopProgressTimer(); window.speechSynthesis.cancel();
    currentIdx = i;
    renderPlayer();
    isPlaying = true;
    speak();
    renderControls();
  };
  window.WM_filter = function(cat) {
    filterCat = cat;
    currentIdx = 0;
    document.querySelectorAll('.wm-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === cat));
    window.speechSynthesis.cancel();
    isPlaying = false;
    renderPlayer();
    renderControls();
  };

  // ── Initial Render ────────────────────────────────────────────────────────
  const item0 = filtered()[0] || PLAYLIST[0];
  estimatedDuration = item0 ? estDuration(item0.text, speed) : 0;

  $('#page-container').innerHTML = `
<div class="page-header">
  <h1>随身听 <span class="badge badge-listening">Walkman</span></h1>
</div>
<div class="wm-player card">
  <div id="wm-now-playing" class="wm-now-playing"></div>
  <div class="wm-text-box">
    <div id="wm-text-preview" class="wm-text-preview"></div>
  </div>
  <div class="wm-progress-row">
    <div class="wm-progress-track" id="wm-progress-track">
      <div class="wm-progress-fill" id="wm-progress-fill"></div>
    </div>
    <span class="wm-time" id="wm-time">0:00 / 0:00</span>
  </div>
  <div class="wm-controls">
    <div class="wm-speed-btns">
      ${[0.75,1.0,1.25,1.5].map(s=>`<button class="wm-speed-btn ${s===1.0?'active':''}" data-speed="${s}" onclick="WM_setSpeed(${s})">${s}x</button>`).join('')}
    </div>
    <div class="wm-main-controls">
      <button class="wm-ctrl-btn" onclick="WM_prev()">⏮</button>
      <button class="wm-play-btn" id="wm-play-btn" onclick="WM_play()">▶</button>
      <button class="wm-ctrl-btn" onclick="WM_next()">⏭</button>
    </div>
    <button class="wm-loop-btn" id="wm-loop-btn" onclick="WM_loop()" title="循环">🔁</button>
  </div>
</div>
<div class="wm-filter-row">
  <button class="wm-filter-btn active" data-cat="all" onclick="WM_filter('all')">全部</button>
  <button class="wm-filter-btn" data-cat="listening" onclick="WM_filter('listening')">听力</button>
  <button class="wm-filter-btn" data-cat="speaking" onclick="WM_filter('speaking')">口语</button>
</div>
<div id="wm-list" class="wm-list"></div>`;

  renderPlayer();
};
