# 🜁 Aural Alchemy — Frequency & Tone Generator

**[→ alchemyaural.com](https://alchemyaural.com)**

Professional healing frequency generator built with the Web Audio API. No backend, no dependencies, no tracking — runs entirely in your browser.

## Features

- **Binaural Beats** — two slightly offset tones, one per ear, creating a perceived beat frequency that entrains the brain. Requires stereo headphones.
- **Isochronic Tones** — amplitude-pulsed tones with smooth Hann-windowed envelopes. No headphones required.
- **Pure Tone** — steady carrier frequencies for meditation and sound healing.

## Presets

| Intention | Brainwave | Beat Hz | Carrier |
|---|---|---|---|
| Sleep | Delta | 2 Hz | 100 Hz |
| Relax | Theta | 5 Hz | 136.1 Hz |
| Meditate | Theta | 6 Hz | 111 Hz |
| Focus | Alpha | 10 Hz | 160 Hz |
| Create | Alpha | 8 Hz | 174 Hz |
| Peak | Beta | 18 Hz | 200 Hz |
| Heal | Theta | 7.83 Hz | 174 Hz |
| Manifest | Gamma | 40 Hz | 432 Hz |

## Frequency Families

- **Solfeggio** — original 6 sacred tones (396, 417, 528, 639, 741, 852 Hz)
- **Chakras** — ascending Root→Crown (396→963 Hz)
- **Pythagorean** — pure 3:2 fifths scale rooted at C=256 Hz
- **432 Hz** — natural A tuning
- **528 Hz** — MI / DNA repair frequency
- **Planetary** — Hans Cousto orbital resonance tones

## Technical

Single HTML file, zero dependencies beyond Google Fonts. All audio synthesis via the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).

The isochronic engine uses a looping `AudioBufferSource` with a pre-computed Hann window connected to a `GainNode.gain` AudioParam — sample-accurate, zero scheduling jitter, zero artifacts.

Binaural beats use hard-panned `StereoPannerNode` (±1) to keep L/R channels fully separated through the entire audio graph.

## Deployment

Hosted on GitHub Pages with custom domain. No build step required.

## License

© Aural Alchemy. All rights reserved.
