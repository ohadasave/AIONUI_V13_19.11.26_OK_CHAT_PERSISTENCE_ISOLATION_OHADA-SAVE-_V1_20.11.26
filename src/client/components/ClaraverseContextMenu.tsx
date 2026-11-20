import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-republish';
import { Input, Message, Modal, Select } from '@arco-design/web-react';
import type { SyncTableOptions } from '../hooks/useTablePersistence';
import { computeRecommendedSampleSize, runAuditSampling, runFraudAnalysis } from '../utils/auditTableAnalytics';
import type { AnalyticsTableResult } from '../utils/auditTableAnalytics';
import { extractCellText, extractTableMatrix, findMessageElementForTable, getMessageTables, tableElementToMarkdown } from '../utils/tableMarkdown';

interface ClaraverseContextMenuProps {
  isDark: boolean;
  onSyncTable: (table: HTMLTableElement, options?: SyncTableOptions) => Promise<boolean>;
  onFlushPendingSync: (messageId?: string) => void;
}

interface CopiedTableData {
  headers: string[];
  rows: string[][];
}

interface MenuItemDef {
  text: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}

interface MenuSectionDef {
  id: string;
  title: string;
  icon: string;
  items: MenuItemDef[];
}

interface PromptField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  defaultValue: string;
  options?: Array<{ label: string; value: string }>;
}

interface PromptModalState {
  title: string;
  fields: PromptField[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
}

function isTableInChat(table: HTMLTableElement): boolean {
  if (table.closest('.sample-results-container, .analysis-results-container, #contextual-table-menu-advanced')) {
    return false;
  }
  if (findMessageElementForTable(table)) {
    return true;
  }
  const selectors = ['.eaudit-prose', '[data-eaudit-table="true"]', '.prose', '.markdown-body'];
  return selectors.some((s) => Boolean(table.closest(s)));
}

function parseMonetaryValue(value: string | null | undefined): number {
  if (!value) return NaN;
  const cleaned = value
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const str = value.trim();
  if (/^\d{4}$/.test(str)) {
    return new Date(parseInt(str, 10), 0, 1);
  }
  const frMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frMatch) {
    return new Date(parseInt(frMatch[3], 10), parseInt(frMatch[2], 10) - 1, parseInt(frMatch[1], 10));
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }
  return null;
}

function formatMonetary(value: number): string {
  if (isNaN(value)) return '';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

type RiskLevel = 'Faible' | 'Moyen' | 'Eleve';

const CRITICITY_MATRIX: Record<RiskLevel, Record<RiskLevel, RiskLevel>> = {
  Faible: { Faible: 'Faible', Moyen: 'Faible', Eleve: 'Moyen' },
  Moyen: { Faible: 'Faible', Moyen: 'Moyen', Eleve: 'Eleve' },
  Eleve: { Faible: 'Moyen', Moyen: 'Eleve', Eleve: 'Eleve' },
};

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
  Faible: { bg: '#28a745', text: '#ffffff' },
  Moyen: { bg: '#ffc107', text: '#000000' },
  Eleve: { bg: '#dc3545', text: '#ffffff' },
};

function normalizeRiskValueWithFormat(value: string | null | undefined): { level: RiskLevel; isLetter: boolean } | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const isLetter = v.length === 1;

  if (v === 'f') return { level: 'Faible', isLetter: true };
  if (v === 'm') return { level: 'Moyen', isLetter: true };
  if (v === 'e' || v === 'é' || v === 'h') return { level: 'Eleve', isLetter: true };

  if (['faible', 'low', 'bas'].includes(v) || v.includes('faible') || v.includes('low') || v.includes('bas')) {
    return { level: 'Faible', isLetter: false };
  }
  if (['moyen', 'medium', 'mod', 'modéré'].includes(v) || v.includes('moyen') || v.includes('medium') || v.includes('modéré')) {
    return { level: 'Moyen', isLetter: false };
  }
  if (['eleve', 'élevé', 'elevé', 'high', 'haut'].includes(v) || v.includes('eleve') || v.includes('élevé') || v.includes('elevé') || v.includes('high') || v.includes('haut')) {
    return { level: 'Eleve', isLetter: false };
  }

  return null;
}

function matrixToMarkdown(headers: string[], rows: string[][]): string {
  const esc = (s: string) =>
    (s || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(?<!\\)\|/g, '\\|');
  const h = headers.map(esc);
  const sep = h.map(() => '---');
  const body = rows.map((r) => `| ${h.map((_, idx) => esc(r[idx] || '')).join(' | ')} |`);
  return [`| ${h.join(' | ')} |`, `| ${sep.join(' | ')} |`, ...body].join('\n');
}

export const ClaraverseContextMenu: React.FC<ClaraverseContextMenuProps> = ({ isDark, onSyncTable, onFlushPendingSync }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['edition', 'lignes', 'colonnes']));
  const [promptModal, setPromptModal] = useState<PromptModalState | null>(null);
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});
  const [analyticsModal, setAnalyticsModal] = useState<{ result: AnalyticsTableResult; sourceTable: HTMLTableElement | null } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const excelImportModeRef = useRef<'standard' | 'withTestCols'>('standard');

  const targetTableRef = useRef<HTMLTableElement | null>(null);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);
  const activeCellPosRef = useRef<{ row: number; col: number }>({ row: -1, col: -1 });
  const copiedTableRef = useRef<CopiedTableData | null>(null);

  const hideMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const showMenuAt = useCallback((x: number, y: number, table: HTMLTableElement) => {
    targetTableRef.current = table;
    const width = 305;
    const estHeight = 460;
    const clampedX = Math.max(8, Math.min(x, window.innerWidth - width - 12));
    const clampedY = Math.max(8, Math.min(y, window.innerHeight - estHeight - 12));
    setMenuPos({ x: clampedX, y: clampedY });
    setMenuVisible(true);
  }, []);

  const highlightActiveCell = useCallback((cell: HTMLTableCellElement, table: HTMLTableElement) => {
    if (activeCellRef.current && activeCellRef.current !== cell) {
      activeCellRef.current.classList.remove('contextual-active-cell');
    }
    activeCellRef.current = cell;
    targetTableRef.current = table;
    cell.classList.add('contextual-active-cell');

    const row = cell.closest('tr');
    const rows = Array.from(table.querySelectorAll('tr'));
    const cells = row ? Array.from(row.querySelectorAll('td, th')) : [];
    activeCellPosRef.current = {
      row: row ? rows.indexOf(row) : -1,
      col: cells.indexOf(cell),
    };
  }, []);

  const getActiveTable = useCallback((): HTMLTableElement | null => {
    const t = targetTableRef.current;
    if (!t || !document.contains(t)) {
      Message.warning('Aucune table sélectionnée. Faites un clic droit sur un tableau.');
      return null;
    }
    return t;
  }, []);

  const validateActiveCell = useCallback((): HTMLTableElement | null => {
    const table = getActiveTable();
    if (!table) return null;
    if (activeCellPosRef.current.row === -1) {
      Message.warning("Cliquez d'abord sur une cellule du tableau.");
      return null;
    }
    return table;
  }, [getActiveTable]);

  const getTableHeaders = useCallback((table: HTMLTableElement): string[] => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return [];
    return Array.from(headerRow.querySelectorAll('th, td')).map(extractCellText);
  }, []);

  const getDataRows = useCallback((table: HTMLTableElement): HTMLTableRowElement[] => {
    const tbody = table.querySelector('tbody');
    if (tbody) return Array.from(tbody.querySelectorAll('tr'));
    return Array.from(table.querySelectorAll('tr')).slice(1);
  }, []);

  const openPrompt = useCallback((config: PromptModalState) => {
    const initial: Record<string, string> = {};
    for (const f of config.fields) {
      initial[f.key] = f.defaultValue;
    }
    setPromptValues(initial);
    setPromptModal(config);
  }, []);

  const makeCellEditableDom = useCallback((cell: HTMLElement) => {
    cell.contentEditable = 'true';
    cell.setAttribute('data-editable', 'true');
  }, []);

  // === SECTION: EDITION ===
  const enableCellEditing = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    table.querySelectorAll('tbody td').forEach((td) => makeCellEditableDom(td as HTMLElement));
    window.dispatchEvent(new CustomEvent('claraverse:table:editing', { detail: { table, enabled: true } }));
    Message.success('Édition des cellules activée');
  }, [getActiveTable, makeCellEditableDom]);

  const disableCellEditing = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    table.querySelectorAll('tbody td').forEach((td) => {
      (td as HTMLElement).contentEditable = 'false';
      td.removeAttribute('data-editable');
    });
    window.dispatchEvent(new CustomEvent('claraverse:table:editing', { detail: { table, enabled: false } }));
    const msgEl = findMessageElementForTable(table);
    onFlushPendingSync(msgEl?.getAttribute('data-message-id') ?? undefined);
    void onSyncTable(table, { silent: false, deferReactSync: table.querySelector('select') !== null });
  }, [getActiveTable, onFlushPendingSync, onSyncTable]);

  // === SECTION: LIGNES ===
  const insertRowBelow = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const targetRow = activeCellPosRef.current.row >= 0 ? rows[activeCellPosRef.current.row] : rows[rows.length - 1];
    if (!targetRow) return;

    const numCols = Math.max(1, targetRow.querySelectorAll('td, th').length);
    const newRow = document.createElement('tr');
    for (let i = 0; i < numCols; i += 1) {
      const td = document.createElement('td');
      td.textContent = '-';
      makeCellEditableDom(td);
      newRow.appendChild(td);
    }

    if (targetRow.parentElement?.tagName === 'THEAD') {
      const tbody = table.querySelector('tbody') || table;
      tbody.insertBefore(newRow, tbody.firstChild);
    } else {
      targetRow.parentNode?.insertBefore(newRow, targetRow.nextSibling);
    }

    void onSyncTable(table);
    Message.success('Ligne ajoutée et sauvegardée');
  }, [getActiveTable, makeCellEditableDom, onSyncTable]);

  const duplicateSelectedRow = useCallback(() => {
    const table = validateActiveCell();
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const targetRow = rows[activeCellPosRef.current.row];
    if (!targetRow || targetRow.parentElement?.tagName === 'THEAD') {
      Message.warning('Sélectionnez une ligne de données à dupliquer.');
      return;
    }
    const cloned = targetRow.cloneNode(true) as HTMLTableRowElement;
    cloned.querySelectorAll('.contextual-active-cell').forEach((el) => el.classList.remove('contextual-active-cell'));
    cloned.querySelectorAll('td').forEach((td) => makeCellEditableDom(td));
    targetRow.parentNode?.insertBefore(cloned, targetRow.nextSibling);
    void onSyncTable(table);
    Message.success('Ligne dupliquée et sauvegardée');
  }, [makeCellEditableDom, onSyncTable, validateActiveCell]);

  const deleteSelectedRow = useCallback(() => {
    const table = validateActiveCell();
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const targetRow = rows[activeCellPosRef.current.row];
    if (!targetRow || targetRow.parentElement?.tagName === 'THEAD') {
      Message.warning("Impossible de supprimer la ligne d'en-tête.");
      return;
    }
    if (getDataRows(table).length <= 1) {
      Message.warning('La table doit conserver au moins une ligne de données.');
      return;
    }
    Modal.confirm({
      title: 'Supprimer la ligne ?',
      content: 'Cette ligne sera supprimée définitivement du tableau.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        targetRow.remove();
        activeCellRef.current = null;
        activeCellPosRef.current = { row: -1, col: -1 };
        void onSyncTable(table);
      },
    });
  }, [getDataRows, onSyncTable, validateActiveCell]);

  const clearAllRowsContent = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    Modal.confirm({
      title: 'Effacer le contenu de toutes les lignes ?',
      content: 'Les en-têtes seront conservés mais toutes les cellules de données seront vidées.',
      okText: 'Effacer',
      cancelText: 'Annuler',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        getDataRows(table).forEach((row) => {
          row.querySelectorAll('td').forEach((td) => {
            const select = td.querySelector('select');
            if (select) select.value = '';
            else td.textContent = '';
          });
        });
        void onSyncTable(table);
      },
    });
  }, [getActiveTable, getDataRows, onSyncTable]);

  const parseClipboardTsv = (text: string): string[][] => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized
      .split('\n')
      .map((line) => line.split('\t').map((c) => c.trim()))
      .filter((cells) => cells.some((c) => c !== ''));
  };

  const pasteFromExcel = useCallback(async () => {
    const table = getActiveTable();
    if (!table) return;
    try {
      if (!navigator.clipboard?.readText) {
        Message.error('Accès au presse-papiers non disponible dans ce navigateur');
        return;
      }
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        Message.warning('Le presse-papiers est vide');
        return;
      }
      const parsed = parseClipboardTsv(clip);
      if (parsed.length === 0) {
        Message.warning('Aucune donnée tabulaire détectée');
        return;
      }

      let startRow = activeCellPosRef.current.row >= 1 ? activeCellPosRef.current.row : 1;
      const startCol = activeCellPosRef.current.col >= 0 ? activeCellPosRef.current.col : 0;
      if (startRow === 0) startRow = 1;

      const tbody = table.querySelector('tbody') || table;
      const allRows = Array.from(table.querySelectorAll('tr'));
      const headerRow = table.querySelector('thead tr') || allRows[0];
      const numCols = headerRow ? headerRow.querySelectorAll('th, td').length : parsed[0].length;

      let cellsUpdated = 0;
      let rowsInserted = 0;

      parsed.forEach((rowData, rIdx) => {
        const targetRowIdx = startRow + rIdx;
        let rowEl = allRows[targetRowIdx];
        if (!rowEl) {
          rowEl = document.createElement('tr');
          for (let i = 0; i < numCols; i += 1) {
            const td = document.createElement('td');
            makeCellEditableDom(td);
            rowEl.appendChild(td);
          }
          tbody.appendChild(rowEl);
          allRows.push(rowEl);
          rowsInserted += 1;
        }
        const cells = rowEl.querySelectorAll('td');
        rowData.forEach((val, cIdx) => {
          const targetCol = startCol + cIdx;
          if (targetCol < cells.length) {
            cells[targetCol].textContent = val;
            cellsUpdated += 1;
          }
        });
      });

      void onSyncTable(table);
      Message.success(`${cellsUpdated} cellule(s) collée(s), ${rowsInserted} ligne(s) ajoutée(s)`);
    } catch {
      Message.error('Permission presse-papiers refusée ou indisponible');
    }
  }, [getActiveTable, makeCellEditableDom, onSyncTable]);

  const replaceTableFromData = useCallback((table: HTMLTableElement, headers: string[], rowsData: string[][]) => {
    const prevThead = table.querySelector('thead');
    const prevTbody = table.querySelector('tbody');
    if (prevThead) prevThead.remove();
    if (prevTbody) prevTbody.remove();
    table.innerHTML = '';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    headers.forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rowsData.forEach((row) => {
      const tr = document.createElement('tr');
      for (let i = 0; i < headers.length; i += 1) {
        const td = document.createElement('td');
        td.textContent = row[i] ?? '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }, []);

  const replaceTableFromExcel = useCallback(async () => {
    const table = getActiveTable();
    if (!table) return;
    try {
      const clip = await navigator.clipboard.readText();
      const parsed = parseClipboardTsv(clip);
      if (parsed.length < 2) {
        Message.warning('Copiez au moins un en-tête et une ligne de données depuis Excel.');
        return;
      }
      replaceTableFromData(table, parsed[0], parsed.slice(1));
      await onSyncTable(table, { deferReactSync: false });
    } catch {
      Message.error('Impossible de lire le presse-papiers');
    }
  }, [getActiveTable, onSyncTable, replaceTableFromData]);

  // === SECTION: COLONNES ===
  const insertColumnRight = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const colIdx = activeCellPosRef.current.col >= 0 ? activeCellPosRef.current.col : getTableHeaders(table).length - 1;
    Array.from(table.querySelectorAll('tr')).forEach((row, i) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const isHeader = i === 0 || row.parentElement?.tagName === 'THEAD';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.textContent = isHeader ? `Colonne ${cells.length + 1}` : '-';
      if (!isHeader) makeCellEditableDom(newCell);
      row.insertBefore(newCell, cells[colIdx + 1] || null);
    });
    void onSyncTable(table);
  }, [getActiveTable, getTableHeaders, makeCellEditableDom, onSyncTable]);

  const duplicateSelectedColumn = useCallback(() => {
    const table = validateActiveCell();
    if (!table) return;
    const colIdx = activeCellPosRef.current.col;
    Array.from(table.querySelectorAll('tr')).forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const src = cells[colIdx];
      if (src) {
        const clone = src.cloneNode(true) as HTMLElement;
        clone.classList.remove('contextual-active-cell');
        if (clone.tagName === 'TD') makeCellEditableDom(clone);
        row.insertBefore(clone, src.nextSibling);
      }
    });
    void onSyncTable(table);
  }, [makeCellEditableDom, onSyncTable, validateActiveCell]);

  const clearColumnContent = useCallback(() => {
    const table = validateActiveCell();
    if (!table) return;
    const colIdx = activeCellPosRef.current.col;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells[colIdx]) {
        const select = cells[colIdx].querySelector('select');
        if (select) select.value = '';
        else cells[colIdx].textContent = '';
      }
    });
    void onSyncTable(table);
  }, [getDataRows, onSyncTable, validateActiveCell]);

  const deleteSelectedColumn = useCallback(() => {
    const table = validateActiveCell();
    if (!table) return;
    const headers = getTableHeaders(table);
    if (headers.length <= 1) {
      Message.warning('La table doit conserver au moins une colonne.');
      return;
    }
    const colIdx = activeCellPosRef.current.col;
    Modal.confirm({
      title: `Supprimer la colonne "${headers[colIdx] || colIdx + 1}" ?`,
      content: 'Toutes les valeurs de cette colonne seront supprimées.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        Array.from(table.querySelectorAll('tr')).forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          if (cells[colIdx]) cells[colIdx].remove();
        });
        activeCellRef.current = null;
        activeCellPosRef.current = { row: -1, col: -1 };
        void onSyncTable(table);
      },
    });
  }, [getTableHeaders, onSyncTable, validateActiveCell]);

  const createSelectCell = useCallback(
    (table: HTMLTableElement, options: string[], onExtraChange?: (val: string, td: HTMLTableCellElement) => void) => {
      const td = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'eaudit-table-select';
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt || '-- Sélectionner --';
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        if (onExtraChange) onExtraChange(select.value, td);
        void onSyncTable(table, { deferReactSync: true });
      });
      td.appendChild(select);
      return td;
    },
    [onSyncTable]
  );

  const addCTRColumns = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    let maxCTR = 0;
    let lastCTRIndex = -1;
    headers.forEach((h, idx) => {
      const m = h.match(/^CTR\s*(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= maxCTR) {
          maxCTR = n;
          lastCTRIndex = idx;
        }
      }
    });
    const colName = `CTR ${maxCTR + 1}`;
    const insertPos = lastCTRIndex >= 0 ? lastCTRIndex + 1 : headers.length;
    const ctrOptions = ['', 'Oui', 'Non', 'N/A', 'En cours', 'À vérifier'];

    Array.from(table.querySelectorAll('tr')).forEach((row, rowIdx) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const refCell = cells[insertPos] || null;
      if (rowIdx === 0) {
        const th = document.createElement('th');
        th.textContent = colName;
        row.insertBefore(th, refCell);
      } else {
        const td = createSelectCell(table, ctrOptions);
        row.insertBefore(td, refCell);
      }
    });

    void onSyncTable(table, { deferReactSync: true });
    Message.success(`Colonne ${colName} ajoutée`);
  }, [createSelectCell, getActiveTable, getTableHeaders, onSyncTable]);

  const addPointageColumns = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const ctrOptions = ['', 'Oui', 'Non', 'N/A', 'En cours', 'À vérifier'];
    const conclusionOptions = ['', 'Conforme', 'Non conforme', 'À améliorer', 'Sans objet', 'En attente'];

    const cols: Array<{ name: string; options?: string[] }> = [{ name: 'CTR 1', options: ctrOptions }, { name: 'CTR 2', options: ctrOptions }, { name: 'CTR 3', options: ctrOptions }, { name: 'Description' }, { name: 'Conclusion', options: conclusionOptions }];

    cols.forEach((colDef) => {
      Array.from(table.querySelectorAll('tr')).forEach((row, rowIdx) => {
        if (rowIdx === 0) {
          const th = document.createElement('th');
          th.textContent = colDef.name;
          row.appendChild(th);
        } else if (colDef.options) {
          row.appendChild(createSelectCell(table, colDef.options));
        } else {
          const td = document.createElement('td');
          td.textContent = '';
          makeCellEditableDom(td);
          row.appendChild(td);
        }
      });
    });

    void onSyncTable(table, { deferReactSync: true });
    Message.success('Colonnes de pointage ajoutées (CTR 1-3, Description, Conclusion)');
  }, [createSelectCell, getActiveTable, makeCellEditableDom, onSyncTable]);

  // === SECTION: ARITHMETIQUE ===
  const findEcartIndex = (headers: string[]) => headers.findIndex((h) => ['ecart', 'écart'].includes(h.toLowerCase().trim()));

  const executeValidation = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const ecartIdx = findEcartIndex(headers);
    if (ecartIdx === -1) {
      Message.warning("Colonne 'Ecart' non trouvée.");
      return;
    }
    if (ecartIdx < 3) {
      Message.warning("Il faut au moins 3 colonnes avant 'Ecart' pour Validation.");
      return;
    }
    let count = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= ecartIdx) return;
      const a = parseMonetaryValue(cells[ecartIdx - 3]?.textContent);
      const b = parseMonetaryValue(cells[ecartIdx - 2]?.textContent);
      const d = parseMonetaryValue(cells[ecartIdx - 1]?.textContent);
      if (!isNaN(a) && !isNaN(b) && !isNaN(d)) {
        const ecart = a + b - d;
        cells[ecartIdx].textContent = formatMonetary(ecart);
        cells[ecartIdx].style.color = ecart >= 0 ? '#16a34a' : '#dc2626';
        cells[ecartIdx].style.fontWeight = 'bold';
        count += 1;
      }
    });
    void onSyncTable(table, { deferReactSync: table.querySelector('select') !== null });
    Message.success(`Validation calculée sur ${count} ligne(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders, onSyncTable]);

  const executeMouvement = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const ecartIdx = findEcartIndex(headers);
    if (ecartIdx === -1) {
      Message.warning("Colonne 'Ecart' non trouvée.");
      return;
    }
    if (ecartIdx < 5) {
      Message.warning("Il faut au moins 5 colonnes avant 'Ecart' pour Mouvement.");
      return;
    }
    let count = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= ecartIdx) return;
      const a = parseMonetaryValue(cells[ecartIdx - 5]?.textContent);
      const b = parseMonetaryValue(cells[ecartIdx - 4]?.textContent);
      const c = parseMonetaryValue(cells[ecartIdx - 3]?.textContent);
      const e = parseMonetaryValue(cells[ecartIdx - 1]?.textContent);
      if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(e)) {
        const d = a + b - c;
        const ecart = d - e;
        cells[ecartIdx - 2].textContent = formatMonetary(d);
        cells[ecartIdx - 2].style.fontWeight = 'bold';
        cells[ecartIdx].textContent = formatMonetary(ecart);
        cells[ecartIdx].style.color = ecart >= 0 ? '#16a34a' : '#dc2626';
        cells[ecartIdx].style.fontWeight = 'bold';
        count += 1;
      }
    });
    void onSyncTable(table, { deferReactSync: table.querySelector('select') !== null });
    Message.success(`Mouvement calculé sur ${count} ligne(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders, onSyncTable]);

  const executeRapprochement = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const ecartIdx = findEcartIndex(headers);
    if (ecartIdx === -1) {
      Message.warning("Colonne 'Ecart' non trouvée.");
      return;
    }
    if (ecartIdx < 3) {
      Message.warning("Il faut au moins 3 colonnes avant 'Ecart' pour Rapprochement.");
      return;
    }
    let count = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= ecartIdx) return;
      const a = parseMonetaryValue(cells[ecartIdx - 3]?.textContent);
      const b = parseMonetaryValue(cells[ecartIdx - 2]?.textContent);
      if (!isNaN(a) && !isNaN(b)) {
        const c = a - b;
        cells[ecartIdx - 1].textContent = formatMonetary(c);
        cells[ecartIdx - 1].style.fontWeight = 'bold';
        cells[ecartIdx].textContent = formatMonetary(c);
        cells[ecartIdx].style.color = c >= 0 ? '#16a34a' : '#dc2626';
        cells[ecartIdx].style.fontWeight = 'bold';
        count += 1;
      }
    });
    void onSyncTable(table, { deferReactSync: table.querySelector('select') !== null });
    Message.success(`Rapprochement calculé sur ${count} ligne(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders, onSyncTable]);

  const executeSeparation = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const ecartIdx = findEcartIndex(headers);
    if (ecartIdx === -1) {
      Message.warning("Colonne 'Ecart' non trouvée.");
      return;
    }
    if (ecartIdx < 3) {
      Message.warning("Il faut au moins 3 colonnes avant 'Ecart' pour Séparation.");
      return;
    }
    let count = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= ecartIdx) return;
      const dateA = parseDateValue(cells[ecartIdx - 3]?.textContent);
      const dateB = parseDateValue(cells[ecartIdx - 2]?.textContent);
      if (dateA && dateB) {
        const diffDays = Math.round((dateA.getTime() - dateB.getTime()) / (24 * 60 * 60 * 1000));
        cells[ecartIdx - 1].textContent = `${diffDays} jours`;
        cells[ecartIdx - 1].style.fontWeight = 'bold';
        cells[ecartIdx].textContent = String(diffDays);
        cells[ecartIdx].style.color = diffDays >= 0 ? '#16a34a' : '#dc2626';
        cells[ecartIdx].style.fontWeight = 'bold';
        count += 1;
      }
    });
    void onSyncTable(table, { deferReactSync: table.querySelector('select') !== null });
    Message.success(`Séparation calculée sur ${count} ligne(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders, onSyncTable]);

  const executeEstimation = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const ecartIdx = findEcartIndex(headers);
    if (ecartIdx === -1) {
      Message.warning("Colonne 'Ecart' non trouvée.");
      return;
    }
    if (ecartIdx < 4) {
      Message.warning("Il faut au moins 4 colonnes avant 'Ecart' pour Estimation.");
      return;
    }
    let count = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= ecartIdx) return;
      const a = parseMonetaryValue(cells[ecartIdx - 4]?.textContent);
      let b = parseMonetaryValue(cells[ecartIdx - 3]?.textContent);
      const d = parseMonetaryValue(cells[ecartIdx - 1]?.textContent);
      const bText = cells[ecartIdx - 3]?.textContent || '';
      if (bText.includes('%') || (b > 1 && b <= 100)) {
        b = b / 100;
      }
      if (!isNaN(a) && !isNaN(b) && !isNaN(d)) {
        const c = a * b;
        const ecart = c - d;
        cells[ecartIdx - 2].textContent = formatMonetary(c);
        cells[ecartIdx - 2].style.fontWeight = 'bold';
        cells[ecartIdx].textContent = formatMonetary(ecart);
        cells[ecartIdx].style.color = ecart >= 0 ? '#16a34a' : '#dc2626';
        cells[ecartIdx].style.fontWeight = 'bold';
        count += 1;
      }
    });
    void onSyncTable(table, { deferReactSync: table.querySelector('select') !== null });
    Message.success(`Estimation calculée sur ${count} ligne(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders, onSyncTable]);

  // === SECTION: EVALUATION DES RISQUES ===
  const findRiskIndexes = (headers: string[]) => ({
    probabilite: headers.findIndex((h) => /probabilit[eé]|prob|obab/i.test(h)),
    impact: headers.findIndex((h) => /impact|mpa|impa/i.test(h)),
    criticite: headers.findIndex((h) => /criticit[eé]|ritici/i.test(h)),
  });

  const applyRiskColorsToCell = (cell: HTMLElement, level: RiskLevel) => {
    const colors = RISK_COLORS[level];
    cell.style.setProperty('background-color', colors.bg, 'important');
    cell.style.setProperty('color', colors.text, 'important');
    cell.style.setProperty('font-weight', 'bold', 'important');
    cell.style.setProperty('text-align', 'center', 'important');
  };

  const computeAndPaintRisks = useCallback(
    (table: HTMLTableElement, criticiteIdx: number, probIdx: number, impIdx: number) => {
      let count = 0;
      getDataRows(table).forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length <= Math.max(probIdx, impIdx, criticiteIdx)) return;
        const probRaw = extractCellText(cells[probIdx]);
        const impRaw = extractCellText(cells[impIdx]);
        const prob = normalizeRiskValueWithFormat(probRaw);
        const imp = normalizeRiskValueWithFormat(impRaw);
        if (prob && imp) {
          const level = CRITICITY_MATRIX[prob.level][imp.level];
          const useLetter = prob.isLetter && imp.isLetter;
          cells[criticiteIdx].textContent = useLetter ? level[0] : level;
          applyRiskColorsToCell(cells[probIdx], prob.level);
          applyRiskColorsToCell(cells[impIdx], imp.level);
          applyRiskColorsToCell(cells[criticiteIdx], level);
          count += 1;
        }
      });
      void onSyncTable(table, { deferReactSync: true });
      Message.success(`Évaluation des risques : ${count} ligne(s) calculée(s)`);
    },
    [getDataRows, onSyncTable]
  );

  const executeRiskEvaluation = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const headers = getTableHeaders(table);
    const idxs = findRiskIndexes(headers);
    if (idxs.probabilite === -1) {
      Message.warning("Colonne 'Probabilité' non trouvée.");
      return;
    }
    if (idxs.impact === -1) {
      Message.warning("Colonne 'Impact' non trouvée.");
      return;
    }
    if (idxs.criticite === -1) {
      Modal.confirm({
        title: "Colonne 'Criticité' manquante",
        content: "Voulez-vous ajouter automatiquement la colonne 'Criticité' après 'Impact' ?",
        okText: 'Ajouter et calculer',
        cancelText: 'Annuler',
        onOk: () => {
          Array.from(table.querySelectorAll('tr')).forEach((row, rIdx) => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            const ref = cells[idxs.impact];
            const el = document.createElement(rIdx === 0 ? 'th' : 'td');
            el.textContent = rIdx === 0 ? 'Criticité' : '';
            if (rIdx > 0) makeCellEditableDom(el);
            row.insertBefore(el, ref?.nextSibling || null);
          });
          const newIdxs = findRiskIndexes(getTableHeaders(table));
          computeAndPaintRisks(table, newIdxs.criticite, newIdxs.probabilite, newIdxs.impact);
        },
      });
      return;
    }
    computeAndPaintRisks(table, idxs.criticite, idxs.probabilite, idxs.impact);
  }, [computeAndPaintRisks, getActiveTable, getTableHeaders, makeCellEditableDom]);

  const applyRiskColors = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const idxs = findRiskIndexes(getTableHeaders(table));
    const cols = [idxs.probabilite, idxs.impact, idxs.criticite].filter((i) => i !== -1);
    if (cols.length === 0) {
      Message.warning('Aucune colonne de risque trouvée (Probabilité, Impact, Criticité).');
      return;
    }
    let colored = 0;
    getDataRows(table).forEach((row) => {
      const cells = row.querySelectorAll('td');
      cols.forEach((cIdx) => {
        if (cIdx < cells.length) {
          const norm = normalizeRiskValueWithFormat(extractCellText(cells[cIdx]));
          if (norm) {
            applyRiskColorsToCell(cells[cIdx], norm.level);
            colored += 1;
          }
        }
      });
    });
    Message.success(`Couleurs risques appliquées à ${colored} cellule(s)`);
  }, [getActiveTable, getDataRows, getTableHeaders]);

  const addRiskColumns = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const existing = findRiskIndexes(getTableHeaders(table));
    const toAdd: string[] = [];
    if (existing.probabilite === -1) toAdd.push('Probabilité');
    if (existing.impact === -1) toAdd.push('Impact');
    if (existing.criticite === -1) toAdd.push('Criticité');
    if (toAdd.length === 0) {
      Message.info('Toutes les colonnes de risque existent déjà.');
      return;
    }

    const riskOptions = ['', 'Faible', 'Moyen', 'Eleve'];
    toAdd.forEach((colName) => {
      Array.from(table.querySelectorAll('tr')).forEach((row, rIdx) => {
        if (rIdx === 0) {
          const th = document.createElement('th');
          th.textContent = colName;
          row.appendChild(th);
        } else if (colName === 'Criticité') {
          const td = document.createElement('td');
          td.textContent = '';
          makeCellEditableDom(td);
          row.appendChild(td);
        } else {
          const td = createSelectCell(table, riskOptions, (val, cell) => {
            const norm = normalizeRiskValueWithFormat(val);
            if (norm) applyRiskColorsToCell(cell, norm.level);
          });
          row.appendChild(td);
        }
      });
    });

    void onSyncTable(table, { deferReactSync: true });
    Message.success(`Colonnes ajoutées : ${toAdd.join(', ')}`);
  }, [createSelectCell, getActiveTable, getTableHeaders, makeCellEditableDom, onSyncTable]);

  // === SECTION: TABLES ===
  const createStandardMissionTable = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const missionMd = ['| Rubrique | Description |', '| --- | --- |', '| Etape de mission | Etape X |', '| Norme | Norme X |', '| Méthode | Méthode X |', '| Reference | Ref-xxx |'].join('\n');
    void onSyncTable(table, { mode: 'prepend', extraMarkdown: missionMd, deferReactSync: false });
    Message.success('Tableau de mission inséré en début de message');
  }, [getActiveTable, onSyncTable]);

  const insertTableBelow = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const newMd = ['| No | Colonne 1 | Colonne 2 | Colonne 3 |', '| --- | --- | --- | --- |', '| 1 | - | - | - |', '| 2 | - | - | - |', '| 3 | - | - | - |'].join('\n');
    void onSyncTable(table, { mode: 'insertAfter', extraMarkdown: newMd, deferReactSync: false });
    Message.success('Nouveau tableau inséré et sauvegardé');
  }, [getActiveTable, onSyncTable]);

  const copyTableToMemory = useCallback(async () => {
    const table = getActiveTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    if (matrix.length === 0) return;
    copiedTableRef.current = { headers: matrix[0], rows: matrix.slice(1) };
    const tsv = matrix.map((r) => r.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      // Clipboard optional; in-memory copy already succeeded
    }
    Message.success(`Tableau copié (${matrix[0].length} col., ${Math.max(0, matrix.length - 1)} lignes)`);
  }, [getActiveTable]);

  const pasteTableFromMemory = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const copied = copiedTableRef.current;
    if (!copied) {
      Message.warning("Aucun tableau copié. Utilisez d'abord 'Copier table'.");
      return;
    }
    replaceTableFromData(table, copied.headers, copied.rows);
    void onSyncTable(table, { deferReactSync: false });
  }, [getActiveTable, onSyncTable, replaceTableFromData]);

  const deleteTable = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    Modal.confirm({
      title: 'Supprimer ce tableau ?',
      content: 'Le tableau sera supprimé définitivement du message.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        activeCellRef.current = null;
        activeCellPosRef.current = { row: -1, col: -1 };
        void onSyncTable(table, { mode: 'delete', deferReactSync: false });
      },
    });
  }, [getActiveTable, onSyncTable]);

  // === SECTION: EXCEL & EXPORTS ===
  const triggerExcelImport = useCallback(
    (mode: 'standard' | 'withTestCols') => {
      const table = getActiveTable();
      if (!table) return;
      excelImportModeRef.current = mode;
      fileInputRef.current?.click();
    },
    [getActiveTable]
  );

  const handleExcelFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const table = getActiveTable();
      if (!table) return;

      if (file.size > 10 * 1024 * 1024) {
        Message.warning('Fichier trop volumineux (max 10 Mo).');
        return;
      }

      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          Message.warning('Aucun onglet trouvé dans le fichier.');
          return;
        }
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet], { header: 1, defval: '' });
        const cleanRows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '').trim()) : [])).filter((r) => r.some((c) => c !== ''));

        if (cleanRows.length < 2) {
          Message.warning('Le fichier doit contenir au moins un en-tête et une ligne.');
          return;
        }

        let headers = cleanRows[0];
        let body = cleanRows.slice(1);
        if (excelImportModeRef.current === 'withTestCols') {
          const extra = ['Ecart', 'Assertion', 'CTR 1', 'CTR 2', 'CTR 3', 'Conclusion'];
          headers = [...headers, ...extra];
          body = body.map((r) => [...r, ...extra.map(() => '')]);
        }

        replaceTableFromData(table, headers, body);
        await onSyncTable(table, { deferReactSync: false });
        Message.success(`Import terminé (${body.length} ligne(s))`);
      } catch {
        Message.error('Impossible de lire le fichier Excel/CSV');
      }
    },
    [getActiveTable, onSyncTable, replaceTableFromData]
  );

  const exportExcelSingle = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'E-audit');
    XLSX.writeFile(wb, `e-audit-export-${Date.now()}.xlsx`);
    Message.success('Export Excel (.xlsx) téléchargé');
  }, [getActiveTable]);

  const exportExcelTemplateAll = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const msgEl = findMessageElementForTable(table);
    const tables = msgEl ? getMessageTables(msgEl) : [table];
    const combined: string[][] = [];
    tables.forEach((t, idx) => {
      if (idx > 0) combined.push([]);
      extractTableMatrix(t).forEach((row) => combined.push(row));
    });
    const ws = XLSX.utils.aoa_to_sheet(combined);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template E-audit');
    XLSX.writeFile(wb, `e-audit-template-${Date.now()}.xlsx`);
    Message.success(`Template Excel exporté (${tables.length} tableau(x))`);
  }, [getActiveTable]);

  const exportCsvSingle = useCallback(() => {
    const table = getActiveTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    const csv = matrix.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e-audit-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Message.success('Export CSV téléchargé');
  }, [getActiveTable]);

  const copyAsHtml = useCallback(async () => {
    const table = getActiveTable();
    if (!table) return;
    try {
      await navigator.clipboard.writeText(table.outerHTML);
      Message.success('HTML copié dans le presse-papiers');
    } catch {
      Message.error('Copie impossible');
    }
  }, [getActiveTable]);

  const copyAsMarkdown = useCallback(async () => {
    const table = getActiveTable();
    if (!table) return;
    try {
      await navigator.clipboard.writeText(tableElementToMarkdown(table));
      Message.success('Markdown copié dans le presse-papiers');
    } catch {
      Message.error('Copie impossible');
    }
  }, [getActiveTable]);

  // === SECTION: ECHANTILLONNAGE & ANALYSE FRAUDE ===
  const getMatrixForAnalytics = useCallback(
    (table: HTMLTableElement) => {
      const headers = getTableHeaders(table);
      const rows = getDataRows(table).map((row) => Array.from(row.querySelectorAll('td, th')).map(extractCellText));
      return { headers, rows };
    },
    [getDataRows, getTableHeaders]
  );

  const openSamplingPrompt = useCallback(
    (method: 'random' | 'systematic' | 'monetary' | 'stratified' | 'fixed' | 'with_replacement') => {
      const table = getActiveTable();
      if (!table) return;
      const { headers, rows } = getMatrixForAnalytics(table);
      const colOptions = headers.map((h, i) => ({ label: h || `Colonne ${i + 1}`, value: String(i) }));

      if (method === 'random' || method === 'with_replacement') {
        openPrompt({
          title: method === 'random' ? 'Échantillonnage aléatoire simple' : 'Échantillonnage avec remise',
          fields: [{ key: 'size', label: "Taille de l'échantillon", type: 'number', defaultValue: '10' }],
          onSubmit: (vals) => {
            const sampleSize = parseInt(vals.size, 10) || 10;
            const res = runAuditSampling(method, headers, rows, { sampleSize });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
      } else if (method === 'systematic') {
        openPrompt({
          title: 'Échantillonnage systématique',
          fields: [
            { key: 'interval', label: "Intervalle (pas d'échantillonnage)", type: 'number', defaultValue: String(Math.max(1, Math.floor(rows.length / 10))) },
            { key: 'start', label: 'Point de départ (ligne ≥ 1)', type: 'number', defaultValue: '1' },
          ],
          onSubmit: (vals) => {
            const res = runAuditSampling('systematic', headers, rows, {
              interval: parseInt(vals.interval, 10) || 5,
              startOffset: parseInt(vals.start, 10) || 1,
            });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
      } else if (method === 'fixed') {
        openPrompt({
          title: 'Échantillonnage fixe',
          fields: [
            { key: 'size', label: "Nombre d'enregistrements", type: 'number', defaultValue: '10' },
            { key: 'start', label: 'Ligne de départ (≥ 1)', type: 'number', defaultValue: '1' },
          ],
          onSubmit: (vals) => {
            const res = runAuditSampling('fixed', headers, rows, {
              sampleSize: parseInt(vals.size, 10) || 10,
              startOffset: parseInt(vals.start, 10) || 1,
            });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
      } else {
        const defaultColIdx = Math.max(
          0,
          headers.findIndex((h) => /montant|amount|total|solde|valeur/i.test(h))
        );
        openPrompt({
          title: method === 'monetary' ? 'Échantillonnage monétaire (MUS)' : 'Échantillonnage stratifié',
          fields: [
            { key: 'col', label: method === 'monetary' ? 'Colonne de montants' : 'Colonne de stratification', type: 'select', defaultValue: String(defaultColIdx), options: colOptions },
            { key: 'size', label: "Taille de l'échantillon", type: 'number', defaultValue: '10' },
          ],
          onSubmit: (vals) => {
            const col = parseInt(vals.col, 10) || 0;
            const res = runAuditSampling(method, headers, rows, {
              sampleSize: parseInt(vals.size, 10) || 10,
              amountColIndex: col,
              strataColIndex: col,
            });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
      }
    },
    [getActiveTable, getMatrixForAnalytics, openPrompt]
  );

  const openSampleSizeCalculator = useCallback(() => {
    const table = getActiveTable();
    const popDefault = table ? String(Math.max(1, getDataRows(table).length)) : '1000';
    openPrompt({
      title: "Calculateur de taille d'échantillon",
      fields: [
        { key: 'pop', label: 'Taille de la population', type: 'number', defaultValue: popDefault },
        {
          key: 'conf',
          label: 'Niveau de confiance',
          type: 'select',
          defaultValue: '0.95',
          options: [
            { label: '90%', value: '0.9' },
            { label: '95%', value: '0.95' },
            { label: '99%', value: '0.99' },
          ],
        },
        { key: 'err', label: 'Erreur tolérable (%)', type: 'number', defaultValue: '5' },
      ],
      onSubmit: (vals) => {
        const pop = Math.max(1, parseInt(vals.pop, 10) || 100);
        const conf = parseFloat(vals.conf) || 0.95;
        const tol = Math.max(0.001, (parseFloat(vals.err) || 5) / 100);
        const { sampleSize, zScore } = computeRecommendedSampleSize(pop, conf, tol);
        Modal.info({
          title: "Taille d'échantillon recommandée",
          content: (
            <div className='space-y-1.5 text-sm'>
              <p>
                Population : <strong>{pop}</strong>
              </p>
              <p>
                Confiance : <strong>{(conf * 100).toFixed(0)}%</strong> (Z = {zScore})
              </p>
              <p>
                Erreur tolérable : <strong>{(tol * 100).toFixed(1)}%</strong>
              </p>
              <p className='text-base font-semibold text-[#6b1102] pt-1'>Taille recommandée : {sampleSize} enregistrement(s)</p>
            </div>
          ),
        });
      },
    });
  }, [getActiveTable, getDataRows, openPrompt]);

  const openFraudPrompt = useCallback(
    (method: 'duplicates' | 'gaps' | 'benford' | 'threshold' | 'weekend' | 'round_amounts' | 'outliers' | 'period_changes') => {
      const table = getActiveTable();
      if (!table) return;
      const { headers, rows } = getMatrixForAnalytics(table);
      const colOptions = headers.map((h, i) => ({ label: h || `Colonne ${i + 1}`, value: String(i) }));
      const amountIdx = Math.max(
        0,
        headers.findIndex((h) => /montant|amount|total|solde|valeur/i.test(h))
      );
      const dateIdx = Math.max(
        0,
        headers.findIndex((h) => /date|jour|day/i.test(h))
      );

      if (method === 'duplicates') {
        const res = runFraudAnalysis('duplicates', headers, rows, {});
        setAnalyticsModal({ result: res, sourceTable: table });
        return;
      }

      if (method === 'threshold') {
        openPrompt({
          title: 'Détection de seuils suspects',
          fields: [
            { key: 'col', label: 'Colonne de montants', type: 'select', defaultValue: String(amountIdx), options: colOptions },
            { key: 'threshold', label: "Seuil d'autorisation", type: 'number', defaultValue: '10000' },
          ],
          onSubmit: (vals) => {
            const res = runFraudAnalysis('threshold', headers, rows, {
              colIndex: parseInt(vals.col, 10) || 0,
              threshold: parseFloat(vals.threshold) || 10000,
            });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
        return;
      }

      if (method === 'outliers') {
        openPrompt({
          title: 'Détection des valeurs aberrantes (Z-score)',
          fields: [
            { key: 'col', label: 'Colonne de montants', type: 'select', defaultValue: String(amountIdx), options: colOptions },
            { key: 'z', label: 'Seuil Z-score', type: 'number', defaultValue: '3.0' },
          ],
          onSubmit: (vals) => {
            const res = runFraudAnalysis('outliers', headers, rows, {
              colIndex: parseInt(vals.col, 10) || 0,
              zThreshold: parseFloat(vals.z) || 3.0,
            });
            setAnalyticsModal({ result: res, sourceTable: table });
          },
        });
        return;
      }

      const defaultCol = method === 'weekend' ? dateIdx : method === 'gaps' ? 0 : amountIdx;
      openPrompt({
        title: `Analyse fraude : ${method}`,
        fields: [{ key: 'col', label: 'Colonne cible', type: 'select', defaultValue: String(defaultCol), options: colOptions }],
        onSubmit: (vals) => {
          const res = runFraudAnalysis(method, headers, rows, {
            colIndex: parseInt(vals.col, 10) || 0,
            dateColIndex: parseInt(vals.col, 10) || 0,
          });
          setAnalyticsModal({ result: res, sourceTable: table });
        },
      });
    },
    [getActiveTable, getMatrixForAnalytics, openPrompt]
  );

  // === MENU SECTIONS (SOURCE CLARAVERSE V9.3) ===
  const sections: MenuSectionDef[] = [
    {
      id: 'edition',
      title: 'Édition des cellules',
      icon: '✏️',
      items: [
        { text: 'Activer édition', shortcut: 'Ctrl+E', action: enableCellEditing },
        { text: 'Désactiver édition', action: disableCellEditing },
      ],
    },
    {
      id: 'lignes',
      title: 'Lignes',
      icon: '📋',
      items: [
        { text: 'Insérer ligne', shortcut: 'Ctrl+Shift+↓', action: insertRowBelow },
        { text: 'Dupliquer ligne', shortcut: 'Ctrl+D', action: duplicateSelectedRow },
        { text: 'Supprimer ligne', action: deleteSelectedRow },
        { text: 'Effacer contenu toutes lignes', action: clearAllRowsContent },
        { text: '📋 Coller depuis Excel', action: pasteFromExcel },
        { text: '📄 Remplacer table (Excel)', shortcut: 'Ctrl+Shift+V', action: replaceTableFromExcel },
      ],
    },
    {
      id: 'colonnes',
      title: 'Colonnes',
      icon: '📊',
      items: [
        { text: 'Insérer colonne', shortcut: 'Ctrl+Shift+→', action: insertColumnRight },
        { text: 'Dupliquer colonne', action: duplicateSelectedColumn },
        { text: 'Vider cellules colonne', action: clearColumnContent },
        { text: 'Ajouter colonne CTR', action: addCTRColumns },
        { text: '📋 Ajouter colonnes de pointage', action: addPointageColumns },
        { text: 'Supprimer colonne', action: deleteSelectedColumn },
      ],
    },
    {
      id: 'arithmetique',
      title: 'Arithmétique',
      icon: '🔢',
      items: [
        { text: 'Validation (C=A+B, Écart=C-D)', shortcut: 'Ctrl+1', action: executeValidation },
        { text: 'Mouvement (D=A+B-C, Écart=D-E)', shortcut: 'Ctrl+2', action: executeMouvement },
        { text: 'Rapprochement (C=A-B, Écart=C)', shortcut: 'Ctrl+3', action: executeRapprochement },
        { text: 'Séparation (dates: C=A-B)', shortcut: 'Ctrl+4', action: executeSeparation },
        { text: 'Estimation (C=A*B, Écart=C-D)', shortcut: 'Ctrl+5', action: executeEstimation },
      ],
    },
    {
      id: 'risques',
      title: 'Évaluation des risques',
      icon: '⚠️',
      items: [
        { text: 'Calculer criticité (matrice)', shortcut: 'Ctrl+R', action: executeRiskEvaluation },
        { text: 'Appliquer couleurs risques', action: applyRiskColors },
        { text: 'Ajouter colonnes risques', action: addRiskColumns },
      ],
    },
    {
      id: 'tables',
      title: 'Tables',
      icon: '🗃️',
      items: [
        { text: '📋 Créer tableau mission', action: createStandardMissionTable },
        { text: 'Insérer table en dessous', action: insertTableBelow },
        { text: '📋 Copier table', action: copyTableToMemory },
        { text: '📄 Coller table', shortcut: 'Ctrl+Shift+P', action: pasteTableFromMemory },
        { text: 'Supprimer la table', action: deleteTable },
      ],
    },
    {
      id: 'excel',
      title: 'Excel & Exports',
      icon: '📁',
      items: [
        { text: 'Importer Excel standard', action: () => triggerExcelImport('standard') },
        { text: 'Importer Excel avec colonnes test', action: () => triggerExcelImport('withTestCols') },
        { text: 'Exporter Excel (.xlsx)', action: exportExcelSingle },
        { text: 'Exporter template Excel', action: exportExcelTemplateAll },
        { text: 'Exporter CSV', action: exportCsvSingle },
        { text: 'Copier comme HTML', action: copyAsHtml },
        { text: 'Copier en Markdown', action: copyAsMarkdown },
      ],
    },
    {
      id: 'echantillonnage',
      title: 'Échantillonnage Audit',
      icon: '🎲',
      items: [
        { text: '🎲 Aléatoire simple', action: () => openSamplingPrompt('random') },
        { text: '📏 Systématique (intervalle)', action: () => openSamplingPrompt('systematic') },
        { text: '💰 Monétaire (MUS)', action: () => openSamplingPrompt('monetary') },
        { text: '📊 Stratifié', action: () => openSamplingPrompt('stratified') },
        { text: '📌 Enregistrements fixes', action: () => openSamplingPrompt('fixed') },
        { text: '🔄 Avec remise', action: () => openSamplingPrompt('with_replacement') },
        { text: '📐 Calculer taille échantillon', action: openSampleSizeCalculator },
      ],
    },
    {
      id: 'analyse-fraude',
      title: 'Analyse & Détection Fraude',
      icon: '🔍',
      items: [
        { text: '👥 Doublons (DUPLICATES)', action: () => openFraudPrompt('duplicates') },
        { text: '🔢 Trous séquence (GAPS)', action: () => openFraudPrompt('gaps') },
        { text: '📊 Loi de Benford', action: () => openFraudPrompt('benford') },
        { text: '🎯 Seuils suspects', action: () => openFraudPrompt('threshold') },
        { text: '📅 Transactions week-end', action: () => openFraudPrompt('weekend') },
        { text: '🔵 Montants ronds', action: () => openFraudPrompt('round_amounts') },
        { text: '📈 Valeurs aberrantes (Z-score)', action: () => openFraudPrompt('outliers') },
        { text: '📉 Changements brutaux', action: () => openFraudPrompt('period_changes') },
      ],
    },
  ];

  // === GLOBAL DOCUMENT LISTENERS (RIGHT CLICK CAPTURE, CELL SELECT, SHORTCUTS) ===
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const table = target?.closest('table');
      if (table && isTableInChat(table)) {
        e.preventDefault();
        e.stopPropagation();
        const cell = target?.closest('td, th') as HTMLTableCellElement | null;
        if (cell) {
          highlightActiveCell(cell, table);
        } else {
          targetTableRef.current = table;
        }
        showMenuAt(e.clientX, e.clientY, table);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      setMenuVisible(false);

      const cell = target?.closest('td, th') as HTMLTableCellElement | null;
      const table = target?.closest('table');
      if (cell && table && isTableInChat(table)) {
        highlightActiveCell(cell, table);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuVisible(false);
        return;
      }
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }
      const table = targetTableRef.current;
      if (!table || !document.contains(table)) return;

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        enableCellEditing();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        insertRowBelow();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        insertColumnRight();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedRow();
      } else if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'V') {
        e.preventDefault();
        void replaceTableFromExcel();
      } else if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        pasteTableFromMemory();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        executeRiskEvaluation();
      } else if (e.ctrlKey && !e.shiftKey && e.key === '1') {
        e.preventDefault();
        executeValidation();
      } else if (e.ctrlKey && !e.shiftKey && e.key === '2') {
        e.preventDefault();
        executeMouvement();
      } else if (e.ctrlKey && !e.shiftKey && e.key === '3') {
        e.preventDefault();
        executeRapprochement();
      } else if (e.ctrlKey && !e.shiftKey && e.key === '4') {
        e.preventDefault();
        executeSeparation();
      } else if (e.ctrlKey && !e.shiftKey && e.key === '5') {
        e.preventDefault();
        executeEstimation();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateSelectedRow, enableCellEditing, executeEstimation, executeMouvement, executeRapprochement, executeRiskEvaluation, executeSeparation, executeValidation, highlightActiveCell, insertColumnRight, insertRowBelow, pasteTableFromMemory, replaceTableFromExcel, showMenuAt]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <input ref={fileInputRef} type='file' accept='.xlsx,.xls,.csv' className='hidden' onChange={(e) => void handleExcelFileSelected(e)} />

      {menuVisible && (
        <div
          ref={menuRef}
          id='contextual-table-menu-advanced'
          className='contextual-menu-accordion fixed z-[15000] min-w-[290px] max-w-[325px] rounded-2xl overflow-hidden border border-[#380101] shadow-2xl select-none bg-white dark:bg-gray-900'
          style={{
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
            boxShadow: '0 20px 60px rgba(56, 1, 1, 0.32), 0 0 40px rgba(56, 1, 1, 0.1)',
          }}
        >
          {/* ClaraVerse #380101 Header */}
          <div className='bg-[#380101] px-4 py-3 flex items-center justify-between border-b border-[#2A0101]'>
            <div className='flex items-center gap-2.5 text-white'>
              <span className='text-sm'>▶</span>
              <span className='font-semibold text-[15px]'>Menu Table</span>
            </div>
            <button type='button' onClick={hideMenu} className='text-white/80 hover:text-white text-xl leading-none cursor-pointer px-1' aria-label='Fermer le menu'>
              ×
            </button>
          </div>

          {/* Accordion Sections */}
          <div className='max-h-[450px] overflow-y-auto py-1.5 eaudit-scrollbar'>
            {sections.map((section) => {
              const expanded = expandedSections.has(section.id);
              return (
                <div key={section.id} className='mx-2 my-0.5'>
                  <button type='button' onClick={() => toggleSection(section.id)} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer border-l-[3px] ${expanded ? 'bg-[#380101]/12 dark:bg-[#6b1102]/30 border-[#380101] dark:border-[#ff6b5b]' : 'border-transparent hover:bg-[#380101]/8 dark:hover:bg-gray-800 hover:border-[#380101]/50'}`}>
                    <span className='flex items-center gap-2.5 text-[13.5px] font-medium text-gray-700 dark:text-gray-200'>
                      <span>{section.icon}</span>
                      <span>{section.title}</span>
                    </span>
                    <span className={`text-xs font-bold transition-transform duration-200 ${isDark ? 'text-[#ff8a7a]' : 'text-[#380101]'} ${expanded ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  {expanded && (
                    <div className='bg-[#380101]/[0.04] dark:bg-gray-800/50 rounded-b-lg py-1'>
                      {section.items.map((item) => (
                        <button
                          key={item.text}
                          type='button'
                          onClick={() => {
                            hideMenu();
                            void Promise.resolve(item.action()).catch((err) => {
                              Message.error(err instanceof Error ? err.message : 'Erreur inattendue');
                            });
                          }}
                          className='w-full flex items-center justify-between pl-9 pr-3.5 py-2 text-left text-[12.5px] text-gray-600 dark:text-gray-300 hover:bg-[#380101]/12 dark:hover:bg-[#6b1102]/35 hover:text-[#1A0000] dark:hover:text-white transition-colors cursor-pointer'
                        >
                          <span className='truncate pr-2'>{item.text}</span>
                          {item.shortcut && <span className='text-[10.5px] text-gray-500 dark:text-gray-400 bg-[#380101]/10 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0'>{item.shortcut}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parameter Input Modal (replaces window.prompt) */}
      <Modal
        visible={Boolean(promptModal)}
        title={promptModal?.title}
        onCancel={() => setPromptModal(null)}
        onOk={() => {
          if (!promptModal) return;
          const fn = promptModal.onSubmit;
          const vals = { ...promptValues };
          setPromptModal(null);
          void Promise.resolve(fn(vals));
        }}
        okText='Exécuter'
        cancelText='Annuler'
      >
        <div className='space-y-3'>
          {promptModal?.fields.map((field) => (
            <div key={field.key} className='space-y-1'>
              <label className='block text-xs font-medium text-gray-600 dark:text-gray-300'>{field.label}</label>
              {field.type === 'select' ? (
                <Select value={promptValues[field.key]} onChange={(val) => setPromptValues((p) => ({ ...p, [field.key]: String(val) }))} style={{ width: '100%' }}>
                  {field.options?.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              ) : (
                <Input type={field.type === 'number' ? 'number' : 'text'} value={promptValues[field.key] || ''} onChange={(val) => setPromptValues((p) => ({ ...p, [field.key]: val }))} />
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Sampling / Fraud Analysis Result Modal */}
      <Modal
        visible={Boolean(analyticsModal)}
        title={analyticsModal?.result.title}
        onCancel={() => setAnalyticsModal(null)}
        style={{ width: 760, maxWidth: '94vw' }}
        okText='Insérer sous le tableau'
        cancelText='Fermer'
        onOk={() => {
          if (analyticsModal?.sourceTable && analyticsModal.result.headers.length > 0 && analyticsModal.result.rows.length > 0) {
            const md = `**${analyticsModal.result.title}**\n\n${matrixToMarkdown(analyticsModal.result.headers, analyticsModal.result.rows)}`;
            void onSyncTable(analyticsModal.sourceTable, { mode: 'insertAfter', extraMarkdown: md, deferReactSync: false });
          }
          setAnalyticsModal(null);
        }}
      >
        {analyticsModal && (
          <div className='space-y-3'>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              {analyticsModal.result.stats.map((st) => (
                <div key={st.label} className='rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-center'>
                  <div className='text-[11px] text-gray-500 dark:text-gray-400'>{st.label}</div>
                  <div className='text-base font-semibold text-[#6b1102] dark:text-[#ff8a7a]'>{st.value}</div>
                </div>
              ))}
            </div>

            {analyticsModal.result.rows.length === 0 ? (
              <div className='text-center py-6 text-sm text-emerald-600 font-medium'>Aucune anomalie ou ligne correspondante détectée.</div>
            ) : (
              <div className='max-h-[360px] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg eaudit-scrollbar'>
                <table className='w-full text-xs border-collapse'>
                  <thead>
                    <tr className='bg-[#6b1102] text-white'>
                      {analyticsModal.result.headers.map((h, i) => (
                        <th key={`${h}-${i}`} className='px-3 py-2 text-left font-semibold border-r border-white/20 last:border-r-0'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsModal.result.rows.map((r, rIdx) => (
                      <tr key={rIdx} className='border-b border-gray-100 dark:border-gray-800 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40'>
                        {r.map((cell, cIdx) => (
                          <td key={cIdx} className='px-3 py-1.5 text-gray-700 dark:text-gray-200'>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
