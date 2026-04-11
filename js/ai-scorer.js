// ── Gemini AI Scorer ────────────────────────────────────────────────────────
// Uses Google Gemini 1.5 Flash — free tier (no cost, just needs a free API key).
// Get a free key at: https://aistudio.google.com/app/apikey

const AIScorer = {
  model: 'gemini-1.5-flash',

  getKey() { return localStorage.getItem('pte_gemini_key') || ''; },

  hasKey() { return !!this.getKey(); },

  async call(systemPrompt, userContent) {
    const key = this.getKey();
    if (!key) throw new Error('No API key. Go to ⚙️ Settings to add your free Gemini API key.');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  },

  // ── Read Aloud / Repeat Sentence ──────────────────────────────────────────
  async scoreSpoken(transcript, reference, taskType = 'Read Aloud') {
    const isRepeat = taskType === 'Repeat Sentence';
    const sys = `You are a PTE Academic examiner scoring ${taskType} responses using Pearson's official marking criteria.

${isRepeat ? `REPEAT SENTENCE SCORING RUBRIC:
- content (0–3): 3=all words in correct sequence, 2=most words in order (≥50%), 1=some words (>5%), 0=very few or none
- fluency (0–5): 5=native-like smooth delivery, 4=minor hesitations, 3=some breaks, 2=frequent pauses/repetitions, 1=very hesitant, 0=unintelligible
- pronunciation (0–5): 5=native-like phonemes and stress, 4=minor errors, 3=some errors without affecting comprehension, 2=errors affecting intelligibility, 1=difficult to understand, 0=unintelligible` :
`READ ALOUD SCORING RUBRIC:
- content (0–5): Count words correctly read in order. 5=90%+ words in sequence, 4=75%, 3=50%, 2=25%, 1=a few, 0=none
- fluency (0–5): 5=natural pace with appropriate phrasing and stress, 4=minor pauses, 3=some unnatural breaks, 2=frequent pauses/false starts, 1=very hesitant, 0=unintelligible
- pronunciation (0–5): 5=all phonemes correct with natural stress, 4=minor phonemic errors, 3=some errors, 2=errors reducing intelligibility, 1=mostly unintelligible, 0=unintelligible`}

Return ONLY valid JSON (no markdown, no explanation):
{"overall":number,"content":number,"fluency":number,"pronunciation":number,"feedback":string,"tips":string[]}
All scores use the PTE 10–90 scale (convert raw scores: 10 + raw/max * 80, minimum 38 if any words spoken).
feedback: 1–2 sentences on the main strength and weakness.
tips: 2–3 short actionable improvement points.`;

    const user = `Reference text: "${reference}"
Student transcript: "${transcript || '(no speech detected)'}"
Score this ${taskType} response according to the official PTE rubric above.`;
    const raw = await this.call(sys, user);
    return JSON.parse(raw);
  },

  // ── Writing (Essay / Summarize Written Text) ──────────────────────────────
  async scoreWriting(text, prompt, taskType = 'Essay', wordRange = null) {
    const isEssay = taskType === 'Essay';
    const wInfo = wordRange ? ` Required word range: ${wordRange[0]}–${wordRange[1]} words.` : '';
    const sys = `You are a PTE Academic examiner scoring ${taskType} responses using Pearson's official marking criteria.

${isEssay ? `WRITE ESSAY SCORING RUBRIC (total 15 raw points → PTE 10–90 scale):
- content (0–3): 3=fully addresses all aspects of the task with depth, 2=addresses main topic adequately, 1=partially addresses, 0=off-topic or no content
- form (0–2): 2=within ${wordRange ? wordRange[0]+'-'+wordRange[1] : '200-300'} words, 1=within 10% of range, 0=outside range
- development_structure_coherence (0–2): 2=clear intro/body/conclusion with logical progression and cohesive devices, 1=some structure, 0=no clear structure
- grammar (0–2): 2=varied complex structures used accurately, 1=some complex structures with some errors, 0=basic structures only or frequent errors
- vocabulary (0–2): 2=sophisticated and precise word choice, 1=adequate range, 0=limited or repetitive
- spelling (0–2): 2=no spelling errors, 1=1–2 minor errors, 0=multiple errors` :
`SUMMARIZE WRITTEN TEXT SCORING RUBRIC (total 7 raw points → PTE 10–90 scale):
- content (0–2): 2=accurately identifies all main points from the text, 1=identifies some main points, 0=misses main idea
- form (0–1): 1=single sentence within ${wordRange ? wordRange[0]+'-'+wordRange[1] : '25-50'} words, 0=otherwise
- grammar (0–2): 2=complex grammar used accurately, 1=some grammatical control, 0=frequent errors
- vocabulary (0–2): 2=appropriate academic vocabulary, 1=adequate range, 0=limited range`}

Return ONLY valid JSON (no markdown):
{"overall":number,"content":number,"form":number,"grammar":number,"vocabulary":number,"spelling":number,"feedback":string,"band":string,"tips":string[]}
overall is PTE score 10–90. band is one of: "Expert (79–90)", "Good (65–78)", "Average (50–64)", "Building Up (<50)".
feedback: 2–3 sentences on main strengths and weaknesses.
tips: 2–3 specific improvement suggestions.`;

    const user = `Task prompt: "${prompt}"${wInfo}
Student response (${countWords(text)} words): "${text || '(empty)'}"
Score this ${taskType} response according to the official PTE rubric above.`;
    const raw = await this.call(sys, user);
    return JSON.parse(raw);
  },

  // ── Write From Dictation ──────────────────────────────────────────────────
  async scoreDictation(typed, original) {
    const sys = `You are a PTE Academic examiner scoring Write From Dictation responses.

WRITE FROM DICTATION SCORING:
Each correct word in the correct position scores 1 point. Spelling must be exact.
Total score = correct words / total words * 90 (minimum 10 if any words correct, 0 if blank).

Return ONLY valid JSON (no markdown):
{"overall":number,"wordsCorrect":number,"wordsTotal":number,"errors":string[],"feedback":string}
overall is 0–90 PTE scale. errors lists specific wrong/missing words. feedback is 1 sentence.`;

    const user = `Original sentence: "${original}"
Student typed: "${typed || '(empty)'}"
Score this Write From Dictation response.`;
    const raw = await this.call(sys, user);
    return JSON.parse(raw);
  },

  // ── Summarize Spoken / Summarize Written ──────────────────────────────────
  async scoreSummary(text, sourceText, wordRange, taskType = 'Summarize Spoken Text') {
    const sys = `You are a PTE Academic examiner scoring ${taskType} responses using Pearson's official criteria.

SUMMARIZE SPOKEN TEXT SCORING RUBRIC (total 9 raw points → PTE 10–90 scale):
- content (0–2): 2=captures all key points from the lecture, 1=captures some key points, 0=misses key content
- form (0–1): 1=50–70 words as required, 0=outside range
- grammar (0–2): 2=varied and accurate grammar, 1=some accuracy, 0=frequent errors
- vocabulary (0–2): 2=appropriate academic vocabulary, 1=adequate, 0=limited
- spelling (0–2): 2=no errors, 1=minor errors, 0=multiple errors

Return ONLY valid JSON (no markdown):
{"overall":number,"content":number,"form":number,"grammar":number,"vocabulary":number,"feedback":string,"tips":string[]}
overall is PTE score 10–90. feedback: 2–3 sentences. tips: 2–3 actionable points.`;

    const user = `Source audio transcript: "${sourceText}"
Required word range: ${wordRange[0]}–${wordRange[1]} words.
Student response (${countWords(text)} words): "${text || '(empty)'}"
Score this ${taskType} response.`;
    const raw = await this.call(sys, user);
    return JSON.parse(raw);
  },

  // ── Render AI score panel ─────────────────────────────────────────────────
  renderScorePanel(score, type = 'speaking') {
    const overall = score.overall ?? score.score ?? 0;
    const bars = [];
    if (type === 'speaking') {
      bars.push(
        { label: 'Content',       val: score.content ?? 0 },
        { label: 'Fluency',       val: score.fluency ?? 0 },
        { label: 'Pronunciation', val: score.pronunciation ?? 0 },
      );
    } else if (type === 'writing') {
      bars.push(
        { label: 'Content',    val: score.content ?? 0 },
        { label: 'Form',       val: score.form ?? 0 },
        { label: 'Grammar',    val: score.grammar ?? 0 },
        { label: 'Vocabulary', val: score.vocabulary ?? 0 },
      );
    } else if (type === 'dictation') {
      bars.push({ label: 'Accuracy', val: overall });
    }

    const tipsHtml = score.tips?.length
      ? `<div style="margin-top:10px"><strong>Tips:</strong><ul style="margin:6px 0 0 16px;font-size:13px;color:var(--text-light)">${score.tips.map(t=>`<li>${t}</li>`).join('')}</ul></div>`
      : '';
    const errorsHtml = score.errors?.length
      ? `<div style="margin-top:10px"><strong>Errors:</strong><ul style="margin:6px 0 0 16px;font-size:13px;color:var(--danger)">${score.errors.map(e=>`<li>${e}</li>`).join('')}</ul></div>`
      : '';

    return `
<div class="score-panel" style="margin-top:12px">
  <div style="display:flex;align-items:flex-end;gap:16px">
    <div><div class="score-big">${overall}</div><div class="score-label">AI Score / 90 (PTE scale)${score.band?` — ${score.band}`:''}</div></div>
    <div style="margin-left:auto;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px;font-size:12px">Powered by Gemini AI</div>
  </div>
</div>
<div class="card" style="margin-top:10px">
  ${bars.map(b=>`<div class="score-bar-row">
<div class="score-bar-label">${b.label}</div>
<div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.round(b.val/90*100)}%;background:${Scorer.gradeColor(Math.round(b.val/90*100))}"></div></div>
<div class="score-bar-val">${b.val}</div>
</div>`).join('')}
  ${score.feedback ? `<hr class="section-divider"><div style="font-size:13.5px;line-height:1.6">${score.feedback}</div>` : ''}
  ${tipsHtml}${errorsHtml}
</div>`;
  },

  renderLoading() {
    return `<div class="card" style="margin-top:12px;text-align:center;padding:28px">
<div class="spinner" style="margin:0 auto 12px"></div>
<div style="font-size:13px;color:var(--text-light)">Gemini AI is scoring your response…</div>
</div>`;
  },

  renderError(msg) {
    return `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;font-size:13.5px;color:#78350f;margin-top:8px">
⚠️ AI Scoring unavailable: ${msg}<br>
<a onclick="navigate('settings')" style="color:var(--primary);cursor:pointer;text-decoration:underline">Go to Settings</a> to add your free Gemini API key.
</div>`;
  },
};
