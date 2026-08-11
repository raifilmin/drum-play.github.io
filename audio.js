/**
 * audio.js — Tone.js 音声管理
 *
 * Kick / Snare / メトロノーム / カウントイン / お手本自動演奏(4小節)
 */

const AudioEngine = (() => {
  let initialized = false;
  let kick, snare, metroHi, metroLo;
  let scheduledIds = [];

  async function init() {
    if (initialized) return;
    await Tone.start();

    kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4, attackCurve: 'exponential' },
      volume: -4,
    }).toDestination();

    const snareFilter = new Tone.Filter({ frequency: 1800, type: 'bandpass', Q: 1 }).toDestination();
    snare = new Tone.NoiseSynth({
      volume: -8,
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    }).connect(snareFilter);

    metroHi = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -12,
    }).toDestination();

    metroLo = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      volume: -16,
    }).toDestination();

    initialized = true;
  }

  function playDrum(part) {
    if (!initialized) return;
    if (part === 'kick') kick.triggerAttackRelease('C1', '8n');
    else if (part === 'snare') snare.triggerAttackRelease('16n');
  }

  function playClick(downbeat) {
    if (!initialized) return;
    if (downbeat) metroHi.triggerAttackRelease('G5', '32n');
    else metroLo.triggerAttackRelease('C5', '32n');
  }

  /**
   * カウントイン（4拍）
   */
  function performCountIn(stepNumber, onBeat, onComplete) {
    if (!initialized) return;
    const interval = 60000 / DrumPatterns.getBpm(stepNumber);
    let beat = 0;
    const tick = () => {
      beat++;
      if (beat <= 4) {
        (beat === 1 ? metroHi : metroLo).triggerAttackRelease(beat === 1 ? 'A5' : 'E5', '16n');
        if (onBeat) onBeat(beat);
        if (beat < 4) scheduledIds.push(setTimeout(tick, interval));
        else scheduledIds.push(setTimeout(() => { if (onComplete) onComplete(); }, interval));
      }
    };
    tick();
  }

  /**
   * お手本自動演奏（4小節 + メトロノーム）
   */
  function playDemo(stepNumber, onNotePlay, onComplete) {
    clearScheduled();
    const notes = DrumPatterns.generateTimeline(stepNumber);
    const beatMs = 60000 / DrumPatterns.getBpm(stepNumber);
    const totalBeats = 4 * DrumPatterns.MEASURES_PER_PHASE; // 16拍

    // メトロノーム（16拍）
    for (let i = 0; i < totalBeats; i++) {
      scheduledIds.push(setTimeout(() => playClick(i % 4 === 0), i * beatMs));
    }

    // ドラムノーツ
    notes.forEach(note => {
      scheduledIds.push(setTimeout(() => {
        playDrum(note.lane);
        if (onNotePlay) onNotePlay(note.lane, note.time);
      }, note.time * 1000));
    });

    // 完了
    const totalMs = DrumPatterns.getPhaseDuration(stepNumber) * 1000;
    scheduledIds.push(setTimeout(() => { if (onComplete) onComplete(); }, totalMs));
  }

  function startMetronome(stepNumber) {
    const beatMs = 60000 / DrumPatterns.getBpm(stepNumber);
    const totalBeats = 4 * DrumPatterns.MEASURES_PER_PHASE;
    for (let i = 0; i < totalBeats; i++) {
      scheduledIds.push(setTimeout(() => playClick(i % 4 === 0), i * beatMs));
    }
  }

  function clearScheduled() {
    scheduledIds.forEach(id => clearTimeout(id));
    scheduledIds = [];
  }

  function isReady() { return initialized; }

  return { init, playDrum, playClick, performCountIn, playDemo, startMetronome, clearScheduled, isReady };
})();
