Pages['retell-lecture'] = function() {
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
  const questions = DB.retellLecture;

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
      RL_stopRecord();
    }, speechStartLimitMs);
  }

  function readyState(message) {
    phase = 'ready';
    finalText = '';
    recordingUrl = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" onclick="RL_startRecord()">🎤</button>
  <div class="record-status" id="rec-status">${message || 'Ready — press to start your re-tell'}</div>
  <div class="recorder-actions">
    <button class="btn btn-primary" onclick="RL_startRecord()">Start Recording</button>
    <button class="btn btn-secondary" onclick="RL_reset()">Done</button>
  </div>
</div>`;
    stopTimer();
    timerObj = new CountdownTimer($('#timer-el'), 10, null, RL_startRecord);
    timerObj.start();
  }

  function render() {
    const q = questions[qIndex];
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>Re-tell Lecture <span class="badge badge-speaking">Speaking</span></h1>
  <p>Listen to a lecture, then retell the key points in your own words.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">🎧 Listen to the lecture, take notes, then retell the key ideas.</div>
  <div class="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="RL_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">${q.title}</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
      <div class="audio-time"><span>0:00</span><span id="dur-label">${formatTime(q.duration)}</span></div>
    </div>
  </div>
  <div id="notes-area" style="margin-bottom:16px">
    <div class="card-title" style="margin-bottom:8px">📝 Notes</div>
    <textarea class="textarea" id="notes" rows="3" placeholder="Take notes while listening..."></textarea>
  </div>
  <div id="recorder-area">
    <div class="recorder-widget">
      <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
      <div class="record-status" id="rec-status">Play the lecture first</div>
    </div>
  </div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="RL_prev()" ${qIndex===0 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-primary" onclick="RL_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>Next →</button>
  </div>
</div>`;
  }

  window.RL_play = function() {
    const btn = $('#play-btn');
    const q = questions[qIndex];
    const fill = $('#ap-fill');
    if (!player) {
      player = createSpeechPlayer({
        text: q.transcript,
        opts: { rate: 0.88 },
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

  window.RL_startRecord = async function() {
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
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget recording" id="rw">
  <button class="record-btn recording" onclick="RL_stopRecord()">⏹</button>
  <div class="record-status recording">🔴 Retell the lecture now — 40 seconds</div>
  <div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>
  <div class="recorder-actions">
    <button class="btn btn-danger" onclick="RL_cancelRecord()">Cancel</button>
    <button class="btn btn-secondary" onclick="RL_exitRecord()">Done</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 40, null, RL_stopRecord);
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
          readyState(mode === 'cancel' ? 'Recording cancelled. Start again when ready.' : 'Attempt exited. Ready for another retell.');
          return;
        }
        RL_showResult();
      },
      onError: (e) => {
        showToast(e);
        RL_showResult();
      }
    });
    recorder.start();
    armSpeechStartRule();
  };

  window.RL_stopRecord = function() {
    if (phase !== 'recording') return;
    phase = 'done';
    stopTimer();
    clearRecorder('score');
  };

  window.RL_cancelRecord = function() {
    if (phase !== 'recording') return;
    phase = 'ready';
    stopTimer();
    clearRecorder('cancel');
  };

  window.RL_exitRecord = function() {
    if (phase !== 'recording') {
      RL_reset();
      return;
    }
    phase = 'ready';
    stopTimer();
    clearRecorder('exit');
  };

  window.RL_reset = function() {
    phase = 'idle';
    stopTimer();
    clearRecorder('exit');
    if (player) { player.stop(); player = null; }
    $('#ap-fill').style.width = '0%';
    $('#play-btn').disabled = false;
    $('#play-btn').textContent = '▶';
    $('#score-area').innerHTML = '';
    recordingUrl = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
  <div class="record-status" id="rec-status">Play the lecture first</div>
</div>`;
  };

  window.RL_showResult = function() {
    const q = questions[qIndex];
    const score = !failedStartWindow && finalText ? Scorer.retellLecture(finalText, q.transcript) : null;
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? 'Failed to start in time' : score ? 'Recording complete' : 'No valid speech captured'}</div>
      <div class="recorder-result-sub">${failedStartWindow ? 'You must start speaking within 5 seconds to receive a score.' : score ? 'Your retell has been saved for AI feedback below.' : 'Try recording again after checking your microphone access.'}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="RL_startRecord()">Re-record</button>
    <button class="btn btn-secondary" onclick="RL_reset()">Done</button>
  </div>
</div>`;
    if (failedStartWindow) Stats.record('retellLecture', 10, 90);
    else if (score) Stats.record('retellLecture', score.pte, 90);
    $('#score-area').innerHTML = failedStartWindow ? `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e"><strong>Score: 10/90</strong><br>⚠️ You must start speaking within 5 seconds after recording begins, otherwise this item is marked as fail.</div>` : finalText ? `
${Scorer.renderSpeakingResult({
  questionTitle: q.title,
  score,
  transcript: finalText,
  reference: q.transcript,
  audioUrl: recordingUrl,
  retryAction: 'RL_startRecord()',
  nextAction: 'RL_next()'
})}` : `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;color:#92400e">⚠️ No speech detected.</div>`;
  };

  window.RL_prev = () => { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  window.RL_next = () => { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  render();
};
