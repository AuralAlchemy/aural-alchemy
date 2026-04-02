// ═══════════════════════════════════════════════════════
// AURAL ALCHEMY — Breathwork Engine
// breathwork/breathwork.js
// ═══════════════════════════════════════════════════════

// ── DATA ────────────────────────────────────────────────

const MAIN_PATTERNS = [
  {
    id: 'box', name: 'box', label: 'Box', benefit: 'calm', origin: 'military',
    inLabel: 'nose in', outLabel: 'nose out',
    desc: '4s inhale, 4s hold, 4s exhale, 4s hold. Used by Navy SEALs and first responders to stay composed under pressure. Balances the autonomic nervous system by equalising all four breath phases, reducing cortisol and steadying heart rate.',
    phases: [
      { name: 'inhale', dur: 4,  scale: 1.42 },
      { name: 'hold',   dur: 4,  scale: 1.42 },
      { name: 'exhale', dur: 4,  scale: 0.68 },
      { name: 'hold',   dur: 4,  scale: 0.68 },
    ]
  },
  {
    id: '478', name: '4-7-8', label: '4-7-8', benefit: 'sleep', origin: 'Dr. Weil',
    inLabel: 'nose in', outLabel: 'mouth out',
    desc: 'Inhale 4s, hold 7s, exhale 8s. Developed by Dr. Andrew Weil based on pranayama. The extended hold builds CO2 tolerance while the long exhale activates the vagus nerve, dropping heart rate and preparing the body for deep sleep.',
    phases: [
      { name: 'inhale', dur: 4, scale: 1.42 },
      { name: 'hold',   dur: 7, scale: 1.42 },
      { name: 'exhale', dur: 8, scale: 0.68 },
    ]
  },
  {
    id: 'coherent', name: 'coherent', label: 'Coherent', benefit: 'focus', origin: 'biofeedback research',
    inLabel: 'nose in', outLabel: 'nose out',
    desc: '5s inhale, 5s exhale, no holds. At roughly 6 breaths per minute, breathing resonates with the natural oscillation of the cardiovascular system. Heart rate variability peaks at this rate, a strong marker of resilience, calm focus, and emotional regulation.',
    phases: [
      { name: 'inhale', dur: 5, scale: 1.42 },
      { name: 'exhale', dur: 5, scale: 0.68 },
    ]
  },
  {
    id: 'wim', name: 'wim hof', label: 'Wim Hof', benefit: 'energy', origin: 'Wim Hof',
    inLabel: 'mouth in', outLabel: 'mouth out',
    desc: '30 deep mouth breaths with passive exhales, then exhale and hold as long as comfortable, then one full inhale hold for 15s. Hyperventilation raises blood oxygen and pH, the holds trigger a controlled stress response releasing adrenaline and strengthening immune function.',
    phases: [
      { name: 'inhale',   dur: 1.2, scale: 1.42, repeats: 30, pairExhale: true, exhaleDur: 0.8 },
      { name: 'hold out', dur: 15,  scale: 0.68 },
      { name: 'hold in',  dur: 15,  scale: 1.42 },
    ]
  },
  {
    id: 'sigh', name: 'sigh', label: 'Physio Sigh', benefit: 'stress', origin: 'Stanford',
    inLabel: 'nose in x2', outLabel: 'mouth out',
    desc: 'Double inhale through the nose - a full breath then a short sharp top-up - followed by a long slow exhale through the mouth. Research by David Spiegel and Jack Feldman at Stanford shows a single physiological sigh deflates over-inflated alveoli and removes CO2 faster than any other breathing pattern.',
    phases: [
      { name: 'inhale',        dur: 2, scale: 1.18 },
      { name: 'inhale +',      dur: 1, scale: 1.42 },
      { name: 'exhale slowly', dur: 7, scale: 0.68 },
    ]
  },
];

const MORE_PATTERNS = {
  'Yogic / Pranayama': [
    { id: 'nadi',        name: 'nadi shodhana', label: 'Nadi Shodhana',  benefit: 'balance',       origin: 'Hatha Yoga Pradipika', inLabel: 'nose in (alt)',    outLabel: 'nose out (alt)',    desc: 'Alternate nostril breathing: inhale left 4s, hold 4s, exhale right 4s, inhale right 4s, hold 4s, exhale left 4s. Balances activity between the brain hemispheres and is traditionally used before meditation to clear energetic channels.',                                                                                                     phases: [{ name: 'inhale (L)', dur: 4, scale: 1.42 }, { name: 'hold', dur: 4, scale: 1.42 }, { name: 'exhale (R)', dur: 4, scale: 0.68 }, { name: 'inhale (R)', dur: 4, scale: 1.42 }, { name: 'hold', dur: 4, scale: 1.42 }, { name: 'exhale (L)', dur: 4, scale: 0.68 }] },
    { id: 'ujjayi',      name: 'ujjayi',        label: 'Ujjayi',         benefit: 'calm',           origin: 'Ashtanga yoga',        inLabel: 'nose in',          outLabel: 'nose out',          desc: 'Ocean breath: constrict the back of the throat slightly on both inhale and exhale, producing a soft hissing sound. Each breath 5-6s. Used throughout vinyasa and Ashtanga yoga to generate internal heat and activate the parasympathetic nervous system.',                                                                                            phases: [{ name: 'inhale', dur: 5, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
    { id: 'bhramari',    name: 'bhramari',       label: 'Bhramari',       benefit: 'anxiety',        origin: 'classical pranayama',  inLabel: 'nose in',          outLabel: 'nose out (hum)',    desc: 'Humming bee breath: long inhale through the nose, then exhale while humming gently with lips closed. The vibration stimulates the vagus nerve directly and has been shown to lower blood pressure rapidly.',                                                                                                                                         phases: [{ name: 'inhale', dur: 4, scale: 1.42 }, { name: 'exhale (hum)', dur: 8, scale: 0.68 }] },
    { id: 'kapalabhati', name: 'kapalabhati',    label: 'Kapalabhati',    benefit: 'energy',         origin: 'Hatha Yoga',           inLabel: 'nose in',          outLabel: 'nose out (sharp)', desc: 'Skull-shining breath: passive inhale followed by a sharp forceful exhale through the nose driven by the abdomen. 1-2 pumps per second for 30 reps, then one slow recovery breath. Clears the airways and energises the body.',                                                                                                                         phases: [{ name: 'breathe', dur: 0.5, scale: 1.3, repeats: 30, pairExhale: true, exhaleDur: 0.3 }, { name: 'inhale', dur: 4, scale: 1.42 }, { name: 'hold', dur: 4, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
    { id: 'sitali',      name: 'sitali',         label: 'Sitali',         benefit: 'cooling',        origin: 'classical pranayama',  inLabel: 'mouth in (curled)', outLabel: 'nose out',         desc: 'Cooling breath: curl the tongue into a tube and inhale slowly through it for 5s, then close the mouth and exhale through the nose for 8s. Reduces body heat, calms inflammation, and is used in yoga to cool pitta dosha.',                                                                                                                           phases: [{ name: 'inhale', dur: 5, scale: 1.42 }, { name: 'exhale', dur: 8, scale: 0.68 }] },
    { id: 'bhastrika',   name: 'bhastrika',      label: 'Bhastrika',      benefit: 'energy',         origin: 'Hatha Yoga',           inLabel: 'nose in (forceful)', outLabel: 'nose out (forceful)', desc: 'Bellows breath: rapid, powerful, equal inhales and exhales through the nose, 1 per second for 20 reps, then one long slow recovery breath. Dramatically raises oxygen and blood alkalinity, producing a strong energy surge.',                                                                                                                     phases: [{ name: 'inhale', dur: 0.5, scale: 1.4, repeats: 20, pairExhale: true, exhaleDur: 0.5 }, { name: 'inhale', dur: 4, scale: 1.42 }, { name: 'hold', dur: 5, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
    { id: 'anulom',      name: 'anulom vilom',   label: 'Anulom Vilom',   benefit: 'balance',        origin: 'classical pranayama',  inLabel: 'nose in (alt)',    outLabel: 'nose out (alt)',    desc: 'Like nadi shodhana but without the breath hold. Continuous alternating nostril breathing - inhale one side for 4s, exhale other side for 4s. Gentler and suitable for beginners. Regulates the nervous system and improves lung function.',                                                                                                          phases: [{ name: 'inhale (L)', dur: 4, scale: 1.42 }, { name: 'exhale (R)', dur: 4, scale: 0.68 }, { name: 'inhale (R)', dur: 4, scale: 1.42 }, { name: 'exhale (L)', dur: 4, scale: 0.68 }] },
  ],
  'Clinical / Therapeutic': [
    { id: 'pursed',          name: 'pursed lip',     label: 'Pursed Lip',      benefit: 'COPD / anxiety', origin: 'respiratory therapy',  inLabel: 'nose in',   outLabel: 'mouth out (pursed)', desc: 'Inhale through the nose for 2s, exhale slowly through pursed lips for 4s. Used in pulmonary rehabilitation to slow breathing rate, reduce air trapping in the lungs, and relieve shortness of breath.',                                                                                                              phases: [{ name: 'inhale', dur: 2, scale: 1.42 }, { name: 'exhale', dur: 4, scale: 0.68 }] },
    { id: 'diaphragmatic',   name: 'diaphragmatic',  label: 'Diaphragmatic',   benefit: 'relaxation',     origin: 'clinical respiratory', inLabel: 'nose in',   outLabel: 'mouth out',          desc: 'Belly breathing: inhale 4s letting the belly rise while the chest stays still, exhale 6s drawing the navel in. Trains the diaphragm as the primary breathing muscle and reduces secondary muscle tension in the neck and shoulders.',                                                                                    phases: [{ name: 'belly in', dur: 4, scale: 1.42 }, { name: 'belly out', dur: 6, scale: 0.68 }] },
    { id: 'resonant',        name: 'resonant',        label: 'Resonant 5.5',    benefit: 'HRV',            origin: 'Lehrer & Gevirtz',    inLabel: 'nose in',   outLabel: 'nose out',           desc: 'Exactly 5.5 seconds in, 5.5 seconds out. Research by Paul Lehrer shows this specific rate maximises heart rate variability and baroreflex sensitivity more than any other. Used in biofeedback therapy for hypertension, depression, and asthma.',                                                                     phases: [{ name: 'inhale', dur: 5.5, scale: 1.42 }, { name: 'exhale', dur: 5.5, scale: 0.68 }] },
    { id: 'buteyko',         name: 'buteyko',         label: 'Buteyko',         benefit: 'asthma / anxiety', origin: 'Dr. Buteyko',        inLabel: 'nose in',   outLabel: 'nose out',           desc: 'Reduced breathing: inhale softly for 2s, exhale 3s, then hold after exhale for 4s. Trains CO2 tolerance. Developed by Dr. Konstantin Buteyko to treat hyperventilation disorders, asthma, and anxiety.',                                                                                                             phases: [{ name: 'inhale', dur: 2, scale: 1.3 }, { name: 'exhale', dur: 3, scale: 0.68 }, { name: 'hold', dur: 4, scale: 0.68 }] },
    { id: 'square6',         name: 'square 6',        label: 'Square 6',        benefit: 'deep calm',      origin: 'clinical adaptation', inLabel: 'nose in',   outLabel: 'nose out',           desc: 'Extended box breathing: 6s inhale, 6s hold, 6s exhale, 6s hold. More powerful than the 4s version for deep relaxation. Used in trauma therapy and for people who find the 4-4-4-4 pace too fast to settle into.',                                                                                                     phases: [{ name: 'inhale', dur: 6, scale: 1.42 }, { name: 'hold', dur: 6, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }, { name: 'hold', dur: 6, scale: 0.68 }] },
  ],
  'Performance / Sports': [
    { id: 'turboflex', name: '2-1 power',      label: '2-1 Power',       benefit: 'activation', origin: 'sports science',   inLabel: 'nose in', outLabel: 'mouth out', desc: 'Inhale for 2s, brief hold 1s, exhale for 1s. Creates mild sympathetic activation, raising alertness and readiness without anxiety. Used by athletes before competition to sharpen focus.',                                                                                           phases: [{ name: 'inhale', dur: 2, scale: 1.42 }, { name: 'hold', dur: 1, scale: 1.42 }, { name: 'exhale', dur: 1, scale: 0.68 }] },
    { id: 'recovery',  name: 'post-exercise',  label: 'Post-Exercise',   benefit: 'recovery',   origin: 'sports science',   inLabel: 'nose in', outLabel: 'mouth out', desc: 'Inhale 4s, hold 2s, extended exhale 8s. Used after intense exercise to rapidly switch from sympathetic to parasympathetic mode. The 1:2 inhale-exhale ratio is the fastest known way to bring heart rate down.',                                                                     phases: [{ name: 'inhale', dur: 4, scale: 1.42 }, { name: 'hold', dur: 2, scale: 1.42 }, { name: 'exhale', dur: 8, scale: 0.68 }] },
    { id: 'oxygen',    name: 'oxygen advantage', label: 'Oxygen Advantage', benefit: 'endurance', origin: 'Patrick McKeown', inLabel: 'nose in', outLabel: 'nose out',  desc: 'Nose-only reduced breathing: inhale 3s, exhale 3s, hold after exhale 3s building to 5s over time. Trains the body to tolerate higher CO2, increasing oxygen delivery to muscles. Used by endurance athletes to simulate altitude training.',                                  phases: [{ name: 'inhale', dur: 3, scale: 1.4 }, { name: 'exhale', dur: 3, scale: 0.68 }, { name: 'hold', dur: 3, scale: 0.68 }] },
  ],
  'Meditation / Spiritual': [
    { id: 'tummo',       name: 'tummo',          label: 'Tummo',          benefit: 'heat / energy', origin: 'Tibetan Buddhism', inLabel: 'mouth in', outLabel: 'mouth out', desc: 'Tibetan inner heat meditation: 30 rapid deep breaths, exhale hold while doing visualisation, then full inhale hold with abdominal locks. The foundation of Wim Hof method. Monks use it to generate enough body heat to dry wet sheets in freezing temperatures.', phases: [{ name: 'inhale', dur: 1.0, scale: 1.42, repeats: 30, pairExhale: true, exhaleDur: 0.7 }, { name: 'hold out', dur: 20, scale: 0.68 }, { name: 'hold in', dur: 20, scale: 1.42 }] },
    { id: 'zen',         name: 'zen counting',   label: 'Zen Counting',   benefit: 'presence',      origin: 'Zen Buddhism',    inLabel: 'nose in',  outLabel: 'nose out',  desc: 'Breathe naturally at a slow pace, counting each exhale from 1 to 10 then start again. If you lose count, begin from 1. Used in Zazen to settle mental chatter before deeper meditation states.',                                                              phases: [{ name: 'inhale', dur: 4, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
    { id: 'pranayama58', name: '5-8 pranayama',  label: '5-8 Pranayama',  benefit: 'calm',          origin: 'classical yoga',  inLabel: 'nose in',  outLabel: 'nose out',  desc: 'Inhale for 5s, exhale for 8s. A simple ratio-based pranayama that emphasises the extended exhale to engage the parasympathetic nervous system. The longer exhale triggers the dive reflex and lowers heart rate within minutes.',                                      phases: [{ name: 'inhale', dur: 5, scale: 1.42 }, { name: 'exhale', dur: 8, scale: 0.68 }] },
  ],
  'Specialized': [
    { id: 'triangle',  name: 'triangle',        label: 'Triangle',       benefit: 'grounding',  origin: 'modern breathwork',  inLabel: 'nose in',   outLabel: 'nose out',  desc: '3-part cycle: inhale 4s, hold 4s, exhale 4s - no hold after exhale. Simpler than box breathing, good for beginners or for situations where the post-exhale hold feels uncomfortable.',                                                                          phases: [{ name: 'inhale', dur: 4, scale: 1.42 }, { name: 'hold', dur: 4, scale: 1.42 }, { name: 'exhale', dur: 4, scale: 0.68 }] },
    { id: '478ext',    name: '4-8 extended',     label: '4-8 Extended',   benefit: 'sleep',      origin: 'sleep research',     inLabel: 'nose in',   outLabel: 'mouth out', desc: 'Inhale 4s, exhale 8s continuously. A simplified version of 4-7-8 without the hold, easier to perform in bed. The 1:2 ratio activates the baroreflex and slows heart rate significantly.',                                                                     phases: [{ name: 'inhale', dur: 4, scale: 1.42 }, { name: 'exhale', dur: 8, scale: 0.68 }] },
    { id: 'coherent6', name: 'coherent 6s',      label: 'Coherent 6s',    benefit: 'deep HRV',   origin: 'biofeedback',        inLabel: 'nose in',   outLabel: 'nose out',  desc: '6s inhale, 6s exhale - 5 breaths per minute. Slightly slower than 5.5s coherent breathing, preferred by some practitioners for a deeper, more meditative quality.',                                                                                            phases: [{ name: 'inhale', dur: 6, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
    { id: 'box8',      name: 'box 8',            label: 'Box 8',          benefit: 'deep calm',  origin: 'advanced breathwork', inLabel: 'nose in',  outLabel: 'nose out',  desc: 'Extended box breathing at 8s per phase. Each full cycle takes 32 seconds. Suitable for experienced practitioners. Produces profound parasympathetic activation.',                                                                                                    phases: [{ name: 'inhale', dur: 8, scale: 1.42 }, { name: 'hold', dur: 8, scale: 1.42 }, { name: 'exhale', dur: 8, scale: 0.68 }, { name: 'hold', dur: 8, scale: 0.68 }] },
    { id: 'cyclic',    name: 'cyclic sighing',   label: 'Cyclic Sighing', benefit: 'mood',       origin: 'Stanford 2023',      inLabel: 'nose in x2', outLabel: 'mouth out', desc: 'Like the physiological sigh but done continuously. A 2023 Stanford RCT found that 5 minutes of daily cyclic sighing improved mood more than any other breathwork tested, including mindfulness meditation.',                                                     phases: [{ name: 'inhale', dur: 2, scale: 1.18 }, { name: 'inhale +', dur: 1, scale: 1.42 }, { name: 'exhale', dur: 6, scale: 0.68 }] },
  ],
};

// ── STATE ────────────────────────────────────────────────
let selectedPat = MAIN_PATTERNS[0];
let running = false;
let rafId = null;
let audioCtx = null;
let masterVol = null;
let cycles = 0;
let dropOpen = false;

// ── AUDIO ────────────────────────────────────────────────
function sliderToGain(v) { return (v / 100) * 3.5; }
function getVol() { return sliderToGain(parseInt(document.getElementById('bwVolSlider').value)); }

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterVol = audioCtx.createGain();
    masterVol.gain.value = getVol();
    masterVol.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

document.getElementById('bwVolSlider').addEventListener('input', function () {
  document.getElementById('bwVolNum').textContent = this.value;
  if (masterVol) masterVol.gain.value = sliderToGain(parseInt(this.value));
});

function makeNoiseBuffer(ctx) {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = last * 0.92 + w * 0.08;
    d[i] = w * 0.6 + last * 0.4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function playBreath(type, dur) {
  if (!document.getElementById('bwSoundOn').checked) return;
  try {
    initAudio();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const isInhale = /inhale|belly in|breathe/.test(type);
    const isExhale = /exhale|belly out/.test(type);

    const noise = makeNoiseBuffer(ctx);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3.5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 2.8;
    const f3 = ctx.createBiquadFilter(); f3.type = 'bandpass'; f3.Q.value = 2.0;
    const chest = ctx.createBiquadFilter(); chest.type = 'lowshelf'; chest.frequency.value = 180; chest.gain.value = isInhale ? 14 : 11;
    const hicut = ctx.createBiquadFilter(); hicut.type = 'highshelf'; hicut.frequency.value = 3500; hicut.gain.value = -16;
    const g = ctx.createGain();

    noise.connect(f1); f1.connect(f2); f2.connect(f3); f3.connect(chest); chest.connect(hicut); hicut.connect(g); g.connect(masterVol);

    if (isInhale) {
      f1.frequency.setValueAtTime(280, t); f1.frequency.linearRampToValueAtTime(520, t + dur * 0.55); f1.frequency.linearRampToValueAtTime(440, t + dur);
      f2.frequency.setValueAtTime(900, t); f2.frequency.linearRampToValueAtTime(1400, t + dur * 0.5); f2.frequency.linearRampToValueAtTime(1200, t + dur);
      f3.frequency.setValueAtTime(2200, t); f3.frequency.linearRampToValueAtTime(2600, t + dur * 0.4); f3.frequency.linearRampToValueAtTime(2400, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(2.2, t + dur * 0.18); g.gain.setValueAtTime(2.2, t + dur * 0.78); g.gain.linearRampToValueAtTime(0, t + dur);
    } else if (isExhale) {
      f1.frequency.setValueAtTime(500, t); f1.frequency.linearRampToValueAtTime(260, t + dur * 0.65); f1.frequency.linearRampToValueAtTime(200, t + dur);
      f2.frequency.setValueAtTime(1300, t); f2.frequency.linearRampToValueAtTime(800, t + dur * 0.6); f2.frequency.linearRampToValueAtTime(650, t + dur);
      f3.frequency.setValueAtTime(2500, t); f3.frequency.linearRampToValueAtTime(1800, t + dur * 0.5); f3.frequency.linearRampToValueAtTime(1400, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.8, t + dur * 0.07); g.gain.setValueAtTime(1.6, t + dur * 0.60); g.gain.linearRampToValueAtTime(0, t + dur);
    } else {
      f1.frequency.value = 400; f2.frequency.value = 1100; f3.frequency.value = 2200;
      g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0, t + Math.min(0.8, dur));
    }

    noise.start(t); noise.stop(t + dur + 0.1);
  } catch (e) { }
}

// ── HELPERS ──────────────────────────────────────────────
function getCycleTime(pat) {
  let t = 0;
  for (const p of pat.phases) {
    t += p.dur * (p.repeats || 1);
    if (p.pairExhale) t += p.exhaleDur * (p.repeats || 1);
  }
  return Math.round(t) + 's';
}

function updateRoute() {
  document.getElementById('bwPillIn').textContent = selectedPat.inLabel || 'nose in';
  document.getElementById('bwPillOut').textContent = selectedPat.outLabel || 'nose out';
  document.getElementById('bwPillIn').style.opacity = '1';
  document.getElementById('bwPillOut').style.opacity = '1';
}

function highlightPill(phaseName) {
  const isIn = /inhale|belly in|breathe/.test(phaseName);
  const isOut = /exhale|belly out/.test(phaseName);
  document.getElementById('bwPillIn').style.opacity = isIn ? '1' : (isOut ? '0.25' : '0.5');
  document.getElementById('bwPillOut').style.opacity = isOut ? '1' : (isIn ? '0.25' : '0.5');
}

function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2; }

// ── PHASE RUNNER ─────────────────────────────────────────
function runPhase(phase, prevScale) {
  return new Promise(resolve => {
    const startT = performance.now();
    const durMs = phase.dur * 1000;
    const toScale = phase.scale;
    const showCount = phase.dur >= 3;

    playBreath(phase.name, phase.dur);
    document.getElementById('bwPhaseText').textContent = phase.name;
    document.getElementById('bwCountText').textContent = '';
    highlightPill(phase.name);

    function tick(now) {
      if (!running) { resolve(toScale); return; }
      const elapsed = now - startT;
      const progress = Math.min(elapsed / durMs, 1);
      const scale = prevScale + (toScale - prevScale) * easeInOut(progress);
      document.getElementById('bwOrb').style.transform = `scale(${scale})`;
      if (showCount) {
        const rem = Math.ceil((durMs - elapsed) / 1000);
        document.getElementById('bwCountText').textContent = rem > 0 ? rem : '';
      }
      if (progress < 1) { rafId = requestAnimationFrame(tick); }
      else { resolve(toScale); }
    }
    rafId = requestAnimationFrame(tick);
  });
}

// ── BREATHWORK LOOP ──────────────────────────────────────
async function runBreathwork() {
  cycles = 0;
  document.getElementById('bwCycles').textContent = '';
  let currentScale = 1;

  while (running) {
    for (const phase of selectedPat.phases) {
      if (!running) break;
      const reps = phase.repeats || 1;
      for (let r = 0; r < reps; r++) {
        if (!running) break;
        currentScale = await runPhase(phase, currentScale);
        if (phase.pairExhale && running) {
          currentScale = await runPhase({ name: 'exhale', dur: phase.exhaleDur, scale: 0.92 }, currentScale);
        }
      }
    }
    if (running) {
      cycles++;
      document.getElementById('bwCycles').textContent = cycles + ' cycle' + (cycles > 1 ? 's' : '') + ' completed';
    }
  }
}

// ── CONTROLS ─────────────────────────────────────────────
function start() {
  if (running) return;
  running = true;
  document.getElementById('bwStartBtn').style.display = 'none';
  document.getElementById('bwStopBtn').style.display = 'inline-block';
  document.getElementById('bwCountText').textContent = '';
  try { initAudio(); } catch (e) { }
  runBreathwork();
}

function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  document.getElementById('bwStartBtn').style.display = 'inline-block';
  document.getElementById('bwStopBtn').style.display = 'none';
  document.getElementById('bwOrb').style.transform = 'scale(1)';
  document.getElementById('bwPhaseText').textContent = 'paused';
  document.getElementById('bwCountText').textContent = '';
  document.getElementById('bwPillIn').style.opacity = '1';
  document.getElementById('bwPillOut').style.opacity = '1';
}

function selectPattern(pat) {
  if (running) stop();
  selectedPat = pat;
  renderPattern();
  document.querySelectorAll('.bw-pat-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bw-dd-item').forEach(b => b.classList.remove('active'));
  const mb = document.querySelector(`.bw-pat-btn[data-id="${pat.id}"]`);
  if (mb) mb.classList.add('active');
  const di = document.querySelector(`.bw-dd-item[data-id="${pat.id}"]`);
  if (di) di.classList.add('active');
  closeDropdown();
}

function openDropdown() {
  dropOpen = true;
  document.getElementById('bwDropdown').style.display = 'block';
  document.getElementById('bwMoreBtn').classList.add('open');
}

function closeDropdown() {
  dropOpen = false;
  document.getElementById('bwDropdown').style.display = 'none';
  document.getElementById('bwMoreBtn').classList.remove('open');
}

// ── RENDER ───────────────────────────────────────────────
function renderPattern() {
  document.getElementById('bwInfoName').textContent = selectedPat.name;
  document.getElementById('bwInfoCycle').textContent = getCycleTime(selectedPat);
  document.getElementById('bwInfoBenefit').textContent = selectedPat.benefit;
  document.getElementById('bwInfoOrigin').textContent = selectedPat.origin;
  document.getElementById('bwDesc').textContent = selectedPat.desc;
  updateRoute();
}

function buildMainButtons() {
  const c = document.getElementById('bwPatterns');
  MAIN_PATTERNS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'bw-pat-btn' + (p.id === selectedPat.id ? ' active' : '');
    btn.dataset.id = p.id;
    btn.textContent = p.label;
    btn.onclick = () => selectPattern(p);
    c.appendChild(btn);
  });
}

function buildDropdown() {
  const dd = document.getElementById('bwDropdown');
  Object.entries(MORE_PATTERNS).forEach(([group, pats]) => {
    const g = document.createElement('div');
    g.className = 'bw-dd-group';
    const lbl = document.createElement('div');
    lbl.className = 'bw-dd-group-label';
    lbl.textContent = group;
    g.appendChild(lbl);
    pats.forEach(p => {
      const item = document.createElement('div');
      item.className = 'bw-dd-item';
      item.dataset.id = p.id;
      item.innerHTML = `<span>${p.label}</span><span class="bw-dd-tag">${p.benefit}</span>`;
      item.onclick = () => selectPattern(p);
      g.appendChild(item);
    });
    dd.appendChild(g);
  });
}

// ── INIT ─────────────────────────────────────────────────
document.getElementById('bwMoreBtn').onclick = e => {
  e.stopPropagation();
  dropOpen ? closeDropdown() : openDropdown();
};
document.addEventListener('click', e => {
  if (dropOpen && !document.getElementById('bwMoreWrap').contains(e.target)) closeDropdown();
});
document.getElementById('bwStartBtn').onclick = start;
document.getElementById('bwStopBtn').onclick = stop;

buildMainButtons();
buildDropdown();
renderPattern();
