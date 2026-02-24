import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const actualSet = new Set(target.numbers);
    let matches = 0;
    for (let j = 0; j < finalPicks.length; j++) {
      if (actualSet.has(finalPicks[j])) matches++;
    }

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
  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);

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

  // -------------------------
  // Incremental training stats (simple scoring)
  // -------------------------
  const freq = new Uint32Array(range + 1);
  const recentW = new Float64Array(range + 1);
  const decay = Math.exp(-1 / 15);
  let maxRecentW = 0;

  const addToTraining = (idx: number) => {
    const nums = data[idx].numbers;
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      freq[x] += 1;
      recentW[x] += 1;
      if (recentW[x] > maxRecentW) maxRecentW = recentW[x];
    }
  };

  const decayRecent = () => {
    maxRecentW = 0;
    for (let x = 1; x <= range; x++) {
      recentW[x] *= decay;
      if (recentW[x] > maxRecentW) maxRecentW = recentW[x];
    }
  };

  // -------------------------
  // Shape stats (odd-count mode + sum band)
  // -------------------------
  const oddCountHist = new Uint32Array(picks + 1);

  const SUM_BIN = 10; // bin width
  const MAX_SUM = range * picks;
  const sumBins = Math.floor(MAX_SUM / SUM_BIN) + 1;
  const sumHist = new Uint32Array(sumBins);

  const addShapeToTraining = (idx: number) => {
    const nums = data[idx].numbers;
    const odd = oddCountOf(nums);
    oddCountHist[odd] += 1;

    const s = sumOf(nums);
    const b = Math.min(sumBins - 1, Math.floor(s / SUM_BIN));
    sumHist[b] += 1;
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

  const getTopSumBins = (topK: number) => {
    const arr: { bin: number; v: number }[] = [];
    for (let b = 0; b < sumHist.length; b++) arr.push({ bin: b, v: sumHist[b] });
    arr.sort((a, b) => b.v - a.v);
    return arr.slice(0, Math.min(topK, arr.length)).map((x) => x.bin);
  };

  const inTopSumBins = (sum: number, topBins: number[]) => {
    const b = Math.min(sumBins - 1, Math.floor(sum / SUM_BIN));
    for (let i = 0; i < topBins.length; i++) if (topBins[i] === b) return true;
    return false;
  };

  // -------------------------
  // Warmup
  // -------------------------
  const startIndex = Math.min(50, n - 1);
  for (let i = 0; i < startIndex; i++) {
    addToTraining(i);
    addShapeToTraining(i);
    decayRecent();
  }

  // -------------------------
  // Main loop
  // -------------------------
  for (let i = startIndex; i < n; i++) {
    const target = data[i];

    // ✅ Hard rule you stated: previous draw numbers won't appear next draw
    const prevSet = new Set<number>(data[i - 1].numbers);

    // score candidates (simple + fast)
    const denom = Math.max(i, 1);
    const scored: { num: number; score: number }[] = [];
    for (let x = 1; x <= range; x++) {
      if (prevSet.has(x)) continue; // enforce anti-repeat
      const f = freq[x] / denom;
      const r = maxRecentW > 0 ? recentW[x] / maxRecentW : 0;
      scored.push({ num: x, score: f * 0.45 + r * 0.55 });
    }
    scored.sort((a, b) => b.score - a.score);

    // shape targets
    const oddMode = getOddMode();
    const topSumBins = getTopSumBins(3);

    // build candidates and keep best
    const TRIES = 350; // still cheap
    let bestTicket: number[] = [];
    let bestTicketScore = -Infinity;

    const POOL = Math.min(scored.length, Math.max(30, picks * 12));
    const pool = scored.slice(0, POOL);

    for (let t = 0; t < TRIES; t++) {
      const chosen: number[] = [];
      const used = new Set<number>();

      while (chosen.length < picks) {
        // bias to top, but allow diversity
        const topK = Math.min(pool.length, 12 + Math.floor(rand() * 10)); // 12..21
        const idx = Math.floor(rand() * topK);
        const x = pool[idx].num;
        if (used.has(x)) continue;
        used.add(x);
        chosen.push(x);
      }

      const ticket = chosen.sort((a, b) => a - b);
      const s = sumOf(ticket);
      const odd = oddCountOf(ticket);

      // (A) odd-shape filter: allow mode +/- 1
      if (Math.abs(odd - oddMode) > 1) continue;

      // (B) sum band filter
      if (!inTopSumBins(s, topSumBins)) continue;

      // ✅ (C) NEW: bucket spread filter (region rule)
      // reject if 4 or more from same bucket (too concentrated)
      if (maxBucketCount(ticket) >= 4) continue;

      // score ticket = sum of member scores (pool is small, linear scan ok)
      let sc = 0;
      for (let k = 0; k < ticket.length; k++) {
        for (let j = 0; j < pool.length; j++) {
          if (pool[j].num === ticket[k]) {
            sc += pool[j].score;
            break;
          }
        }
      }

      if (sc > bestTicketScore) {
        bestTicketScore = sc;
        bestTicket = ticket;
      }
    }

    // fallback: if filters too strict, relax bucket rule automatically
    if (bestTicket.length !== picks) {
      // try again with relaxed bucket filter (max bucket 5)
      let relaxedBest: number[] = [];
      let relaxedScore = -Infinity;

      const RELAX_TRIES = 200;
      for (let t = 0; t < RELAX_TRIES; t++) {
        const chosen: number[] = [];
        const used = new Set<number>();

        while (chosen.length < picks) {
          const topK = Math.min(pool.length, 15 + Math.floor(rand() * 12)); // 15..26
          const idx = Math.floor(rand() * topK);
          const x = pool[idx].num;
          if (used.has(x)) continue;
          used.add(x);
          chosen.push(x);
        }

        const ticket = chosen.sort((a, b) => a - b);
        const s = sumOf(ticket);
        const odd = oddCountOf(ticket);

        if (Math.abs(odd - oddMode) > 1) continue;
        if (!inTopSumBins(s, topSumBins)) continue;

        // relaxed bucket (allow concentration up to 4)
        if (maxBucketCount(ticket) >= 5) continue;

        let sc = 0;
        for (let k = 0; k < ticket.length; k++) {
          for (let j = 0; j < pool.length; j++) {
            if (pool[j].num === ticket[k]) {
              sc += pool[j].score;
              break;
            }
          }
        }

        if (sc > relaxedScore) {
          relaxedScore = sc;
          relaxedBest = ticket;
        }
      }

      bestTicket = relaxedBest.length === picks
        ? relaxedBest
        : pool.slice(0, picks).map((x) => x.num).sort((a, b) => a - b);
    }

    // evaluate
    const actualSet = new Set(target.numbers);
    let matches = 0;
    for (let k = 0; k < bestTicket.length; k++) if (actualSet.has(bestTicket[k])) matches++;

    predictions.push({
      draw_date: target.draw_date,
      actual: target.numbers,
      predicted: bestTicket,
      matches,
      accuracy: (matches / picks) * 100,
      method: 'Anti-Repeat + Shape(Odd/Sum) + Bucket-Spread + Simple Score',
    });

    // advance training
    addToTraining(i);
    addShapeToTraining(i);
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

    const tableName =
      type === 'supreme-toto-6-58'
        ? 'supreme_toto_6_58'
        : 'supreme_toto_6_58';

    const allData = await fetchAllDrawsKeyset(tableName);

    console.log(`Fetched ${allData.length} draws for analysis`);

    const analysis = analyzeData(allData);
    const backtest = allData.length > 20 ? runBacktestOptimized(allData, 58, 6) : null;

    return NextResponse.json({
      analysis,
      backtest,
      dataCount: allData.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
