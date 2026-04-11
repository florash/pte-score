Pages['describe-image'] = function() {
  let qIndex = 0;
  let phase = 'prep';
  let timerObj = null;
  let recorder = null;
  let finalText = '';
  let recordingUrl = '';
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  const speechStartLimitMs = 5000;
  const questions = DB.describeImage;

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
      DI_stopRecord();
    }, speechStartLimitMs);
  }

  function startPrep(message) {
    phase = 'prep';
    finalText = '';
    recordingUrl = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    stopTimer();
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" onclick="DI_startRecord()">🎤</button>
  <div class="record-status" id="rec-status">${message || '⏳ Study the image — recording starts automatically in 25s'}</div>
  <div class="recorder-actions">
    <button class="btn btn-primary" onclick="DI_startRecord()">Start Now</button>
    <button class="btn btn-secondary" onclick="DI_restart()">Done</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 25, null, () => DI_startRecord());
    timerObj.start();
  }

  function render() {
    const q = questions[qIndex];
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'describeImage', questionText: `${q.title} ${q.hint}` });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>Describe Image <span class="badge badge-speaking">Speaking</span></h1>
  <p>Look at the image and describe it in detail within 40 seconds.</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">Question ${qIndex+1} / ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:40</div>
  </div>
  <div class="q-instruction">📌 You have 25 seconds to study the image, then 40 seconds to describe it.</div>
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-weight:600;margin-bottom:10px;font-size:15px">${q.title}</div>
    ${q.imageSvg}
    <div style="font-size:12px;color:var(--text-light);margin-top:8px">${q.hint}</div>
  </div>
  <div id="recorder-area"></div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="DI_prev()" ${qIndex===0 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-primary" onclick="DI_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>Next →</button>
  </div>
</div>`;
    startPrep();
  }

  window.DI_startRecord = async function() {
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
    $('#recorder-area').innerHTML = `
<div class="recorder-widget recording" id="rec-widget">
  <button class="record-btn recording" id="rec-btn" onclick="DI_stopRecord()">⏹</button>
  <div class="record-status recording">🔴 Describe the image now</div>
  <div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>
  <div class="recorder-actions">
    <button class="btn btn-danger" onclick="DI_cancelRecord()">Cancel</button>
    <button class="btn btn-secondary" onclick="DI_exitRecord()">Done</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 40, null, DI_stopRecord);
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
          startPrep(mode === 'cancel' ? 'Recording cancelled. Review the image and try again.' : 'Attempt exited. Ready for another try.');
          return;
        }
        DI_showResult();
      },
      onError: (e) => {
        showToast('Mic: ' + e);
        DI_showResult();
      }
    });
    recorder.start();
    armSpeechStartRule();
  };

  window.DI_stopRecord = function() {
    if (phase !== 'recording') return;
    phase = 'done';
    stopTimer();
    clearRecorder('score');
  };

  window.DI_cancelRecord = function() {
    if (phase !== 'recording') return;
    phase = 'prep';
    stopTimer();
    clearRecorder('cancel');
  };

  window.DI_exitRecord = function() {
    if (phase !== 'recording') {
      startPrep();
      return;
    }
    phase = 'prep';
    stopTimer();
    clearRecorder('exit');
  };

  window.DI_restart = function() {
    startPrep();
  };

  window.DI_showResult = function() {
    const q = questions[qIndex];
    const score = !failedStartWindow && finalText ? Scorer.describeImage(finalText, `${q.title} ${q.hint}`) : null;
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? 'Failed to start in time' : 'Recording complete'}</div>
      <div class="recorder-result-sub">${failedStartWindow ? 'You must start speaking within 5 seconds to receive a score.' : 'Your description is ready for AI feedback below.'}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="DI_startRecord()">Re-record</button>
    <button class="btn btn-secondary" onclick="DI_restart()">Done</button>
  </div>
</div>`;
    if (failedStartWindow) Stats.record('describeImage', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
    else if (score) Stats.record('describeImage', score.pte, 90, { transcript: finalText || '', ai_feedback: Scorer.getSpeakingInsights(score, finalText || '', `${q.title} ${q.hint}`).suggestion });
    $('#score-area').innerHTML = failedStartWindow ? `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e"><strong>Score: 10/90</strong><br>⚠️ You must start speaking within 5 seconds after recording begins, otherwise this item is marked as fail.</div>` : finalText ? `
${Scorer.renderSpeakingResult({
  questionTitle: q.title,
  score,
  transcript: finalText,
  reference: `${q.title} ${q.hint}`,
  audioUrl: recordingUrl,
  retryAction: 'DI_startRecord()',
  nextAction: 'DI_next()'
})}` : `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e">⚠️ No speech detected.</div>`;
  };

  window.DI_prev = () => { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); render(); };
  window.DI_next = () => { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); render(); };
  render();
};
