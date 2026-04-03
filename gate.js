// Aural Alchemy — License Gate
// Each tool has its own key. Stored in localStorage per tool.

(function(){
  const path = window.location.pathname;
  const isHz       = path.includes('frequency-generator');
  const isMidi     = path.includes('midi-generator');
  const isBreath   = path.includes('breathwork');

  const CONFIG = {
    'frequency-generator': {
      key: 'AURAL-432-ALCHEMY',
      storage: 'aa_license_hz_v1',
      title: 'Frequency Generator',
      gumroad: 'https://auralalchemy.gumroad.com',
      free: false
    },
    'midi-generator': {
      key: 'AURAL-MIDI-ALCHEMY',
      storage: 'aa_license_midi_v1',
      title: 'MIDI Generator',
      gumroad: 'https://auralalchemy.gumroad.com/l/midigenerator',
      free: false
    },
    'breathwork': {
      key: 'AURAL-BREATH-ALCHEMY',
      storage: 'aa_license_breath_v1',
      title: 'Breathwork App',
      gumroad: 'https://auralalchemy.gumroad.com/l/breathworkapp',
      free: true
    }
  };

  const tool = isHz ? CONFIG['frequency-generator'] : isMidi ? CONFIG['midi-generator'] : isBreath ? CONFIG['breathwork'] : null;
  if(!tool) return;

  function isUnlocked(){ return localStorage.getItem(tool.storage) === 'unlocked'; }
  function unlock(){ localStorage.setItem(tool.storage, 'unlocked'); }

  function hideGate(){
    const gate = document.getElementById('aa-gate');
    if(gate) gate.remove();
    const app = document.getElementById('aa-app-content');
    if(app) app.style.display = '';
  }

  function tryKey(key){
    if(key.trim().toUpperCase() === tool.key){
      unlock();
      hideGate();
    } else {
      const el = document.getElementById('aa-gate-error');
      if(el){ el.textContent = 'Invalid key. Check your receipt and try again.'; el.style.display = 'block'; }
    }
  }

  window.__aaGateTry = tryKey;

  function injectGate(){
    const app = document.getElementById('aa-app-content');
    if(app) app.style.display = 'none';

    const gate = document.createElement('div');
    gate.id = 'aa-gate';
    gate.innerHTML = `
      <div style="min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:2rem;position:relative;z-index:2">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:2.5rem 2rem;max-width:420px;width:100%;text-align:center">
          <svg width="40" height="40" viewBox="0 0 52 52" fill="none" style="margin-bottom:1.2rem">
            <defs><linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#d4a843"/></linearGradient></defs>
            <circle cx="26" cy="26" r="22" stroke="url(#gg)" stroke-width="1" fill="none" opacity="0.65"/>
            <polygon points="26,5 7.81,36.5 44.19,36.5" stroke="url(#gg)" stroke-width="1.5" fill="none"/>
          </svg>
          <p style="font-family:'Share Tech Mono',monospace;font-size:0.58rem;letter-spacing:0.28em;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.6rem">Aural Alchemy</p>
          <h2 style="font-family:'Cinzel',serif;font-size:1.4rem;font-weight:700;letter-spacing:0.1em;background:linear-gradient(135deg,#2dd4bf,#d4a843);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:0.5rem">${tool.title}</h2>
          <p style="font-size:0.78rem;color:var(--text-dim);line-height:1.7;margin-bottom:1.8rem">${tool.free ? 'Get free access on Gumroad and enter your key below to unlock.' : 'Enter your license key to access this tool. Purchase on Gumroad to get your key.'}</p>
          <input id="aa-key-input" type="text" placeholder="XXXX-XXXX-XXXXXXX"
            style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:0.82rem;letter-spacing:0.15em;padding:0.75rem 1rem;text-align:center;outline:none;margin-bottom:0.8rem;transition:border-color .2s;box-sizing:border-box"
            onkeydown="if(event.key==='Enter')document.getElementById('aa-gate-submit').click()"
            onfocus="this.style.borderColor='var(--teal-dim)'"
            onblur="this.style.borderColor='var(--border)'">
          <p id="aa-gate-error" style="display:none;font-family:'Share Tech Mono',monospace;font-size:0.62rem;color:var(--red);margin-bottom:0.8rem;letter-spacing:0.05em"></p>
          <button id="aa-gate-submit" onclick="window.__aaGateTry(document.getElementById('aa-key-input').value)"
            style="width:100%;background:transparent;border:1px solid var(--teal);color:var(--teal);font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:0.2em;padding:0.78rem;border-radius:4px;cursor:pointer;transition:all .25s;margin-bottom:1.2rem"
            onmouseover="this.style.background='rgba(45,212,191,0.08)'"
            onmouseout="this.style.background='transparent'">Unlock</button>
          <a href="${tool.gumroad}" target="_blank"
            style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;letter-spacing:0.15em;color:var(--text-muted);text-decoration:none;text-transform:uppercase;transition:color .2s"
            onmouseover="this.style.color='var(--gold)'"
            onmouseout="this.style.color='var(--text-muted)'">${tool.free ? 'Get Free Access on Gumroad →' : 'Get Access on Gumroad →'}</a>
        </div>
      </div>`;

    const wrap = document.querySelector('.page-wrap');
    if(wrap) wrap.insertBefore(gate, wrap.firstChild.nextSibling);
    else document.body.appendChild(gate);

    setTimeout(()=>{ const inp=document.getElementById('aa-key-input'); if(inp)inp.focus(); }, 100);
  }

  function init(){
    if(isUnlocked()) hideGate();
    else injectGate();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
