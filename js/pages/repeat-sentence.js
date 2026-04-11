Pages['repeat-sentence'] = function() {
  let qIndex = 0;
  let phase = 'idle';
  let timerObj = null;
  let recorder = null;
  let finalText = '';
  let recordingUrl = '';
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  let player = null;
  const speechStartLimitMs = 5000;
  const questions = DB.repeatSentence;

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
      RS_stopRecord();
    }, speechStartLimitMs);
  }

  function readyState(message) {
    phase = 'ready';
    finalText = '';
    recordingUrl = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    $('#hidden-text').style.display = 'none';
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" onclick="RS_startRecord()">🎤</button>
  <div class="record-status" id="rec-status">${message || 'Ready to record — press the mic button'}</div>
  <div class="recorder-actions">
    <button class="btn btn-primary" onclick="RS_startRecord()">Start Recording</button>
    <button class="btn btn-secondary" onclick="RS_reset()">Done</button>
  </div>
</div>`;
    stopTimer();
    timerObj = new CountdownTimer($('#timer-el'), 10, null, RS_startRecord);
    timerObj.start();
  }

  function render() {
    const q = questions[qIndex];
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'repeatSentence', questionText: q.text });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>Repeat Sentence <span class="badge badge-speaking">Speaking</span></h1>
  <p>Listen to the sentence, then repeat it exactly as you heard it.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">🔊 The sentence will be read aloud. Do NOT read the text below until after recording.</div>
  <div class="audio-widget" id="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="RS_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">Listen to the sentence</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
    </div>
  </div>
  <div id="hidden-text" style="display:none" class="q-text">${q.text}</div>
  <div id="recorder-area">
    <div class="recorder-widget">
      <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
      <div class="record-status" id="rec-status">Play the audio first</div>
    </div>
  </div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="RS_prev()" ${qIndex===0 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-primary" onclick="RS_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>Next →</button>
  </div>
</div>`;
  }

  window.RS_play = function() {
    const btn = $('#play-btn');
    const fill = $('#ap-fill');
    const q = questions[qIndex];
    if (!player) {
      player = createSpeechPlayer({
        text: q.text,
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

  window.RS_startRecord = async function() {
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
    $('#hidden-text').style.display = 'none';
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget recording" id="rec-widget">
  <button class="record-btn recording" id="rec-btn" onclick="RS_stopRecord()">⏹</button>
  <div class="record-status recording" id="rec-status">🔴 Recording — repeat the sentence now</div>
  <div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>
  <div class="recorder-actions">
    <button class="btn btn-danger" onclick="RS_cancelRecord()">Cancel</button>
    <button class="btn btn-secondary" onclick="RS_exitRecord()">Done</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 15, null, RS_stopRecord);
    timerObj.start();
    recorder = new SpeechRecorder({
      captureAudio: true,
      onCapture: ({ url }) => { recordingUrl = url; },
      continuous: true,
      keepAlive: false,
      onResult: ({ final, interim }) => {
        finalText = final || finalText;
        if ((final || interim || '').trim()) {
          speechDetected = true;
          clearSpeechStartTimer();
        }
      },
      onEnd: ({ final, audioUrl }) => {
        finalText = final || finalText;
        recordingUrl = audioUrl || recordingUrl;
        const mode = stopMode;
        recorder = null;
        if (mode === 'cancel' || mode === 'exit') {
          readyState(mode === 'cancel' ? 'Recording cancelled. Try again.' : 'Attempt exited. You can record again.');
          return;
        }
        RS_showScore();
      },
      onError: (e) => {
        showToast('Mic error: ' + e);
        RS_showScore();
      }
    });
    recorder.start();
    armSpeechStartRule();
  };

  window.RS_stopRecord = function() {
    if (phase !== 'recording') return;
    phase = 'done';
    stopTimer();
    clearRecorder('score');
  };

  window.RS_cancelRecord = function() {
    if (phase !== 'recording') return;
    phase = 'ready';
    stopTimer();
    clearRecorder('cancel');
  };

  window.RS_exitRecord = function() {
    if (phase !== 'recording') {
      RS_reset();
      return;
    }
    phase = 'ready';
    stopTimer();
    clearRecorder('exit');
  };

  window.RS_reset = function() {
    phase = 'idle';
    stopTimer();
    clearRecorder('exit');
    if (player) { player.stop(); player = null; }
    $('#ap-fill').style.width = '0%';
    $('#play-btn').disabled = false;
    $('#play-btn').textContent = '▶';
    $('#hidden-text').style.display = 'none';
    $('#score-area').innerHTML = '';
    recordingUrl = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
  <div class="record-status" id="rec-status">Play the audio first</div>
</div>`;
  };

  window.RS_showScore = function() {
    const q = questions[qIndex];
    $('#hidden-text').style.display = 'block';
    const score = !failedStartWindow && finalText ? Scorer.repeatSentence(finalText, q.text) : null;
    if (failedStartWindow) Stats.record('repeatSentence', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
    else if (score) Stats.record('repeatSentence', score.pte, 90, { transcript: finalText || '', ai_feedback: Scorer.getSpeakingInsights(score, finalText || '', q.text).suggestion });
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? 'Failed to start in time' : score ? 'Recording complete' : 'No valid speech captured'}</div>
      <div class="recorder-result-sub">${failedStartWindow ? 'You must start speaking within 5 seconds to receive a score.' : score ? 'Your answer is ready for AI feedback below.' : 'Try recording again after checking your microphone access.'}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="RS_startRecord()">Re-record</button>
    <button class="btn btn-secondary" onclick="RS_reset()">Done</button>
  </div>
</div>`;
    $('#score-area').innerHTML = failedStartWindow ? `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e"><strong>Score: 10/90</strong><br>⚠️ You must start speaking within 5 seconds after recording begins, otherwise this item is marked as fail.</div>` : score ? `
${Scorer.renderSpeakingResult({
  questionTitle: `Repeat Sentence · Question ${qIndex + 1}`,
  score,
  transcript: finalText,
  reference: q.text,
  audioUrl: recordingUrl,
  retryAction: 'RS_startRecord()',
  nextAction: 'RS_next()'
})}` : `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e">⚠️ No speech detected. Use Chrome with microphone permission.</div>`;
  };

  window.RS_prev = () => { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  window.RS_next = () => { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  render();
};
