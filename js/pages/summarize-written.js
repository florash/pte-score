Pages['summarize-written'] = function() {
  let qIndex=0, timerObj=null;
  const questions=DB.summarizeWritten;

  function render(){
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Summarize Written Text <span class="badge badge-writing">Writing</span></h1>
  <p>Read the passage and write a one-sentence summary in 5–10 minutes.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>10:00</div>
  </div>
  <div class="q-instruction">📌 Write ONE sentence. Range: ${q.wordRange[0]}–${q.wordRange[1]} words.</div>
  <div style="font-weight:600;margin-bottom:8px;font-size:14px">${q.title}</div>
  <div class="q-text">${q.text}</div>
  <textarea class="textarea" id="answer" rows="3" placeholder="Write your one-sentence summary here..." oninput="SWT_update()"></textarea>
  <div class="word-count" id="wc-label">0 words</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="SWT_submit()">Submit Answer</button>
    <button class="btn btn-secondary" onclick="SWT_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="SWT_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
    timerObj=new CountdownTimer($('#timer-el'),600,null,()=>SWT_submit(true)); timerObj.start();
  }

  window.SWT_update=function(){
    const q=questions[qIndex];
    const wc=countWords($('#answer').value);
    const el=$('#wc-label');
    el.textContent=`${wc} words`;
    el.className='word-count'+(wc>=q.wordRange[0]&&wc<=q.wordRange[1]?' ok':wc>q.wordRange[1]?' warn':'');
  };

  window.SWT_submit=function(auto=false){
    timerObj&&timerObj.stop();
    const q=questions[qIndex];
    const text=$('#answer').value;
    const result=Scorer.summarizeWritten(text,q.text,q.wordRange);
    Stats.record('summarizeWritten',result.pte,90);
    // Count sentences
    const sentences=text.split(/[.!?]+/).filter(s=>s.trim()).length;
    const oneSentence=sentences===1;
    $('#feedback-area').innerHTML=`
${Scorer.renderPanel(result)}
<div class="card" style="margin-top:12px">
  <div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${oneSentence?'✅':'❌'}</span><span>One sentence: ${oneSentence?'Yes':'No — found '+sentences+' sentences'}</span></div>
    <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${result.inRange?'✅':'⚠️'}</span><span>Word count: ${result.words} (range: ${q.wordRange[0]}–${q.wordRange[1]})</span></div>
  </div>
  ${auto?'<div style="color:var(--warning);font-size:13px;margin-top:8px">⏱️ Auto-submitted when time ran out.</div>':''}
</div>
<div class="retry-row"><button class="btn btn-refresh" onclick="SWT_retry()">↻ Retry This Question</button></div>`;
  };

  window.SWT_retry=()=>{timerObj&&timerObj.stop(); render();};
  window.SWT_prev=()=>{qIndex=Math.max(0,qIndex-1);timerObj&&timerObj.stop();render();};
  window.SWT_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1);timerObj&&timerObj.stop();render();};
  render();
};
