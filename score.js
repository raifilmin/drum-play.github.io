/**
 * score.js — Canvas 2レーン譜面描画エンジン
 *
 * Snare（上）+ Kick（下）の2レーン
 */

const ScoreRenderer = (() => {
  let canvas, ctx;
  let width, height;

  const LANE_NAMES = ['snare', 'kick'];
  const LANE_LABELS = ['Snare', 'Kick'];
  const LANE_PADDING_TOP = 28, LANE_PADDING_BOTTOM = 16;
  let laneHeight = 0, laneY = {};

  const JUDGE_LINE_X_RATIO = 0.2;
  let judgeLineX = 0;
  const NOTE_SIZE = 16;

  const COLORS = {
    bg: '#FAFAFA', line: '#E8E8E8', judgeLine: '#E85A4F', judgeLineGlow: 'rgba(232, 90, 79, 0.12)',
    labelText: '#AAA', snare: '#333', kick: '#888', demoHit: 'rgba(232, 90, 79, 0.5)',
    judgedGood: 'rgba(232, 90, 79, 0.55)', judgedNice: 'rgba(90, 170, 120, 0.55)',
    judgedOk: 'rgba(180, 160, 80, 0.45)', judgedMousukoshi: 'rgba(180, 180, 180, 0.35)'
  };

  function init(canvasEl) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    resize(); window.addEventListener('resize', resize);
  }

  function resize() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    width = container.clientWidth; height = container.clientHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const usableHeight = height - LANE_PADDING_TOP - LANE_PADDING_BOTTOM;
    laneHeight = usableHeight / 2;
    LANE_NAMES.forEach((name, i) => laneY[name] = LANE_PADDING_TOP + laneHeight * i + laneHeight / 2);
    judgeLineX = width * JUDGE_LINE_X_RATIO;
  }

  function render(notes, currentTime, isListening, hitEffects, showNotes) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, width, height);

    const pps = width * 0.45; // 流速調整

    drawLanes(isListening);
    if (hitEffects) drawHitEffects(hitEffects);
    drawJudgeLine();
    if (showNotes && notes) drawNotes(notes, currentTime, pps, isListening);
    drawLaneLabels();
  }

  function drawLanes(isListening) {
    ctx.strokeStyle = isListening ? '#DDD' : COLORS.line; ctx.lineWidth = 1;
    LANE_NAMES.forEach(name => {
      ctx.beginPath(); ctx.moveTo(0, laneY[name]); ctx.lineTo(width, laneY[name]); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(0, LANE_PADDING_TOP); ctx.lineTo(width, LANE_PADDING_TOP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, height - LANE_PADDING_BOTTOM); ctx.lineTo(width, height - LANE_PADDING_BOTTOM); ctx.stroke();
  }

  function drawJudgeLine() {
    ctx.fillStyle = COLORS.judgeLineGlow;
    ctx.fillRect(judgeLineX - 18, LANE_PADDING_TOP, 36, height - LANE_PADDING_TOP - LANE_PADDING_BOTTOM);
    ctx.strokeStyle = COLORS.judgeLine; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(judgeLineX, LANE_PADDING_TOP); ctx.lineTo(judgeLineX, height - LANE_PADDING_BOTTOM); ctx.stroke();
    LANE_NAMES.forEach(name => {
      ctx.fillStyle = COLORS.judgeLine; ctx.beginPath(); ctx.arc(judgeLineX, laneY[name], 4, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawNotes(notes, currentTime, pps, isListening) {
    notes.forEach(note => {
      const timeDiff = note.time - currentTime;
      const x = judgeLineX + timeDiff * pps;
      if (x < -40 || x > width + 40) return;
      const y = laneY[note.lane]; if (!y) return;

      if (note.judged) {
        if (note.judgedAt !== null) {
          ctx.globalAlpha = Math.max(0, 1 - (currentTime - note.judgedAt) * 3);
          if (ctx.globalAlpha > 0) drawJudgedNote(x, y, note);
          ctx.globalAlpha = 1;
        }
        return;
      }
      if (isListening && timeDiff < 0) {
        ctx.globalAlpha = Math.max(0, 1 + timeDiff * 2);
        if(ctx.globalAlpha > 0){
          ctx.fillStyle = COLORS.demoHit; ctx.beginPath(); ctx.arc(x, y, NOTE_SIZE * 0.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; return;
      }
      drawNote(x, y, note.lane);
    });
  }

  function drawNote(x, y, lane) {
    if (lane === 'snare') {
      ctx.fillStyle = COLORS.snare; ctx.beginPath(); ctx.arc(x, y, NOTE_SIZE * 0.55, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = COLORS.kick; ctx.beginPath();
      ctx.moveTo(x, y - NOTE_SIZE * 0.7); ctx.lineTo(x + NOTE_SIZE * 0.7, y);
      ctx.lineTo(x, y + NOTE_SIZE * 0.7); ctx.lineTo(x - NOTE_SIZE * 0.7, y); ctx.fill();
    }
  }

  function drawJudgedNote(x, y, note) {
    let c = COLORS.judgedMousukoshi;
    if (note.judgment === 'GOOD') c = COLORS.judgedGood;
    else if (note.judgment === 'NICE') c = COLORS.judgedNice;
    else if (note.judgment === 'OK') c = COLORS.judgedOk;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, NOTE_SIZE * 0.8, 0, Math.PI * 2); ctx.fill();
  }

  function drawHitEffects(effects) {
    const now = performance.now();
    effects.forEach(effect => {
      const prog = (now - effect.startTime) / (effect.type === 'good' ? 400 : 250);
      if (prog >= 1) return;
      const y = laneY[effect.lane]; if (!y) return;
      if (effect.type === 'good') {
        ctx.strokeStyle = `rgba(232, 90, 79, ${(1 - prog) * 0.5})`;
        ctx.lineWidth = 1.5 * (1 - prog);
        ctx.beginPath(); ctx.arc(judgeLineX, y, 12 + prog * 35, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = `rgba(232, 90, 79, ${(1 - prog) * 0.2})`;
      ctx.fillRect(judgeLineX - 22, y - laneHeight * 0.4, 44, laneHeight * 0.8);
    });
  }

  function drawLaneLabels() {
    ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = COLORS.labelText;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    LANE_NAMES.forEach((n, i) => ctx.fillText(LANE_LABELS[i], 10, laneY[n]));
  }

  return { init, render };
})();
