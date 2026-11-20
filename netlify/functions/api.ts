import serverless from 'serverless-http';
import { connectLambda } from '@netlify/blobs';

(globalThis as Record<string, unknown>).__EAUDIT_SERVERLESS__ = true;

let cachedHandler: serverless.Handler | null = null;
let ensureStoreFn: ((forceRefresh?: boolean) => Promise<void>) | null = null;

async function getHandler(): Promise<serverless.Handler> {
  if (!cachedHandler || !ensureStoreFn) {
    const { createApiApp, ensureStoreLoaded } = await import('../../server');
    ensureStoreFn = ensureStoreLoaded;
    const app = createApiApp();
    cachedHandler = serverless(app);
  }
  await ensureStoreFn(true);
  return cachedHandler;
}

export const handler = async (event: Record<string, unknown>, context: Record<string, unknown>): Promise<unknown> => {
  try {
    if (event && typeof event === 'object' && 'blobs' in event) {
      connectLambda(event as unknown as Parameters<typeof connectLambda>[0]);
    }
  } catch {
    // Ignore when running outside Netlify Blobs Lambda runtime
  }
  const fn = await getHandler();
  return fn(event, context);
};
