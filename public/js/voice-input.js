/* ═══════════════════════════════════════════════════════════════
   Voice Input — Whisper-powered dictation for textareas
   Records audio via MediaRecorder, sends to /v1/voice/transcribe,
   and inserts the transcribed text into the textarea.
   Uses the project's proposal_lang for automatic translation.
   ═══════════════════════════════════════════════════════════════ */

const VoiceInput = (() => {
  let activeBtn = null;
  let activeTA  = null;
  let mediaRec  = null;
  let stream    = null;
  let chunks    = [];

  /* ── Get the target write language from the project ──────────── */
  const NA_LANG = {
    EACEA:'en', AT01:'de',
    BE01:'fr', BE02:'nl', BE03:'de', BE04:'fr', BE05:'nl',
    BG01:'bg', HR01:'hr', CY01:'el', CZ01:'cs', DK01:'da',
    EE01:'et', FI01:'fi',
    FR01:'fr', FR02:'fr',
    DE01:'de', DE02:'de', DE03:'de', DE04:'de',
    EL01:'el', EL02:'el', HU01:'hu', IS01:'is',
    IE01:'en', IE02:'en',
    IT01:'it', IT02:'it', IT03:'it',
    LV01:'lv', LV02:'lv', LI01:'de',
    LT01:'lt', LT02:'lt', LU01:'fr', MT01:'en',
    NL01:'nl', NL02:'nl', NO01:'no', NO02:'no',
    PL01:'pl', PT01:'pt', PT02:'pt', RO01:'ro', RS01:'sr',
    SK01:'sk', SK02:'sk', SI01:'sl', SI02:'sl',
    ES01:'es', ES02:'es', SE01:'sv', SE02:'sv', TR01:'tr',
  };

  function getWriteLang() {
    // 1. From Intake form selector (if on intake page)
    const langEl = document.getElementById('intake-f-lang');
    if (langEl && langEl.value) return langEl.value;
    // 2. From current project's NA (set by Developer.js / App when project loads)
    if (window.__projectNA && NA_LANG[window.__projectNA]) return NA_LANG[window.__projectNA];
    // 3. From cached proposal_lang if set
    if (window.__projectLang) return window.__projectLang;
    // 4. Fallback: default to English
    return 'en';
  }

  /* ── Attach mic button to a textarea ─────────────────────────── */
  function attach(textarea) {
    if (!textarea || textarea.dataset.voiceAttached) return;
    // Opt-out: explicit attribute or any ancestor marked .voice-skip.
    // Used by table-cell textareas where a mic button would crowd the cell.
    if (textarea.dataset.noVoice === '1') return;
    if (typeof textarea.closest === 'function' && textarea.closest('.voice-skip')) return;
    textarea.dataset.voiceAttached = '1';

    // Wrap textarea in a relative container
    let wrapper = textarea.parentElement;
    if (!wrapper.classList.contains('voice-wrap')) {
      wrapper = document.createElement('div');
      wrapper.className = 'voice-wrap';
      textarea.parentNode.insertBefore(wrapper, textarea);
      wrapper.appendChild(textarea);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-btn';
    btn.title = 'Dictar por voz';
    btn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
    btn.addEventListener('click', () => toggle(textarea, btn));
    wrapper.appendChild(btn);
  }

  /* ── Toggle recording ────────────────────────────────────────── */
  function toggle(textarea, btn) {
    if (mediaRec && activeTA === textarea) {
      stop();
    } else {
      if (mediaRec) stop();
      start(textarea, btn);
    }
  }

  /* ── Start recording ─────────────────────────────────────────── */
  async function start(textarea, btn) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (typeof Toast !== 'undefined') {
        Toast.show('Permiso de micrófono denegado. Actívalo en el navegador.', 'err');
      }
      return;
    }

    chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRec = new MediaRecorder(stream, { mimeType });

    mediaRec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      stream = null;

      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: mimeType });
      chunks = [];

      // Show loading state
      btn.innerHTML = '<span class="material-symbols-outlined voice-spin">progress_activity</span>';
      btn.classList.remove('voice-active');
      btn.classList.add('voice-loading');
      textarea.classList.remove('voice-recording');

      try {
        const text = await transcribe(blob);
        if (text) {
          insertText(textarea, text);
          if (typeof Toast !== 'undefined') Toast.show('Transcripción completada', 'ok');
        }
      } catch (err) {
        if (typeof Toast !== 'undefined') Toast.show('Error: ' + err.message, 'err');
      } finally {
        btn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        btn.classList.remove('voice-loading');
      }
    };

    mediaRec.start(1000);

    activeBtn = btn;
    activeTA  = textarea;
    btn.classList.add('voice-active');
    btn.innerHTML = '<span class="material-symbols-outlined">stop</span>';
    btn.title = 'Parar y transcribir';
    textarea.classList.add('voice-recording');

    if (typeof Toast !== 'undefined') Toast.show('Grabando... pulsa de nuevo para parar', 'ok');
  }

  /* ── Stop recording ──────────────────────────────────────────── */
  function stop() {
    if (mediaRec && mediaRec.state !== 'inactive') {
      mediaRec.stop();
    }
    mediaRec = null;

    if (activeBtn) {
      activeBtn.classList.remove('voice-active');
      activeBtn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
      activeBtn.title = 'Dictar por voz';
      activeBtn = null;
    }
    if (activeTA) {
      activeTA.classList.remove('voice-recording');
      activeTA = null;
    }
  }

  /* ── Send audio to backend for Whisper transcription ─────────── */
  async function transcribe(blob) {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    form.append('write_lang', getWriteLang());

    const token = typeof API !== 'undefined' ? API.getToken() : null;
    const resp = await fetch('/v1/voice/transcribe', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
      body: form,
    });

    const data = await resp.json();
    if (!data.ok) throw new Error(data.error?.message || 'Transcription failed');
    return data.text;
  }

  /* ── Insert text at cursor position in textarea ──────────────── */
  function insertText(textarea, text) {
    const start  = textarea.selectionStart || textarea.value.length;
    const prefix = textarea.value.substring(0, start);
    const suffix = textarea.value.substring(start);
    const sep    = prefix.length > 0 && !/[\s\n]$/.test(prefix) ? ' ' : '';

    textarea.value = prefix + sep + text + suffix;
    textarea.selectionStart = textarea.selectionEnd = start + sep.length + text.length;
    textarea.focus();

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ── Auto-attach to all textareas + watch for new ones ─────────── */
  function init() {
    document.querySelectorAll('textarea').forEach(attach);

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'TEXTAREA') attach(node);
          else if (node.querySelectorAll) {
            node.querySelectorAll('textarea').forEach(attach);
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  return { init, attach, stop };
})();

document.addEventListener('DOMContentLoaded', () => VoiceInput.init());
