/**
 * patterns.js — 4 STEPの譜面パターンデータ
 *
 * 8分音符単位。1 = ノーツあり, 0 = なし
 * 1小節 = 8ステップ（8分音符 × 8 = 4拍）
 * BPM 60 固定。お手本4小節、プレイ4小節。
 */

const DrumPatterns = (() => {
  const MEASURES_PER_PHASE = 4; // お手本・プレイとも4小節

  const STEPS = [
    {
      id: 1,
      title: '基本のドン・パン',
      description: 'ドン・パン・ドン・パン。ロック/ポップスの基本形。',
      bpm: 60,
      //       1   &   2   &   3   &   4   &
      snare: [0,  0,  1,  0,  0,  0,  1,  0],
      kick:  [1,  0,  0,  0,  1,  0,  0,  0],
    },
    {
      id: 2,
      title: 'キックを1つ足す',
      description: '4拍目の直前にキックを追加。急にビートが跳ねる感じに。',
      bpm: 80,
      snare: [0,  0,  1,  0,  0,  0,  1,  0],
      kick:  [1,  0,  0,  0,  1,  1,  0,  0],
    },
    {
      id: 3,
      title: 'さらにキックを足す',
      description: '2の裏にもキック。より曲っぽくグルーヴが出る。',
      bpm: 90,
      snare: [0,  0,  1,  0,  0,  0,  1,  1],
      kick:  [1,  0,  0,  1,  1,  0,  1,  0],
    },
  ];

  function getBpm(stepNumber) {
    return getStep(stepNumber).bpm || 60;
  }

  function getStep(stepNumber) {
    return STEPS[stepNumber - 1] || STEPS[0];
  }

  /** 1小節分のノーツタイムライン */
  function generateMeasureTimeline(stepNumber, measureOffset) {
    const step = getStep(stepNumber);
    const bpm = getBpm(stepNumber);
    const eighthDur = 60 / bpm / 2;
    const measureDur = getMeasureDuration(stepNumber);
    const notes = [];

    ['snare', 'kick'].forEach(lane => {
      step[lane].forEach((hit, idx) => {
        if (hit) {
          notes.push({
            time: measureOffset * measureDur + idx * eighthDur,
            lane,
            stepIndex: idx,
            measure: measureOffset,
            judged: false,
            judgment: null,
            judgedAt: null,
          });
        }
      });
    });
    return notes;
  }

  /** 4小節分のタイムラインを生成 */
  function generateTimeline(stepNumber) {
    let notes = [];
    for (let m = 0; m < MEASURES_PER_PHASE; m++) {
      notes = notes.concat(generateMeasureTimeline(stepNumber, m));
    }
    notes.sort((a, b) => a.time - b.time);
    return notes;
  }

  /** 1小節の長さ（秒） */
  function getMeasureDuration(stepNumber) {
    const bpm = getBpm(stepNumber);
    return (60 / bpm) * 4;
  }

  /** フェーズ全体の長さ（秒）= 4小節 */
  function getPhaseDuration(stepNumber) {
    return getMeasureDuration(stepNumber) * MEASURES_PER_PHASE;
  }

  function getTotalSteps() {
    return STEPS.length;
  }

  return {
    getBpm,
    MEASURES_PER_PHASE,
    getStep,
    generateTimeline,
    getMeasureDuration,
    getPhaseDuration,
    getTotalSteps,
  };
})();
