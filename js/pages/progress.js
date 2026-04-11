Pages['progress'] = function() {
  const lang = window.getAppLang ? getAppLang() : 'zh';
  const isEn = lang === 'en';
  const stats = Stats.get();
  const allTypes = [
    {key:'readAloud',label:'Read Aloud',icon:'📖',category:'Speaking'},
    {key:'repeatSentence',label:'Repeat Sentence',icon:'🔁',category:'Speaking'},
    {key:'describeImage',label:'Describe Image',icon:'🖼️',category:'Speaking'},
    {key:'answerShort',label:'Answer Short Q',icon:'❓',category:'Speaking'},
    {key:'summarizeWritten',label:'Summarize Written',icon:'📝',category:'Writing'},
    {key:'writeEssay',label:'Write Essay',icon:'✍️',category:'Writing'},
    {key:'rwFillBlanks',label:'R&W Fill Blanks',icon:'🔤',category:'Reading'},
    {key:'mcSingleReading',label:'MC Single (R)',icon:'🔘',category:'Reading'},
    {key:'mcMultipleReading',label:'MC Multiple (R)',icon:'☑️',category:'Reading'},
    {key:'reorderParagraphs',label:'Re-order Paragraphs',icon:'🔀',category:'Reading'},
    {key:'rFillBlanks',label:'Reading Fill Blanks',icon:'📋',category:'Reading'},
    {key:'summarizeSpoken',label:'Summarize Spoken',icon:'🎧',category:'Listening'},
    {key:'mcSingleListening',label:'MC Single (L)',icon:'🔘',category:'Listening'},
    {key:'mcMultipleListening',label:'MC Multiple (L)',icon:'☑️',category:'Listening'},
    {key:'fillBlanksListening',label:'Fill Blanks (L)',icon:'🎵',category:'Listening'},
    {key:'highlightSummary',label:'Highlight Summary',icon:'💡',category:'Listening'},
    {key:'selectMissing',label:'Select Missing',icon:'🔍',category:'Listening'},
    {key:'highlightIncorrect',label:'Highlight Incorrect',icon:'❌',category:'Listening'},
    {key:'writeDictation',label:'Write Dictation',icon:'✏️',category:'Listening'},
  ];

  const total=Object.values(stats).reduce((s,v)=>s+(v.attempts||0),0);
  const practised=allTypes.filter(t=>stats[t.key]&&stats[t.key].attempts>0).length;
  const avgAll=practised?Math.round(allTypes.filter(t=>stats[t.key]).reduce((s,t)=>s+(Stats.getAvg(t.key)||0),0)/practised):0;

  const categories=['Speaking','Writing','Reading','Listening'];
  const categoryLabels = {
    Speaking: isEn ? 'Speaking' : '口语',
    Writing: isEn ? 'Writing' : '写作',
    Reading: isEn ? 'Reading' : '阅读',
    Listening: isEn ? 'Listening' : '听力',
  };

  const catRows = categories.map(cat=>{
    const catTypes=allTypes.filter(t=>t.category===cat);
    const done=catTypes.filter(t=>stats[t.key]);
    const catAvg=done.length?Math.round(done.reduce((s,t)=>s+(Stats.getAvg(t.key)||0),0)/done.length):null;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
<span style="font-weight:600">${categoryLabels[cat]}</span>
<span style="color:var(--text-light);font-size:13px">${done.length}/${catTypes.length} ${t('practiced')}</span>
<span style="font-weight:700;color:${catAvg?Scorer.gradeColor(catAvg):'var(--text-light)'}">${catAvg!=null?catAvg+t('pts'):'--'}</span>
</div>`;
  }).join('');

  const typeRows=allTypes.map(t=>{
    const d=stats[t.key]; const avg=Stats.getAvg(t.key);
    return `<div class="score-bar-row" style="padding:6px 0">
<div class="score-bar-label" style="width:160px;font-size:12.5px">${t.icon} ${t.label}</div>
<div class="score-bar-track"><div class="score-bar-fill" style="width:${avg||0}%;background:${Scorer.gradeColor(avg||0)}"></div></div>
<div class="score-bar-val" style="font-size:12.5px">${avg!=null?avg:'--'}</div>
<div style="width:60px;text-align:right;font-size:11px;color:var(--text-light)">${d?d.attempts+'x':''}</div>
</div>`;
  }).join('');

  $('#page-container').innerHTML=`
<div class="page-header">
  <h1>${t('progress_title')} <span class="badge badge-speaking">${t('stats')}</span></h1>
  <p>${t('progress_subtitle')}</p>
</div>
<div class="grid-4" style="margin-bottom:24px">
  <div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-label">${t('total_attempts')}</div><div class="stat-value">${total}</div></div>
  <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-label">${t('types_practiced')}</div><div class="stat-value">${practised}</div><div class="stat-sub">${t('of_types')}</div></div>
  <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-label">${t('overall_average')}</div><div class="stat-value" style="color:${Scorer.gradeColor(avgAll)}">${avgAll||'--'}</div></div>
  <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-label">${t('est_pte_score')}</div><div class="stat-value">${avgAll?Math.round(avgAll*0.9):'--'}</div><div class="stat-sub">${t('pts_90')}</div></div>
</div>
<div class="grid-2">
  <div class="card">
    <div class="card-title">${t('by_section')}</div>
    ${catRows}
    <div style="margin-top:12px">
      <button class="btn btn-secondary" onclick="Stats.save({});navigate('progress');showToast('${t('progress_reset')}')">${t('reset_all_stats')}</button>
    </div>
  </div>
  <div class="card">
    <div class="card-title">${t('all_types')}</div>
    ${typeRows}
  </div>
</div>`;
};
