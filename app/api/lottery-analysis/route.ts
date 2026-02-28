import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LOTTERY_ID, getLotteryConfig } from '@/lib/lotteryConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface DrawData {
  id: number;
  draw_date: string; // date string from Supabase
  numbers: number[];
  special: number | null;
}

type AnalysisResult = {
  frequency: Record<number, number>;
  hotNumbers: number[];
  coldNumbers: number[];
  evenOddRatio: { even: number; odd: number };
  rangeDistribution: Record<'1-10' | '11-20' | '21-30' | '31-40' | '41-50' | '51-58', number>;
  consecutivePairs: Record<string, number>;
  sumAverage: number;
  gapAnalysis: Record<number, number[]>;
};

const analyzeData = (data: DrawData[]): AnalysisResult => {
  if (!data || data.length === 0) {
    return {
      frequency: {},
      hotNumbers: [],
      coldNumbers: [],
      evenOddRatio: { even: 0, odd: 0 },
      rangeDistribution: { '1-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41-50': 0, '51-58': 0 },
      consecutivePairs: {},
      sumAverage: 0,
      gapAnalysis: {},
    };
  }

  const frequency: Record<number, number> = {};
  const lastSeen: Record<number, number> = {};
  const gaps: Record<number, number[]> = {};

  let totalSum = 0;
  let evenCount = 0;
  let oddCount = 0;

  const rangeDistribution: AnalysisResult['rangeDistribution'] = {
    '1-10': 0,
    '11-20': 0,
    '21-30': 0,
    '31-40': 0,
    '41-50': 0,
    '51-58': 0,
  };

  const consecutivePairs: Record<string, number> = {};

  for (let drawIndex = 0; drawIndex < data.length; drawIndex++) {
    const draw = data[drawIndex];

    // IMPORTANT: do NOT mutate draw.numbers
    const nums = [...draw.numbers].sort((a, b) => a - b);

    // Faster sum than reduce in tight loops
    let drawSum = 0;
    for (let i = 0; i < nums.length; i++) drawSum += nums[i];
    totalSum += drawSum;

    for (let idx = 0; idx < nums.length; idx++) {
      const num = nums[idx];

      frequency[num] = (frequency[num] || 0) + 1;

      if ((num & 1) === 0) evenCount++;
      else oddCount++;

      if (num <= 10) rangeDistribution['1-10']++;
      else if (num <= 20) rangeDistribution['11-20']++;
      else if (num <= 30) rangeDistribution['21-30']++;
      else if (num <= 40) rangeDistribution['31-40']++;
      else if (num <= 50) rangeDistribution['41-50']++;
      else rangeDistribution['51-58']++;

      if (idx < nums.length - 1 && nums[idx + 1] === num + 1) {
        const pair = `${num}-${num + 1}`;
        consecutivePairs[pair] = (consecutivePairs[pair] || 0) + 1;
      }

      if (lastSeen[num] !== undefined) {
        const gap = drawIndex - lastSeen[num];
        (gaps[num] ||= []).push(gap);
      }
      lastSeen[num] = drawIndex;
    }
  }

  const sortedFreq = Object.entries(frequency).sort(([, a], [, b]) => b - a);
  const hotNumbers = sortedFreq.slice(0, 10).map(([num]) => parseInt(num, 10));
  const coldNumbers = sortedFreq.slice(-10).map(([num]) => parseInt(num, 10));

  return {
    frequency,
    hotNumbers,
    coldNumbers,
    evenOddRatio: { even: evenCount, odd: oddCount },
    rangeDistribution,
    consecutivePairs,
    sumAverage: Math.round(totalSum / data.length),
    gapAnalysis: gaps,
  };
};

const sortPredictionsByDrawDateDesc = <T extends { draw_date: string }>(predictions: T[]): T[] =>
  [...predictions].sort((a, b) => {
    const aTime = Date.parse(a.draw_date);
    const bTime = Date.parse(b.draw_date);
    return (Number.isNaN(bTime) ? Number.NEGATIVE_INFINITY : bTime) -
      (Number.isNaN(aTime) ? Number.NEGATIVE_INFINITY : aTime);
  });

const countPositionalMatches = (actual: number[], predicted: number[]): number => {
  const len = Math.min(actual.length, predicted.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (actual[i] === predicted[i]) matches++;
  }
  return matches;
};

/**
 * Backtest (fast) + "region" (mentor tip) modeling:
 * - NO FUTURE LEAKAGE
 * - Seeded RNG
 * - Adds "combination-space region" feature:
 *   - ranks each combo in [0..C(range,picks)-1]
 *   - maps rank into {0..regionBins-1} (half/quarter/1/8)
 *   - learns P(nextRegion | prevRegion) and per-region number tendencies
 *
 * IMPORTANT:
 * - This does NOT guarantee high accuracy on real lottery draws.
 * - It only helps if your generator exhibits region dependence.
 */
export const runBacktestOptimized_v1 = (
  data: DrawData[],
  range: number,
  picks: number,
  seed = 123456789,
  regionBins = 8,                 // mentor idea: 2/4/8 are typical
  enforceRegionFilter = true      // if true, we reject candidate picks not in chosen region
) => {
  type Pred = {
    draw_date: string;
    actual: number[];
    predicted: number[];
    matches: number;
    accuracy: number;
    method: string;
    debug?: {
      prevRegion: number;
      targetRegion: number;
    };
  };

  const predictions: Pred[] = [];

  // -------------------------
  // Seeded RNG (Mulberry32)
  // -------------------------
  const mulberry32 = (a: number) => {
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rand = mulberry32(seed);

  // -------------------------
  // Precompute sorted numbers + sums
  // -------------------------
  const n = data.length;
  const sortedNums: number[][] = new Array(n);
  const sums: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const s = [...data[i].numbers].sort((a, b) => a - b);
    sortedNums[i] = s;

    let sum = 0;
    for (let k = 0; k < s.length; k++) sum += s[k];
    sums[i] = sum;
  }

  // -------------------------
  // Combinations table for fast nCk + colex rank
  // -------------------------
  // comb[n][k] for n<=range and k<=picks
  const comb: number[][] = Array.from({ length: range + 1 }, () =>
    new Array(picks + 1).fill(0)
  );
  for (let nn = 0; nn <= range; nn++) {
    comb[nn][0] = 1;
    for (let kk = 1; kk <= Math.min(nn, picks); kk++) {
      if (kk === nn) comb[nn][kk] = 1;
      else comb[nn][kk] = comb[nn - 1][kk - 1] + comb[nn - 1][kk];
    }
  }

  const totalComb = comb[range][picks]; // C(range,picks) = 40,475,358 for 58/6

  // colex rank: r = sum_{i=1..k} C(a_i-1, i)
  const rankColex = (numsSorted: number[]) => {
    let r = 0;
    for (let i = 0; i < picks; i++) {
      const ai = numsSorted[i]; // 1..range
      r += comb[ai - 1][i + 1];
    }
    return r;
  };

  const regionOf = (numsSorted: number[]) => {
    const r = rankColex(numsSorted);
    const bucketSize = totalComb / regionBins;
    const idx = Math.floor(r / bucketSize);
    return Math.min(Math.max(idx, 0), regionBins - 1);
  };

  // Precompute region for every draw once
  const drawRegion: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    drawRegion[i] = regionOf(sortedNums[i]);
  }

  // -------------------------
  // Incremental training stats (your heuristic model)
  // -------------------------
  const freq = new Uint32Array(range + 1);
  const recentW = new Float64Array(range + 1);
  const lastSeenAbs = new Int32Array(range + 1);
  lastSeenAbs.fill(-1);

  const pairCount = new Uint32Array(range + 1);

  const decay = Math.exp(-1 / 15);
  let maxRecentW = 0;

  let trainingSumTotal = 0;
  let trainingCount = 0;

  // ✅ seen combos up to i-1 ONLY (no future leakage)
  const seenCombos = new Set<string>();

  // -------------------------
  // NEW: Region model stats (mentor tip)
  // -------------------------
  // transitionCounts[prevR][nextR]
  const transitionCounts: number[][] = Array.from({ length: regionBins }, () =>
    new Array(regionBins).fill(0)
  );

  // per-region number counts: regionNumCount[r][num]
  const regionNumCount: Uint32Array[] = Array.from(
    { length: regionBins },
    () => new Uint32Array(range + 1)
  );
  const regionTotals = new Uint32Array(regionBins); // number of draws in each region seen so far

  const addDrawToTraining = (drawIndex: number) => {
    const nums = sortedNums[drawIndex];
    const comboKey = nums.join(",");
    seenCombos.add(comboKey);

    // region stats
    const r = drawRegion[drawIndex];
    regionTotals[r] += 1;
    for (let k = 0; k < nums.length; k++) {
      regionNumCount[r][nums[k]] += 1;
    }

    // heuristic stats
    for (let k = 0; k < nums.length; k++) {
      const num = nums[k];
      freq[num] += 1;

      // newest draw adds weight 1
      recentW[num] += 1;
      if (recentW[num] > maxRecentW) maxRecentW = recentW[num];

      lastSeenAbs[num] = drawIndex;
    }

    for (let k = 0; k < nums.length - 1; k++) {
      const a = nums[k];
      const b = nums[k + 1];
      pairCount[a] += 1;
      pairCount[b] += 1;
    }

    trainingSumTotal += sums[drawIndex];
    trainingCount += 1;
  };

  // Build region transitions incrementally too (still no leakage):
  // when adding draw t (t>=1), we can count transition draw(t-1)->draw(t)
  const addTransitionIfPossible = (drawIndex: number) => {
    if (drawIndex <= 0) return;
    const prevR = drawRegion[drawIndex - 1];
    const nextR = drawRegion[drawIndex];
    transitionCounts[prevR][nextR] += 1;
  };

  const argMax = (arr: number[]) => {
    let bestI = 0;
    let bestV = arr[0] ?? -Infinity;
    for (let i = 1; i < arr.length; i++) {
      const v = arr[i];
      if (v > bestV) {
        bestV = v;
        bestI = i;
      }
    }
    return bestI;
  };

  const nextRegionFromPrev = (prevRegion: number) => {
    const row = transitionCounts[prevRegion];
    const total = row.reduce((s, x) => s + x, 0);

    // If we don’t have enough history yet, just stay in same region
    if (total < Math.max(20, regionBins * 3)) return prevRegion;

    // Add Laplace smoothing so zeroes don’t dominate early
    const smoothed = row.map((c) => c + 1);
    return argMax(smoothed);
  };

  // -------------------------
  // Start training with draw 0
  // -------------------------
  if (n > 0) addDrawToTraining(0);

  // -------------------------
  // Backtest loop
  // -------------------------
  for (let i = 1; i < n; i++) {
    const target = data[i];

    // Update transitions with the newly added training draw i-1? Not yet.
    // Transitions for (i-1)->i is not known at prediction time.
    // But we *can* have transitions up to (i-2)->(i-1), which were added when we trained i-1.
    // So we add transitions when we add each draw to training (below).

    // Determine previous region from draw i-1 (known at prediction time)
    const prevR = drawRegion[i - 1];
    const targetR = nextRegionFromPrev(prevR);

    // -------------------------
    // Heuristic scoring (your model) + region feature
    // -------------------------
    const denom = Math.max(trainingCount, 1);
    const avgSum = trainingSumTotal / denom;

    // Find max region count for normalization (avoid division by 0)
    let maxRegionCount = 0;
    {
      const arr = regionNumCount[targetR];
      for (let num = 1; num <= range; num++) {
        if (arr[num] > maxRegionCount) maxRegionCount = arr[num];
      }
    }

    const scored: { num: number; score: number }[] = new Array(range);
    for (let num = 1; num <= range; num++) {
      const freqScore = freq[num] / denom;
      const recentScore = maxRecentW > 0 ? recentW[num] / maxRecentW : 0;

      const last = lastSeenAbs[num];
      const gap = last >= 0 ? (i - last) : trainingCount;
      const gapScore = Math.min(gap / 20, 1);

      const pairScore = Math.min(pairCount[num] / (denom * (picks - 1)), 1);

      // ✅ region preference: how common is this number in the predicted target region?
      const regionScore =
        maxRegionCount > 0 ? regionNumCount[targetR][num] / maxRegionCount : 0;

      // Weighting: keep your core weights, add a small region term
      const score =
        freqScore * 0.28 +
        recentScore * 0.33 +
        gapScore * 0.24 +
        pairScore * 0.10 +
        regionScore * 0.05;

      scored[num - 1] = { num, score };
    }

    scored.sort((a, b) => b.score - a.score);

    // -------------------------
    // Candidate generation with constraints
    // -------------------------
    let finalPicks: number[] = [];
    let attempts = 0;

    // Expand pool slightly to allow region constraint to succeed
    const poolSize = Math.min(range, picks * 6);

    while (attempts < 2500) {
      attempts++;
      finalPicks = [];

      const candidatePool = scored.slice(0, poolSize).map((x) => x.num);

      for (let j = 0; j < picks && candidatePool.length > 0; j++) {
        const topK = Math.min(candidatePool.length, 12);
        const idx = Math.floor(rand() * topK);
        finalPicks.push(candidatePool[idx]);
        candidatePool.splice(idx, 1);
      }

      finalPicks.sort((a, b) => a - b);
      const comboKey = finalPicks.join(",");

      // rule: full combo never repeats
      if (seenCombos.has(comboKey)) continue;

      // mentor: enforce region if enabled
      if (enforceRegionFilter) {
        const r = regionOf(finalPicks);
        if (r !== targetR) continue;
      }

      // sum constraint
      let sum = 0;
      for (let j = 0; j < finalPicks.length; j++) sum += finalPicks[j];
      if (Math.abs(sum - avgSum) > avgSum * 0.3) continue;

      // max consecutive constraint
      let maxRun = 1;
      let run = 1;
      for (let j = 1; j < finalPicks.length; j++) {
        if (finalPicks[j] === finalPicks[j - 1] + 1) {
          run++;
          if (run > maxRun) maxRun = run;
        } else run = 1;
      }
      if (maxRun > 3) continue;

      break;
    }

    // fallback deterministic top picks if constraints fail
    if (finalPicks.length !== picks) {
      finalPicks = scored
        .slice(0, picks)
        .map((x) => x.num)
        .sort((a, b) => a - b);
    }

    // Evaluate
    const matches = countPositionalMatches(target.numbers, finalPicks);

    predictions.push({
      draw_date: target.draw_date,
      actual: target.numbers,
      predicted: finalPicks,
      matches,
      accuracy: (matches / picks) * 100,
      method: enforceRegionFilter
        ? `Heuristic + RegionMarkov(${regionBins} bins, filtered)`
        : `Heuristic + RegionMarkov(${regionBins} bins)`,
      debug: { prevRegion: prevR, targetRegion: targetR },
    });

    // -------------------------
    // Advance training:
    // - decay recent weights
    // - add draw i to training
    // - add transition (i-1)->i only AFTER we "observe" draw i (OK in backtest)
    // -------------------------
    maxRecentW = 0;
    for (let num = 1; num <= range; num++) {
      recentW[num] *= decay;
      if (recentW[num] > maxRecentW) maxRecentW = recentW[num];
    }

    addDrawToTraining(i);
    addTransitionIfPossible(i);
  }

  const denomPred = Math.max(predictions.length, 1);
  const avgMatches = predictions.reduce((s, p) => s + p.matches, 0) / denomPred;
  const overallAccuracy = predictions.reduce((s, p) => s + p.accuracy, 0) / denomPred;

  const bestDraw = predictions.reduce(
    (best, p) => (p.matches > best.matches ? p : best),
    predictions[0]
  );
  const worstDraw = predictions.reduce(
    (worst, p) => (p.matches < worst.matches ? p : worst),
    predictions[0]
  );

  const sortedPredictions = sortPredictionsByDrawDateDesc(predictions);

  return {
    predictions: sortedPredictions,
    overallAccuracy,
    avgMatches,
    bestDraw,
    worstDraw,
    totalDraws: data.length,
    drawsTested: predictions.length,
  };
};

export const runBacktestOptimized = (
  data: DrawData[],
  range: number,
  picks: number,
  seed = 123456789
) => {
  type Pred = {
    draw_date: string;
    actual: number[];
    predicted: number[];
    matches: number;
    accuracy: number;
    method: string;
  };

  const predictions: Pred[] = [];
  const n = data.length;

  if (!data || n === 0) {
    return {
      predictions: [],
      overallAccuracy: 0,
      avgMatches: 0,
      bestDraw: null,
      worstDraw: null,
      totalDraws: 0,
      drawsTested: 0,
    };
  }
  if (n < 2) {
    return {
      predictions: [],
      overallAccuracy: 0,
      avgMatches: 0,
      bestDraw: null,
      worstDraw: null,
      totalDraws: data.length,
      drawsTested: 0,
    };
  }

  // -------------------------
  // Seeded RNG (Mulberry32)
  // -------------------------
  const mulberry32 = (a: number) => () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = mulberry32(seed);

  // -------------------------
  // Helpers
  // -------------------------
  const sumOf = (arr: number[]) => {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s;
  };

  const oddCountOf = (arr: number[]) => {
    let c = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] & 1) c++;
    return c;
  };

  // Bucket index for "region" spread
  // 1-10,11-20,21-30,31-40,41-50,51-58
  const bucketIndex = (x: number) => {
    if (x <= 10) return 0;
    if (x <= 20) return 1;
    if (x <= 30) return 2;
    if (x <= 40) return 3;
    if (x <= 50) return 4;
    return 5;
  };

  const maxBucketCount = (nums: number[]) => {
    const buckets = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < nums.length; i++) {
      buckets[bucketIndex(nums[i])]++;
    }
    let max = 0;
    for (let i = 0; i < buckets.length; i++) if (buckets[i] > max) max = buckets[i];
    return max;
  };

  const overlapWithSet = (nums: number[], s: Set<number>) => {
    let c = 0;
    for (let i = 0; i < nums.length; i++) if (s.has(nums[i])) c++;
    return c;
  };

  const weightedSampleNoReplace = (
    scoredPool: { num: number; score: number }[],
    k: number
  ) => {
    const pool = scoredPool.map((x) => ({
      num: x.num,
      w: Math.max(x.score, 0) + 1e-9,
    }));
    const out: number[] = [];

    while (out.length < k && pool.length > 0) {
      let totalW = 0;
      for (let i = 0; i < pool.length; i++) totalW += pool[i].w;
      let r = rand() * totalW;
      let chosen = 0;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].w;
        if (r <= 0) {
          chosen = i;
          break;
        }
      }
      out.push(pool[chosen].num);
      pool.splice(chosen, 1);
    }

    return out.sort((a, b) => a - b);
  };

  const getQuantile = (arr: Uint32Array, q: number) => {
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += arr[i];
    if (total === 0) return 0;
    const target = total * q;
    let acc = 0;
    for (let i = 0; i < arr.length; i++) {
      acc += arr[i];
      if (acc >= target) return i;
    }
    return arr.length - 1;
  };

  const pairIdx = (a: number, b: number) => a * (range + 1) + b;

  // -------------------------
  // Incremental training stats (adaptive quant scoring)
  // -------------------------
  const freq = new Uint32Array(range + 1); // long-run frequency
  const recentW = new Float64Array(range + 1);
  const decay = Math.exp(-1 / 14);
  let maxRecentW = 0;
  const lastSeen = new Int32Array(range + 1);
  lastSeen.fill(-1);

  // across-draw transitions: prev draw number -> next draw number
  const followCount = new Uint32Array((range + 1) * (range + 1));
  const pairWithinDraw = new Uint32Array((range + 1) * (range + 1));
  let maxPairWithin = 1;

  let trainingCount = 0;
  const oddCountHist = new Uint32Array(picks + 1);
  const repeatHist = new Uint32Array(picks + 1);
  const bucketMaxHist = new Uint32Array(picks + 1);
  const sumHistBins = new Uint32Array(Math.floor((range * picks) / 5) + 1);
  const SUM_BIN = 5;

  // Welford online mean/std for draw sums
  let sumMean = 0;
  let sumM2 = 0;

  const addToTraining = (idx: number, prevIdx: number | null) => {
    const nums = [...data[idx].numbers].sort((a, b) => a - b);
    const numSet = new Set(nums);

    const drawSum = sumOf(nums);
    const odd = oddCountOf(nums);
    const bucketMax = maxBucketCount(nums);
    const sumBin = Math.min(sumHistBins.length - 1, Math.floor(drawSum / SUM_BIN));

    trainingCount += 1;
    oddCountHist[odd] += 1;
    bucketMaxHist[bucketMax] += 1;
    sumHistBins[sumBin] += 1;

    const delta = drawSum - sumMean;
    sumMean += delta / trainingCount;
    sumM2 += delta * (drawSum - sumMean);

    if (prevIdx !== null && prevIdx >= 0) {
      const prev = data[prevIdx].numbers;
      let repeats = 0;
      for (let i = 0; i < prev.length; i++) {
        if (numSet.has(prev[i])) repeats++;
      }
      repeatHist[repeats] += 1;

      for (let i = 0; i < prev.length; i++) {
        for (let j = 0; j < nums.length; j++) {
          const pi = prev[i];
          const nj = nums[j];
          followCount[pairIdx(pi, nj)] += 1;
        }
      }
    }

    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      freq[x] += 1;
      recentW[x] += 1;
      if (recentW[x] > maxRecentW) maxRecentW = recentW[x];
      lastSeen[x] = idx;
    }

    for (let i = 0; i < nums.length - 1; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i];
        const b = nums[j];
        pairWithinDraw[pairIdx(a, b)] += 1;
        pairWithinDraw[pairIdx(b, a)] += 1;
        if (pairWithinDraw[pairIdx(a, b)] > maxPairWithin) {
          maxPairWithin = pairWithinDraw[pairIdx(a, b)];
        }
      }
    }
  };

  const decayRecent = () => {
    maxRecentW = 0;
    for (let x = 1; x <= range; x++) {
      recentW[x] *= decay;
      if (recentW[x] > maxRecentW) maxRecentW = recentW[x];
    }
  };

  const getOddMode = () => {
    let best = 0;
    let bestV = -1;
    for (let k = 0; k < oddCountHist.length; k++) {
      if (oddCountHist[k] > bestV) {
        bestV = oddCountHist[k];
        best = k;
      }
    }
    return best;
  };

  const stdSum = () => (trainingCount > 1 ? Math.sqrt(sumM2 / (trainingCount - 1)) : 0);

  const componentTopHits = (
    component: Float64Array,
    actualSet: Set<number>
  ) => {
    const arr: { num: number; score: number }[] = [];
    for (let x = 1; x <= range; x++) arr.push({ num: x, score: component[x] });
    arr.sort((a, b) => b.score - a.score);
    let hits = 0;
    for (let i = 0; i < Math.min(picks, arr.length); i++) {
      if (actualSet.has(arr[i].num)) hits++;
    }
    return hits / picks;
  };

  // Component performance EMAs (used for adaptive blending)
  let emaLong = 0.33;
  let emaRecent = 0.35;
  let emaGap = 0.16;
  let emaFollow = 0.16;

  // -------------------------
  // Warmup
  // -------------------------
  const startIndex = Math.min(Math.max(45, 1), n - 1);
  for (let i = 0; i < startIndex; i++) {
    addToTraining(i, i > 0 ? i - 1 : null);
    decayRecent();
  }

  // -------------------------
  // Main loop
  // -------------------------
  for (let i = startIndex; i < n; i++) {
    const target = data[i];
    const targetSet = new Set(target.numbers);
    const prevSet = new Set<number>(data[i - 1].numbers);

    // Adaptive component weights based on recent walk-forward performance
    const rawLong = 0.25 + emaLong;
    const rawRecent = 0.25 + emaRecent;
    const rawGap = 0.12 + emaGap;
    const rawFollow = 0.12 + emaFollow;
    const wSum = rawLong + rawRecent + rawGap + rawFollow;
    const wLong = rawLong / wSum;
    const wRecent = rawRecent / wSum;
    const wGap = rawGap / wSum;
    const wFollow = rawFollow / wSum;

    const denom = Math.max(trainingCount, 1);
    const gapBaseline = range / picks;
    const followNorm = Math.max(denom * picks, 1);

    const longComp = new Float64Array(range + 1);
    const recentComp = new Float64Array(range + 1);
    const gapComp = new Float64Array(range + 1);
    const followComp = new Float64Array(range + 1);

    const scored: { num: number; score: number }[] = new Array(range);
    for (let x = 1; x <= range; x++) {
      const longS = freq[x] / denom;
      const recentS = maxRecentW > 0 ? recentW[x] / maxRecentW : 0;
      const gap =
        lastSeen[x] >= 0
          ? i - lastSeen[x]
          : Math.max(1, Math.floor(gapBaseline));
      const gapDist = Math.abs(gap - gapBaseline) / (gapBaseline + 1e-9);
      const gapS = 1 / (1 + gapDist);

      let followRaw = 0;
      for (const p of prevSet) followRaw += followCount[pairIdx(p, x)];
      const followS = followRaw / followNorm;

      longComp[x] = longS;
      recentComp[x] = recentS;
      gapComp[x] = gapS;
      followComp[x] = followS;

      // Soft anti-repeat instead of hard exclusion
      const repeatPenalty = prevSet.has(x) ? 0.22 : 0;

      const blended =
        wLong * longS +
        wRecent * recentS +
        wGap * gapS +
        wFollow * followS -
        repeatPenalty;

      scored[x - 1] = { num: x, score: blended };
    }
    scored.sort((a, b) => b.score - a.score);

    // shape targets
    const oddMode = getOddMode();
    const sumStd = stdSum();
    const sumLow = sumMean - Math.max(1, sumStd * 1.65);
    const sumHigh = sumMean + Math.max(1, sumStd * 1.65);
    const maxBucketAllowed = Math.max(3, getQuantile(bucketMaxHist, 0.9));
    const overlapMode = getQuantile(repeatHist, 0.55);

    // build candidates and keep best
    const TRIES = 900;
    let bestTicket: number[] = [];
    let bestTicketScore = -Infinity;

    const POOL = Math.min(scored.length, Math.max(36, picks * 14));
    const pool = scored.slice(0, POOL);

    for (let t = 0; t < TRIES; t++) {
      const ticket = weightedSampleNoReplace(pool, picks);
      if (ticket.length !== picks) continue;
      const s = sumOf(ticket);
      const odd = oddCountOf(ticket);
      const overlap = overlapWithSet(ticket, prevSet);
      const bucketMax = maxBucketCount(ticket);

      // keep filters broad to reduce overfitting while removing outliers
      if (Math.abs(odd - oddMode) > 2) continue;
      if (s < sumLow || s > sumHigh) continue;
      if (bucketMax > maxBucketAllowed + 1) continue;

      // ticket score = number score + pair synergy + shape likelihood terms
      let sc = 0;
      for (let k = 0; k < ticket.length; k++) sc += longComp[ticket[k]] * 0.25 + recentComp[ticket[k]] * 0.35 + gapComp[ticket[k]] * 0.2 + followComp[ticket[k]] * 0.2;

      let pairSynergy = 0;
      let pairDen = 0;
      for (let a = 0; a < ticket.length - 1; a++) {
        for (let b = a + 1; b < ticket.length; b++) {
          pairSynergy += pairWithinDraw[pairIdx(ticket[a], ticket[b])] / maxPairWithin;
          pairDen++;
        }
      }
      if (pairDen > 0) sc += (pairSynergy / pairDen) * 0.5;

      sc -= Math.abs(odd - oddMode) * 0.04;
      sc -= Math.abs(overlap - overlapMode) * 0.05;
      sc -= Math.max(0, bucketMax - maxBucketAllowed) * 0.08;

      if (sc > bestTicketScore) {
        bestTicketScore = sc;
        bestTicket = ticket;
      }
    }

    // fallback: if no candidate survives, use diversified top blend
    if (bestTicket.length !== picks) {
      const fallback: number[] = [];
      const bucketUse = [0, 0, 0, 0, 0, 0];
      for (let j = 0; j < scored.length && fallback.length < picks; j++) {
        const x = scored[j].num;
        const bi = bucketIndex(x);
        if (bucketUse[bi] >= maxBucketAllowed) continue;
        fallback.push(x);
        bucketUse[bi]++;
      }
      bestTicket = fallback.length === picks
        ? fallback.sort((a, b) => a - b)
        : scored.slice(0, picks).map((x) => x.num).sort((a, b) => a - b);
    }

    // evaluate
    const matches = countPositionalMatches(target.numbers, bestTicket);

    predictions.push({
      draw_date: target.draw_date,
      actual: target.numbers,
      predicted: bestTicket,
      matches,
      accuracy: (matches / picks) * 100,
      method: 'Adaptive Blend + Follow Matrix + Pair Synergy + Calibrated Shape',
    });

    // Update component performance EMAs with realized draw (walk-forward)
    const alpha = 0.15;
    emaLong = (1 - alpha) * emaLong + alpha * componentTopHits(longComp, targetSet);
    emaRecent = (1 - alpha) * emaRecent + alpha * componentTopHits(recentComp, targetSet);
    emaGap = (1 - alpha) * emaGap + alpha * componentTopHits(gapComp, targetSet);
    emaFollow = (1 - alpha) * emaFollow + alpha * componentTopHits(followComp, targetSet);

    // advance training
    addToTraining(i, i - 1);
    decayRecent();
  }

  const denomPred = Math.max(predictions.length, 1);
  const avgMatches = predictions.reduce((s, p) => s + p.matches, 0) / denomPred;
  const overallAccuracy = predictions.reduce((s, p) => s + p.accuracy, 0) / denomPred;

  const bestDraw = predictions.reduce((best, p) => (p.matches > best.matches ? p : best), predictions[0]);
  const worstDraw = predictions.reduce((worst, p) => (p.matches < worst.matches ? p : worst), predictions[0]);

  const sortedPredictions = sortPredictionsByDrawDateDesc(predictions);

  return {
    predictions: sortedPredictions,
    overallAccuracy,
    avgMatches,
    bestDraw,
    worstDraw,
    totalDraws: data.length,
    drawsTested: predictions.length,
  };
};


/**
 * ✅ FIXED: fetch ALL rows correctly using keyset pagination.
 * Critical change: pageSize must be <= server cap (commonly 1000),
 * otherwise the "pageData.length < pageSize" break triggers too early.
 */
async function fetchAllDrawsKeyset(tableName: string): Promise<DrawData[]> {
  const allData: DrawData[] = [];

  // ✅ MUST be <= server response cap (often 1000)
  const pageSize = 1000;

  let lastDate: string | null = null;
  let lastId: number | null = null;

  while (true) {
    let q = supabase
      .from(tableName)
      .select('id,draw_date,numbers,special')
      .order('draw_date', { ascending: true })
      .order('id', { ascending: true })
      .limit(pageSize);

    if (lastDate !== null && lastId !== null) {
      q = q.or(`draw_date.gt.${lastDate},and(draw_date.eq.${lastDate},id.gt.${lastId})`);
    }

    const { data: pageData, error } = await q;
    if (error) throw new Error(error.message);

    if (!pageData || pageData.length === 0) break;

    allData.push(...(pageData as DrawData[]));

    const last = pageData[pageData.length - 1] as DrawData;
    lastDate = last.draw_date;
    lastId = last.id;

    // ✅ Correct termination condition
    if (pageData.length < pageSize) break;
  }

  return allData;
}

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    const lotteryConfig = getLotteryConfig(type || DEFAULT_LOTTERY_ID);
    const { tableName, range, picks } = lotteryConfig;

    const allData = await fetchAllDrawsKeyset(tableName);

    console.log(`Fetched ${allData.length} draws for analysis`);

    const analysis = analyzeData(allData);
    const backtest = allData.length > 20 ? runBacktestOptimized(allData, range, picks) : null;

    return NextResponse.json({
      analysis,
      backtest,
      dataCount: allData.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
