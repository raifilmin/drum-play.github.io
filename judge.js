/**
 * judge.js — タイミング判定モジュール（寛容版）
 *
 * MISS禁止。GOOD(±150ms), NICE(±300ms), OK(±500ms), もうすこし!(それ以上)
 */

const JudgeSystem = (() => {
  const GOOD_WINDOW = 150;
  const NICE_WINDOW = 300;
  const OK_WINDOW = 500;

  const SCORE_RATE = { 'GOOD': 1.0, 'NICE': 0.7, 'OK': 0.4, 'もうすこし！': 0 };

  let combo = 0, maxCombo = 0, totalNotes = 0, earnedScore = 0;
  let judgmentCounts = { 'GOOD': 0, 'NICE': 0, 'OK': 0, 'もうすこし！': 0 };
  let timingOffset = 0;
  let onJudgment = null, onComboUpdate = null;

  function judge(inputTime, targetTime, lane) {
    const adjustedInput = inputTime - timingOffset;
    const diff = Math.abs(adjustedInput - targetTime);

    let j;
    if (diff <= GOOD_WINDOW) j = 'GOOD';
    else if (diff <= NICE_WINDOW) j = 'NICE';
    else if (diff <= OK_WINDOW) j = 'OK';
    else j = 'もうすこし！';

    applyJudgment(j, lane, diff);
    return { judgment: j, timeDiff: diff };
  }

  function missed(lane) { applyJudgment('もうすこし！', lane, Infinity); }

  function applyJudgment(j, lane, diff) {
    totalNotes++;
    judgmentCounts[j]++;
    earnedScore += SCORE_RATE[j];
    
    if (j === 'もうすこし！') combo = Math.max(0, Math.floor(combo / 2));
    else { combo++; if (combo > maxCombo) maxCombo = combo; }

    if (onJudgment) onJudgment(j, lane, diff);
    if (onComboUpdate) onComboUpdate(combo, maxCombo);
  }

  function calculateScore() {
    if (totalNotes === 0) return 0;
    return Math.round((earnedScore / totalNotes) * 100);
  }

  function getResultMessage() {
    const s = calculateScore();
    if (s >= 60) return { text: 'クリア！', emoji: '', cleared: true };
    return { text: 'ナイスチャレンジ！', emoji: '', cleared: false };
  }

  function getStats() {
    return {
      score: calculateScore(), combo, maxCombo, totalNotes,
      counts: { ...judgmentCounts }, result: getResultMessage()
    };
  }

  function reset() {
    combo = 0; maxCombo = 0; totalNotes = 0; earnedScore = 0;
    judgmentCounts = { 'GOOD': 0, 'NICE': 0, 'OK': 0, 'もうすこし！': 0 };
  }

  function setCallbacks({ onJudgment: j, onComboUpdate: c }) {
    onJudgment = j || onJudgment; onComboUpdate = c || onComboUpdate;
  }
  function setTimingOffset(ms) { timingOffset = ms; }

  return { judge, missed, getStats, reset, setCallbacks, setTimingOffset, OK_WINDOW };
})();
