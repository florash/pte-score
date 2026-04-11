Pages['settings'] = function () {
  const saved = localStorage.getItem('pte_gemini_key') || '';
  const masked = saved ? saved.slice(0, 8) + '••••••••••••••••••••' : '';
  const micLabel = window.MicAccess ? MicAccess.getStatusLabel() : 'Unknown';
  const micState = window.MicAccess ? MicAccess.permissionState : 'prompt';
  const isLoggedIn = !!(window.AppAuth && AppAuth.isLoggedIn());
  const userEmail = AppAuth?.user?.email || '';

  $('#page-container').innerHTML = `
<div class="page-header">
  <h1>AI Settings</h1>
  <p>Configure your free Gemini API key to enable AI scoring for speaking and writing.</p>
</div>

<div class="card" style="max-width:600px;margin-bottom:16px">
  <div class="eyebrow">Microphone Access</div>
  <div class="card-title" style="margin-bottom:6px">One-time speaking permission</div>
  <p style="font-size:13.5px;color:var(--text-light);line-height:1.7;margin-bottom:14px">
    Current status: <strong>${micLabel}</strong><br>
    Allow microphone access once for <strong>localhost:3000</strong> so speaking tasks can start with fewer permission prompts.
  </p>
  <div style="display:flex;gap:10px;align-items:center">
    <button class="btn btn-primary" onclick="requestMicPreauth('settings')" ${micState === 'granted' ? 'disabled' : ''}>Enable Microphone</button>
    ${micState === 'granted' ? '<span style="font-size:12.5px;color:var(--success)">✓ Microphone already enabled</span>' : ''}
  </div>
</div>

<div class="card" style="max-width:600px;margin-bottom:16px">
  <div class="eyebrow">Supabase Write Test</div>
  <div class="card-title" style="margin-bottom:6px">Temporary insert test</div>
  <p style="font-size:13.5px;color:var(--text-light);line-height:1.7;margin-bottom:14px">
    ${isLoggedIn ? `Logged in as <strong>${userEmail}</strong>.` : 'Log in first to test inserting one row into practice_attempts.'}
  </p>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <button class="btn btn-primary" onclick="saveSupabaseTestAttempt()" ${isLoggedIn ? '' : 'disabled'}>Save Test Attempt</button>
    <div id="supabase-test-status" style="font-size:12.5px;color:var(--text-light)"></div>
  </div>
</div>

<div class="card" style="max-width:600px">
  <div class="eyebrow">Gemini AI Scoring</div>
  <div class="card-title" style="margin-bottom:6px">Free API Key Setup</div>
  <p style="font-size:13.5px;color:var(--text-light);line-height:1.7;margin-bottom:20px">
    Google Gemini 1.5 Flash is <strong>completely free</strong> — no credit card required.<br>
    It provides PTE-standard scoring for speaking, writing, and dictation tasks.
  </p>

  <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px;line-height:1.8">
    <strong>How to get your free key:</strong><br>
    1. Visit <strong>aistudio.google.com</strong><br>
    2. Sign in with your Google account<br>
    3. Click <strong>"Get API key"</strong> → <strong>"Create API key"</strong><br>
    4. Copy the key and paste it below
  </div>

  <label style="display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">Gemini API Key</label>
  <input
    id="gemini-key-input"
    type="password"
    placeholder="AIza..."
    value="${masked ? saved : ''}"
    style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:monospace;background:var(--surface);color:var(--text);outline:none;transition:border-color 0.15s"
    onfocus="this.style.borderColor='var(--primary)'"
    onblur="this.style.borderColor='var(--border)'"
  />
  <div id="key-status" style="margin-top:8px;font-size:12.5px;height:18px">
    ${saved ? '<span style="color:var(--success)">✓ API key saved</span>' : '<span style="color:var(--text-light)">No key saved yet</span>'}
  </div>

  <div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn btn-primary" onclick="saveGeminiKey()">Save Key</button>
    ${saved ? `<button class="btn btn-outline" onclick="removeGeminiKey()" style="color:var(--danger);border-color:var(--danger)">Remove Key</button>` : ''}
  </div>
</div>

<div class="card" style="max-width:600px;margin-top:16px">
  <div class="card-title" style="margin-bottom:10px">What AI Scoring covers</div>
  <div style="display:grid;gap:8px;font-size:13.5px;color:var(--text-light)">
    <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--success);font-weight:700;flex-shrink:0">✓</span><span><strong style="color:var(--text)">Speaking</strong> — Read Aloud, Repeat Sentence, Describe Image, Re-tell Lecture, Answer Short Question<br><span style="font-size:12px">Scored on Content, Oral Fluency, Pronunciation (PTE official rubric)</span></span></div>
    <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--success);font-weight:700;flex-shrink:0">✓</span><span><strong style="color:var(--text)">Writing</strong> — Write Essay, Summarize Written Text<br><span style="font-size:12px">Scored on Content, Form, Grammar, Vocabulary, Spelling</span></span></div>
    <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--success);font-weight:700;flex-shrink:0">✓</span><span><strong style="color:var(--text)">Listening</strong> — Write From Dictation, Summarize Spoken Text<br><span style="font-size:12px">Word-level accuracy scoring</span></span></div>
    <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--text-light);font-weight:700;flex-shrink:0">—</span><span><strong style="color:var(--text)">Reading</strong> — Auto-scored locally (no AI needed)<br><span style="font-size:12px">Objective answer matching</span></span></div>
  </div>
</div>
`;

  window.saveGeminiKey = function () {
    const key = document.getElementById('gemini-key-input').value.trim();
    if (!key) {
      document.getElementById('key-status').innerHTML = '<span style="color:var(--danger)">Please enter a key first.</span>';
      return;
    }
    if (!key.startsWith('AIza')) {
      document.getElementById('key-status').innerHTML = '<span style="color:var(--warning)">Warning: Gemini keys usually start with "AIza"</span>';
    }
    localStorage.setItem('pte_gemini_key', key);
    document.getElementById('key-status').innerHTML = '<span style="color:var(--success)">✓ Key saved successfully!</span>';
    // Re-render after a moment to show remove button
    setTimeout(() => Pages['settings'](), 800);
  };

  window.removeGeminiKey = function () {
    localStorage.removeItem('pte_gemini_key');
    Pages['settings']();
  };

  window.saveSupabaseTestAttempt = async function () {
    const status = document.getElementById('supabase-test-status');
    if (!status) return;
    status.style.color = 'var(--text-light)';
    status.textContent = 'Saving...';
    try {
      await PracticeTracker.saveTestAttempt();
      status.style.color = 'var(--success)';
      status.textContent = '✓ Test attempt saved successfully.';
    } catch (error) {
      status.style.color = 'var(--danger)';
      status.textContent = error.message || 'Insert failed.';
    }
  };
};
