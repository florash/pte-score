// ── Summarize Spoken Text ─────────────────────────────────────────────────
Pages['summarize-spoken'] = function() {
  let qIndex=0, timerObj=null;
  let player=null;
  const questions=DB.summarizeSpoken;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Summarize Spoken Text <span class="badge badge-listening">Listening</span></h1>
  <p>Listen to a recording and write a summary in 50–70 words.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>10:00</div>
  </div>
  <div class="q-instruction">🎧 Listen once, take notes, then write your summary. Range: ${q.wordRange[0]}–${q.wordRange[1]} words.</div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="SST_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">${q.title}</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
      <div class="audio-time"><span>0:00</span><span>${formatTime(q.duration)}</span></div>
    </div>
  </div>
  <textarea class="textarea" id="notes" rows="2" placeholder="Quick notes..." style="margin-bottom:12px"></textarea>
  <textarea class="textarea" id="answer" rows="5" placeholder="Write your summary here..." oninput="SST_update()"></textarea>
  <div class="word-count" id="wc-label">0 words</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="SST_submit()">Submit</button>
    <button class="btn btn-secondary" onclick="SST_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="SST_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
    timerObj=new CountdownTimer($('#timer-el'),600,null,()=>SST_submit(true)); timerObj.start();
  }

  window.SST_play=function(){
    const btn=$('#play-btn');
    const q=questions[qIndex]; const fill=$('#ap-fill');
    if(!player){
      player=createSpeechPlayer({
        text:q.transcript,
        opts:{rate:0.88},
        onProgress:(pct)=>{fill.style.width=`${pct*100}%`;},
        onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';},
        onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; }
      });
      player.play();
      return;
    }
    player.toggle();
  };
  window.SST_update=function(){
    const q=questions[qIndex]; const wc=countWords($('#answer').value);
    const el=$('#wc-label'); el.textContent=`${wc} words`;
    el.className='word-count'+(wc>=q.wordRange[0]&&wc<=q.wordRange[1]?' ok':wc>q.wordRange[1]?' warn':'');
  };
  window.SST_submit=function(auto=false){
    timerObj&&timerObj.stop();
    const q=questions[qIndex]; const text=$('#answer').value;
    const result=Scorer.summarizeSpoken(text,q.transcript,q.wordRange);
    Stats.record('summarizeSpoken',result.pte,90);
    $('#feedback-area').innerHTML=`
${Scorer.renderPanel(result)}
${auto?'<div style="color:var(--warning);font-size:13px;margin:6px 0 0 2px">⏱️ Auto-submitted when time ran out.</div>':''}
<div class="card" style="margin-top:12px"><div class="card-title">Original transcript</div><div class="transcript-box">${q.transcript}</div></div>
<div class="retry-row"><button class="btn btn-refresh" onclick="SST_retry()">↻ Retry This Question</button></div>`;
  };
  window.SST_retry=()=>{timerObj&&timerObj.stop();render();};
  window.SST_prev=()=>{qIndex=Math.max(0,qIndex-1);timerObj&&timerObj.stop(); render();};
  window.SST_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1);timerObj&&timerObj.stop(); render();};
  render();
};

// ── MC Single Listening ────────────────────────────────────────────────────
Pages['mc-single-listening'] = function() {
  let qIndex=0; const questions=DB.mcSingleListening;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>MC Single Answer <span class="badge badge-listening">Listening</span></h1>
  <p>Listen to the recording and choose the best answer.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="MCSL_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">${q.title}</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
    </div>
  </div>
  <div class="q-title">${q.question}</div>
  <div class="choice-list">${q.options.map((o,i)=>`<label class="choice" id="c${i}"><input type="radio" name="mc" value="${i}" onchange="MCSL_check(${i})"> ${o}</label>`).join('')}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="MCSL_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-primary" onclick="MCSL_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }

  window.MCSL_play=function(){ const btn=$('#play-btn'); const q=questions[qIndex]; const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.88}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle(); };
  window.MCSL_check=function(i){ const q=questions[qIndex]; $$('.choice').forEach(c=>c.classList.remove('selected','correct','incorrect')); if(i===q.answer){$('#c'+i).classList.add('correct');Stats.record('mcSingleListening',100,100);$('#feedback-area').innerHTML=`<div style="color:var(--success);font-weight:600">✅ Correct!</div><div class="retry-row"><button class="btn btn-refresh" onclick="MCSL_retry()">↻ Retry This Question</button></div>`;}else{$('#c'+i).classList.add('incorrect');$('#c'+q.answer).classList.add('correct');Stats.record('mcSingleListening',0,100);$('#feedback-area').innerHTML=`<div style="color:var(--danger);font-weight:600">❌ Incorrect.</div><div class="retry-row"><button class="btn btn-refresh" onclick="MCSL_retry()">↻ Retry This Question</button></div>`;} };
  window.MCSL_retry=()=>{ render(); };
  window.MCSL_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.MCSL_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── MC Multiple Listening ─────────────────────────────────────────────────
Pages['mc-multiple-listening'] = function() {
  let qIndex=0; const questions=DB.mcMultipleListening;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>MC Multiple Answer <span class="badge badge-listening">Listening</span></h1>
  <p>Listen and select ALL correct answers.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="MCML_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">${q.title}</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-title">${q.question}</div>
  <div class="choice-list">${q.options.map((o,i)=>`<label class="choice" id="cm${i}"><input type="checkbox" value="${i}"> ${o}</label>`).join('')}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="MCML_submit()">Check</button>
    <button class="btn btn-secondary" onclick="MCML_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="MCML_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  window.MCML_play=function(){ const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.88}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle(); };
  window.MCML_submit=function(){ const q=questions[qIndex];const sel=$$('.choice input:checked').map(e=>+e.value);const correct=q.answers;let pts=0;q.options.forEach((_,i)=>{const s=sel.includes(i),a=correct.includes(i);if(s&&a){$('#cm'+i).classList.add('correct');pts++;}else if(s&&!a){$('#cm'+i).classList.add('incorrect');pts--;}else if(!s&&a){$('#cm'+i).style.border='2px dashed var(--success)';}});pts=Math.max(0,pts);const pct=Math.round(pts/correct.length*100);Stats.record('mcMultipleListening',pct,100);$('#feedback-area').innerHTML=`<div class="score-panel" style="margin-top:16px"><div class="score-big">${pts}/${correct.length}</div><div class="score-label">Correct</div></div><div class="retry-row"><button class="btn btn-refresh" onclick="MCML_retry()">↻ Retry This Question</button></div>`; };
  window.MCML_retry=()=>{ render(); };
  window.MCML_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.MCML_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── Fill in Blanks Listening ──────────────────────────────────────────────
Pages['fill-blanks-listening'] = function() {
  let qIndex=0; const questions=DB.fillBlanksListening;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    let blankHtml='';
    q.blanks.forEach((b,i)=>{ blankHtml+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:14px"><span>${b.before}</span> <input class="blank-input" id="fb${i}" data-key="${b.key}" style="min-width:${b.key.length*10+20}px" placeholder="..."> <span>${b.after}</span></div>`; });
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Fill in the Blanks <span class="badge badge-listening">Listening</span></h1>
  <p>Listen and type the missing words.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="FBL_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">${q.title}</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-instruction">📌 Fill in each blank with the exact word from the recording.</div>
  <div style="padding:16px 0">${blankHtml}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="FBL_submit()">Check</button>
    <button class="btn btn-secondary" onclick="FBL_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="FBL_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  window.FBL_play=function(){const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.85}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle();};
  window.FBL_submit=function(){const q=questions[qIndex];const inputs=$$('[id^=fb]');let c=0;inputs.forEach(inp=>{const val=inp.value.trim().toLowerCase(),ans=inp.dataset.key.toLowerCase();if(val===ans){c++;inp.style.background='#dcfce7';inp.style.color='#15803d';inp.style.borderBottomColor='#22c55e';}else{inp.style.background='#fee2e2';inp.style.color='var(--danger)';inp.style.borderBottomColor='var(--danger)';const sp=document.createElement('span');sp.style='font-size:12px;color:var(--success);margin-left:4px';sp.textContent='('+inp.dataset.key+')';inp.after(sp);}});Stats.record('fillBlanksListening',Math.round(c/q.blanks.length*100),100);$('#feedback-area').innerHTML=`<div class="score-panel" style="margin-top:16px"><div class="score-big">${c}/${q.blanks.length}</div><div class="score-label">Correct blanks</div></div><div class="retry-row"><button class="btn btn-refresh" onclick="FBL_retry()">↻ Retry This Question</button></div>`;};
  window.FBL_retry=()=>{ render(); };
  window.FBL_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.FBL_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── Highlight Correct Summary ─────────────────────────────────────────────
Pages['highlight-summary'] = function() {
  let qIndex=0; const questions=DB.highlightSummary;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Highlight Correct Summary <span class="badge badge-listening">Listening</span></h1>
  <p>Listen and choose the paragraph that best summarizes the recording.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="HCS_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">${q.title}</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-instruction">📌 Choose the paragraph that best summarizes what you heard.</div>
  <div class="choice-list">${q.summaries.map((s,i)=>`<label class="choice" id="hc${i}"><input type="radio" name="hcs" value="${i}" onchange="HCS_check(${i})"> ${s}</label>`).join('')}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="HCS_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="HCS_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  window.HCS_play=function(){const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.88}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle();};
  window.HCS_check=function(i){const q=questions[qIndex];$$('.choice').forEach(c=>c.classList.remove('correct','incorrect'));if(i===q.answer){$('#hc'+i).classList.add('correct');Stats.record('highlightSummary',100,100);$('#feedback-area').innerHTML=`<div style="color:var(--success);font-weight:600">✅ Correct!</div><div class="retry-row"><button class="btn btn-refresh" onclick="HCS_retry()">↻ Retry This Question</button></div>`;}else{$('#hc'+i).classList.add('incorrect');$('#hc'+q.answer).classList.add('correct');Stats.record('highlightSummary',0,100);$('#feedback-area').innerHTML=`<div style="color:var(--danger);font-weight:600">❌ Incorrect. Correct answer highlighted.</div><div class="retry-row"><button class="btn btn-refresh" onclick="HCS_retry()">↻ Retry This Question</button></div>`;}};
  window.HCS_retry=()=>{ render(); };
  window.HCS_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.HCS_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── Select Missing Word ────────────────────────────────────────────────────
Pages['select-missing'] = function() {
  let qIndex=0; const questions=DB.selectMissing;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Select Missing Word <span class="badge badge-listening">Listening</span></h1>
  <p>Listen to an incomplete recording and select the word that completes it.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="SMW_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">${q.title}</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-instruction">📌 The last word is missing. Select what you think completes the sentence.</div>
  <div class="choice-list">${q.options.map((o,i)=>`<label class="choice" id="sm${i}"><input type="radio" name="smw" value="${i}" onchange="SMW_check(${i})"> ${o}</label>`).join('')}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="SMW_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="SMW_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  window.SMW_play=function(){const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.88}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle();};
  window.SMW_check=function(i){const q=questions[qIndex];$$('.choice').forEach(c=>c.classList.remove('correct','incorrect'));if(i===q.answer){$('#sm'+i).classList.add('correct');Stats.record('selectMissing',100,100);$('#feedback-area').innerHTML=`<div style="color:var(--success);font-weight:600">✅ Correct!</div><div class="retry-row"><button class="btn btn-refresh" onclick="SMW_retry()">↻ Retry This Question</button></div>`;}else{$('#sm'+i).classList.add('incorrect');$('#sm'+q.answer).classList.add('correct');Stats.record('selectMissing',0,100);$('#feedback-area').innerHTML=`<div style="color:var(--danger);font-weight:600">❌ Incorrect.</div><div class="retry-row"><button class="btn btn-refresh" onclick="SMW_retry()">↻ Retry This Question</button></div>`;}};
  window.SMW_retry=()=>{ render(); };
  window.SMW_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.SMW_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── Highlight Incorrect Words ─────────────────────────────────────────────
Pages['highlight-incorrect'] = function() {
  let qIndex=0; const questions=DB.highlightIncorrect;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    selected.clear();
    const wordSpans=q.textWords.map((w,i)=>`<span data-idx="${i}" onclick="HI_toggle(${i})" style="cursor:pointer;padding:1px 3px;border-radius:3px">${w}</span>`).join(' ');
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Highlight Incorrect Words <span class="badge badge-listening">Listening</span></h1>
  <p>Listen and click on the words in the text that are different from the recording.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="HI_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">${q.title}</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-instruction">📌 Click words in the text below that differ from what you heard. The text contains ${q.incorrectIndices.length} incorrect words.</div>
  <div class="highlightable q-text" id="hi-text">${wordSpans}</div>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="HI_submit()">Check</button>
    <button class="btn btn-secondary" onclick="HI_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="HI_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  const selected=new Set();
  window.HI_toggle=function(i){const sp=document.querySelector(`#hi-text span[data-idx="${i}"]`);if(selected.has(i)){selected.delete(i);sp.style.background='';}else{selected.add(i);sp.style.background='#fde68a';}};
  window.HI_play=function(){const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.transcript, opts:{rate:0.88}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle();};
  window.HI_submit=function(){
    const q=questions[qIndex]; let correct=0; let wrong=0;
    q.incorrectIndices.forEach(idx=>{
      const sp=document.querySelector(`#hi-text span[data-idx="${idx}"]`);
      if(selected.has(idx)){correct++;sp.classList.add('highlighted-found');}
      else{sp.classList.add('highlighted-wrong');}
    });
    selected.forEach(idx=>{if(!q.incorrectIndices.includes(idx)){wrong++;const sp=document.querySelector(`#hi-text span[data-idx="${idx}"]`);if(sp)sp.style.background='#fee2e2';}});
    const score=Math.max(0,correct-wrong);
    Stats.record('highlightIncorrect',Math.round(score/q.incorrectIndices.length*100),100);
    $('#feedback-area').innerHTML=`<div class="score-panel" style="margin-top:16px"><div class="score-big">${score}/${q.incorrectIndices.length}</div><div class="score-label">Correct picks minus incorrect picks</div></div><div class="retry-row"><button class="btn btn-refresh" onclick="HI_retry()">↻ Retry This Question</button></div>`;
  };
  window.HI_retry=()=>{ render(); };
  window.HI_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.HI_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};

// ── Write From Dictation ──────────────────────────────────────────────────
Pages['write-dictation'] = function() {
  let qIndex=0; const questions=DB.writeDictation;
  let player=null;

  function stopPlayback() {
    if (player) {
      player.stop();
      player = null;
    }
  }

  function render(){
    stopPlayback();
    const q=questions[qIndex];
    $('#page-container').innerHTML=`
<div class="page-header">
  <h1>Write From Dictation <span class="badge badge-listening">Listening</span></h1>
  <p>Listen and type the sentence exactly as you hear it.</p>
</div>
<div class="card">
  <div class="question-nav"><span class="q-number">Question ${qIndex+1} / ${questions.length}</span></div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="WFD_play()">▶</button>
    <div class="audio-progress"><div class="audio-label">Listen carefully — you can replay</div><div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div></div>
  </div>
  <div class="q-instruction">📌 Type exactly what you hear, including punctuation.</div>
  <textarea class="textarea" id="answer" rows="3" placeholder="Type the sentence here..."></textarea>
  <div id="feedback-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-primary" onclick="WFD_submit()">Check Answer</button>
    <button class="btn btn-secondary" onclick="WFD_prev()" ${qIndex===0?'disabled':''}>← Prev</button>
    <button class="btn btn-secondary" onclick="WFD_next()" ${qIndex===questions.length-1?'disabled':''}>Next →</button>
  </div>
</div>`;
  }
  window.WFD_play=function(){const btn=$('#play-btn');const q=questions[qIndex];const fill=$('#ap-fill'); if(!player){ player=createSpeechPlayer({ text:q.sentence, opts:{rate:0.78}, onProgress:(pct)=>{fill.style.width=`${pct*100}%`;}, onEnd:()=>{player=null; fill.style.width='100%'; btn.textContent='▶';}, onStateChange:(state)=>{ btn.textContent = state==='paused' ? '▶' : '⏸'; } }); player.play(); return; } player.toggle();};
  window.WFD_submit=function(){
    const q=questions[qIndex]; const text=$('#answer').value;
    const score=Scorer.writeDictation(text,q.sentence);
    Stats.record('writeDictation',score.pte,90);
    const diff=Scorer.diffWords(text,q.sentence);
    $('#feedback-area').innerHTML=`
<div class="score-panel" style="margin-top:16px"><div class="score-big">${score.pte}</div><div class="score-label">PTE Score (10–90) — ${score.correct}/${score.total} words correct</div></div>
<div class="card" style="margin-top:12px">
  <div class="card-title">Word-by-word comparison</div>
  <div style="margin-bottom:6px"><strong>Correct sentence:</strong></div>
  <div class="transcript-box">${diff.map(w=>`<span class="${w.found?'word-correct':'word-wrong'}">${w.word}</span>`).join(' ')}</div>
  <div style="margin-top:8px;font-size:12px;color:var(--text-light)">✅ Matched &nbsp; ❌ Missing or wrong</div>
</div>
<div class="retry-row"><button class="btn btn-refresh" onclick="WFD_retry()">↻ Retry This Question</button></div>`;
  };
  window.WFD_retry=()=>{ render(); };
  window.WFD_prev=()=>{qIndex=Math.max(0,qIndex-1); render();};
  window.WFD_next=()=>{qIndex=Math.min(questions.length-1,qIndex+1); render();};
  render();
};
