export interface TableBlockRange {
  start: number;
  end: number;
}

export function findMessageElementForTable(table: Element | null): HTMLElement | null {
  let current: Element | null = table;
  while (current) {
    if (current.hasAttribute('data-message-id')) {
      return current as HTMLElement;
    }
    const parent: Element | null = current.parentElement;
    if (!parent && current.parentNode && current.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const shadowRoot = current.parentNode as ShadowRoot;
      if (shadowRoot.host) {
        current = shadowRoot.host;
        continue;
      }
    }
    current = parent;
  }
  return null;
}

export function getMessageTables(messageEl: HTMLElement): HTMLTableElement[] {
  const prose = messageEl.querySelector('.eaudit-prose') || messageEl;
  return Array.from(prose.querySelectorAll('table')).filter((t) => !t.classList.contains('claraverse-conso-table') && !t.closest('.sample-results-container, .analysis-results-container'));
}

export function getTableIndexInMessage(table: HTMLTableElement, messageEl: HTMLElement): number {
  const tables = getMessageTables(messageEl);
  return tables.indexOf(table);
}

export function extractCellText(cell: Element): string {
  const select = cell.querySelector('select');
  if (select) {
    return (select.value || '').trim();
  }
  const raw = cell.textContent || '';
  return raw.replace(/\s+/g, ' ').trim();
}

export function extractCellMarkdown(cell: Element): string {
  const text = extractCellText(cell);
  return text.replace(/(?<!\\)\|/g, '\\|');
}

export function extractTableMatrix(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach((cell) => {
      cells.push(extractCellText(cell));
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  return rows;
}

export function tableElementToMarkdown(table: HTMLTableElement): string {
  const theadRow = table.querySelector('thead tr');
  const allRows = Array.from(table.querySelectorAll('tr'));

  let headerCells: string[] = [];
  let bodyRowEls: Element[] = [];

  if (theadRow) {
    headerCells = Array.from(theadRow.querySelectorAll('th, td')).map(extractCellMarkdown);
    const tbody = table.querySelector('tbody');
    if (tbody) {
      bodyRowEls = Array.from(tbody.querySelectorAll('tr'));
    } else {
      bodyRowEls = allRows.filter((r) => r !== theadRow);
    }
  } else if (allRows.length > 0) {
    headerCells = Array.from(allRows[0].querySelectorAll('th, td')).map(extractCellMarkdown);
    bodyRowEls = allRows.slice(1);
  }

  if (headerCells.length === 0) {
    return '';
  }

  const colCount = Math.max(headerCells.length, ...bodyRowEls.map((r) => r.querySelectorAll('td, th').length));
  while (headerCells.length < colCount) {
    headerCells.push('');
  }

  const lines: string[] = [];
  lines.push(`| ${headerCells.join(' | ')} |`);
  lines.push(`| ${headerCells.map(() => '---').join(' | ')} |`);

  for (const rowEl of bodyRowEls) {
    const cells = Array.from(rowEl.querySelectorAll('td, th')).map(extractCellMarkdown);
    while (cells.length < colCount) {
      cells.push('');
    }
    lines.push(`| ${cells.slice(0, colCount).join(' | ')} |`);
  }

  return lines.join('\n');
}

function isGfmDelimiterLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const parts = inner.split('|');
  if (parts.length === 0) return false;
  return parts.every((part) => /^\s*:?-{1,}:?\s*$/.test(part));
}

function isPotentialGfmHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('|')) return false;
  if (/^\s*(?:#|>|```|~~~)/.test(trimmed)) return false;
  return true;
}

function isGfmBodyRowLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('|')) return false;
  if (/^\s*(?:#|>|```|~~~)/.test(trimmed)) return false;
  if (isGfmDelimiterLine(trimmed)) return false;
  return true;
}

export function findTableBlocksInMarkdown(rawContent: string): { normalized: string; blocks: TableBlockRange[] } {
  const normalized = (rawContent || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const lineOffsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1;
  }

  const blocks: TableBlockRange[] = [];
  let inFence = false;
  let fenceChar = '';

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.trim().match(/^(```|~~~)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      i += 1;
      continue;
    }

    if (inFence) {
      i += 1;
      continue;
    }

    // Check GFM table: header line + delimiter line
    if (i + 1 < lines.length && isPotentialGfmHeaderLine(line) && isGfmDelimiterLine(lines[i + 1])) {
      const start = lineOffsets[i];
      let endLine = i + 1;
      while (endLine + 1 < lines.length && isGfmBodyRowLine(lines[endLine + 1])) {
        endLine += 1;
      }
      const end = lineOffsets[endLine] + lines[endLine].length;
      blocks.push({ start, end });
      i = endLine + 1;
      continue;
    }

    // Check raw HTML <table>...</table> block
    if (/<table[\s>]/i.test(line)) {
      const start = lineOffsets[i];
      let endLine = i;
      while (endLine < lines.length && !/<\/table>/i.test(lines[endLine])) {
        endLine += 1;
      }
      if (endLine < lines.length) {
        const end = lineOffsets[endLine] + lines[endLine].length;
        blocks.push({ start, end });
        i = endLine + 1;
        continue;
      }
    }

    i += 1;
  }

  return { normalized, blocks };
}

export function replaceNthTableInMarkdown(content: string, tableIndex: number, newTableMd: string): string {
  const { normalized, blocks } = findTableBlocksInMarkdown(content);
  if (blocks.length === 0) {
    return newTableMd;
  }
  if (tableIndex < 0 || tableIndex >= blocks.length) {
    return normalized;
  }
  const target = blocks[tableIndex];
  return `${normalized.slice(0, target.start)}${newTableMd}${normalized.slice(target.end)}`;
}

export function insertAfterNthTableInMarkdown(content: string, tableIndex: number, newTableMd: string): string {
  const { normalized, blocks } = findTableBlocksInMarkdown(content);
  if (blocks.length === 0 || tableIndex < 0 || tableIndex >= blocks.length) {
    return normalized ? `${normalized.trimEnd()}\n\n${newTableMd}` : newTableMd;
  }
  const target = blocks[tableIndex];
  return `${normalized.slice(0, target.end)}\n\n${newTableMd}${normalized.slice(target.end)}`;
}

export function prependTableToMarkdown(content: string, newTableMd: string): string {
  const normalized = (content || '').replace(/\r\n/g, '\n').trimStart();
  return normalized ? `${newTableMd}\n\n${normalized}` : newTableMd;
}

export function deleteNthTableInMarkdown(content: string, tableIndex: number): string {
  const { normalized, blocks } = findTableBlocksInMarkdown(content);
  if (tableIndex < 0 || tableIndex >= blocks.length) {
    return normalized;
  }
  const target = blocks[tableIndex];
  const before = normalized.slice(0, target.start).replace(/\n+$/, '');
  const after = normalized.slice(target.end).replace(/^\n+/, '');
  if (!before && !after) return '*Tableau supprimé*';
  if (!before) return after;
  if (!after) return before;
  return `${before}\n\n${after}`;
}
