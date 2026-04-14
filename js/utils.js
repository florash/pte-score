// ── Utilities ──────────────────────────────────────────────────────────────

function $(sel, ctx) { return (ctx||document).querySelector(sel); }
function $$(sel, ctx) { return [...(ctx||document).querySelectorAll(sel)]; }

function showToast(msg, duration=2800) {
  const old = document.querySelector('.toast');
  if(old) old.remove();
  const el = document.createElement('div');
  el.className='toast'; el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), duration);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(w=>w.length>0).length;
}

function formatTime(sec) {
  const m=Math.floor(sec/60), s=sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

const MicAccess = {
  stream: null,
  permissionState: 'prompt',
  pending: null,
  preauthStarted: false,

  async syncPermissionState() {
    if(!navigator.permissions || !navigator.permissions.query) return this.permissionState;
    try {
      const status = await navigator.permissions.query({ name: 'microphone' });
      this.permissionState = status.state;
      status.onchange = () => { this.permissionState = status.state; };
      return this.permissionState;
    } catch(e) {
      return this.permissionState;
    }
  },

  getStatusLabel() {
    if (this.permissionState === 'granted') return 'Allowed';
    if (this.permissionState === 'denied') return 'Blocked';
    return 'Not enabled';
  },

  async ensure() {
    // 检查已有 stream 是否仍然活跃（跨页面导航后 tracks 可能变成 ended）
    if (this.stream) {
      const alive = this.stream.getTracks().some(t => t.readyState === 'live');
      if (!alive) { this.stream = null; } // 清除失效 stream，重新申请
    }
    if(this.stream) return this.stream;
    if(this.pending) return this.pending;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;

    this.pending = navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.stream = stream;
        this.permissionState = 'granted';
        // 监听 stream 失效，自动清除
        stream.getTracks().forEach(t => {
          t.onended = () => { if(this.stream === stream) this.stream = null; };
        });
        return stream;
      })
      .catch(err => {
        this.permissionState = 'denied';
        throw err;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  },

  async ensureOrNotify() {
    try {
      await this.ensure();
      return true;
    } catch (e) {
      showToast('Please allow microphone access once so recording can work normally.');
      return false;
    }
  },

  async preAuthorize({ silent=false } = {}) {
    try {
      await this.syncPermissionState();
      if (this.permissionState === 'granted') return true;
      await this.ensure();
      localStorage.setItem('pte_mic_preauth_granted', '1');
      return true;
    } catch (e) {
      if (!silent) showToast('Microphone permission was not granted yet.');
      return false;
    }
  },

  async preAuthorizeOnEntry() {
    if (this.preauthStarted) return;
    this.preauthStarted = true;
    await this.syncPermissionState();
    if (this.permissionState === 'granted') {
      localStorage.setItem('pte_mic_preauth_granted', '1');
      return;
    }
    if (sessionStorage.getItem('pte_mic_preauth_prompted') === '1') return;
    sessionStorage.setItem('pte_mic_preauth_prompted', '1');
    await this.preAuthorize({ silent: true });
  }
};

window.MicAccess = MicAccess;

// Persistent stats
const Stats = {
  _key: 'pte_stats',
  get() {
    try { return JSON.parse(localStorage.getItem(this._key)||'{}'); } catch(e){return {};}
  },
  save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },
  record(type, score, total, meta={}) {
    const d=this.get();
    if(!d[type]) d[type]={attempts:0,totalScore:0,history:[]};
    d[type].attempts++;
    d[type].totalScore+=score;
    d[type].history.push({score,total,date:new Date().toISOString()});
    if(d[type].history.length>30) d[type].history=d[type].history.slice(-30);
    this.save(d);
    if (window.PracticeTracker) {
      PracticeTracker.saveAttempt(type, score, meta).catch(err => {
        console.warn('Supabase attempt save failed:', err?.message || err);
      });
    }
  },
  getAvg(type) {
    const d=this.get(); if(!d[type]||!d[type].attempts) return null;
    return Math.round(d[type].totalScore/d[type].attempts);
  }
};

// ── Countdown Timer ────────────────────────────────────────────────────────
class CountdownTimer {
  constructor(el, seconds, onTick, onEnd) {
    this.el=el; this.seconds=seconds; this.remaining=seconds;
    this.onTick=onTick; this.onEnd=onEnd; this.iv=null;
  }
  start() {
    this._render();
    this.iv = setInterval(()=>{
      this.remaining--;
      this._render();
      if(this.onTick) this.onTick(this.remaining);
      if(this.remaining<=0){ clearInterval(this.iv); if(this.onEnd) this.onEnd(); }
    },1000);
  }
  stop() { clearInterval(this.iv); }
  _render() {
    if(!this.el) return;
    const pct = this.remaining/this.seconds;
    let cls='timer';
    if(pct<0.25) cls+=' danger';
    else if(pct<0.5) cls+=' warning';
    this.el.className=cls;
    this.el.innerHTML=`<span class="timer-dot"></span>${formatTime(this.remaining)}`;
  }
}

// ── TTS (Text-to-Speech) ──────────────────────────────────────────────────
function speak(text, opts={}) {
  return new Promise((res,rej)=>{
    if(!('speechSynthesis' in window)){ rej('not supported'); return; }
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.rate=opts.rate||0.92; u.pitch=opts.pitch||1; u.volume=opts.volume||1;
    // Prefer an English voice
    const voices=speechSynthesis.getVoices();
    const enVoice=voices.find(v=>v.lang.startsWith('en-'));
    if(enVoice) u.voice=enVoice;
    u.onend=res; u.onerror=rej;
    speechSynthesis.speak(u);
  });
}

function createSpeechPlayer({ text, opts={}, onProgress, onEnd, onStateChange }) {
  let utterance = null;
  let timer = null;
  let elapsed = 0;
  let ended = false;
  const totalMs = Math.max(1200, Math.round((text.trim().split(/\s+/).filter(Boolean).length || 1) * 380 / (opts.rate || 0.92)));

  function emitState(state) {
    onStateChange && onStateChange(state);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      elapsed = Math.min(totalMs, elapsed + 120);
      onProgress && onProgress(Math.min(1, elapsed / totalMs));
    }, 120);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function finish(cancelled=false) {
    if (ended) return;
    ended = true;
    stopTimer();
    if (!cancelled) {
      elapsed = totalMs;
      onProgress && onProgress(1);
      emitState('ended');
      onEnd && onEnd();
    } else {
      emitState('idle');
    }
  }

  function buildUtterance() {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 0.92;
    u.pitch = opts.pitch || 1;
    u.volume = opts.volume || 1;
    const voices = speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en-'));
    if (enVoice) u.voice = enVoice;
    u.onend = () => finish(false);
    u.onerror = () => finish(false);
    return u;
  }

  return {
    play() {
      if (!('speechSynthesis' in window)) return false;
      window.speechSynthesis.cancel();
      stopTimer();
      elapsed = 0;
      ended = false;
      utterance = buildUtterance();
      speechSynthesis.speak(utterance);
      startTimer();
      emitState('playing');
      return true;
    },
    pause() {
      if (!utterance || ended || speechSynthesis.paused) return;
      speechSynthesis.pause();
      stopTimer();
      emitState('paused');
    },
    resume() {
      if (!utterance || ended || !speechSynthesis.paused) return;
      speechSynthesis.resume();
      startTimer();
      emitState('playing');
    },
    stop() {
      if (!utterance && !timer) return;
      stopTimer();
      ended = true;
      speechSynthesis.cancel();
      emitState('idle');
    },
    toggle() {
      if (!utterance || ended) return this.play();
      if (speechSynthesis.paused) {
        this.resume();
        return true;
      }
      this.pause();
      return true;
    },
  };
}

// ── Speech Recognition ─────────────────────────────────────────────────────
class SpeechRecorder {
  constructor({ onResult, onEnd, onError, onCapture, continuous=false, keepAlive=true, captureAudio=false }) {
    this.onResult=onResult; this.onEnd=onEnd; this.onError=onError;
    this.onCapture=onCapture;
    this.continuous=continuous; this.keepAlive=keepAlive; this.recognition=null; this.isRunning=false;
    this.shouldStop=false; this.finalTranscript=''; this.restartTimer=null;
    this.captureAudio=captureAudio; this.mediaRecorder=null; this.audioChunks=[]; this.audioUrl=''; this.captureStream=null;
    this.recognitionEnded=false; this.captureEnded=true;
  }
  _teardownCapture() {
    if(this.captureStream) {
      this.captureStream.getTracks().forEach(track => track.stop());
      this.captureStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
  _maybeFinish() {
    if(!this.recognitionEnded || !this.captureEnded) return;
    this.isRunning=false;
    this.onEnd&&this.onEnd({ final:this.finalTranscript.trim(), audioUrl:this.audioUrl });
  }
  _startCapture() {
    this.captureEnded = true;
    if(!this.captureAudio || !window.MediaRecorder || !MicAccess.stream) return;
    try {
      this.captureStream = MicAccess.stream.clone();
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      this.mediaRecorder = preferredType ? new MediaRecorder(this.captureStream, { mimeType: preferredType }) : new MediaRecorder(this.captureStream);
      this.audioChunks = [];
      this.captureEnded = false;
      this.mediaRecorder.ondataavailable = (e) => {
        if(e.data && e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder && this.mediaRecorder.mimeType ? this.mediaRecorder.mimeType : 'audio/webm';
        if(this.audioChunks.length) {
          if(this.audioUrl) URL.revokeObjectURL(this.audioUrl);
          const blob = new Blob(this.audioChunks, { type: mime });
          this.audioUrl = URL.createObjectURL(blob);
          this.onCapture && this.onCapture({ url:this.audioUrl, blob });
        }
        this.captureEnded = true;
        this._teardownCapture();
        this._maybeFinish();
      };
      this.mediaRecorder.start();
    } catch(e) {
      this.captureEnded = true;
      this._teardownCapture();
    }
  }
  _buildRecognition() {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    const recognition=new SR();
    recognition.continuous=this.continuous;
    recognition.interimResults=true;
    recognition.lang='en-US';
    recognition.onresult=(e)=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const transcript = e.results[i][0].transcript;
        if(e.results[i].isFinal) this.finalTranscript += transcript + ' ';
        else interim += transcript;
      }
      this.onResult&&this.onResult({final:this.finalTranscript.trim(), interim});
    };
    recognition.onend=()=>{
      this.recognition=null;
      if(this.shouldStop || !this.keepAlive){
        this.recognitionEnded=true;
        this._maybeFinish();
        return;
      }
      this.restartTimer = setTimeout(() => {
        if(this.shouldStop) return;
        try {
          this.recognition = this._buildRecognition();
          this.recognition.start();
          this.isRunning = true;
        } catch (e) {
          this.recognitionEnded = true;
          this.onError&&this.onError('Speech recognition restarted unexpectedly.');
          this._maybeFinish();
        }
      }, 120);
    };
    recognition.onerror=(e)=>{
      if(!this.shouldStop && this.keepAlive && (e.error==='no-speech' || e.error==='aborted')){
        return;
      }
      this.onError&&this.onError(e.error);
    };
    return recognition;
  }
  start() {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    clearTimeout(this.restartTimer);
    this.shouldStop=false;
    this.finalTranscript='';
    this.recognitionEnded=!SR;
    this.captureEnded=!this.captureAudio;
    this._startCapture();
    if(!SR){
      if (!this.captureAudio) {
        this.onError&&this.onError('Browser does not support speech recognition. Please use Chrome.');
        return;
      }
      this.isRunning=true;
      return;
    }
    this.recognition=this._buildRecognition();
    this.recognition.start();
    this.isRunning=true;
  }
  stop() {
    this.shouldStop=true;
    clearTimeout(this.restartTimer);
    if(this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    else this.captureEnded = true;
    if(this.recognition) this.recognition.stop();
    else {
      this.recognitionEnded=true;
      this._maybeFinish();
    }
  }
}
