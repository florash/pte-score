Pages['mock-test'] = function() {
  $('#page-container').innerHTML = `
<div class="page-header">
  <h1>模拟考试 Mock Test <span class="badge badge-speaking">Full Test</span></h1>
  <p>Complete a timed full-length PTE mock test.</p>
</div>
<div class="grid-3" style="margin-bottom:24px">
  <div class="skill-card" onclick="MT_start('speaking')">
    <div class="skill-icon">🎤</div>
    <div class="skill-title">Speaking Section</div>
    <div class="skill-desc">RA × 2 · RS × 2 · DI × 1 · RL × 1 · ASQ × 2</div>
    <div class="skill-count">~30 minutes</div>
  </div>
  <div class="skill-card" onclick="MT_start('writing')">
    <div class="skill-icon">✍️</div>
    <div class="skill-title">Writing Section</div>
    <div class="skill-desc">SWT × 2 · Essay × 1</div>
    <div class="skill-count">~30 minutes</div>
  </div>
  <div class="skill-card" onclick="MT_start('reading')">
    <div class="skill-icon">📖</div>
    <div class="skill-title">Reading Section</div>
    <div class="skill-desc">RWFIB · MCSR · MCMR · ROP · RFIB</div>
    <div class="skill-count">~32 minutes</div>
  </div>
  <div class="skill-card" onclick="MT_start('listening')">
    <div class="skill-icon">🎧</div>
    <div class="skill-title">Listening Section</div>
    <div class="skill-desc">SST · FBL · HCS · SMW · HI · WFD</div>
    <div class="skill-count">~45 minutes</div>
  </div>
  <div class="skill-card" onclick="MT_start('mini')">
    <div class="skill-icon">⚡</div>
    <div class="skill-title">Mini Mock (Quick)</div>
    <div class="skill-desc">One question from each section</div>
    <div class="skill-count">~15 minutes</div>
  </div>
</div>

<!-- PTE Exam Structure -->
<div class="card" style="margin-bottom:16px">
  <div class="card-title" style="margin-bottom:16px">📋 PTE 考试结构 Exam Structure</div>

  <!-- Part 1 -->
  <div class="mt-part-header mt-part-speaking">
    <span class="mt-part-badge">Part 1</span>
    <span class="mt-part-name">Speaking &amp; Writing</span>
    <span class="mt-part-time">77 – 93 min</span>
  </div>
  <table class="mt-table">
    <thead><tr><th>题型 Item Type</th><th>题数</th><th>时间</th></tr></thead>
    <tbody>
      <tr><td>📖 Read Aloud</td><td>6 – 9</td><td>~30–40 s / 题</td></tr>
      <tr><td>🔁 Repeat Sentence</td><td>10 – 12</td><td>~15 s / 题</td></tr>
      <tr><td>🖼️ Describe Image</td><td>6 – 7</td><td>25 s 准备 + 40 s 答</td></tr>
      <tr><td>🎙️ Re-tell Lecture</td><td>3 – 4</td><td>10 s 准备 + 40 s 答</td></tr>
      <tr><td>❓ Answer Short Q.</td><td>5 – 6</td><td>~10 s / 题</td></tr>
      <tr class="mt-row-divider"><td>📝 Summarize Written Text</td><td>1 – 2</td><td>10 min / 题</td></tr>
      <tr><td>✍️ Write Essay</td><td>1 – 2</td><td>20 min / 题</td></tr>
    </tbody>
  </table>

  <!-- Part 2 -->
  <div class="mt-part-header mt-part-reading" style="margin-top:18px">
    <span class="mt-part-badge">Part 2</span>
    <span class="mt-part-name">Reading</span>
    <span class="mt-part-time">32 – 41 min</span>
  </div>
  <table class="mt-table">
    <thead><tr><th>题型 Item Type</th><th>题数</th><th>时间</th></tr></thead>
    <tbody>
      <tr><td>🔤 R&amp;W Fill in the Blanks</td><td>5 – 6</td><td>–</td></tr>
      <tr><td>🔘 MC Single Answer</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>☑️ MC Multiple Answers</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>🔀 Re-order Paragraphs</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>📋 Reading Fill in Blanks</td><td>4 – 5</td><td>–</td></tr>
    </tbody>
  </table>

  <!-- Part 3 -->
  <div class="mt-part-header mt-part-listening" style="margin-top:18px">
    <span class="mt-part-badge">Part 3</span>
    <span class="mt-part-name">Listening</span>
    <span class="mt-part-time">45 – 57 min</span>
  </div>
  <table class="mt-table">
    <thead><tr><th>题型 Item Type</th><th>题数</th><th>时间</th></tr></thead>
    <tbody>
      <tr><td>🎧 Summarize Spoken Text</td><td>2 – 3</td><td>10 min / 题</td></tr>
      <tr><td>☑️ MC Multiple Answers</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>🎵 Fill in the Blanks</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>💡 Highlight Correct Summary</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>🔘 MC Single Answer</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>🔍 Select Missing Word</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>❌ Highlight Incorrect Words</td><td>2 – 3</td><td>–</td></tr>
      <tr><td>✏️ Write from Dictation</td><td>3 – 4</td><td>~3 min / 题</td></tr>
    </tbody>
  </table>
</div>

<div class="card">
  <div class="card-title">Recent Mock Test Scores</div>
  ${generateMockHistory()}
</div>`;
};

function generateMockHistory() {
  const stats=Stats.get();
  const types=['readAloud','repeatSentence','summarizeWritten','writeEssay','writeDictation'];
  const labels=['Read Aloud','Repeat Sentence','Summarize Written','Write Essay','Write Dictation'];
  let rows=types.map((t,i)=>{
    const avg=Stats.getAvg(t); const d=stats[t];
    return `<div class="score-bar-row">
<div class="score-bar-label">${labels[i]}</div>
<div class="score-bar-track"><div class="score-bar-fill" style="width:${avg||0}%;background:${Scorer.gradeColor(avg||0)}"></div></div>
<div class="score-bar-val">${avg!=null?avg:'--'}</div>
</div>`;
  }).join('');
  return rows || '<div class="empty-state"><div class="empty-icon">📊</div><p>Complete exercises to see your stats here</p></div>';
}

window.MT_start = function(type) {
  const map = { speaking:'read-aloud', writing:'summarize-written', reading:'rw-fill-blanks', listening:'summarize-spoken', mini:'read-aloud' };
  navigate(map[type]);
  showToast(`Starting ${type} section — good luck! 🎯`);
};
