Pages['write-essay'] = function() {
  let qIndex=0, timerObj=null;
  const questions=DB.writeEssay;

  function render(){
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Write Essay <span class="badge badge-writing">Writing</span></h1>
  <p>Write an essay in 20 minutes. Aim for ${q.wordRange[0]}–${q.wordRange[1]} words.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Prompt ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>20:00</div>
  </div>
  <div class="q-instruction">📌 Write ${q.wordRange[0]}–${q.wordRange[1]} words. Structure: Introduction → Body → Conclusion.</div>
  <div class="q-text" style="font-weight:500">${q.prompt}</div>
  <div style="background:var(--surface);border:1px solid var(--primary);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--primary)">
    💡 <strong>Structure tip:</strong> Introduction (2–3 sentences) → Point 1 with example → Point 2 with example → Conclusion (2–3 sentences)
  </div>
  <textarea class="textarea" id="answer" rows="14" placeholder="Write your essay here..." oninput="WE_update()"></textarea>
  <div class="word-count" id="wc-label">0 / ${q.wordRange[1]} words</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="WE_submit()">Submit Essay</button>
    <button class="btn btn-secondary" onclick="WE_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="WE_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
    timerObj=new CountdownTimer($('#timer-el'),1200,null,()=>WE_submit(true)); timerObj.start();
  }

  window.WE_update=function(){
    const q=questions[qIndex]; const wc=countWords($('#answer').value);
    const el=$('#wc-label'); el.textContent=`${wc} / ${q.wordRange[1]} words`;
    el.className='word-count'+(wc>=q.wordRange[0]&&wc<=q.wordRange[1]?' ok':wc>q.wordRange[1]?' warn':'');
  };

  window.WE_submit=function(auto=false){
    timerObj&&timerObj.stop();
    const q=questions[qIndex]; const text=$('#answer').value;
    const result=Scorer.writeEssay(text,q.prompt,q.wordRange);
    Stats.record('writeEssay',result.pte,90);
    const sentences=text.split(/[.!?]+/).filter(s=>s.trim()).length;
    const paragraphs=text.split(/\n\n+/).filter(p=>p.trim()).length;
    $('#feedback-area').innerHTML=`
${Scorer.renderPanel(result)}
<div class="card" style="margin-top:12px">
  <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px">
    <span>📝 Words: <strong>${result.words}</strong></span>
    <span>📖 Sentences: <strong>${sentences}</strong></span>
    <span>🗂️ Paragraphs: <strong>${paragraphs}</strong></span>
    ${!result.inRange?`<span style="color:var(--warning)">⚠️ Aim for ${q.wordRange[0]}–${q.wordRange[1]} words</span>`:''}
    ${auto?'<span style="color:var(--warning)">⏱️ Auto-submitted</span>':''}
  </div>
</div>
<div class="retry-row"><button class="btn btn-refresh" onclick="WE_retry()">↻ Retry This Question</button></div>`;
  };

  window.WE_retry=()=>{timerObj&&timerObj.stop(); render();};
  window.WE_prev=()=>{qIndex=Math.max(0,qIndex-1);timerObj&&timerObj.stop();render();};
  window.WE_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1);timerObj&&timerObj.stop();render();};
  render();
};
