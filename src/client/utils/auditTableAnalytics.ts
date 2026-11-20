export interface AnalyticsTableResult {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  stats: Array<{ label: string; value: string }>;
}

export function parseMonetaryNumber(raw: string): number {
  if (!raw) return NaN;
  const cleaned = raw
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

export function runAuditSampling(method: 'random' | 'systematic' | 'monetary' | 'stratified' | 'fixed' | 'with_replacement', headers: string[], rows: string[][], params: { sampleSize?: number; interval?: number; startOffset?: number; amountColIndex?: number; strataColIndex?: number }): AnalyticsTableResult {
  const popSize = rows.length;
  if (popSize === 0) {
    return {
      title: 'Échantillonnage impossible',
      headers: [],
      rows: [],
      stats: [{ label: 'Population', value: '0' }],
    };
  }

  let selectedIndices: number[] = [];

  if (method === 'random') {
    const size = Math.min(Math.max(1, params.sampleSize || 10), popSize);
    const pool = rows.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    selectedIndices = pool.slice(0, size).sort((a, b) => a - b);
  } else if (method === 'with_replacement') {
    const size = Math.max(1, params.sampleSize || 10);
    for (let i = 0; i < size; i += 1) {
      selectedIndices.push(Math.floor(Math.random() * popSize));
    }
  } else if (method === 'systematic') {
    const interval = Math.max(1, params.interval || Math.max(1, Math.floor(popSize / 10)));
    const start = Math.max(0, Math.min(popSize - 1, (params.startOffset || 1) - 1));
    for (let i = start; i < popSize; i += interval) {
      selectedIndices.push(i);
    }
  } else if (method === 'fixed') {
    const size = Math.min(Math.max(1, params.sampleSize || 10), popSize);
    const start = Math.max(0, Math.min(popSize - 1, (params.startOffset || 1) - 1));
    for (let i = start; i < Math.min(popSize, start + size); i += 1) {
      selectedIndices.push(i);
    }
  } else if (method === 'monetary') {
    const colIdx = params.amountColIndex ?? 0;
    const size = Math.min(Math.max(1, params.sampleSize || 10), popSize);
    const weights = rows.map((r) => Math.max(0, Math.abs(parseMonetaryNumber(r[colIdx] || '')) || 0));
    const total = weights.reduce((acc, w) => acc + w, 0);
    if (total <= 0) {
      selectedIndices = rows.slice(0, size).map((_, i) => i);
    } else {
      const step = total / size;
      let cursor = Math.random() * step;
      let cum = 0;
      const picked = new Set<number>();
      for (let i = 0; i < popSize && picked.size < size; i += 1) {
        cum += weights[i];
        while (cursor <= cum && picked.size < size) {
          picked.add(i);
          cursor += step;
        }
      }
      selectedIndices = Array.from(picked).sort((a, b) => a - b);
    }
  } else if (method === 'stratified') {
    const strataIdx = params.strataColIndex ?? 0;
    const size = Math.min(Math.max(1, params.sampleSize || 10), popSize);
    const buckets = new Map<string, number[]>();
    rows.forEach((r, idx) => {
      const key = (r[strataIdx] || '(Vide)').trim() || '(Vide)';
      const list = buckets.get(key) || [];
      list.push(idx);
      buckets.set(key, list);
    });
    const picked: number[] = [];
    for (const [, indices] of buckets) {
      const quota = Math.max(1, Math.round((indices.length / popSize) * size));
      const shuffled = [...indices].sort(() => Math.random() - 0.5);
      picked.push(...shuffled.slice(0, Math.min(quota, indices.length)));
    }
    selectedIndices = picked.slice(0, size).sort((a, b) => a - b);
  }

  const sampledRows = selectedIndices.map((idx) => [String(idx + 1), ...rows[idx]]);
  const rate = ((sampledRows.length / popSize) * 100).toFixed(1);

  return {
    title: `Échantillonnage Audit (${method.toUpperCase()})`,
    headers: ['Ligne #', ...headers],
    rows: sampledRows,
    stats: [
      { label: 'Population', value: String(popSize) },
      { label: 'Échantillon', value: String(sampledRows.length) },
      { label: 'Taux', value: `${rate}%` },
    ],
  };
}

export function computeRecommendedSampleSize(populationSize: number, confidenceLevel: number, tolerableError: number, expectedError = 0.01): { sampleSize: number; zScore: number } {
  const zMap: Record<string, number> = {
    '0.9': 1.645,
    '0.95': 1.96,
    '0.99': 2.576,
  };
  const z = zMap[String(confidenceLevel)] || 1.96;
  const p = expectedError;
  const n0 = (z * z * p * (1 - p)) / (tolerableError * tolerableError);
  const adjusted = Math.ceil(n0 / (1 + (n0 - 1) / Math.max(1, populationSize)));
  return {
    sampleSize: Math.min(populationSize, Math.max(1, adjusted)),
    zScore: z,
  };
}

export function runFraudAnalysis(method: 'duplicates' | 'gaps' | 'benford' | 'threshold' | 'weekend' | 'round_amounts' | 'outliers' | 'period_changes', headers: string[], rows: string[][], params: { colIndexes?: number[]; colIndex?: number; dateColIndex?: number; threshold?: number; zThreshold?: number }): AnalyticsTableResult {
  if (method === 'duplicates') {
    const idxs = params.colIndexes && params.colIndexes.length > 0 ? params.colIndexes : headers.map((_, i) => i);
    const seen = new Map<string, number[]>();
    rows.forEach((r, rowIdx) => {
      const key = idxs.map((c) => (r[c] || '').trim().toLowerCase()).join(' | ');
      const list = seen.get(key) || [];
      list.push(rowIdx + 1);
      seen.set(key, list);
    });
    const dupRows: string[][] = [];
    for (const [key, lineNums] of seen) {
      if (lineNums.length > 1) {
        dupRows.push([key, String(lineNums.length), lineNums.join(', ')]);
      }
    }
    return {
      title: 'Détection de Doublons',
      headers: ['Clé dupliquée', 'Occurrences', 'Lignes'],
      rows: dupRows,
      stats: [
        { label: 'Lignes analysées', value: String(rows.length) },
        { label: 'Groupes en doublon', value: String(dupRows.length) },
      ],
    };
  }

  if (method === 'gaps') {
    const col = params.colIndex ?? 0;
    const nums = rows
      .map((r) => {
        const m = (r[col] || '').match(/\d+/g);
        return m ? parseInt(m[m.length - 1], 10) : NaN;
      })
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
    const gaps: string[][] = [];
    for (let i = 1; i < nums.length; i += 1) {
      const diff = nums[i] - nums[i - 1];
      if (diff > 1) {
        gaps.push([String(nums[i - 1]), String(nums[i]), String(diff - 1)]);
      }
    }
    return {
      title: `Trous de séquence (${headers[col] || 'Colonne'})`,
      headers: ['De', 'À', 'Manquants'],
      rows: gaps.slice(0, 100),
      stats: [
        { label: 'Numéros analysés', value: String(nums.length) },
        { label: 'Ruptures détectées', value: String(gaps.length) },
      ],
    };
  }

  if (method === 'benford') {
    const col = params.colIndex ?? 0;
    const counts = new Array(10).fill(0) as number[];
    let valid = 0;
    rows.forEach((r) => {
      const n = Math.abs(parseMonetaryNumber(r[col] || ''));
      if (!isNaN(n) && n > 0) {
        const firstDigit = parseInt(String(n).replace(/^0+\.?0*/, '')[0] || '', 10);
        if (firstDigit >= 1 && firstDigit <= 9) {
          counts[firstDigit] += 1;
          valid += 1;
        }
      }
    });
    const outRows: string[][] = [];
    for (let d = 1; d <= 9; d += 1) {
      const expected = Math.log10(1 + 1 / d) * 100;
      const observed = valid > 0 ? (counts[d] / valid) * 100 : 0;
      const delta = observed - expected;
      const flag = Math.abs(delta) > 5 ? '⚠️ Écart' : 'OK';
      outRows.push([String(d), String(counts[d]), `${observed.toFixed(1)}%`, `${expected.toFixed(1)}%`, `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`, flag]);
    }
    return {
      title: `Loi de Benford (${headers[col] || 'Montant'})`,
      headers: ['1er Chiffre', 'Effectif', 'Observé', 'Benford', 'Écart', 'Statut'],
      rows: outRows,
      stats: [{ label: 'Montants valides', value: String(valid) }],
    };
  }

  if (method === 'threshold') {
    const col = params.colIndex ?? 0;
    const threshold = params.threshold ?? 10000;
    const lower = threshold * 0.8;
    const matched = rows
      .map((r, i) => ({ row: r, idx: i + 1, val: Math.abs(parseMonetaryNumber(r[col] || '')) }))
      .filter((x) => !isNaN(x.val) && x.val >= lower && x.val < threshold)
      .map((x) => [String(x.idx), ...x.row, '⚠️ Sous seuil']);
    return {
      title: `Transactions suspectes sous seuil (${lower.toLocaleString('fr-FR')} – ${threshold.toLocaleString('fr-FR')})`,
      headers: ['Ligne #', ...headers, 'Alerte'],
      rows: matched,
      stats: [
        { label: 'Seuil', value: threshold.toLocaleString('fr-FR') },
        { label: 'Suspects', value: String(matched.length) },
      ],
    };
  }

  if (method === 'weekend') {
    const col = params.dateColIndex ?? params.colIndex ?? 0;
    const matched: string[][] = [];
    rows.forEach((r, idx) => {
      const raw = (r[col] || '').trim();
      let d: Date | null = null;
      const fr = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (fr) d = new Date(parseInt(fr[3], 10), parseInt(fr[2], 10) - 1, parseInt(fr[1], 10));
      else {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
      if (d && (d.getDay() === 0 || d.getDay() === 6)) {
        matched.push([String(idx + 1), ...r, d.getDay() === 0 ? 'Dimanche' : 'Samedi']);
      }
    });
    return {
      title: `Transactions Week-end (${headers[col] || 'Date'})`,
      headers: ['Ligne #', ...headers, 'Jour'],
      rows: matched,
      stats: [
        { label: 'Lignes analysées', value: String(rows.length) },
        { label: 'Week-end', value: String(matched.length) },
      ],
    };
  }

  if (method === 'round_amounts') {
    const col = params.colIndex ?? 0;
    const matched = rows
      .map((r, idx) => ({ row: r, idx: idx + 1, val: Math.abs(parseMonetaryNumber(r[col] || '')) }))
      .filter((x) => !isNaN(x.val) && x.val >= 100 && x.val % 100 === 0)
      .map((x) => [String(x.idx), ...x.row, 'Montant rond']);
    return {
      title: `Montants ronds (${headers[col] || 'Montant'})`,
      headers: ['Ligne #', ...headers, 'Type'],
      rows: matched,
      stats: [{ label: 'Montants ronds', value: String(matched.length) }],
    };
  }

  if (method === 'outliers') {
    const col = params.colIndex ?? 0;
    const zMax = params.zThreshold ?? 3.0;
    const values = rows.map((r, i) => ({ idx: i + 1, row: r, val: parseMonetaryNumber(r[col] || '') })).filter((x) => !isNaN(x.val));
    const mean = values.reduce((a, b) => a + b.val, 0) / Math.max(1, values.length);
    const std = Math.sqrt(values.reduce((a, b) => a + (b.val - mean) ** 2, 0) / Math.max(1, values.length));
    const outliers = values
      .map((v) => ({ ...v, z: std > 0 ? Math.abs((v.val - mean) / std) : 0 }))
      .filter((v) => v.z >= zMax)
      .map((v) => [String(v.idx), ...v.row, v.z.toFixed(2)]);
    return {
      title: `Valeurs aberrantes (|Z| ≥ ${zMax})`,
      headers: ['Ligne #', ...headers, 'Z-score'],
      rows: outliers,
      stats: [
        { label: 'Moyenne', value: mean.toFixed(2) },
        { label: 'Écart-type', value: std.toFixed(2) },
        { label: 'Aberrants', value: String(outliers.length) },
      ],
    };
  }

  // period_changes
  const col = params.colIndex ?? 0;
  const values = rows.map((r, i) => ({ idx: i + 1, row: r, val: parseMonetaryNumber(r[col] || '') })).filter((x) => !isNaN(x.val));
  const jumps: string[][] = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1].val;
    const curr = values[i].val;
    if (prev !== 0) {
      const pct = ((curr - prev) / Math.abs(prev)) * 100;
      if (Math.abs(pct) >= 50) {
        jumps.push([String(values[i].idx), ...values[i].row, `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`]);
      }
    }
  }
  return {
    title: `Changements brutaux ≥ 50% (${headers[col] || 'Montant'})`,
    headers: ['Ligne #', ...headers, 'Variation'],
    rows: jumps,
    stats: [{ label: 'Variations détectées', value: String(jumps.length) }],
  };
}
