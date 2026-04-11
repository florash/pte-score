Pages['read-aloud'] = function() {
  let qIndex = 0;
  let timerObj = null;
  let recorder = null;
  let finalText = '';
  let recordingUrl = '';
  let phase = 'prep';
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  const prepSeconds = 40;
  const speechStartLimitMs = 5000;
  const questions = DB.readAloud;

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
      RA_stopRecord();
    }, speechStartLimitMs);
  }

  function prepCard(seconds) {
    return `
<div class="status-card">
  <div class="status-title">Current status: <strong>Beginning in ${seconds} seconds</strong></div>
  <div class="status-progress">
    <div class="status-progress-fill" id="ra-prep-fill"></div>
  </div>
  <div class="btn-group" style="justify-content:center">
    <button class="btn status-btn" onclick="RA_startRecord()">Skip</button>
  </div>
</div>`;
  }

  function recordingCard(seconds) {
    return `
<div class="status-card">
  <div class="status-title">Current Status: <strong>recording ${seconds} seconds</strong></div>
  <div class="status-progress">
    <div class="status-progress-fill recording" id="ra-record-fill"></div>
  </div>
  <div class="btn-group" style="justify-content:center">
    <button class="btn status-btn recording" onclick="RA_stopRecord()">FINISH</button>
  </div>
</div>`;
  }

  function recorderMarkup(status, actions) {
    return `
<div class="recorder-widget ${phase === 'recording' ? 'recording' : ''}" id="rec-widget">
  <button class="record-btn ${phase === 'recording' ? 'recording' : 'idle'}" id="rec-btn" onclick="${phase === 'recording' ? 'RA_stopRecord()' : 'RA_startRecord()'}">${phase === 'recording' ? '⏹' : '🎤'}</button>
  <div class="record-status ${phase === 'recording' ? 'recording' : ''}" id="rec-status">${status}</div>
  ${phase === 'recording' ? `<div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>` : ''}
  <div class="recorder-actions">${actions}</div>
</div>`;
  }

  function showPrepState(message) {
    phase = 'prep';
    finalText = '';
    recordingUrl = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    stopTimer();
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = prepCard(prepSeconds);
    if (message) {
      $('#score-area').innerHTML = `<div class="recorder-note" style="text-align:center;margin-top:4px">${message}</div>`;
    }
    timerObj = new CountdownTimer(
      $('#timer-el'),
      prepSeconds,
      (remaining) => {
        const title = $('.status-title');
        const fill = $('#ra-prep-fill');
        if (title) title.innerHTML = `Current status: <strong>Beginning in ${remaining} seconds</strong>`;
        if (fill) fill.style.width = `${((prepSeconds - remaining) / prepSeconds) * 100}%`;
      },
      () => { RA_startRecord(); }
    );
    timerObj.start();
    const fill = $('#ra-prep-fill');
    if (fill) fill.style.width = '0%';
  }

  function render() {
    const q = questions[qIndex];
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'readAloud', questionText: q.text });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>Read Aloud <span class="badge badge-speaking">Speaking</span></h1>
  <p>Read the following text aloud as naturally and clearly as possible.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length} ${q.tag ? `<span style="background:#fef3c7;color:#92400e;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px">${q.tag}</span>` : ''}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">📌 You have 40 seconds to prepare, then 40 seconds to record your answer.</div>
  <div class="q-text" id="q-text">${q.text}</div>
  <div id="recorder-area"></div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="RA_prev()" ${qIndex===0 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-primary" onclick="RA_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>Next →</button>
  </div>
</div>`;
    showPrepState();
  }

  window.RA_startRecord = async function() {
    if (phase === 'recording') return;
    const startedManually = phase === 'prep';
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
    $('#recorder-area').innerHTML = recordingCard(40);

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
          showPrepState(mode === 'cancel' ? 'Recording cancelled. You can start again.' : 'Ready to record again whenever you are.');
          return;
        }
        RA_showScore();
      },
      onError: (e) => {
        showToast('Speech recognition error: ' + e);
        RA_showScore();
      }
    });
    recorder.start();
    armSpeechStartRule();
    timerObj = new CountdownTimer(
      $('#timer-el'),
      40,
      (remaining) => {
        const title = $('.status-title');
        const fill = $('#ra-record-fill');
        if (title) title.innerHTML = `Current Status: <strong>recording ${remaining} seconds</strong>`;
        if (fill) fill.style.width = `${((40 - remaining) / 40) * 100}%`;
      },
      () => { RA_stopRecord(); }
    );
    timerObj.start();
    const fill = $('#ra-record-fill');
    if (fill) fill.style.width = '0%';
  };

  window.RA_stopRecord = function() {
    if (phase !== 'recording') return;
    phase = 'done';
    stopTimer();
    clearRecorder('score');
  };

  window.RA_cancelRecord = function() {
    if (phase !== 'recording') return;
    phase = 'prep';
    stopTimer();
    clearRecorder('cancel');
  };

  window.RA_exitRecord = function() {
    if (phase !== 'recording') {
      showPrepState();
      return;
    }
    phase = 'prep';
    stopTimer();
    clearRecorder('exit');
  };

  window.RA_restart = function() {
    showPrepState();
  };

  window.RA_showScore = function() {
    const q = questions[qIndex];
    const score = !failedStartWindow && finalText && finalText.trim().length >= 3 ? Scorer.readAloud(finalText, q.text) : null;
    if (failedStartWindow) Stats.record('readAloud', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
    else if (score) Stats.record('readAloud', score.pte, 90, { transcript: finalText || '', ai_feedback: Scorer.getSpeakingInsights(score, finalText || '', q.text).suggestion });

    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? 'Failed to start in time' : score ? 'Recording complete' : 'No valid speech captured'}</div>
      <div class="recorder-result-sub">${failedStartWindow ? 'You must start speaking within 5 seconds to receive a score.' : score ? 'Your response has been saved and analysed below.' : 'Try recording again after checking your microphone access.'}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="RA_startRecord()">Re-record</button>
    <button class="btn btn-secondary" onclick="RA_restart()">Done</button>
  </div>
</div>`;

    $('#score-area').innerHTML = failedStartWindow ? `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e;margin-top:8px"><strong>Score: 10/90</strong><br>⚠️ You must start speaking within 5 seconds after recording begins, otherwise this item is marked as fail.</div>` : score ? `
${Scorer.renderSpeakingResult({
  questionTitle: `Read Aloud · Question ${qIndex + 1}`,
  score,
  transcript: finalText,
  reference: q.text,
  audioUrl: recordingUrl,
  retryAction: 'RA_startRecord()',
  nextAction: 'RA_next()'
})}` : `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e;margin-top:8px">⚠️ No speech detected. Please allow microphone access in your browser and use Chrome for best results.</div>`;
  };

  window.RA_prev = function() { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); render(); };
  window.RA_next = function() { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); render(); };

  render();
};
