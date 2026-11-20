import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeN8nBaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://2dl3ntnj.rpcld.co/webhook';
  return trimmed.endsWith('/webhook') ? trimmed : `${trimmed}/webhook`;
}

const runtimeEnv: Record<string, string | undefined> = process.env;
const PORT = Number(runtimeEnv.PORT || 3000);
const HOST = '0.0.0.0';
const JWT_SECRET = (runtimeEnv['JWT_SECRET'] || '').trim() || 'e-audit-secret-production-2026';
const N8N_BASE_URL = normalizeN8nBaseUrl(runtimeEnv['N8N_BASE_URL'] || 'https://2dl3ntnj.rpcld.co/webhook');
const N8N_MULTI_ENDPOINT = (runtimeEnv['N8N_MULTI_WORKFLOW_ENDPOINT'] || '').trim() || 'https://providerbridge.netlify.app/api/providers/n8n/processor';
const N8N_TIMEOUT_MS = 10 * 60 * 1000;
const DATA_FILE = path.join(__dirname, '.eaudit-store.json');

// ---------------------------------------------------------------------------
// Types & In-Memory Store (replaces better-sqlite3 for container runtime)
// ---------------------------------------------------------------------------

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export type WorkflowType = 'n8n' | 'n8n-multi-workflow';

export interface StoredConversation {
  id: string;
  userId: string;
  name: string;
  type: WorkflowType;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface StoreData {
  users: StoredUser[];
  conversations: StoredConversation[];
  messages: StoredMessage[];
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'user';
  };
}

const store: StoreData = {
  users: [],
  conversations: [],
  messages: [],
};

function loadStore(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (Array.isArray(parsed.users)) store.users = parsed.users;
      if (Array.isArray(parsed.conversations)) store.conversations = parsed.conversations;
      if (Array.isArray(parsed.messages)) store.messages = parsed.messages;
    }
  } catch (err) {
    console.warn('[Store] Failed to load persisted JSON store, starting fresh:', err);
  }

  // Ensure default pre-seeded account from public/enable-login.html exists
  const defaultUsername = 'ohada.save@gmail.com';
  if (!store.users.some((u) => u.username.toLowerCase() === defaultUsername)) {
    const hash = bcrypt.hashSync('LEADER00', 10);
    store.users.push({
      id: 'user_default_admin',
      username: defaultUsername,
      passwordHash: hash,
      role: 'admin',
      createdAt: Date.now(),
    });
    saveStore();
  }
}

function saveStore(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Unable to persist store to disk:', err);
  }
}

loadStore();

// ---------------------------------------------------------------------------
// n8n Switch-Case Router & Response Normalizer (from claraApiService.ts)
// ---------------------------------------------------------------------------

const SENTINEL_DATABASE = '__INTERNAL__DATABASE__';
const SENTINEL_NOTIFICATION = '__INTERNAL__NOTIFICATION__';

function resolveN8nEndpoint(userMessage: string): string {
  const msg = userMessage;
  let routeKey: string;

  if (msg.includes('Document')) {
    routeKey = 'document';
  } else if (msg.includes('Database')) {
    routeKey = 'database_endpoint';
  } else if (msg.includes('CIA') || msg.includes('cia') || msg.includes('Cia')) {
    if (msg.includes('Cours') || msg.includes('COURS') || msg.includes('cours')) {
      routeKey = 'cia_cours';
    } else if (msg.includes('Qcm') || msg.includes('QCM') || msg.includes('Question')) {
      routeKey = 'cia_qcm';
    } else if (msg.includes('Synthèse') || msg.includes('Synth')) {
      routeKey = 'cia_synthese';
    } else {
      routeKey = 'cia';
    }
  } else if (msg.includes('Methodologie') || msg.includes('Methodo') || msg.includes('Méthodologie')) {
    routeKey = 'methodo';
  } else if (msg.includes('Guide') || msg.includes('guide') || msg.includes('GUIDE')) {
    routeKey = 'guide';
  } else if (msg.includes('[Integration]')) {
    routeKey = 'integration';
  } else if (msg.includes('n8n_doc')) {
    routeKey = 'n8n_doc';
  } else if (msg.includes('Htlm_processor')) {
    routeKey = 'htlm_processor';
  } else if (msg.includes('Algorithme')) {
    routeKey = 'algorithme';
  } else if (msg.includes('Visualisation')) {
    routeKey = 'visualisation';
  } else if (!msg.includes('Command') && !msg.includes('command') && !msg.includes('/')) {
    routeKey = 'notification';
  } else {
    routeKey = 'default';
  }

  switch (routeKey) {
    case 'integration':
      return `${N8N_BASE_URL}/integration_windows`;
    case 'n8n_doc':
      return `${N8N_BASE_URL}/n8n_doc`;
    case 'htlm_processor':
      return `${N8N_BASE_URL}/htlm_processor`;
    case 'database_endpoint':
      return `${N8N_BASE_URL}/integration_database`;
    case 'cia_cours':
      return `${N8N_BASE_URL}/cia_cours_gemini`;
    case 'cia_qcm':
      return `${N8N_BASE_URL}/qcm_cia_gemini`;
    case 'cia':
      return `${N8N_BASE_URL}/integration_cia`;
    case 'methodo':
      return `${N8N_BASE_URL}/cia_methodo_gemini`;
    case 'cia_synthese':
      return `${N8N_BASE_URL}/synthese_cia_gemini`;
    case 'guide':
      return `${N8N_BASE_URL}/guide_gemini`;
    case 'algorithme':
      return `${N8N_BASE_URL}/algorithme`;
    case 'visualisation':
      return `${N8N_BASE_URL}/visualisation`;
    case 'notification':
      return SENTINEL_NOTIFICATION;
    case 'document':
      return `${N8N_BASE_URL}/integration_document`;
    case 'default':
    default:
      return `${N8N_BASE_URL}/template`;
  }
}

function detectTableType(tableKey: string, tableData: unknown): 'header' | 'data_array' | 'download' | 'unknown' {
  const lowerKey = tableKey.toLowerCase();

  if (tableData && typeof tableData === 'object' && !Array.isArray(tableData)) {
    const record = tableData as Record<string, unknown>;
    const keys = Object.keys(record);
    const hasSimpleValues = keys.every((k) => typeof record[k] !== 'object' || record[k] === null);
    const headerKeywords = ['etape', 'reference', 'ref', 'titre', 'title', 'date', 'version', 'normes', 'methode'];
    const hasHeaderKeywords = keys.some((k) => headerKeywords.some((kw) => k.toLowerCase().includes(kw)));

    if (keys.length <= 6 && hasSimpleValues && hasHeaderKeywords) {
      return 'header';
    }

    const hasDownloadKeywords = lowerKey.includes('telecharger') || lowerKey.includes('download') || keys.some((k) => k.toLowerCase().includes('telecharger'));
    const hasUrls = keys.some((k) => typeof record[k] === 'string' && ((record[k] as string).startsWith('http://') || (record[k] as string).startsWith('https://')));

    if (hasDownloadKeywords || hasUrls) {
      return 'download';
    }
  }

  if (Array.isArray(tableData) && tableData.length > 0) {
    return 'data_array';
  }

  return 'unknown';
}

function convertHeaderTableToMarkdown(data: Record<string, unknown>): string {
  let md = '| Rubrique | Description |\n|----------|-------------|\n';
  Object.entries(data).forEach(([key, value]) => {
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
    md += `| **${formattedKey}** | ${String(value ?? '-')} |\n`;
  });
  return md + '\n\n';
}

function convertArrayTableToMarkdown(tableName: string, data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return tableName ? `### ${tableName}\n\n*Aucune donnée disponible*\n\n` : '*Aucune donnée disponible*\n\n';
  }

  let md = tableName ? `### ${tableName}\n\n` : '';
  const columns = Object.keys(data[0]);
  const headers = columns.map((col) => col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '));

  md += '| ' + headers.join(' | ') + ' |\n';
  md += '|' + columns.map(() => '---').join('|') + '|\n';

  data.forEach((row) => {
    const cells = columns.map((col) => {
      const value = row[col];
      if (value === null || value === undefined) return '-';
      const cleanValue = String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      return cleanValue || '-';
    });
    md += '| ' + cells.join(' | ') + ' |\n';
  });

  return md + '\n';
}

function convertDownloadTableToMarkdown(data: unknown): string {
  let md = '## 📥 Ressources et Téléchargements\n\n';
  if (data && typeof data === 'object') {
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        md += `🔗 **[${formattedKey}](${value})**\n\n`;
      } else {
        md += `**${formattedKey}**: ${String(value ?? '')}\n\n`;
      }
    });
  } else {
    md += `${String(data ?? '')}\n\n`;
  }
  return md;
}

function convertGenericStructureToMarkdown(data: unknown, depth = 0): string {
  let md = '';
  const indent = '  '.repeat(depth);

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      md += `${indent}- **Item ${index + 1}**:\n`;
      md += convertGenericStructureToMarkdown(item, depth + 1);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        md += `${indent}**${key}**:\n`;
        md += convertGenericStructureToMarkdown(value, depth + 1);
      } else {
        md += `${indent}**${key}**: ${String(value ?? '')}\n`;
      }
    });
  } else {
    md += `${indent}${String(data ?? '')}\n`;
  }
  return md;
}

function convertStructuredDataToMarkdown(data: Record<string, unknown>): string {
  let markdown = '';
  try {
    const mainKey = Object.keys(data).find((key) => key.toLowerCase().includes('etape') || key.toLowerCase().includes('mission') || key.toLowerCase().includes('programme')) || Object.keys(data)[0];
    const mainData = data[mainKey];
    if (!Array.isArray(mainData)) {
      return convertGenericStructureToMarkdown(data);
    }

    mainData.forEach((tableObj: Record<string, unknown>) => {
      const tableKey = Object.keys(tableObj)[0];
      if (!tableKey) return;
      const tableData = tableObj[tableKey];
      const tableType = detectTableType(tableKey, tableData);

      switch (tableType) {
        case 'header':
          markdown += convertHeaderTableToMarkdown(tableData as Record<string, unknown>);
          break;
        case 'data_array':
          markdown += convertArrayTableToMarkdown('', tableData as Record<string, unknown>[]);
          break;
        case 'download':
          markdown += convertDownloadTableToMarkdown(tableData);
          break;
        default:
          markdown += convertGenericStructureToMarkdown({ [tableKey]: tableData });
      }
    });
  } catch (err) {
    markdown = `**Erreur de conversion**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    console.error('[Normalizer] Error:', err);
  }
  return markdown;
}

function normalizeN8nResponse(result: unknown, endpoint?: string): { content: string; metadata: Record<string, unknown> } {
  if (!result) {
    return { content: '❌ Réponse vide du workflow n8n.', metadata: { format: 'error' } };
  }

  // Format Methodo: CIA Methodo Accordion
  if (endpoint && endpoint.includes('methodo') && Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === 'object' && 'Sous-section' in result[0]) {
    return {
      content: `__CIA_METHODO_ACCORDION__${JSON.stringify(result)}`,
      metadata: { format: 'cia_methodo_accordion', totalSections: result.length },
    };
  }

  // Format 6: CIA QCM Accordion
  if (Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === 'object' && 'Etape mission - CIA' in result[0]) {
    return {
      content: `__CIA_QCM_ACCORDION__${JSON.stringify(result)}`,
      metadata: { format: 'cia_qcm_accordion' },
    };
  }

  // Format 5: CIA Course Accordion
  if (Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === 'object' && 'Sous-section' in result[0]) {
    return {
      content: `__CIA_ACCORDION__${JSON.stringify(result)}`,
      metadata: { format: 'cia_accordion', totalSections: result.length },
    };
  }

  // Format 4 & Format 1: Array responses
  if (Array.isArray(result) && result.length > 0) {
    const firstItem = result[0] as Record<string, unknown>;
    if (firstItem && typeof firstItem === 'object' && 'data' in firstItem && firstItem.data && typeof firstItem.data === 'object') {
      const md = convertStructuredDataToMarkdown(firstItem.data as Record<string, unknown>);
      return {
        content: md,
        metadata: { format: 'programme_travail_data', totalItems: result.length },
      };
    }

    if (firstItem && typeof firstItem === 'object' && 'output' in firstItem) {
      return {
        content: String(firstItem.output ?? ''),
        metadata: { format: 'array_output', totalItems: result.length },
      };
    }
  }

  // Format 2: Object with tables array
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, unknown>;
    if (Array.isArray(obj.tables)) {
      const joined = obj.tables
        .map((t) => (t && typeof t === 'object' ? String((t as Record<string, unknown>).markdown ?? '') : ''))
        .filter((s) => s.trim() !== '')
        .join('\n\n---\n\n');
      return { content: joined, metadata: { format: 'tables_array', tablesFound: obj.tables.length } };
    }

    // Format 3: Direct output
    if (typeof obj.output === 'string') {
      return { content: obj.output, metadata: { format: 'direct_output' } };
    }

    // Multi-workflow Provider Bridge format
    if (obj.message && typeof obj.message === 'object' && typeof (obj.message as Record<string, unknown>).content === 'string') {
      const msgContent = (obj.message as Record<string, unknown>).content as string;
      return { content: msgContent, metadata: { format: 'provider_bridge' } };
    }
  }

  return {
    content: `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
    metadata: { format: 'unknown_fallback' },
  };
}

async function executeWorkflow(userMessage: string, workflowType: WorkflowType, attachments?: unknown[]): Promise<{ content: string; metadata: Record<string, unknown> }> {
  if (workflowType === 'n8n-multi-workflow') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
      const response = await fetch(N8N_MULTI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ message: userMessage, options: { timeout: 660000 } }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Provider-Bridge HTTP ${response.status}: ${text.slice(0, 300)}`);
      }

      const json = (await response.json()) as unknown;
      return normalizeN8nResponse(json, N8N_MULTI_ENDPOINT);
    } catch (error) {
      clearTimeout(timer);
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        content: `⚠️ **Erreur Provider-Bridge Multi-Workflow**\n\nImpossible de joindre l'endpoint \`${N8N_MULTI_ENDPOINT}\`.\n\n- **Détail**: \`${errMsg}\``,
        metadata: { format: 'error', error: errMsg },
      };
    }
  }

  // Standard n8n switch-case router
  const endpoint = resolveN8nEndpoint(userMessage);

  if (endpoint === SENTINEL_DATABASE) {
    return {
      content: `| Database |\n|----------|\n| [Ouvrir le formulaire Database](${N8N_BASE_URL}/database) |`,
      metadata: { format: 'local_database' },
    };
  }

  if (endpoint === SENTINEL_NOTIFICATION) {
    return {
      content: '| Notification |\n|--------------|\n| Merci d’exécuter les commandes prévues dans le « Bouton démarrer » ou le Guide utilisateur. Le cas échéant, se référer à l’éditeur de la suite E-audit. |',
      metadata: { format: 'local_notification' },
    };
  }

  const requestBody = attachments && attachments.length > 0 ? { data: { question: userMessage, attachments } } : { question: userMessage };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 300)}` : ''}`);
    }

    const rawText = await response.text();
    if (!rawText.trim()) {
      return {
        content: `⚠️ Le workflow n8n (\`${endpoint}\`) a renvoyé une réponse vide.`,
        metadata: { format: 'empty', endpoint },
      };
    }

    const parsed = JSON.parse(rawText) as unknown;
    const normalized = normalizeN8nResponse(parsed, endpoint);
    return {
      content: normalized.content,
      metadata: { ...normalized.metadata, endpoint },
    };
  } catch (error) {
    clearTimeout(timer);
    const err = error instanceof Error ? error : new Error(String(error));
    const isTimeout = err.name === 'AbortError';
    return {
      content: isTimeout ? `⏱️ **Timeout n8n**: Le workflow (\`${endpoint}\`) n'a pas répondu dans le délai imparti.` : `🌐 **Erreur de connexion n8n**\n\nEndpoint ciblé : \`${endpoint}\`\n\n**Détail :** \`${err.message}\`\n\n*Astuce : vérifiez que le webhook n8n est actif et accessible depuis ce serveur, ou utilisez le menu **Démarrer** pour envoyer une commande structurée.*`,
      metadata: { format: 'error', endpoint, error: err.message },
    };
  }
}

// ---------------------------------------------------------------------------
// Auth Middleware
// ---------------------------------------------------------------------------

function getTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  return req.cookies?.eaudit_token as string | undefined;
}

function authenticateMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentification requise' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: 'admin' | 'user' };
    const userExists = store.users.find((u) => u.id === decoded.id);
    if (!userExists) {
      res.status(401).json({ success: false, message: 'Session invalide' });
      return;
    }
    req.user = { id: userExists.id, username: userExists.username, role: userExists.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expirée' });
  }
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return req.secure;
}

function setAuthCookie(req: Request, res: Response, user: StoredUser, remember?: boolean): string {
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: remember ? '30d' : '24h',
  });
  const secure = isHttpsRequest(req);
  res.cookie('eaudit_token', token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: (remember ? 30 : 1) * 24 * 60 * 60 * 1000,
  });
  return token;
}

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------

async function createServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'e-audit-web', port: PORT });
  });

  // ── Auth Routes ────────────────────────────────────────────────────────────
  app.get('/api/auth/user', (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ success: false });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = store.users.find((u) => u.id === decoded.id);
      if (!user) {
        res.status(401).json({ success: false });
        return;
      }
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch {
      res.status(401).json({ success: false });
    }
  });

  app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const cleanUser = (username || '').trim();
    if (!cleanUser || cleanUser.length < 3) {
      res.status(400).json({ success: false, message: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    if (store.users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      res.status(409).json({ success: false, message: "Ce nom d'utilisateur existe déjà." });
      return;
    }

    const newUser: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username: cleanUser,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'user',
      createdAt: Date.now(),
    };
    store.users.push(newUser);
    saveStore();
    const token = setAuthCookie(req, res, newUser, true);

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  });

  app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const { username, password, remember } = req.body as { username?: string; password?: string; remember?: boolean };
    const cleanUser = (username || '').trim();
    if (!cleanUser || !password) {
      res.status(400).json({ success: false, message: 'Veuillez remplir tous les champs.' });
      return;
    }

    const found = store.users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (!found || !bcrypt.compareSync(password, found.passwordHash)) {
      res.status(401).json({ success: false, message: 'Identifiants invalides.' });
      return;
    }

    const token = setAuthCookie(req, res, found, remember);
    res.json({
      success: true,
      token,
      user: { id: found.id, username: found.username, role: found.role },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const secure = isHttpsRequest(req);
    res.clearCookie('eaudit_token', {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
    });
    res.json({ success: true });
  });

  // ── Isolated Conversations & Messages Routes ───────────────────────────────
  app.get('/api/conversations', authenticateMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const list = store.conversations.filter((c) => c.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
    res.json({ success: true, conversations: list });
  });

  app.post('/api/conversations', authenticateMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, type } = req.body as { name?: string; type?: WorkflowType };
    const now = Date.now();
    const conv: StoredConversation = {
      id: `conv_${now}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      name: (name || 'Nouvelle mission E-audit').trim().slice(0, 120),
      type: type === 'n8n-multi-workflow' ? 'n8n-multi-workflow' : 'n8n',
      createdAt: now,
      updatedAt: now,
    };
    store.conversations.push(conv);
    saveStore();
    res.status(201).json({ success: true, conversation: conv });
  });

  app.get('/api/conversations/:id', authenticateMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const conv = store.conversations.find((c) => c.id === req.params.id && c.userId === userId);
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation introuvable' });
      return;
    }
    const messages = store.messages.filter((m) => m.conversationId === conv.id && m.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
    res.json({ success: true, conversation: conv, messages });
  });

  app.delete('/api/conversations/:id', authenticateMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const idx = store.conversations.findIndex((c) => c.id === req.params.id && c.userId === userId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Conversation introuvable' });
      return;
    }
    store.conversations.splice(idx, 1);
    store.messages = store.messages.filter((m) => !(m.conversationId === req.params.id && m.userId === userId));
    saveStore();
    res.json({ success: true });
  });

  app.patch('/api/conversations/:id/messages/:messageId', authenticateMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { content, metadataPatch } = req.body as { content?: string; metadataPatch?: Record<string, unknown> };
    const msg = store.messages.find((m) => m.id === req.params.messageId && m.conversationId === req.params.id && m.userId === userId);
    if (!msg) {
      res.status(404).json({ success: false, message: 'Message introuvable' });
      return;
    }
    let changed = false;
    if (typeof content === 'string') {
      msg.content = content;
      changed = true;
    }
    if (metadataPatch && typeof metadataPatch === 'object' && !Array.isArray(metadataPatch)) {
      const existingMeta = msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {};
      const nextMeta: Record<string, unknown> = { ...existingMeta };
      for (const [key, val] of Object.entries(metadataPatch)) {
        if (key === 'consoData' && val && typeof val === 'object' && !Array.isArray(val)) {
          const prevConso = existingMeta.consoData && typeof existingMeta.consoData === 'object' ? (existingMeta.consoData as Record<string, unknown>) : {};
          nextMeta.consoData = { ...prevConso, ...(val as Record<string, unknown>) };
        } else {
          nextMeta[key] = val;
        }
      }
      msg.metadata = nextMeta;
      changed = true;
    }
    if (changed) {
      saveStore();
    }
    res.json({ success: true, message: msg });
  });

  app.post('/api/conversations/:id/send', authenticateMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const conv = store.conversations.find((c) => c.id === req.params.id && c.userId === userId);
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation introuvable' });
      return;
    }

    const { content, attachments } = req.body as { content?: string; attachments?: unknown[] };
    const trimmed = (content || '').trim();
    if (!trimmed) {
      res.status(400).json({ success: false, message: 'Le message est vide' });
      return;
    }

    const userMsg: StoredMessage = {
      id: `msg_${Date.now()}_u_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: conv.id,
      userId,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    store.messages.push(userMsg);

    // Update conversation title if it's still generic
    if (conv.name === 'Nouvelle mission E-audit' || conv.name === 'New Conversation') {
      const firstLine = trimmed.split('\n')[0].replace(/^-\s*/, '').slice(0, 60);
      conv.name = firstLine || conv.name;
    }
    conv.updatedAt = Date.now();
    saveStore();

    const result = await executeWorkflow(trimmed, conv.type, attachments);

    const assistantMsg: StoredMessage = {
      id: `msg_${Date.now()}_a_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: conv.id,
      userId,
      role: 'assistant',
      content: result.content,
      metadata: result.metadata,
      createdAt: Date.now(),
    };
    store.messages.push(assistantMsg);
    conv.updatedAt = Date.now();
    saveStore();

    res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversation: conv,
    });
  });

  // Vite / Static Frontend Serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 E-audit Web Server running on http://${HOST}:${PORT}`);
  });
}

void createServer();
