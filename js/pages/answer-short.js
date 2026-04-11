Pages['answer-short'] = function() {
  let qIndex = 0;
  let recorder = null;
  let finalText = '';
  let phase = 'idle';
  let timerObj = null;
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  let player = null;
  const speechStartLimitMs = 5000;
  const questions = DB.answerShort;

  function stopTimer() {
    if (timerObj) timerObj.stop();
    timerObj = null;
  }

  function resetTimerDisplay() {
    const el = $('#timer-el');
    if (!el) return;
    el.className = 'timer';
    el.innerHTML = '<span class="timer-dot"></span>00:00';
  }

  function clearRecorder(mode) {
    stopMode = mode || 'score';
    clearSpeechStartTimer();
    if (recorder && recorder.isRunning) recorder.stop();
    recorder = null;
  }

  function clearSpeechStartTimer() {
    if (speechStartTimer) clearTimeout(speechStartTimer);
    speechStartTimer = null;
  }

  function armSpeechStartRule() {
    clearSpeechStartTimer();
    speechDetected = false;
    failedStartWindow = false;
    speechStartTimer = setTimeout(() => {
      if (phase !== 'recording' || speechDetected) return;
      failedStartWindow = true;
      ASQ_stopRecord();
    }, speechStartLimitMs);
  }

  function readyState(message) {
    phase = 'ready';
    finalText = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    $('#result-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" onclick="ASQ_startRecord()">🎤</button>
  <div class="record-status">${message || 'Ready to answer — keep it short and clear'}</div>
  <div class="recorder-actions">
    <button class="btn btn-primary" onclick="ASQ_startRecord()">Start Recording</button>
    <button class="btn btn-secondary" onclick="ASQ_reset()">Done</button>
  </div>
</div>`;
    stopTimer();
    timerObj = new CountdownTimer($('#timer-el'), 10, null, ASQ_startRecord);
    timerObj.start();
  }

  function render() {
    const q = questions[qIndex];
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'answerShort', questionText: q.question });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>Answer Short Question <span class="badge badge-speaking">Speaking</span></h1>
  <p>Listen to the question and answer with one or a few words.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">🔊 Listen to the question, then give a short spoken answer.</div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="ASQ_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">Listen to the question</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
    </div>
  </div>
  <div id="recorder-area">
    <div class="recorder-widget">
      <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
      <div class="record-status">Play the question first</div>
    </div>
  </div>
  <div id="result-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="ASQ_prev()" ${qIndex===0 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-primary" onclick="ASQ_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>Next →</button>
  </div>
</div>`;
  }

  window.ASQ_play = function() {
    const btn = $('#play-btn');
    const q = questions[qIndex];
    const fill = $('#ap-fill');
    if (!player) {
      player = createSpeechPlayer({
        text: q.question,
        onProgress: (pct) => { fill.style.width = `${pct * 100}%`; },
        onEnd: () => { player = null; fill.style.width = '100%'; readyState(); },
        onStateChange: (state) => {
          phase = state === 'playing' ? 'playing' : phase;
          btn.textContent = state === 'paused' ? '▶' : '⏸';
        }
      });
      player.play();
      return;
    }
    player.toggle();
  };

  window.ASQ_startRecord = async function() {
    if (phase === 'recording') return;
    const startedManually = phase === 'ready';
    const allowed = await MicAccess.ensureOrNotify();
    if (!allowed) return;
    stopTimer();
    if (startedManually) resetTimerDisplay();
    phase = 'recording';
    finalText = '';
    speechDetected = false;
    failedStartWindow = false;
    stopMode = 'score';
    $('#result-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget recording">
  <button class="record-btn recording" onclick="ASQ_stopRecord()">⏹</button>
  <div class="record-status recording">🔴 Speak your answer</div>
  <div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>
  <div class="recorder-actions">
    <button class="btn btn-danger" onclick="ASQ_cancelRecord()">Cancel</button>
    <button class="btn btn-secondary" onclick="ASQ_exitRecord()">Done</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 10, null, ASQ_stopRecord);
    timerObj.start();
    recorder = new SpeechRecorder({
      continuous: true,
      keepAlive: false,
      onResult: ({ final, interim }) => {
        finalText = final || finalText;
        if ((final || interim || '').trim()) {
          speechDetected = true;
          clearSpeechStartTimer();
        }
      },
      onEnd: () => {
        const mode = stopMode;
        recorder = null;
        if (mode === 'cancel' || mode === 'exit') {
          readyState(mode === 'cancel' ? 'Recording cancelled. Try again.' : 'Attempt exited. You can answer again.');
          return;
        }
        ASQ_showResult();
      },
      onError: (e) => {
        showToast(e);
        ASQ_showResult();
      }
    });
    recorder.start();
    armSpeechStartRule();
  };

  window.ASQ_stopRecord = function() {
    if (phase !== 'recording') return;
    phase = 'done';
    stopTimer();
    clearRecorder('score');
  };

  window.ASQ_cancelRecord = function() {
    if (phase !== 'recording') return;
    phase = 'ready';
    stopTimer();
    clearRecorder('cancel');
  };

  window.ASQ_exitRecord = function() {
    if (phase !== 'recording') {
      ASQ_reset();
      return;
    }
    phase = 'ready';
    stopTimer();
    clearRecorder('exit');
  };

  window.ASQ_reset = function() {
    phase = 'idle';
    stopTimer();
    clearRecorder('exit');
    if (player) { player.stop(); player = null; }
    $('#ap-fill').style.width = '0%';
    $('#play-btn').disabled = false;
    $('#play-btn').textContent = '▶';
    $('#result-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
  <div class="record-status">Play the question first</div>
</div>`;
  };

  window.ASQ_showResult = function() {
    const q = questions[qIndex];
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? 'Failed to start in time' : 'Answer captured'}</div>
      <div class="recorder-result-sub">${failedStartWindow ? 'You must start speaking within 5 seconds to receive a score.' : 'Check the result below or record one more time.'}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="ASQ_startRecord()">Re-record</button>
    <button class="btn btn-secondary" onclick="ASQ_reset()">Done</button>
  </div>
</div>`;
    if (failedStartWindow) {
      Stats.record('answerShort', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
      $('#result-area').innerHTML = `
<div class="card" style="margin-top:12px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
    <span style="font-size:24px">⚠️</span>
    <span style="font-size:16px;font-weight:700;color:var(--warning)">Fail</span>
  </div>
  <div class="score-bar-row"><div class="score-bar-label">Score</div><div class="transcript-box" style="padding:6px 12px;color:#92400e">10 / 90</div></div>
  <div class="score-bar-row" style="margin-top:8px"><div class="score-bar-label">Rule</div><div class="transcript-box" style="padding:6px 12px">You must start speaking within 5 seconds after recording begins to receive a score.</div></div>
</div>`;
      return;
    }
    const answerNorm = Scorer.normalize(q.answer);
    const responseNorm = Scorer.normalize(finalText || '');
    const correct = responseNorm === answerNorm || responseNorm.split(' ').includes(answerNorm);
    const icon = correct ? '✅' : '❌';
    const color = correct ? 'var(--success)' : 'var(--danger)';
    Stats.record('answerShort', correct ? 90 : 10, 90, { transcript: finalText || '', ai_feedback: correct ? 'Correct short answer.' : `Expected answer: ${q.answer}` });
    $('#result-area').innerHTML = `
<div class="card" style="margin-top:12px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
    <span style="font-size:24px">${icon}</span>
    <span style="font-size:16px;font-weight:700;color:${color}">${correct ? 'Correct!' : 'Incorrect'}</span>
  </div>
  <div class="score-bar-row"><div class="score-bar-label">Correct answer</div><div class="transcript-box" style="padding:6px 12px">${q.answer}</div></div>
  <div class="score-bar-row" style="margin-top:8px"><div class="score-bar-label">Your answer</div><div class="transcript-box" style="padding:6px 12px;color:${color}">${finalText || '(no speech)'}</div></div>
</div>`;
  };

  window.ASQ_prev = () => { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  window.ASQ_next = () => { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  render();
};
