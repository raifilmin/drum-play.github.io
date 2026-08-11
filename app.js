/**
 * app.js — メインアプリ（SPA画面遷移 + STEPフロー）
 */

(() => {
  const PHASES = { IDLE: 'idle', COUNT_IN_LISTEN: 'cil', LISTEN: 'listen', WAITING: 'wait', COUNT_IN_PLAY: 'cip', PLAY: 'play', RESULT: 'result', FREE: 'free' };
  const state = { screen: 'intro', phase: PHASES.IDLE, currentStep: 1, notes: [], startTime: 0, hitEffects: [], keysDown: new Set(), animFrameId: null };

  const dom = {
    introScreen: document.getElementById('intro-screen'),
    guideScreen: document.getElementById('guide-screen'),
    playScreen: document.getElementById('play-screen'),
    completionScreen: document.getElementById('completion-screen'),
    ctaBtn: document.getElementById('cta-btn'),
    guideStartBtn: document.getElementById('guideStartBtn'),
    startBtn: document.getElementById('startBtn'),
    listenAgainBtn: document.getElementById('listenAgainBtn'),
    stepNumber: document.getElementById('stepNumber'),
    phaseBadge: document.getElementById('phaseBadge'),
    phaseIcon: document.getElementById('phaseIcon'),
    phaseText: document.getElementById('phaseText'),
    demoTextOverlay: document.getElementById('demoTextOverlay'),
    scoreCanvas: document.getElementById('scoreCanvas'),
    judgmentText: document.getElementById('judgmentText'),
    comboNumber: document.getElementById('comboNumber'),
    comboDisplay: document.getElementById('comboDisplay'),
    svgKick: document.getElementById('svgKick'),
    svgSnare: document.getElementById('svgSnare'),
    keySpace: document.getElementById('keySpace'),
    keyS: document.getElementById('keyS'),
    actionsBar: document.getElementById('actionsBar'),
    countinOverlay: document.getElementById('countinOverlay'),
    countinNumber: document.getElementById('countinNumber'),
    resultOverlay: document.getElementById('resultOverlay'),
    retryBtn: document.getElementById('retryBtn'),
    nextStepBtn: document.getElementById('nextStepBtn'),
    backToStepBtn: document.getElementById('backToStepBtn'),
    restartBtn: document.getElementById('restartBtn'),
    freeModeBtn: document.getElementById('freeModeBtn')
  };

  const LANE_KEY = { kick: dom.keySpace, snare: dom.keyS };
  const LANE_SVG = { kick: dom.svgKick, snare: dom.svgSnare };

  // --- SPA 画面遷移 ---
  function showScreen(screenId) {
    state.screen = screenId;
    dom.introScreen.classList.toggle('hidden', screenId !== 'intro');
    dom.guideScreen.classList.toggle('hidden', screenId !== 'guide');
    dom.playScreen.classList.toggle('hidden', screenId !== 'play');
    dom.completionScreen.classList.toggle('hidden', screenId !== 'completion');
    if(screenId === 'play') {
      ScoreRenderer.init(dom.scoreCanvas);
      if(state.phase === PHASES.IDLE || state.phase === PHASES.FREE) {
        ScoreRenderer.render([], 0, false, [], false);
      }
    }
  }

  // --- 導入画面 ---
  dom.ctaBtn.addEventListener('click', async () => {
    await AudioEngine.init();
    showScreen('guide');
  });

  // --- 説明画面 ---
  dom.guideStartBtn.addEventListener('click', () => {
    showScreen('play');
    startStepFlow();
  });

  // --- 完走画面 ---
  dom.restartBtn.addEventListener('click', () => { showScreen('intro'); });
  dom.freeModeBtn.addEventListener('click', () => { showScreen('play'); switchToFree(); });

  // --- STEPフロー ---
  function startStepFlow() {
    state.currentStep = 1; dom.backToStepBtn.classList.add('hidden');
    updateStepUI(); setPhase(PHASES.IDLE);
    ScoreRenderer.render(DrumPatterns.generateTimeline(1), -2, true, [], true);
  }

  function updateStepUI() {
    dom.stepNumber.textContent = `STEP ${state.currentStep} / ${DrumPatterns.getTotalSteps()}`;
  }

  function setPhase(p) {
    state.phase = p;
    dom.playScreen.className = (p === PHASES.LISTEN || p === PHASES.COUNT_IN_LISTEN) ? 'phase-listen' : '';
    
    if (p === PHASES.LISTEN) dom.demoTextOverlay.classList.remove('hidden');
    else dom.demoTextOverlay.classList.add('hidden');

    dom.phaseBadge.className = 'phase-badge';
    if(p === PHASES.LISTEN) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='お手本演奏中'; dom.phaseBadge.classList.add('listen'); }
    else if(p === PHASES.COUNT_IN_LISTEN) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='きく'; dom.phaseBadge.classList.add('listen'); }
    else if(p === PHASES.WAITING) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='準備OK'; dom.phaseBadge.classList.add('play'); }
    else if(p === PHASES.PLAY || p === PHASES.COUNT_IN_PLAY) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='まねする'; dom.phaseBadge.classList.add('play'); }
    else if(p === PHASES.RESULT) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='結果'; dom.phaseBadge.classList.add('result'); }
    else if(p === PHASES.FREE) { dom.phaseIcon.textContent=''; dom.phaseText.textContent='フリーモード'; }
    else { dom.phaseIcon.textContent=''; dom.phaseText.textContent=''; }

    dom.actionsBar.classList.remove('hidden');
    dom.startBtn.classList.add('hidden'); dom.listenAgainBtn.classList.add('hidden');
    if(p === PHASES.IDLE) { dom.startBtn.classList.remove('hidden'); dom.startBtn.textContent = 'スタート'; }
    else if(p === PHASES.WAITING) { dom.startBtn.classList.remove('hidden'); dom.startBtn.textContent = '本番！'; dom.listenAgainBtn.classList.remove('hidden'); }
    else if(p === PHASES.FREE) { dom.actionsBar.classList.add('hidden'); }
  }

  dom.startBtn.addEventListener('click', () => {
    if(state.phase === PHASES.IDLE) beginListen();
    else if(state.phase === PHASES.WAITING) beginPlay();
  });
  dom.listenAgainBtn.addEventListener('click', beginListen);

  function beginListen() {
    setPhase(PHASES.COUNT_IN_LISTEN); stopLoop();
    showCountIn(() => {
      setPhase(PHASES.LISTEN);
      state.notes = DrumPatterns.generateTimeline(state.currentStep);
      state.startTime = performance.now(); state.hitEffects = [];
      AudioEngine.playDemo(state.currentStep, l => { flashSVG(l); flashKey(l); }, () => setTimeout(() => setPhase(PHASES.WAITING), 300));
      startDemoLoop();
    });
  }

  function startDemoLoop() {
    stopLoop();
    const start = performance.now();
    const loop = () => {
      if(state.phase !== PHASES.LISTEN) { ScoreRenderer.render(DrumPatterns.generateTimeline(state.currentStep), -1, false, [], true); return; }
      ScoreRenderer.render(state.notes, (performance.now() - start)/1000, true, state.hitEffects, true);
      state.hitEffects = state.hitEffects.filter(e => performance.now() - e.startTime < 500);
      state.animFrameId = requestAnimationFrame(loop);
    };
    state.animFrameId = requestAnimationFrame(loop);
  }

  function beginPlay() {
    setPhase(PHASES.COUNT_IN_PLAY); stopLoop(); AudioEngine.clearScheduled();
    JudgeSystem.reset(); dom.comboNumber.textContent = 0; dom.comboDisplay.classList.remove('hidden');
    showCountIn(() => {
      setPhase(PHASES.PLAY);
      state.notes = DrumPatterns.generateTimeline(state.currentStep);
      state.startTime = performance.now(); state.hitEffects = [];
      AudioEngine.startMetronome(state.currentStep);
      startPlayLoop();
    });
  }

  function startPlayLoop() {
    stopLoop();
    const dur = DrumPatterns.getPhaseDuration(state.currentStep);
    const loop = () => {
      if(state.phase !== PHASES.PLAY) return;
      const elapsed = (performance.now() - state.startTime)/1000;
      
      state.notes.forEach(n => {
        if(!n.judged && elapsed*1000 - n.time*1000 > JudgeSystem.OK_WINDOW) {
          JudgeSystem.missed(n.lane); n.judged=true; n.judgment='もうすこし！'; n.judgedAt=elapsed;
        }
      });
      if(elapsed >= dur + 0.5) {
        state.notes.forEach(n => { if(!n.judged) { JudgeSystem.missed(n.lane); n.judged=true; n.judgment='もうすこし！'; n.judgedAt=elapsed; }});
        showResult(); return;
      }
      state.hitEffects = state.hitEffects.filter(e => performance.now() - e.startTime < 500);
      ScoreRenderer.render(state.notes, elapsed, false, state.hitEffects, true);
      state.animFrameId = requestAnimationFrame(loop);
    };
    state.animFrameId = requestAnimationFrame(loop);
  }

  function showCountIn(cb) {
    dom.countinOverlay.classList.add('show');
    AudioEngine.performCountIn(state.currentStep, b => {
      dom.countinNumber.textContent = b; dom.countinNumber.style.animation = 'none';
      void dom.countinNumber.offsetWidth; dom.countinNumber.style.animation = 'countPop 0.8s ease forwards';
    }, () => { dom.countinOverlay.classList.remove('show'); if(cb) cb(); });
  }

  function showResult() {
    setPhase(PHASES.RESULT); stopLoop();
    const stats = JudgeSystem.getStats();
    document.getElementById('resultEmoji').textContent = stats.result.emoji;
    document.getElementById('resultMessage').textContent = stats.result.text;
    document.getElementById('resultScore').textContent = stats.score;
    document.getElementById('statGood').textContent = stats.counts['GOOD'];
    document.getElementById('statNice').textContent = stats.counts['NICE'];
    document.getElementById('statOk').textContent = stats.counts['OK'];
    document.getElementById('statMousukoshi').textContent = stats.counts['もうすこし！'];
    dom.nextStepBtn.textContent = state.currentStep >= DrumPatterns.getTotalSteps() ? '🎊 完走画面へ' : '→ 次のSTEPへ';
    dom.resultOverlay.classList.add('show');
  }

  dom.retryBtn.addEventListener('click', () => { dom.resultOverlay.classList.remove('show'); beginListen(); });
  dom.nextStepBtn.addEventListener('click', () => {
    dom.resultOverlay.classList.remove('show');
    if(state.currentStep >= DrumPatterns.getTotalSteps()) showScreen('completion');
    else { state.currentStep++; updateStepUI(); beginListen(); }
  });

  function switchToFree() {
    stopLoop(); AudioEngine.clearScheduled(); state.screen = 'play'; setPhase(PHASES.FREE);
    dom.backToStepBtn.classList.remove('hidden'); dom.comboDisplay.classList.add('hidden');
    ScoreRenderer.render([], 0, false, [], false);
  }
  dom.backToStepBtn.addEventListener('click', () => { dom.backToStepBtn.classList.add('hidden'); dom.comboDisplay.classList.remove('hidden'); startStepFlow(); });

  function stopLoop() { if(state.animFrameId) cancelAnimationFrame(state.animFrameId); state.animFrameId = null; }

  // --- 入力処理 ---
  JudgeSystem.setCallbacks({
    onJudgment: (j, lane) => {
      dom.judgmentText.textContent = j;
      dom.judgmentText.className = 'judgment-text show ' + (j==='GOOD'?'good':j==='NICE'?'nice':j==='OK'?'ok':'mousukoshi');
      setTimeout(() => { dom.judgmentText.classList.remove('show'); dom.judgmentText.classList.add('fade-out'); }, 180);
      if(j!=='もうすこし！') state.hitEffects.push({lane, type: j==='GOOD'?'good':'other', startTime: performance.now()});
    },
    onComboUpdate: c => {
      dom.comboNumber.textContent = c; dom.comboNumber.classList.remove('pulse');
      if(c>0) { void dom.comboNumber.offsetWidth; dom.comboNumber.classList.add('pulse'); dom.comboNumber.style.fontSize = Math.min(2.2, 1.5+c*0.04)+'rem'; }
      else dom.comboNumber.style.fontSize = '1.5rem';
    }
  });

  function handleInput(lane) {
    AudioEngine.playDrum(lane); flashKey(lane); flashSVG(lane);
    if(state.phase === PHASES.PLAY) {
      const inputTime = performance.now(); const elapsed = (inputTime - state.startTime)/1000;
      let clNote = null, clDiff = Infinity;
      state.notes.forEach(n => {
        if(n.judged || n.lane !== lane) return;
        const diff = Math.abs(elapsed - n.time)*1000;
        if(diff < clDiff) { clDiff = diff; clNote = n; }
      });
      if(clNote && clDiff <= JudgeSystem.OK_WINDOW) {
        const t = state.startTime + clNote.time*1000;
        const r = JudgeSystem.judge(inputTime, t, lane);
        clNote.judged = true; clNote.judgment = r.judgment; clNote.judgedAt = elapsed;
      }
    }
  }

  function flashKey(lane) { const el = LANE_KEY[lane]; if(el) { el.classList.add('pressed'); setTimeout(()=>el.classList.remove('pressed'), 120); } }
  function flashSVG(lane) { const el = LANE_SVG[lane]; if(el) { el.classList.add(lane==='kick'?'hit-kick':'hit-snare'); setTimeout(()=>el.classList.remove('hit-kick','hit-snare'), 150); } }

  document.addEventListener('keydown', e => {
    if(e.key === ' ') e.preventDefault();
    if(state.screen !== 'play') return;
    const l = e.key===' '? 'kick' : (e.key.toLowerCase()==='s'? 'snare' : null);
    if(!l || state.keysDown.has(e.key)) return;
    state.keysDown.add(e.key); if(AudioEngine.isReady()) handleInput(l);
  });
  document.addEventListener('keyup', e => {
    state.keysDown.delete(e.key);
    const l = e.key===' '? 'kick' : (e.key.toLowerCase()==='s'? 'snare' : null);
    if(l && LANE_KEY[l]) LANE_KEY[l].classList.remove('pressed');
  });


})();
