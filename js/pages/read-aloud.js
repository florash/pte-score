Pages['read-aloud'] = function() {
  let qIndex = 0;
  let timerObj = null;
  let recorder = null;
  let finalText = '';
  let recordingUrl = '';
  let recordingBlob = null;
  let recordingDurationSeconds = 0;
  let recordingStartedAt = 0;
  let uploadedAudio = null;
  let audioSource = '';
  let phase = 'prep';
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  const prepSeconds = 40;
  const speechStartLimitMs = 5000;
  const totalQuestions = DB.readAloud.length;
  const questions = getAccessibleQuestions(DB.readAloud);
  qIndex = getInitialQuestionIndex(questions);
  const getQuestionRecordingKey = (question) => `readAloud:${question?.id || qIndex}`;

  setPageCleanup(() => {
    stopTimer();
    clearSpeechStartTimer();
    if (recorder && recorder.isRunning) recorder.stop();
    recorder = null;
    if (uploadedAudio) SpeakingAudio.revokePreview(uploadedAudio);
    uploadedAudio = null;
  });

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

  function getActiveAudio() {
    if (audioSource === 'upload' && uploadedAudio) {
      return { ...uploadedAudio, source: 'upload' };
    }
    if (recordingBlob && recordingUrl) {
      return {
        file: new File([recordingBlob], 'read-aloud.webm', { type: recordingBlob.type || 'audio/webm' }),
        previewUrl: recordingUrl,
        durationSeconds: recordingDurationSeconds || 1,
        mimeType: recordingBlob.type || 'audio/webm',
        name: 'Recorded response.webm',
        source: 'recording',
      };
    }
    if (uploadedAudio) {
      return { ...uploadedAudio, source: 'upload' };
    }
    return null;
  }

  function renderSubmissionPanel(message = t('panel_record_or_upload')) {
    const activeAudio = getActiveAudio();
    $('#score-area').innerHTML = SpeakingAudio.renderCapturePanel({
      title: 'Speaking audio',
      helperText: message,
      session: { activeAudio },
      uploadAction: 'RA_handleUpload',
      clearUploadAction: 'RA_clearUpload',
      submitAction: 'RA_submitAudio',
      supportsRecording: !!(window.MediaRecorder || recordingBlob),
    });
  }

  function clearSpeechStartTimer() {
    if (speechStartTimer) clearTimeout(speechStartTimer);
    speechStartTimer = null;
  }

  function armSpeechStartRule() {
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return;
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
  <div class="status-title">Current status: <strong>${t('status_beginning').replace('${n}', seconds)}</strong></div>
  <div class="status-progress">
    <div class="status-progress-fill" id="ra-prep-fill"></div>
  </div>
  <div class="btn-group" style="justify-content:center">
    <button class="btn status-btn" onclick="RA_startRecord()">${t('btn_skip')}</button>
  </div>
</div>`;
  }

  function recordingCard(seconds) {
    return `
<div class="status-card">
  <div class="status-title">Current Status: <strong>${t('status_recording').replace('${n}', seconds)}</strong></div>
  <div class="status-progress">
    <div class="status-progress-fill recording" id="ra-record-fill"></div>
  </div>
  <div class="btn-group" style="justify-content:center">
    <button class="btn status-btn recording" onclick="RA_stopRecord()">${t('btn_finish')}</button>
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
    recordingBlob = null;
    recordingDurationSeconds = 0;
    audioSource = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    stopTimer();
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = prepCard(prepSeconds);
    if (message) {
      $('#score-area').innerHTML = `<div class="recorder-note" style="text-align:center;margin-top:4px">${message}</div>`;
    }
    renderSubmissionPanel(t('panel_record_new'));
    timerObj = new CountdownTimer(
      $('#timer-el'),
      prepSeconds,
      (remaining) => {
        const title = $('.status-title');
        const fill = $('#ra-prep-fill');
        if (title) title.innerHTML = `Current status: <strong>${t('status_beginning').replace('${n}', remaining)}</strong>`;
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
    syncSelectedQuestion(q);
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'readAloud', questionText: q.text });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>${t('ra_title')} <span class="badge badge-speaking">${t('badge_speaking')}</span></h1>
  <p>${t('ra_subtitle')}</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">${t('question_label')} ${qIndex+1} ${t('question_of')} ${questions.length} ${q.tag ? `<span style="background:#fef3c7;color:#92400e;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px">${q.tag}</span>` : ''}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">${t('ra_instruction')}</div>
  <div class="q-text" id="q-text">${q.text}</div>
  <div id="saved-audio-area"></div>
  <div id="recorder-area"></div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="RA_prev()" ${qIndex===0 ? 'disabled' : ''}>${t('btn_prev')}</button>
    <button class="btn btn-primary" onclick="RA_next()" ${qIndex===questions.length-1 ? 'disabled' : ''}>${t('btn_next')}</button>
  </div>
  ${renderGuestPracticeUpsell(totalQuestions, questions.length)}
</div>`;
    $('#saved-audio-area').innerHTML = AIScorer.renderQuestionRecordingHistory(getQuestionRecordingKey(q));
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
    recordingUrl = '';
    recordingBlob = null;
    recordingDurationSeconds = 0;
    recordingStartedAt = Date.now();
    speechDetected = false;
    failedStartWindow = false;
    stopMode = 'score';
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = recordingCard(40);

    recorder = new SpeechRecorder({
      captureAudio: true,
      onCapture: ({ url, blob }) => { recordingUrl = url; recordingBlob = blob || null; },
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
        recordingDurationSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000));
        audioSource = recordingBlob ? 'recording' : audioSource;
        const mode = stopMode;
        recorder = null;
        if (mode === 'cancel' || mode === 'exit') {
          showPrepState(mode === 'cancel' ? t('toast_cancel_msg') : t('toast_exit_msg'));
          return;
        }
        RA_showScore();
      },
      onError: (e) => {
        showToast(t('toast_mic_error') + e);
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
        if (title) title.innerHTML = `Current Status: <strong>${t('status_recording').replace('${n}', remaining)}</strong>`;
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

  window.RA_handleUpload = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      if (uploadedAudio) SpeakingAudio.revokePreview(uploadedAudio);
      uploadedAudio = await SpeakingAudio.inspectFile(file);
      audioSource = 'upload';
      renderSubmissionPanel(t('panel_uploaded_ready'));
    } catch (error) {
      uploadedAudio = null;
      showToast(error.message || t('toast_audio_error'));
      renderSubmissionPanel(t('panel_upload_or_record'));
    } finally {
      if (event?.target) event.target.value = '';
    }
  };

  window.RA_clearUpload = function() {
    if (uploadedAudio) SpeakingAudio.revokePreview(uploadedAudio);
    uploadedAudio = null;
    audioSource = recordingBlob ? 'recording' : '';
    renderSubmissionPanel(t('panel_upload_another'));
  };

  window.RA_submitAudio = async function() {
    const q = questions[qIndex];
    const activeAudio = getActiveAudio();
    if (!activeAudio) {
      showToast(t('toast_no_audio'));
      return;
    }
    if (!AppAuth.isLoggedIn()) {
      AuthUI.open('login');
      $('#score-area').innerHTML = AIScorer.renderAuthGate();
      return;
    }
    const stopLoading = SpeakingAudio.mountStageLoader($('#score-area'));
    try {
      const result = await AIScorer.scoreAudio({
        task: 'speaking',
        promptType: 'read_aloud',
        file: activeAudio.file,
        mimeType: activeAudio.mimeType,
        questionText: q.text,
        referenceAnswer: q.text,
        durationSeconds: activeAudio.durationSeconds,
      });
      stopLoading();
      Stats.record('readAloud', result.overall || 0, 90, {
        transcript: result.transcript || finalText || '',
        ai_feedback: typeof result.feedback === 'object' ? (result.feedback.summary || '') : (result.feedback || ''),
      });
      AIScorer.saveQuestionRecording(getQuestionRecordingKey(q), {
        audioUrl: AIScorer.getPlayableAudioUrl(result, activeAudio.previewUrl || ''),
        score: result.overall || null,
        createdAt: new Date().toLocaleString(),
      });
      $('#saved-audio-area').innerHTML = AIScorer.renderQuestionRecordingHistory(getQuestionRecordingKey(q));
      $('#score-area').innerHTML = AIScorer.renderSpeakingResult(result, {
        promptType: 'Read Aloud',
        referenceText: q.text,
        reRecordAction: 'RA_startRecord()',
        tryAgainAction: 'RA_restart()',
        isLoggedIn: AppAuth.isLoggedIn(),
      });
    } catch (error) {
      stopLoading();
      $('#score-area').innerHTML = AIScorer.renderError(AIScorer.getErrorMessage(error));
      if (error?.code === 'AUTH_REQUIRED') AuthUI.open('login');
    }
  };

  window.RA_showScore = async function() {
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? t('result_failed_start') : finalText && finalText.trim() ? t('result_recording_complete') : t('result_no_speech')}</div>
      <div class="recorder-result-sub">${failedStartWindow ? t('result_failed_sub') : finalText && finalText.trim() ? t('result_ready_sub') : t('result_no_speech_sub')}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="RA_startRecord()">${t('btn_re_record')}</button>
    <button class="btn btn-secondary" onclick="RA_restart()">${t('btn_done')}</button>
  </div>
</div>`;
    if (failedStartWindow) {
      Stats.record('readAloud', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
      $('#score-area').innerHTML = `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e;margin-top:8px"><strong>${t('score_10_label')}</strong><br>${t('score_fail_no_start')}</div>`;
      return;
    }

    if (!recordingBlob && (!finalText || finalText.trim().length < 3)) {
      $('#score-area').innerHTML = `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e;margin-top:8px">${t('score_no_speech')}</div>`;
      return;
    }
    audioSource = recordingBlob ? 'recording' : audioSource;
    renderSubmissionPanel(t('panel_recording_ready'));
  };

  window.RA_prev = function() { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); render(); };
  window.RA_next = function() { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); render(); };

  render();
};
