import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-republish';
import { Message } from '@arco-design/web-react';
import { Check, Copy, Download, Edit3, FileSpreadsheet, Plus, Rows3, Columns3 } from 'lucide-react';
import type { SyncTableOptions } from '../hooks/useTablePersistence';
import { extractTableMatrix } from '../utils/tableMarkdown';

interface InteractiveTableProps {
  children: React.ReactNode;
  onPersistTable?: (table: HTMLTableElement, options?: SyncTableOptions) => Promise<boolean>;
}

export const InteractiveTable: React.FC<InteractiveTableProps> = ({ children, onPersistTable }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputTimerRef = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTable = (): HTMLTableElement | null => {
    return containerRef.current?.querySelector('table:not(.claraverse-conso-table)') ?? null;
  };

  useEffect(() => {
    const table = getTable();
    if (!table) return;
    table.querySelectorAll('td').forEach((td) => {
      td.contentEditable = editing ? 'true' : 'false';
      td.style.outline = editing ? '1px dashed rgba(107, 17, 2, 0.35)' : '';
      if (editing) {
        td.setAttribute('data-editable', 'true');
      } else {
        td.removeAttribute('data-editable');
      }
    });
  }, [editing, children]);

  useEffect(() => {
    const handleEditingEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<{ table?: HTMLTableElement; enabled?: boolean }>).detail;
      const myTable = getTable();
      if (myTable && detail?.table === myTable && typeof detail.enabled === 'boolean') {
        setEditing(detail.enabled);
      }
    };
    window.addEventListener('claraverse:table:editing', handleEditingEvent);
    return () => {
      window.removeEventListener('claraverse:table:editing', handleEditingEvent);
      if (inputTimerRef.current !== null) {
        window.clearTimeout(inputTimerRef.current);
      }
    };
  }, []);

  const toggleEditing = () => {
    const table = getTable();
    if (!table) return;
    const next = !editing;
    setEditing(next);
    if (!next) {
      void onPersistTable?.(table, { silent: false, deferReactSync: table.querySelector('select') !== null });
    } else {
      Message.info('Édition activée — cliquez sur une cellule ou utilisez le clic droit');
    }
  };

  const addRow = () => {
    const table = getTable();
    if (!table) return;
    const tbody = table.querySelector('tbody') || table;
    const colCount = table.querySelectorAll('thead th').length || table.querySelector('tr')?.children.length || 1;
    const tr = document.createElement('tr');
    for (let i = 0; i < colCount; i += 1) {
      const td = document.createElement('td');
      td.textContent = '-';
      if (editing) {
        td.contentEditable = 'true';
        td.setAttribute('data-editable', 'true');
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    void onPersistTable?.(table);
  };

  const addColumn = () => {
    const table = getTable();
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      const th = document.createElement('th');
      th.textContent = `Colonne ${headerRow.children.length + 1}`;
      headerRow.appendChild(th);
    }
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const td = document.createElement('td');
      td.textContent = '-';
      if (editing) {
        td.contentEditable = 'true';
        td.setAttribute('data-editable', 'true');
      }
      tr.appendChild(td);
    });
    void onPersistTable?.(table);
  };

  const copyTsv = async () => {
    const table = getTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    const tsv = matrix.map((row) => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      Message.success('Tableau copié (compatible Excel)');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      Message.error('Impossible de copier dans le presse-papiers');
    }
  };

  const exportCsv = () => {
    const table = getTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    const csv = matrix.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `e-audit-table-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    Message.success('Export CSV téléchargé');
  };

  const exportExcel = () => {
    const table = getTable();
    if (!table) return;
    const matrix = extractTableMatrix(table);
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'E-audit');
    XLSX.writeFile(wb, `e-audit-table-${Date.now()}.xlsx`);
    Message.success('Export Excel (.xlsx) téléchargé');
  };

  const handleCellBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement | null)?.closest('td, th') as HTMLElement | null;
    if (!cell || cell.contentEditable !== 'true') return;
    if (inputTimerRef.current !== null) {
      window.clearTimeout(inputTimerRef.current);
      inputTimerRef.current = null;
    }
    const table = getTable();
    if (table) {
      void onPersistTable?.(table);
    }
  };

  const handleCellInputCapture = (e: React.FormEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement | null)?.closest('td, th') as HTMLElement | null;
    if (!cell || cell.contentEditable !== 'true') return;
    if (inputTimerRef.current !== null) {
      window.clearTimeout(inputTimerRef.current);
    }
    inputTimerRef.current = window.setTimeout(() => {
      inputTimerRef.current = null;
      const table = getTable();
      if (table) {
        void onPersistTable?.(table, { silent: true, deferReactSync: true });
      }
    }, 650);
  };

  const handleCellKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement | null)?.closest('td, th') as HTMLElement | null;
    if (!cell || cell.contentEditable !== 'true') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      cell.blur();
    }
  };

  const handleSelectChangeCapture = (e: React.ChangeEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement | null)?.tagName === 'SELECT') {
      const table = getTable();
      if (table) {
        void onPersistTable?.(table, { deferReactSync: true });
      }
    }
  };

  return (
    <div ref={containerRef} data-eaudit-table='true' className='my-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden'>
      <div className='flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs'>
        <span className='font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5'>
          <FileSpreadsheet className='w-3.5 h-3.5 text-[#6b1102] dark:text-[#ff6b5b]' />
          Tableau E-audit
          <span className='hidden sm:inline text-[11px] font-normal text-gray-400 dark:text-gray-500'>· Clic droit pour le Menu Table</span>
        </span>
        <div className='flex flex-wrap items-center gap-1'>
          <button type='button' onClick={toggleEditing} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${editing ? 'bg-[#6b1102] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title='Activer ou désactiver la modification des cellules'>
            <Edit3 className='w-3 h-3' />
            {editing ? 'Terminer' : 'Éditer'}
          </button>
          <button type='button' onClick={addRow} className='inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer' title='Insérer une ligne'>
            <Plus className='w-3 h-3' />
            <Rows3 className='w-3 h-3' />
          </button>
          <button type='button' onClick={addColumn} className='inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer' title='Insérer une colonne'>
            <Plus className='w-3 h-3' />
            <Columns3 className='w-3 h-3' />
          </button>
          <button type='button' onClick={() => void copyTsv()} className='inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer' title='Copier le tableau pour Excel'>
            {copied ? <Check className='w-3 h-3 text-emerald-600' /> : <Copy className='w-3 h-3' />}
            Copier
          </button>
          <button type='button' onClick={exportCsv} className='inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer' title='Exporter en CSV'>
            <Download className='w-3 h-3' />
            CSV
          </button>
          <button type='button' onClick={exportExcel} className='inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[#6b1102]/10 text-[#6b1102] dark:bg-[#6b1102]/30 dark:text-[#ff8a7a] hover:bg-[#6b1102]/20 transition-colors cursor-pointer' title='Exporter en Excel (.xlsx)'>
            <Download className='w-3 h-3' />
            Excel
          </button>
        </div>
      </div>
      <div className='w-full overflow-x-auto max-h-[560px] overflow-y-auto p-2 eaudit-scrollbar' onBlurCapture={handleCellBlurCapture} onInputCapture={handleCellInputCapture} onKeyDownCapture={handleCellKeyDownCapture} onChangeCapture={handleSelectChangeCapture}>
        <table>{children}</table>
      </div>
    </div>
  );
};
