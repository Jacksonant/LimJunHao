import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface DrawData {
  draw_date: string;
  numbers: number[];
  special: number;
}

const analyzeData = (data: DrawData[]) => {
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

  const frequency: { [key: number]: number } = {};
  const lastSeen: { [key: number]: number } = {};
  const gaps: { [key: number]: number[] } = {};
  let totalSum = 0;
  let evenCount = 0;
  let oddCount = 0;
  const rangeDistribution = { '1-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41-50': 0, '51-58': 0 };
  const consecutivePairs: { [key: string]: number } = {};

  data.forEach((draw, drawIndex) => {
    const nums = draw.numbers.sort((a, b) => a - b);
    totalSum += nums.reduce((a, b) => a + b, 0);

    nums.forEach((num, idx) => {
      frequency[num] = (frequency[num] || 0) + 1;
      
      if (num % 2 === 0) evenCount++;
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
        if (!gaps[num]) gaps[num] = [];
        gaps[num].push(gap);
      }
      lastSeen[num] = drawIndex;
    });
  });

  const sortedFreq = Object.entries(frequency).sort(([, a], [, b]) => b - a);
  const hotNumbers = sortedFreq.slice(0, 10).map(([num]) => parseInt(num));
  const coldNumbers = sortedFreq.slice(-10).map(([num]) => parseInt(num));

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

const runBacktest = (data: DrawData[], range: number, picks: number) => {
  const predictions: any[] = [];
  const historicalCombos = new Set<string>();
  
  data.forEach(d => {
    const combo = [...d.numbers].sort((a, b) => a - b).join(',');
    historicalCombos.add(combo);
  });
  
  for (let i = 1; i < data.length; i++) {
    const trainingData = data.slice(0, i).reverse();
    const targetDraw = data[i];
    
    if (trainingData.length < 1) continue;
    
    const frequency: { [key: number]: number } = {};
    const recentWeight: { [key: number]: number } = {};
    const lastSeen: { [key: number]: number } = {};
    const pairFreq: { [key: string]: number } = {};
    
    trainingData.forEach((draw, idx) => {
      const weight = Math.exp(-idx / 15);
      draw.numbers.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
        recentWeight[num] = (recentWeight[num] || 0) + weight;
        lastSeen[num] = idx;
      });
      
      const sorted = [...draw.numbers].sort((a, b) => a - b);
      for (let j = 0; j < sorted.length - 1; j++) {
        const pair = `${sorted[j]}-${sorted[j + 1]}`;
        pairFreq[pair] = (pairFreq[pair] || 0) + 1;
      }
    });
    
    const allNumbers = Array.from({ length: range }, (_, idx) => idx + 1);
    const scored = allNumbers.map(num => {
      const freqScore = (frequency[num] || 0) / trainingData.length;
      const recentScore = (recentWeight[num] || 0) / Math.max(...Object.values(recentWeight));
      const gap = lastSeen[num] !== undefined ? i - lastSeen[num] : trainingData.length;
      const gapScore = Math.min(gap / 20, 1);
      const pairScore = Object.keys(pairFreq).filter(p => p.includes(`${num}`)).length / 10;
      
      return {
        num,
        score: freqScore * 0.3 + recentScore * 0.35 + gapScore * 0.25 + pairScore * 0.1
      };
    });
    
    const topScored = scored.sort((a, b) => b.score - a.score);
    const avgSum = trainingData.reduce((s, d) => s + d.numbers.reduce((a, b) => a + b, 0), 0) / trainingData.length;
    
    let finalPicks: number[] = [];
    let attempts = 0;
    
    while (attempts < 1000) {
      attempts++;
      finalPicks = [];
      
      const candidatePool = topScored.slice(0, picks * 3).map(x => x.num);
      
      for (let j = 0; j < picks && candidatePool.length > 0; j++) {
        const idx = Math.floor(Math.random() * Math.min(candidatePool.length, 8));
        finalPicks.push(candidatePool[idx]);
        candidatePool.splice(idx, 1);
      }
      
      finalPicks.sort((a, b) => a - b);
      const comboKey = finalPicks.join(',');
      
      if (historicalCombos.has(comboKey)) continue;
      
      const sum = finalPicks.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - avgSum) > avgSum * 0.3) continue;
      
      let maxConsecutive = 1;
      let currentConsecutive = 1;
      for (let j = 1; j < finalPicks.length; j++) {
        if (finalPicks[j] === finalPicks[j - 1] + 1) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }
      if (maxConsecutive > 3) continue;
      
      break;
    }
    
    if (finalPicks.length !== picks) {
      finalPicks = topScored.slice(0, picks).map(x => x.num).sort((a, b) => a - b);
    }
    
    const matches = finalPicks.filter(num => targetDraw.numbers.includes(num)).length;
    const accuracy = (matches / picks) * 100;
    
    predictions.push({
      draw_date: targetDraw.draw_date,
      actual: targetDraw.numbers,
      predicted: finalPicks,
      matches,
      accuracy,
      method: 'Non-Repeating Pattern Model'
    });
  }
  
  const avgMatches = predictions.reduce((sum, p) => sum + p.matches, 0) / predictions.length;
  const overallAccuracy = predictions.reduce((sum, p) => sum + p.accuracy, 0) / predictions.length;
  const bestDraw = predictions.reduce((best, p) => p.matches > best.matches ? p : best, predictions[0]);
  const worstDraw = predictions.reduce((worst, p) => p.matches < worst.matches ? p : worst, predictions[0]);
  
  console.log(`Backtest completed: ${predictions.length} predictions generated from ${data.length} total draws`);
  
  return {
    predictions,
    overallAccuracy,
    avgMatches,
    bestDraw,
    worstDraw,
    totalDraws: data.length,
    drawsTested: predictions.length
  };
};

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    let tableName = '';
    switch (type) {
      case 'supreme-toto-6-58':
        tableName = 'supreme_toto_6_58';
        break;
      default:
        tableName = 'supreme_toto_6_58';
    }
    
    let allData: any[] = [];
    let page = 0;
    let hasMore = true;
    const pageSize = 1000;
    
    while (hasMore) {
      const { data: pageData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('draw_date', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (pageData && pageData.length > 0) {
        allData = [...allData, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Fetched ${allData.length} draws for analysis`);
    
    const analysis = analyzeData(allData);
    const backtest = allData.length > 20 ? runBacktest(allData, 58, 6) : null;
    
    return NextResponse.json({ 
      analysis,
      backtest,
      dataCount: allData.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
