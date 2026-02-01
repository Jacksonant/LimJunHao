'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CountUp } from 'countup.js';
import Cursor from '../components/Cursor';

interface DrawData {
  draw_date: string;
  numbers: number[];
  special: number;
}

interface DrawPrediction {
  draw_date: string;
  actual: number[];
  predicted: number[];
  matches: number;
  accuracy: number;
  method: string;
}

interface BacktestResult {
  predictions: DrawPrediction[];
  overallAccuracy: number;
  avgMatches: number;
  bestDraw: DrawPrediction;
  worstDraw: DrawPrediction;
}

interface AnalysisResult {
  frequency: { [key: number]: number };
  hotNumbers: number[];
  coldNumbers: number[];
  evenOddRatio: { even: number; odd: number };
  rangeDistribution: { [key: string]: number };
  consecutivePairs: { [key: string]: number };
  sumAverage: number;
  gapAnalysis: { [key: number]: number[] };
}

interface AnimatedNumberProps {
  start: number;
  end: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ start, end, decimals = 0, duration = 0.8, suffix = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      const countUp = new CountUp(ref.current, end, {
        startVal: start,
        decimalPlaces: decimals,
        duration,
        suffix
      });
      countUp.start();
    }
  }, [end, start, decimals, duration, suffix]);

  return <span ref={ref}>{start}</span>;
};

const LOTTERY_TYPES = [
  { id: 'supreme-toto-6-58', name: 'Supreme Toto 6/58', range: 58, picks: 6 },
];



export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState('supreme-toto-6-58');
  const [data, setData] = useState<DrawData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);
  const [exactPositionMatch, setExactPositionMatch] = useState(true);

  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevAnalysisRef = useRef<AnalysisResult | null>(null);
  const prevBacktestRef = useRef<BacktestResult | null>(null);

  // Memoize expensive computations
  const similarDrawsData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((draw, idx) => {
      const sorted1 = [...draw.numbers].sort((a, b) => a - b);
      const similarDraws = data.filter((d, i) => {
        if (i === idx) return false;
        const sorted2 = [...d.numbers].sort((a, b) => a - b);
        if (exactPositionMatch) {
          let posMatches = 0;
          for (let j = 0; j < sorted1.length; j++) {
            if (sorted1[j] === sorted2[j]) posMatches++;
          }
          return posMatches >= 4;
        } else {
          const matches = draw.numbers.filter(n => d.numbers.includes(n)).length;
          return matches >= 4;
        }
      });
      
      return similarDraws.length > 0 ? { draw, sorted1, similarDraws } : null;
    }).filter(Boolean);
  }, [data, exactPositionMatch]);

  const fetchPage = async (page: number) => {
    const res = await fetch(`/api/lottery?type=${activeTab}&page=${page}`);
    return res.json();
  };

  const loadAndAnalyze = async () => {
    setLoading(false); // Show empty cards immediately
    setData([]);
    setAnalysis(null);
    setBacktestResult(null);
    
    // Step 1: Fetch first page of data
    const result = await fetchPage(0);
    if (result.data && result.data.length > 0) {
      setData(result.data);
      setTotalCount(result.count);
      const hasMore = result.hasMore;
      
      // Step 2: Run analytics on first batch
      fetch('/api/lottery-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab })
      })
        .then(res => res.json())
        .then(analyticsResult => {
          if (analyticsResult.analysis) {
            setAnalysis(analyticsResult.analysis);
            prevAnalysisRef.current = analyticsResult.analysis;
          }
          if (analyticsResult.backtest) {
            setBacktestResult(analyticsResult.backtest);
            prevBacktestRef.current = analyticsResult.backtest;
          }
          
          // Step 3: Start loading more data after analytics complete
          if (hasMore) {
            loadNextPage(1, result.data);
          }
        });
    }
  };

  const loadNextPage = async (page: number, currentData: DrawData[]) => {
    setIsLoadingMore(true);
    
    // Fetch next page
    const result = await fetchPage(page);
    
    if (result.data && result.data.length > 0) {
      const newData = [...currentData, ...result.data];
      setData(newData);
      
      // Run analytics on updated dataset
      await fetch('/api/lottery-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab })
      })
        .then(res => res.json())
        .then(analyticsResult => {
          if (analyticsResult.analysis) {
            prevAnalysisRef.current = analysis;
            setAnalysis(analyticsResult.analysis);
          }
          if (analyticsResult.backtest) {
            prevBacktestRef.current = backtestResult;
            setBacktestResult(analyticsResult.backtest);
          }
        });
      
      // Continue loading if more data exists
      if (result.hasMore) {
        setTimeout(() => loadNextPage(page + 1, newData), 100);
      } else {
        setIsLoadingMore(false);
      }
    } else {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadAndAnalyze();
  }, [activeTab]);

  if (loading) {
    return (
      <>
        <Cursor />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' }}>
          <div style={{ color: '#fff', fontSize: '20px' }}>Initializing...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Cursor />
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
            Lottery Analysis & Predictions
            {isLoadingMore && (
              <span style={{ fontSize: '16px', color: '#3b82f6', marginLeft: '16px' }}>
                Loading more data... ({data.length}/{totalCount})
              </span>
            )}
          </h1>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '2px solid #374151' }}>
            {LOTTERY_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: activeTab === type.id ? '#3b82f6' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === type.id ? 'bold' : 'normal'
                }}
              >
                {type.name}
              </button>
            ))}
          </div>

          {data.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>
              Loading data...
            </div>
          ) : (
            <>
              {/* Empty card placeholders while analytics load */}
              {!backtestResult && (
                <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
                    Model Performance
                  </h2>
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>
                    Analyzing data...
                  </div>
                </div>
              )}
              
              {backtestResult && (
                <>
                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
                      Model Performance
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Overall Accuracy</div>
                        <div style={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevBacktestRef.current?.overallAccuracy || 0}
                            end={backtestResult.overallAccuracy} 
                            decimals={1} 
                            duration={0.8}
                            suffix="%"
                          />
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Avg Matches</div>
                        <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevBacktestRef.current?.avgMatches || 0}
                            end={backtestResult.avgMatches} 
                            decimals={2} 
                            duration={0.8}
                          /> / 6
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Draws Tested</div>
                        <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevBacktestRef.current?.predictions.length || 0}
                            end={backtestResult.predictions.length} 
                            duration={0.8}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                        Prediction Results ({backtestResult.predictions.length} draws)
                      </h2>
                      <button
                        onClick={() => setShowAllResults(!showAllResults)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {showAllResults ? 'Show Less' : 'Show All Results'}
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #374151' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#9ca3af' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#9ca3af' }}>Predicted</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#9ca3af' }}>Actual</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>Matches</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllResults ? backtestResult.predictions : backtestResult.predictions.slice(0, 20)).map((pred, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                              <td style={{ padding: '12px', color: '#d1d5db' }}>{pred.draw_date}</td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {pred.predicted.map(num => (
                                    <span key={num} style={{
                                      width: '28px',
                                      height: '28px',
                                      backgroundColor: pred.actual.includes(num) ? '#10b981' : '#3b82f6',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      fontSize: '12px'
                                    }}>
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {pred.actual.map(num => (
                                    <span key={num} style={{
                                      width: '28px',
                                      height: '28px',
                                      backgroundColor: '#6366f1',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      fontSize: '12px'
                                    }}>
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{
                                  color: pred.matches >= 3 ? '#10b981' : '#9ca3af',
                                  fontWeight: 'bold'
                                }}>
                                  {pred.matches} / 6
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{
                                  color: pred.accuracy >= 50 ? '#10b981' : pred.accuracy >= 33 ? '#f59e0b' : '#9ca3af',
                                  fontWeight: 'bold'
                                }}>
                                  {pred.accuracy.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {analysis && (
                <>
                  {/* All Even/Odd Draws Section */}
                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Special Patterns</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>All Even Draws</h3>
                          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                            {data.filter(d => d.numbers.every(n => n % 2 === 0)).length}
                          </span>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {data.filter(d => d.numbers.every(n => n % 2 === 0)).length === 0 ? (
                            <div style={{ color: '#9ca3af', fontSize: '14px' }}>No all-even draws found</div>
                          ) : (
                            data.filter(d => d.numbers.every(n => n % 2 === 0)).map((draw, idx) => (
                              <div key={idx} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#1f2937', borderRadius: '6px' }}>
                                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{draw.draw_date}</div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {draw.numbers.map(num => (
                                    <span key={num} style={{
                                      width: '24px',
                                      height: '24px',
                                      backgroundColor: '#10b981',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>{num}</span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>All Odd Draws</h3>
                          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                            {data.filter(d => d.numbers.every(n => n % 2 !== 0)).length}
                          </span>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {data.filter(d => d.numbers.every(n => n % 2 !== 0)).length === 0 ? (
                            <div style={{ color: '#9ca3af', fontSize: '14px' }}>No all-odd draws found</div>
                          ) : (
                            data.filter(d => d.numbers.every(n => n % 2 !== 0)).map((draw, idx) => (
                              <div key={idx} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#1f2937', borderRadius: '6px' }}>
                                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{draw.draw_date}</div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {draw.numbers.map(num => (
                                    <span key={num} style={{
                                      width: '24px',
                                      height: '24px',
                                      backgroundColor: '#f59e0b',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>{num}</span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Similar Draws Section */}
                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>Similar Draw Patterns</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#9ca3af', fontSize: '14px' }}>Any Position</span>
                          <label style={{ 
                            position: 'relative', 
                            display: 'inline-block', 
                            width: '48px', 
                            height: '24px',
                            cursor: 'pointer'
                          }}>
                            <input 
                              type="checkbox" 
                              checked={exactPositionMatch}
                              onChange={() => setExactPositionMatch(!exactPositionMatch)}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: exactPositionMatch ? '#10b981' : '#374151',
                              borderRadius: '24px',
                              transition: 'background-color 0.3s'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: exactPositionMatch ? '27px' : '3px',
                                bottom: '3px',
                                backgroundColor: '#fff',
                                borderRadius: '50%',
                                transition: 'left 0.3s'
                              }} />
                            </span>
                          </label>
                          <span style={{ color: '#9ca3af', fontSize: '14px' }}>Exact Position</span>
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                          {similarDrawsData.length}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>
                      {exactPositionMatch ? 'Draws with 4+ numbers in exact same positions' : 'Draws with 4+ matching numbers'}
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {similarDrawsData.slice(0, 50).map((item: any, idx) => {
                        if (!item) return null;
                        const { draw, sorted1, similarDraws } = item;
                        const mostSimilar = similarDraws[0];
                        const sortedMostSimilar = [...mostSimilar.numbers].sort((a, b) => a - b);
                        
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              marginBottom: '12px', 
                              padding: '12px', 
                              backgroundColor: '#374151', 
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ color: '#d1d5db', fontSize: '14px', fontWeight: 'bold' }}>{draw.draw_date}</div>
                              <div style={{ color: '#fbbf24', fontSize: '12px' }}>{similarDraws.length} similar draw(s)</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              {sorted1.map((num, pos) => {
                                const isMatch = exactPositionMatch 
                                  ? sortedMostSimilar[pos] === num
                                  : mostSimilar.numbers.includes(num);
                                return (
                                  <span key={pos} style={{
                                    width: '28px',
                                    height: '28px',
                                    backgroundColor: isMatch ? '#10b981' : '#3b82f6',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>{num}</span>
                                );
                              })}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#d1d5db',
                              padding: '8px',
                              backgroundColor: '#1f2937',
                              borderRadius: '6px',
                              marginTop: '8px'
                            }}>
                              <div style={{ color: '#fbbf24', marginBottom: '4px' }}>Most Similar: {mostSimilar.draw_date}</div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {sortedMostSimilar.map((num, pos) => {
                                  const isMatch = exactPositionMatch
                                    ? sorted1[pos] === num
                                    : draw.numbers.includes(num);
                                  return (
                                    <span key={pos} style={{
                                      width: '24px',
                                      height: '24px',
                                      backgroundColor: isMatch ? '#10b981' : '#6366f1',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>{num}</span>
                                  );
                                })}
                              </div>
                              <div style={{ marginTop: '4px', color: '#9ca3af' }}>
                                {exactPositionMatch
                                  ? (() => {
                                      let posMatches = 0;
                                      for (let j = 0; j < sorted1.length; j++) {
                                        if (sorted1[j] === sortedMostSimilar[j]) posMatches++;
                                      }
                                      return `${posMatches} exact position matches`;
                                    })()
                                  : `${draw.numbers.filter(n => mostSimilar.numbers.includes(n)).length} matching numbers`
                                }
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {similarDrawsData.length > 50 && (
                        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '16px' }}>
                          Showing 50 of {similarDrawsData.length} similar draws
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Hot & Cold Numbers</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Hot Numbers</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {analysis.hotNumbers.map(num => (
                            <div key={num} style={{ textAlign: 'center' }}>
                              <div style={{ 
                                width: '48px', 
                                height: '48px', 
                                backgroundColor: '#ef4444', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#fff', 
                                fontWeight: 'bold',
                                fontSize: '18px',
                                marginBottom: '4px'
                              }}>
                                {num}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{analysis.frequency[num]}x</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Cold Numbers</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {analysis.coldNumbers.map(num => (
                            <div key={num} style={{ textAlign: 'center' }}>
                              <div style={{ 
                                width: '48px', 
                                height: '48px', 
                                backgroundColor: '#3b82f6', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#fff', 
                                fontWeight: 'bold',
                                fontSize: '18px',
                                marginBottom: '4px'
                              }}>
                                {num}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{analysis.frequency[num]}x</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Range Distribution</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                      {Object.entries(analysis.rangeDistribution).map(([range, count]) => {
                        const prevCount = prevAnalysisRef.current?.rangeDistribution[range] || 0;
                        return (
                          <div key={range} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                              <AnimatedNumber start={prevCount} end={count} duration={0.8} />
                            </div>
                            <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>{range}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
                      Statistical Analysis
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Even/Odd Ratio</div>
                        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevAnalysisRef.current?.evenOddRatio.even || 0}
                            end={analysis.evenOddRatio.even} 
                            duration={0.8}
                          /> : <AnimatedNumber 
                            start={prevAnalysisRef.current?.evenOddRatio.odd || 0}
                            end={analysis.evenOddRatio.odd} 
                            duration={0.8}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Average Sum</div>
                        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevAnalysisRef.current?.sumAverage || 0}
                            end={analysis.sumAverage} 
                            duration={0.8}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Draws</div>
                        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                          <AnimatedNumber 
                            start={prevAnalysisRef.current ? data.length - 1000 : 0}
                            end={data.length} 
                            duration={0.8}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
