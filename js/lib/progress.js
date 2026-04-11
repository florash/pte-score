const PracticeTracker = {
  currentQuestion: null,

  setCurrentQuestion(meta) {
    this.currentQuestion = {
      questionId: meta?.questionId || '',
      questionType: meta?.questionType || '',
      questionText: meta?.questionText || '',
    };
  },

  buildAttempt(questionType, score, meta = {}) {
    const current = this.currentQuestion || {};
    return {
      question_id: meta.questionId || current.questionId || '',
      question_type: meta.questionType || questionType || current.questionType || '',
      question_text: meta.questionText || current.questionText || null,
      score: typeof score === 'number' ? score : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Number.isFinite(meta.duration_seconds) ? meta.duration_seconds : null,
      transcript: meta.transcript || null,
      ai_feedback: meta.ai_feedback || null,
    };
  },

  async saveAttempt(questionType, score, meta = {}) {
    if (!AppAuth.isLoggedIn()) return { skipped: true };
    const client = SupabaseService.getClient();
    if (!client) return { skipped: true };
    const attempt = this.buildAttempt(questionType, score, meta);
    if (!attempt.question_id || !attempt.question_type) return { skipped: true };
    const payload = {
      user_id: AppAuth.user.id,
      ...attempt,
    };
    const { data, error } = await client.from('practice_attempts').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async fetchAttempts(limit = 200) {
    if (!AppAuth.isLoggedIn()) return [];
    const client = SupabaseService.getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('practice_attempts')
      .select('id, question_id, question_type, question_text, score, completed_at, duration_seconds, transcript, ai_feedback')
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async fetchRecentAttempts(limit = 8) {
    return this.fetchAttempts(limit);
  },

  async fetchSummaryStats() {
    const attempts = await this.fetchAttempts(500);
    const totalCompleted = attempts.length;
    const scoreAttempts = attempts.filter(item => typeof item.score === 'number');
    const averageScore = scoreAttempts.length
      ? Math.round(scoreAttempts.reduce((sum, item) => sum + item.score, 0) / scoreAttempts.length)
      : null;
    const countsByType = attempts.reduce((acc, item) => {
      acc[item.question_type] = (acc[item.question_type] || 0) + 1;
      return acc;
    }, {});
    const mostRecent = attempts[0] || null;
    return {
      totalCompleted,
      averageScore,
      countsByType,
      mostRecent,
      attempts,
    };
  },

  async saveTestAttempt() {
    if (!AppAuth.isLoggedIn()) throw new Error('You must be logged in first.');
    const client = SupabaseService.getClient();
    if (!client) throw new Error(SupabaseService.getMissingMessage());

    const payload = {
      user_id: AppAuth.user.id,
      question_id: 'test_001',
      question_type: 'repeat_sentence',
      question_text: 'This is a test practice attempt.',
      score: 80,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('practice_attempts')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

window.PracticeTracker = PracticeTracker;
