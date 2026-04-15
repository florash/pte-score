const AIScorer = {
  recentRecordingsKey: 'pte_recent_question_recordings_v1',

  getBaseUrl() {
    const env = window.__PTE_ENV__ || {};
    const appConfig = window.APP_CONFIG || {};
    const hostname = window.location.hostname || '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const fallbackApiBaseUrl = isLocalHost ? 'http://localhost:8000' : '';
    return (appConfig.API_BASE_URL || env.PTE_API_BASE_URL || window.PTE_API_BASE_URL || fallbackApiBaseUrl).replace(/\/$/, '');
  },

  getNetworkDebugMessage(error, endpoint = '') {
    const baseUrl = this.getBaseUrl();
    const target = `${baseUrl}${endpoint}`;
    console.error('API network error:', error);
    return `Unable to connect to AI scoring service. Target: ${target}.`;
  },

  buildUrl(path) {
    return `${this.getBaseUrl()}${path}`;
  },

  async getAuthToken() {
    if (!window.AppAuth || !AppAuth.isLoggedIn()) return '';
    if (typeof AppAuth.getAccessToken === 'function') {
      return (await AppAuth.getAccessToken()) || '';
    }
    return AppAuth.session?.access_token || '';
  },

  getErrorMessage(error, fallback = 'AI scoring is unavailable right now.') {
    const code = error?.code || '';
    if (code === 'AUTH_REQUIRED') return 'Sign in to use AI scoring';
    if (code === 'DAILY_LIMIT') return 'Daily AI scoring limit reached';
    if (code === 'TIMEOUT') return 'The AI scoring request timed out. Please try again.';
    if (code === 'SERVICE_UNAVAILABLE') return 'AI scoring service is temporarily unavailable.';
    if (code === 'PARSE_ERROR') return 'We could not read the scoring result. Please try again.';
    if (code === 'NETWORK_ERROR') return error?.message || 'Unable to connect to AI scoring service. Please try again.';
    if (code === 'REQUEST_FAILED') return error?.message || 'AI scoring request failed.';
    return error?.message || fallback;
  },

  buildHttpError(response, body, fallbackMessage) {
    console.error('API response error body:', body);
    const message = body?.error || body?.message || fallbackMessage || `AI scoring failed (HTTP ${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.code = 'REQUEST_FAILED';
    if (response.status === 401) error.code = 'AUTH_REQUIRED';
    else if (response.status === 429) error.code = message === 'Daily AI scoring limit reached' ? 'DAILY_LIMIT' : 'RATE_LIMIT';
    else if (response.status >= 500) error.code = 'SERVICE_UNAVAILABLE';
    return error;
  },

  async parseJsonResponse(response) {
    const rawText = await response.text();
    if (!rawText) return null;
    try {
      return JSON.parse(rawText);
    } catch (error) {
      console.error('API raw response body:', rawText);
      const parseError = new Error(response.ok ? 'We could not read the scoring result. Please try again.' : `AI scoring failed (HTTP ${response.status})`);
      parseError.code = response.ok ? 'PARSE_ERROR' : 'REQUEST_FAILED';
      parseError.status = response.status;
      throw parseError;
    }
  },

  async requestScore(payload) {
    if (!window.AppAuth || !AppAuth.isLoggedIn()) {
      const error = new Error('Sign in to use AI scoring');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const token = await this.getAuthToken();
      const url = this.buildUrl('/api/score');
      console.log('Calling API:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await this.parseJsonResponse(response);

      if (!response.ok || body?.success === false) {
        throw this.buildHttpError(response, body, `AI scoring failed (HTTP ${response.status})`);
      }

      return body.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('The AI scoring request timed out. Please try again.');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        const networkError = new Error(this.getNetworkDebugMessage(error, '/api/score'));
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }
      console.error('API error:', error);
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async requestAudioScore({ file, payload }) {
    if (!window.AppAuth || !AppAuth.isLoggedIn()) {
      const error = new Error('Sign in to use AI scoring');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }
    if (!file) {
      const error = new Error('Audio recording is unavailable. Please record again.');
      error.code = 'NO_AUDIO';
      throw error;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const token = await this.getAuthToken();
      const formData = new FormData();
      formData.append('file', file, file.name || 'recording.webm');
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });

      const url = this.buildUrl('/api/score-audio');
      console.log('Calling API:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });

      const body = await this.parseJsonResponse(response);

      if (!response.ok || body?.success === false) {
        throw this.buildHttpError(response, body, `AI scoring failed (HTTP ${response.status})`);
      }

      return body.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('The AI scoring request timed out. Please try again.');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        const networkError = new Error(this.getNetworkDebugMessage(error, '/api/score-audio'));
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }
      console.error('API error:', error);
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async scoreSpoken(params) {
    return this.requestScore({
      task: 'speaking',
      promptType: params.promptType || 'Read Aloud',
      transcript: params.transcript || '',
      questionText: params.questionText || null,
      referenceAnswer: params.referenceAnswer || null,
    });
  },

  async scoreWriting(params) {
    return this.requestScore({
      task: 'writing',
      promptType: params.promptType || 'Write Essay',
      transcript: params.transcript || '',
      questionText: params.questionText || null,
      referenceAnswer: params.referenceAnswer || null,
    });
  },

  async scoreDictation(params) {
    return this.requestScore({
      task: 'dictation',
      promptType: params.promptType || 'Write From Dictation',
      transcript: params.transcript || '',
      questionText: params.questionText || null,
      referenceAnswer: params.referenceAnswer || null,
    });
  },

  async scoreSummary(params) {
    return this.requestScore({
      task: 'summary',
      promptType: params.promptType || 'Summarize Spoken Text',
      transcript: params.transcript || '',
      questionText: params.questionText || null,
      referenceAnswer: params.referenceAnswer || null,
    });
  },

  async scoreAudio(params) {
    const sampleRate = params.sampleRateHertz
      || window.MicAccess?.stream?.getAudioTracks?.()[0]?.getSettings?.().sampleRate
      || 48000;
    return this.requestAudioScore({
      file: params.file,
      payload: {
        task: params.task || 'speaking',
        promptType: params.promptType || 'Read Aloud',
        questionText: params.questionText || '',
        referenceAnswer: params.referenceAnswer || '',
        mimeType: params.mimeType || params.file?.type || 'audio/webm',
        sampleRateHertz: sampleRate,
        durationSeconds: params.durationSeconds || '',
      },
    });
  },

  renderLoading(message) {
    return `<div class="card" style="margin-top:12px;text-align:center;padding:28px">
<div class="spinner" style="margin:0 auto 12px"></div>
<div style="font-size:14px;color:var(--text);font-weight:600">${message || t('score_analyzing')}</div>
<div style="font-size:13px;color:var(--text-light);margin-top:6px">${t('score_generating')}</div>
</div>`;
  },

  renderError(message) {
    return `<div style="background:#fff8ed;border:1px solid #f59e0b;border-radius:10px;padding:14px;font-size:13.5px;color:#92400e;margin-top:8px">
<strong>${t('score_unavailable')}</strong><br>${Scorer.escapeHtml(message)}
</div>`;
  },

  renderAuthGate() {
    return `<div style="background:#eef6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;font-size:13.5px;color:#1d4ed8;margin-top:8px">
<strong>${t('score_sign_in_msg')}</strong><br>
<button class="btn btn-primary" style="margin-top:10px" onclick="AuthUI.open('login')">${t('btn_sign_in')}</button>
</div>`;
  },

  metricRows(metrics) {
    return metrics
      .filter(item => typeof item.value === 'number')
      .map(item => `
<div class="score-bar-row">
  <div class="score-bar-label">${item.label}</div>
  <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.max(0, Math.min(100, Math.round(item.value / 90 * 100)))}%;background:${Scorer.gradeColor(Math.round(item.value / 90 * 100))}"></div></div>
  <div class="score-bar-val">${item.value}</div>
</div>`)
      .join('');
  },

  metricLabel(key, fallback) {
    return t(key) || fallback;
  },

  renderStructuredResult(result, options = {}) {
    const title = options.title || t('score_overall');
    const subtitle = options.subtitle || '';
    const metrics = options.metrics || [];
    const feedbackText = typeof result.feedback === 'object' && result.feedback
      ? (result.feedback.summary || t('score_no_feedback'))
      : (result.feedback || t('score_no_feedback'));
    const transcriptHtml = result.transcript
      ? `<div class="card" style="margin-top:12px"><div class="card-title">${t('score_transcript_label')}</div><div class="transcript-box">${Scorer.escapeHtml(result.transcript)}</div></div>`
      : '';

    return `
<div class="score-panel" style="margin-top:14px">
  <div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap">
    <div>
      <div class="score-big" style="color:#fff">${result.overall ?? 0}</div>
      <div class="score-label">${Scorer.escapeHtml(title)}</div>
    </div>
    <div style="flex:1"></div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700;color:#fff">${Scorer.escapeHtml(subtitle)}</div>
      <div style="font-size:11px;opacity:0.7">${t('score_scale')}</div>
    </div>
  </div>
</div>
<div class="card" style="margin-top:10px">
  ${this.metricRows(metrics)}
  <hr class="section-divider">
  <div class="card-title">${t('score_feedback_label')}</div>
  <div style="font-size:13.5px;line-height:1.7;color:var(--text-light)">${Scorer.escapeHtml(feedbackText)}</div>
</div>
${transcriptHtml}`;
  },

  feedbackList(items, emptyText) {
    const rows = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!rows.length) return `<div style="font-size:13px;color:var(--text-light)">${Scorer.escapeHtml(emptyText || t('score_no_feedback'))}</div>`;
    return `<div class="speaking-feedback-list">${rows.map(item => `<div class="speaking-feedback-item">${Scorer.escapeHtml(item)}</div>`).join('')}</div>`;
  },

  renderSavedAttempt(result) {
    if (!result?.attemptId && !result?.audioPath && !result?.audioUrl) return '';
    const derivedAudioUrl = result.audioPath && window.SupabaseService
      ? SupabaseService.getPublicStorageUrl(SupabaseService.speakingBucket, result.audioPath)
      : '';
    if (result.audioPath && !derivedAudioUrl) {
      console.error('[AIScorer] Saved attempt has audioPath but public URL generation failed.', {
        attemptId: result.attemptId,
        audioPath: result.audioPath,
      });
    }
    const resolvedAudioUrl = derivedAudioUrl || result.audioUrl || '';
    const audioPlayer = resolvedAudioUrl
      ? `<audio class="result-audio-player" controls preload="none" src="${Scorer.escapeHtml(resolvedAudioUrl)}"></audio>`
      : `<div class="result-audio-empty">${t('score_replay_empty')}</div>`;
    const transcriptMeta = typeof result.transcriptWordCount === 'number'
      ? `<span>${result.transcriptWordCount} words</span>`
      : '';
    const durationMeta = typeof result.durationSeconds === 'number'
      ? `<span>${Math.round(result.durationSeconds * 10) / 10}s</span>`
      : '';
    const issueMeta = result.issueSummary
      ? `<div class="speaking-saved-summary">${Scorer.escapeHtml(result.issueSummary)}</div>`
      : '';

    return `
<div class="card speaking-result-card speaking-saved-card" style="animation-delay:.1s">
  <div class="speaking-saved-head">
    <div>
      <div class="card-title">${t('score_saved_title')}</div>
      <div class="speaking-saved-copy">${t('score_saved_copy')}</div>
    </div>
    <button class="btn btn-outline" type="button" onclick="navigate('progress')">${t('btn_view_progress')}</button>
  </div>
  <div class="speaking-saved-meta">
    ${result.audioPath ? `<span>${Scorer.escapeHtml(result.audioPath)}</span>` : ''}
    ${durationMeta}
    ${transcriptMeta}
  </div>
  ${issueMeta}
  <div class="speaking-saved-player">
    ${audioPlayer}
  </div>
</div>`;
  },

  renderInlineSavedRecording(options = {}) {
    const audioUrl = options.audioUrl || '';
    if (!audioUrl) return '';
    const title = options.title || 'This question recording';
    const copy = options.copy || 'Replay the exact answer you just submitted for this question.';
    return `
<div class="card speaking-result-card speaking-inline-recording" style="animation-delay:.02s">
  <div class="card-title">${Scorer.escapeHtml(title)}</div>
  <div class="speaking-saved-copy">${Scorer.escapeHtml(copy)}</div>
  <div class="speaking-saved-player">
    <audio class="result-audio-player" controls preload="metadata" src="${Scorer.escapeHtml(audioUrl)}"></audio>
  </div>
</div>`;
  },

  getPlayableAudioUrl(result = {}, fallbackUrl = '') {
    const derivedAudioUrl = result.audioPath && window.SupabaseService
      ? SupabaseService.getPublicStorageUrl(SupabaseService.speakingBucket, result.audioPath)
      : '';
    if (result.audioPath && !derivedAudioUrl && !result.audioUrl && !fallbackUrl) {
      console.error('[AIScorer] Recording path exists but no playable URL could be generated.', {
        attemptId: result.attemptId,
        audioPath: result.audioPath,
      });
    }
    return derivedAudioUrl || result.audioUrl || fallbackUrl || '';
  },

  loadRecentQuestionRecordings() {
    try {
      return JSON.parse(window.localStorage.getItem(this.recentRecordingsKey) || '{}') || {};
    } catch (error) {
      console.error('[AIScorer] Failed to read recent question recordings.', error);
      return {};
    }
  },

  saveRecentQuestionRecordings(payload) {
    try {
      window.localStorage.setItem(this.recentRecordingsKey, JSON.stringify(payload));
    } catch (error) {
      console.error('[AIScorer] Failed to persist recent question recordings.', error);
    }
  },

  saveQuestionRecording(questionKey, entry) {
    if (!questionKey || !entry?.audioUrl) return;
    const payload = this.loadRecentQuestionRecordings();
    const existing = Array.isArray(payload[questionKey]) ? payload[questionKey] : [];
    payload[questionKey] = [entry, ...existing].filter(item => item && item.audioUrl).slice(0, 5);
    this.saveRecentQuestionRecordings(payload);
  },

  getQuestionRecordings(questionKey) {
    if (!questionKey) return [];
    const payload = this.loadRecentQuestionRecordings();
    return Array.isArray(payload[questionKey]) ? payload[questionKey] : [];
  },

  renderQuestionRecordingHistory(questionKey, options = {}) {
    const items = this.getQuestionRecordings(questionKey);
    if (!items.length) return '';
    const title = options.title || t('score_recent_title');
    const rows = items.map((item, index) => `
<div class="speaking-history-item">
  <div class="speaking-history-meta">
    <span class="speaking-history-badge">${index === 0 ? t('score_latest') : `${t('score_attempt')}${index + 1}`}</span>
    ${item.createdAt ? `<span>${Scorer.escapeHtml(item.createdAt)}</span>` : ''}
    ${typeof item.score === 'number' ? `<span>Score ${item.score}</span>` : ''}
  </div>
  <audio class="result-audio-player" controls preload="metadata" src="${Scorer.escapeHtml(item.audioUrl)}"></audio>
</div>`).join('');
    return `
<div class="card speaking-result-card speaking-inline-recording">
  <div class="card-title">${Scorer.escapeHtml(title)}</div>
  <div class="speaking-saved-copy">${t('score_recent_copy')}</div>
  <div class="speaking-history-list">${rows}</div>
</div>`;
  },

  renderSpeakingActions(context = {}) {
    const saveLabel = context.isLoggedIn ? t('score_save_label') : t('score_save_signin');
    const buttons = [
      context.reRecordAction ? `<button class="btn btn-primary" onclick="${context.reRecordAction}">${t('btn_re_record')}</button>` : '',
      context.tryAgainAction ? `<button class="btn btn-secondary" onclick="${context.tryAgainAction}">${t('btn_try_again')}</button>` : '',
      context.isLoggedIn
        ? `<button class="btn btn-outline" type="button" disabled aria-disabled="true">${Scorer.escapeHtml(saveLabel)}</button>`
        : `<button class="btn btn-outline" type="button" onclick="openLoginPrompt()">${Scorer.escapeHtml(saveLabel)}</button>`,
    ].filter(Boolean).join('');
    return `<div class="speaking-result-actions">${buttons}</div>`;
  },

  renderSpeakingResult(result, context = {}) {
    const feedback = typeof result.feedback === 'object' && result.feedback ? result.feedback : null;
    const feedbackSummary = feedback?.summary || result.feedback || t('score_no_feedback');
    const diff = context.referenceText && window.TextDiff
      ? TextDiff.compareText(context.referenceText, result.transcript || '')
      : null;

    const heroHtml = `
<div class="score-panel speaking-result-hero" style="margin-top:14px">
  <div class="speaking-result-hero-top">
    <div>
      <div class="score-big" style="color:#fff">${result.overall ?? 0}</div>
      <div class="score-label">${Scorer.escapeHtml(context.promptType || '')}</div>
    </div>
    <div class="speaking-result-badge">${t('score_ai_label')}</div>
  </div>
</div>`;

    const breakdownHtml = `
  <div class="card speaking-result-card speaking-breakdown-card" style="animation-delay:.03s">
  <div class="card-title">${t('score_breakdown')}</div>
  ${this.metricRows([
    { label: this.metricLabel('metric_content', 'Content'), value: result.content },
    { label: this.metricLabel('metric_fluency', 'Fluency'), value: result.fluency },
    { label: this.metricLabel('metric_pronunciation', 'Pronunciation'), value: result.pronunciation },
  ])}
</div>`;

    const feedbackHtml = `
<div class="card speaking-result-card" style="animation-delay:.07s">
  <div class="card-title">${t('score_feedback_label')}</div>
  <div class="speaking-feedback-summary">${Scorer.escapeHtml(feedbackSummary)}</div>
  <div class="speaking-feedback-columns">
    <div>
      <div class="speaking-feedback-heading">${t('score_key_issues')}</div>
      ${this.feedbackList(feedback?.issues, t('score_no_issues'))}
    </div>
    <div>
      <div class="speaking-feedback-heading">${t('score_improvements')}</div>
      ${this.feedbackList(feedback?.improvements, t('score_no_improve'))}
    </div>
  </div>
  ${(feedback?.example_fix || context.referenceText)
    ? `<div class="speaking-feedback-heading">${t('score_correct_example')}</div><div class="speaking-example-fix">${Scorer.escapeHtml(feedback?.example_fix || context.referenceText || '')}</div>`
    : ''}
</div>`;

    const reviewHtml = diff && window.WordReview
      ? WordReview.render(diff, {
        referenceText: context.referenceText,
        transcriptText: result.transcript || '',
      })
      : (result.transcript
        ? `<div class="card speaking-result-card" style="animation-delay:.12s"><div class="card-title">${t('score_recognised')}</div><div class="transcript-box">${Scorer.escapeHtml(result.transcript)}</div></div>`
        : '');

    return heroHtml + breakdownHtml + feedbackHtml + this.renderSavedAttempt(result) + reviewHtml + this.renderSpeakingActions(context);
  },

  renderWritingResult(result, context = {}) {
    return this.renderStructuredResult(result, {
      title: t('score_overall'),
      subtitle: context.promptType || 'Writing assessment',
      metrics: [
        { label: this.metricLabel('metric_content', 'Content'), value: result.content },
        { label: this.metricLabel('metric_grammar', 'Grammar'), value: result.grammar },
        { label: this.metricLabel('metric_vocabulary', 'Vocabulary'), value: result.vocabulary },
        { label: this.metricLabel('metric_spelling', 'Spelling'), value: result.spelling },
      ],
    });
  },

  renderSummaryResult(result, context = {}) {
    return this.renderStructuredResult(result, {
      title: t('score_overall'),
      subtitle: context.promptType || 'Summary assessment',
      metrics: [
        { label: this.metricLabel('metric_content', 'Content'), value: result.content },
        { label: this.metricLabel('metric_grammar', 'Grammar'), value: result.grammar },
        { label: this.metricLabel('metric_vocabulary', 'Vocabulary'), value: result.vocabulary },
        { label: this.metricLabel('metric_spelling', 'Spelling'), value: result.spelling },
      ],
    });
  },

  renderDictationResult(result) {
    return this.renderStructuredResult(result, {
      title: t('score_overall'),
      subtitle: t('wfd_title'),
      metrics: [
        { label: this.metricLabel('metric_spelling', 'Spelling'), value: result.spelling },
        { label: this.metricLabel('metric_grammar', 'Grammar'), value: result.grammar },
        { label: this.metricLabel('metric_vocabulary', 'Vocabulary'), value: result.vocabulary },
      ],
    });
  },
};

window.AIScorer = AIScorer;
