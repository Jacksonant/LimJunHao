'use client';

import React, { useEffect, useMemo, useState } from 'react';

type OCRLine = {
  text: string;
  confidence: number;
  box: number[][];
};

type OCRResponse = {
  jobId?: string;
  status?: 'queued' | 'running' | 'done' | 'error';
  logs: string[];
  analysis: {
    lineCount: number;
    avgConfidence: number;
    highConfidenceLines: number;
    mediumConfidenceLines: number;
    lowConfidenceLines: number;
  };
  result: {
    text: string;
    lines: OCRLine[];
  };
  error?: string;
};

type PositionedLine = {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeLines = (lines: OCRLine[] = []): PositionedLine[] => {
  const out: PositionedLine[] = [];
  for (const line of lines) {
    if (!line?.text) continue;
    const points = Array.isArray(line.box) ? line.box : [];
    const xs = points.map((p) => Number(Array.isArray(p) ? p[0] : 0)).filter((n) => Number.isFinite(n));
    const ys = points.map((p) => Number(Array.isArray(p) ? p[1] : 0)).filter((n) => Number.isFinite(n));
    if (xs.length === 0 || ys.length === 0) continue;
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    out.push({
      text: line.text,
      left,
      right,
      top,
      bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    });
  }
  return out.sort((a, b) => (a.top - b.top) || (a.left - b.left));
};

const groupRows = (lines: PositionedLine[]): PositionedLine[][] => {
  if (lines.length === 0) return [];
  const avgHeight = lines.reduce((s, l) => s + l.height, 0) / lines.length;
  const yThreshold = Math.max(8, avgHeight * 0.6);
  const rows: PositionedLine[][] = [];
  for (const line of lines) {
    const row = rows[rows.length - 1];
    if (!row) {
      rows.push([line]);
      continue;
    }
    const rowCenter = row.reduce((s, r) => s + (r.top + r.bottom) / 2, 0) / row.length;
    const lineCenter = (line.top + line.bottom) / 2;
    if (Math.abs(lineCenter - rowCenter) <= yThreshold) row.push(line);
    else rows.push([line]);
  }
  for (const row of rows) row.sort((a, b) => a.left - b.left);
  return rows;
};

const buildLayoutText = (rows: PositionedLine[][]): string => {
  const all = rows.flat();
  if (all.length === 0) return '';
  const minLeft = Math.min(...all.map((l) => l.left));
  const avgHeight = all.reduce((s, l) => s + l.height, 0) / all.length;
  const charWidth = Math.max(4, avgHeight * 0.55);
  const lines: string[] = [];
  for (const row of rows) {
    let cursorCol = 0;
    let rowText = '';
    for (const item of row) {
      const desiredCol = Math.max(0, Math.round((item.left - minLeft) / charWidth));
      const spaces = Math.max(1, desiredCol - cursorCol);
      rowText += ' '.repeat(spaces) + item.text;
      cursorCol = desiredCol + item.text.length;
    }
    lines.push(rowText.trimEnd());
  }
  return lines.join('\n');
};

const buildLayoutHtml = (lines: PositionedLine[]): string => {
  if (lines.length === 0) {
    return '<div style="font-family:monospace;white-space:pre;">No OCR lines</div>';
  }
  const minLeft = Math.min(...lines.map((l) => l.left));
  const minTop = Math.min(...lines.map((l) => l.top));
  const maxRight = Math.max(...lines.map((l) => l.right));
  const maxBottom = Math.max(...lines.map((l) => l.bottom));
  const width = Math.max(1, Math.ceil(maxRight - minLeft + 8));
  const height = Math.max(1, Math.ceil(maxBottom - minTop + 8));

  const children = lines
    .map((l) => {
      const left = Math.round(l.left - minLeft);
      const top = Math.round(l.top - minTop);
      const fontSize = Math.max(10, Math.round(l.height * 0.8));
      return `<div style="position:absolute;left:${left}px;top:${top}px;font-size:${fontSize}px;line-height:1;font-family:Arial,sans-serif;white-space:nowrap;">${escapeHtml(l.text)}</div>`;
    })
    .join('');

  return `<div style="position:relative;width:${width}px;height:${height}px;background:#fff;color:#111;overflow:auto;border:1px solid #ddd;">${children}</div>`;
};

const buildTableHeuristicHtml = (rows: PositionedLine[][]): string => {
  if (rows.length < 2) return '';
  const flat = rows.flat();
  if (flat.length === 0) return '';

  const avgWidth = flat.reduce((s, x) => s + x.width, 0) / flat.length;
  const tolerance = Math.max(12, avgWidth * 0.6);
  const anchors: number[] = [];

  for (const row of rows) {
    for (const cell of row) {
      const nearest = anchors.findIndex((a) => Math.abs(a - cell.left) <= tolerance);
      if (nearest >= 0) {
        anchors[nearest] = (anchors[nearest] + cell.left) / 2;
      } else {
        anchors.push(cell.left);
      }
    }
  }
  anchors.sort((a, b) => a - b);
  if (anchors.length < 2) return '';

  const rowCells: string[][] = rows.map(() => new Array(anchors.length).fill(''));
  let filledCount = 0;
  for (let r = 0; r < rows.length; r++) {
    for (const cell of rows[r]) {
      let bestCol = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let c = 0; c < anchors.length; c++) {
        const dist = Math.abs(cell.left - anchors[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCol = c;
        }
      }
      if (bestDist <= tolerance * 1.4) {
        rowCells[r][bestCol] = rowCells[r][bestCol]
          ? `${rowCells[r][bestCol]} ${cell.text}`
          : cell.text;
        filledCount++;
      }
    }
  }

  const density = filledCount / (rows.length * anchors.length);
  if (density < 0.35) return '';

  const trs = rowCells
    .map((cells) => `<tr>${cells.map((x) => `<td>${escapeHtml(x)}</td>`).join('')}</tr>`)
    .join('');
  return `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;background:#fff;color:#111;">${trs}</table>`;
};

export default function OCRPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<OCRResponse | null>(null);
  const [jobId, setJobId] = useState<string>('');
  const [copied, setCopied] = useState('');

  const previewUrl = useMemo(() => {
    if (!selectedFile) return '';
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const layout = useMemo(() => {
    const normalized = normalizeLines(data?.result?.lines || []);
    const rows = groupRows(normalized);
    return {
      normalized,
      rows,
      plainText: buildLayoutText(rows),
      html: buildLayoutHtml(normalized),
      tableHtml: buildTableHeuristicHtml(rows),
    };
  }, [data?.result?.lines]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied(`Failed to copy ${label}`);
      setTimeout(() => setCopied(''), 1500);
    }
  };

  useEffect(() => {
    document.body.classList.add('show-native-cursor');
    return () => {
      document.body.classList.remove('show-native-cursor');
    };
  }, []);

  const runOCR = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setData({
      status: 'queued',
      logs: ['job:queued'],
      analysis: {
        lineCount: 0,
        avgConfidence: 0,
        highConfidenceLines: 0,
        mediumConfidenceLines: 0,
        lowConfidenceLines: 0,
      },
      result: {
        text: '',
        lines: [],
      },
    });
    setJobId('');

    try {
      const image_base64 = await toBase64(selectedFile);
      const startRes = await fetch('/api/ocr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64, lang }),
      });

      const startJson = await startRes.json();

      if (!startRes.ok || !startJson?.jobId) {
        const message = startJson?.detail || startJson?.error || `OCR request failed (${startRes.status})`;
        throw new Error(message);
      }

      const newJobId = String(startJson.jobId);
      setJobId(newJobId);
      setData((prev) => ({
        logs: prev?.logs || [],
        analysis: prev?.analysis || {
          lineCount: 0,
          avgConfidence: 0,
          highConfidenceLines: 0,
          mediumConfidenceLines: 0,
          lowConfidenceLines: 0,
        },
        result: prev?.result || { text: '', lines: [] },
        jobId: newJobId,
        status: startJson?.status || 'queued',
      }));
    } catch (e: any) {
      setError(e?.message || 'Unexpected OCR error');
      setData(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let consecutiveErrors = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ocr/status?jobId=${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || `Status request failed (${res.status})`);
        }

        if (cancelled) return;
        consecutiveErrors = 0;
        setData(json);

        if (json?.status === 'done' || json?.status === 'error') {
          setLoading(false);
          return;
        }
      } catch (e: any) {
        if (cancelled) return;
        consecutiveErrors += 1;
        const msg = e?.message || 'Failed to poll OCR status';

        setData((prev) => ({
          ...(prev || {
            analysis: {
              lineCount: 0,
              avgConfidence: 0,
              highConfidenceLines: 0,
              mediumConfidenceLines: 0,
              lowConfidenceLines: 0,
            },
            result: { text: '', lines: [] },
          }),
          logs: [...(prev?.logs || []), `status:retry_${consecutiveErrors}:${msg}`],
        }));

        if (consecutiveErrors >= 12) {
          setError(`Polling failed repeatedly: ${msg}`);
          setLoading(false);
          return;
        }
      }
      timer = setTimeout(poll, 700);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: '#e2e8f0',
        padding: '24px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>PaddleOCR Pipeline</h1>
        <p style={{ margin: '0 0 20px 0', color: '#94a3b8' }}>
          Upload an image, run OCR, then inspect pipeline logs, analysis, and extracted text.
        </p>

        <section
          style={{
            border: '1px solid #334155',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            background: '#111827',
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ color: '#cbd5e1' }}
            />

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                background: '#1f2937',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              <option value="en">English (en)</option>
              <option value="ch">Chinese (ch)</option>
              <option value="japan">Japanese (japan)</option>
              <option value="korean">Korean (korean)</option>
            </select>

            <button
              onClick={runOCR}
              disabled={loading || !selectedFile}
              style={{
                background: loading ? '#1e293b' : '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              {loading ? 'Running OCR...' : 'Run OCR'}
            </button>
          </div>

          {previewUrl && (
            <div style={{ marginTop: 14 }}>
              <img
                src={previewUrl}
                alt="Selected"
                style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, border: '1px solid #334155' }}
              />
            </div>
          )}

          {error && (
            <p style={{ marginTop: 12, color: '#fca5a5' }}>
              {error}
            </p>
          )}
        </section>

        <section
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 14, background: '#111827' }}>
            <h2 style={{ marginTop: 0 }}>Pipeline Logs</h2>
            <pre
              style={{
                margin: 0,
                background: '#020617',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 10,
                minHeight: 220,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                overflowY: "auto"
              }}
            >
              {(data?.logs || ['No run yet.']).join('\n')}
            </pre>
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 14, background: '#111827' }}>
            <h2 style={{ marginTop: 0 }}>Analysis</h2>
            <pre
              style={{
                margin: 0,
                background: '#020617',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 10,
                minHeight: 220,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
              }}
            >
              {JSON.stringify(data?.analysis || { status: 'No analysis yet.' }, null, 2)}
            </pre>
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 14, background: '#111827' }}>
            <h2 style={{ marginTop: 0 }}>Result</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => copyText(layout.plainText || data?.result?.text || '', 'Plain text')}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                Copy Plain
              </button>
              <button
                onClick={() => copyText(layout.html, 'HTML')}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                Copy HTML
              </button>
              <button
                onClick={() => copyText(layout.tableHtml || layout.html, 'Table HTML')}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                Copy Table HTML
              </button>
              {copied && <span style={{ fontSize: 12, color: '#86efac' }}>{copied}</span>}
            </div>
            <textarea
              readOnly
              value={layout.plainText || data?.result?.text || ''}
              placeholder="Layout-preserved text will appear here"
              style={{
                width: '100%',
                minHeight: 150,
                resize: 'vertical',
                background: '#020617',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
              }}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>HTML Layout Preview</div>
              <iframe
                title="OCR HTML Preview"
                srcDoc={layout.html}
                style={{
                  width: '100%',
                  minHeight: 220,
                  border: '1px solid #334155',
                  borderRadius: 8,
                  background: '#fff',
                }}
              />
            </div>
            {layout.tableHtml && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Table Heuristic Preview</div>
                <iframe
                  title="OCR Table Preview"
                  srcDoc={layout.tableHtml}
                  style={{
                    width: '100%',
                    minHeight: 180,
                    border: '1px solid #334155',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
