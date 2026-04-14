Pages['repeat-sentence'] = function() {
  let qIndex = 0;
  let phase = 'idle';
  let timerObj = null;
  let recorder = null;
  let finalText = '';
  let recordingUrl = '';
  let recordingBlob = null;
  let recordingDurationSeconds = 0;
  let recordingStartedAt = 0;
  let uploadedAudio = null;
  let audioSource = '';
  let stopMode = 'score';
  let speechStartTimer = null;
  let speechDetected = false;
  let failedStartWindow = false;
  let player = null;
  const speechStartLimitMs = 5000;
  const sourceQuestions = getQuestionSet(DB.repeatSentence, 'repeatSentence', item => ({
    id: item.id,
    tag: `${t('prediction_badge')} · ${item.monthTag}`,
    text: item.content,
    audio: null,
    isPrediction: true,
  }));
  const totalQuestions = sourceQuestions.length;
  const questions = getTodayPlanQuestions('practice-repeat-sentence', getAccessibleQuestions(sourceQuestions));
  qIndex = getInitialQuestionIndex(questions);
  const getQuestionRecordingKey = (question) => `repeatSentence:${question?.id || qIndex}`;

  setPageCleanup(() => {
    stopTimer();
    clearSpeechStartTimer();
    if (recorder && recorder.isRunning) recorder.stop();
    recorder = null;
    if (player) player.stop();
    player = null;
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
    if (audioSource === 'upload' && uploadedAudio) return { ...uploadedAudio, source: 'upload' };
    if (recordingBlob && recordingUrl) {
      return {
        file: new File([recordingBlob], 'repeat-sentence.webm', { type: recordingBlob.type || 'audio/webm' }),
        previewUrl: recordingUrl,
        durationSeconds: recordingDurationSeconds || 1,
        mimeType: recordingBlob.type || 'audio/webm',
        name: 'Recorded response.webm',
        source: 'recording',
      };
    }
    if (uploadedAudio) return { ...uploadedAudio, source: 'upload' };
    return null;
  }

  function renderSubmissionPanel(message = t('panel_record_answer')) {
    $('#score-area').innerHTML = SpeakingAudio.renderCapturePanel({
      title: 'Speaking audio',
      helperText: message,
      session: { activeAudio: getActiveAudio() },
      uploadAction: 'RS_handleUpload',
      clearUploadAction: 'RS_clearUpload',
      submitAction: 'RS_submitAudio',
      supportsRecording: !!window.MediaRecorder,
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
      RS_stopRecord();
    }, speechStartLimitMs);
  }

  function readyState(message) {
    phase = 'ready';
    finalText = '';
    recordingUrl = '';
    recordingBlob = null;
    recordingDurationSeconds = 0;
    audioSource = '';
    speechDetected = false;
    failedStartWindow = false;
    clearSpeechStartTimer();
    $('#hidden-text').style.display = 'none';
    renderSubmissionPanel(message || t('panel_record_answer'));
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" onclick="RS_startRecord()">🎤</button>
  <div class="record-status" id="rec-status">${message || t('status_ready_record')}</div>
  <div class="recorder-actions">
    <button class="btn btn-primary" onclick="RS_startRecord()">${t('btn_start_recording')}</button>
    <button class="btn btn-secondary" onclick="RS_reset()">${t('btn_done')}</button>
  </div>
</div>`;
    stopTimer();
    timerObj = new CountdownTimer($('#timer-el'), 10, null, RS_startRecord);
    timerObj.start();
  }

  function render() {
    const q = questions[qIndex];
    syncSelectedQuestion(q);
    if (window.PracticeTracker) PracticeTracker.setCurrentQuestion({ questionId: q.id, questionType: 'repeatSentence', questionText: q.text });
    $('#page-container').innerHTML = `
<div class="page-header">
  <h1>${t('rs_title')} <span class="badge badge-speaking">${t('badge_speaking')}</span></h1>
  <p>${t('rs_subtitle')}</p>
</div>
<div class="card">
  <div class="question-nav">
    <span class="q-number">${t('question_label')} ${qIndex+1} ${t('question_of')} ${questions.length}</span>
    <div id="timer-el" class="timer"><span class="timer-dot"></span>00:00</div>
  </div>
  <div class="q-instruction">${t('rs_instruction')}</div>
  <div class="audio-widget" id="audio-widget">
    <button class="audio-btn" id="play-btn" onclick="RS_play()">▶</button>
    <div class="audio-progress">
      <div class="audio-label">${t('status_listen_sentence')}</div>
      <div class="audio-progress-bar"><div class="audio-progress-fill" id="ap-fill" style="width:0%"></div></div>
    </div>
  </div>
  <div id="hidden-text" style="display:none" class="q-text">${q.text}</div>
  <div id="saved-audio-area"></div>
  <div id="recorder-area">
    <div class="recorder-widget">
      <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
      <div class="record-status" id="rec-status">${t('status_play_first')}</div>
    </div>
  </div>
  <div id="score-area"></div>
  <hr class="section-divider">
  <div class="btn-group">
    <button class="btn btn-secondary" onclick="RS_prev()" ${qIndex===0 ? 'disabled' : ''}>${t('btn_prev')}</button>
    ${qIndex===questions.length-1 ? renderTodayPlanAction('practice-repeat-sentence') || `<button class="btn btn-primary" onclick="RS_next()" disabled>${t('btn_next')}</button>` : `<button class="btn btn-primary" onclick="RS_next()">${t('btn_next')}</button>`}
  </div>
  ${renderGuestPracticeUpsell(totalQuestions, questions.length)}
</div>`;
    $('#saved-audio-area').innerHTML = AIScorer.renderQuestionRecordingHistory(getQuestionRecordingKey(q));
    renderSubmissionPanel(t('panel_study_then_record'));
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
    recordingUrl = '';
    recordingBlob = null;
    recordingDurationSeconds = 0;
    recordingStartedAt = Date.now();
    speechDetected = false;
    failedStartWindow = false;
    stopMode = 'score';
    $('#hidden-text').style.display = 'none';
    $('#score-area').innerHTML = '';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget recording" id="rec-widget">
  <button class="record-btn recording" id="rec-btn" onclick="RS_stopRecord()">⏹</button>
  <div class="record-status recording" id="rec-status">${t('status_recording_now')}</div>
  <div class="waveform">${Array(5).fill('<div class="waveform-bar"></div>').join('')}</div>
  <div class="recorder-actions">
    <button class="btn btn-danger" onclick="RS_cancelRecord()">${t('btn_cancel')}</button>
    <button class="btn btn-secondary" onclick="RS_exitRecord()">${t('btn_done')}</button>
  </div>
</div>`;
    timerObj = new CountdownTimer($('#timer-el'), 15, null, RS_stopRecord);
    timerObj.start();
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
          readyState(mode === 'cancel' ? t('toast_rs_cancel') : t('toast_rs_exit'));
          return;
        }
        RS_showScore();
      },
      onError: (e) => {
        showToast(t('toast_mic_error') + e);
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
    recordingBlob = null;
    recordingDurationSeconds = 0;
    $('#recorder-area').innerHTML = `
<div class="recorder-widget">
  <button class="record-btn idle" id="rec-btn" disabled>🎤</button>
  <div class="record-status" id="rec-status">${t('status_play_first')}</div>
</div>`;
    renderSubmissionPanel(t('panel_record_answer'));
  };

  window.RS_handleUpload = async function(event) {
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

  window.RS_clearUpload = function() {
    if (uploadedAudio) SpeakingAudio.revokePreview(uploadedAudio);
    uploadedAudio = null;
    audioSource = recordingBlob ? 'recording' : '';
    renderSubmissionPanel(t('panel_upload_another'));
  };

  window.RS_submitAudio = async function() {
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
        promptType: 'repeat_sentence',
        file: activeAudio.file,
        mimeType: activeAudio.mimeType,
        questionText: q.text,
        referenceAnswer: q.text,
        durationSeconds: activeAudio.durationSeconds,
      });
      stopLoading();
      Stats.record('repeatSentence', result.overall || 0, 90, { transcript: result.transcript || finalText || '', ai_feedback: typeof result.feedback === 'object' ? (result.feedback.summary || '') : (result.feedback || '') });
      AIScorer.saveQuestionRecording(getQuestionRecordingKey(q), {
        audioUrl: AIScorer.getPlayableAudioUrl(result, activeAudio.previewUrl || ''),
        score: result.overall || null,
        createdAt: new Date().toLocaleString(),
      });
      $('#saved-audio-area').innerHTML = AIScorer.renderQuestionRecordingHistory(getQuestionRecordingKey(q));
      $('#score-area').innerHTML = AIScorer.renderSpeakingResult(result, {
        promptType: 'Repeat Sentence',
        referenceText: q.text,
        reRecordAction: 'RS_startRecord()',
        tryAgainAction: 'RS_reset()',
        isLoggedIn: AppAuth.isLoggedIn(),
      });
    } catch (error) {
      stopLoading();
      $('#score-area').innerHTML = AIScorer.renderError(AIScorer.getErrorMessage(error));
      if (error?.code === 'AUTH_REQUIRED') AuthUI.open('login');
    }
  };

  window.RS_showScore = async function() {
    const q = questions[qIndex];
    $('#hidden-text').style.display = 'block';
    $('#recorder-area').innerHTML = `
<div class="recorder-widget done result-state">
  <div class="recorder-result-main">
    <div class="recorder-result-icon">✓</div>
    <div class="recorder-result-copy">
      <div class="recorder-result-title">${failedStartWindow ? t('result_failed_start') : finalText && finalText.trim() ? t('result_recording_complete') : t('result_no_speech')}</div>
      <div class="recorder-result-sub">${failedStartWindow ? t('result_failed_sub') : finalText && finalText.trim() ? t('result_answer_ready') : t('result_no_speech_sub')}</div>
    </div>
  </div>
  <div class="result-actions compact">
    <button class="btn btn-primary" onclick="RS_startRecord()">${t('btn_re_record')}</button>
    <button class="btn btn-secondary" onclick="RS_reset()">${t('btn_done')}</button>
  </div>
</div>`;
    if (failedStartWindow) {
      Stats.record('repeatSentence', 10, 90, { transcript: finalText || '', ai_feedback: 'You must start speaking within 5 seconds after recording begins.' });
      $('#score-area').innerHTML = `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e"><strong>${t('score_10_label')}</strong><br>${t('score_fail_no_start')}</div>`;
      return;
    }
    if (!recordingBlob && (!finalText || !finalText.trim())) {
      $('#score-area').innerHTML = `<div style="background:#fff8ed;border:1px solid #fcd34d;border-radius:8px;padding:14px;font-size:13.5px;color:#92400e">${t('score_no_speech')}</div>`;
      return;
    }
    audioSource = recordingBlob ? 'recording' : audioSource;
    renderSubmissionPanel(t('panel_recording_ready'));
  };

  window.RS_prev = () => { qIndex = Math.max(0, qIndex - 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  window.RS_next = () => { qIndex = Math.min(questions.length - 1, qIndex + 1); stopTimer(); clearRecorder('exit'); if (player) { player.stop(); player = null; } render(); };
  render();
};
