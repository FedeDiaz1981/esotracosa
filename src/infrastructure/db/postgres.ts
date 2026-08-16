import { Pool, type PoolConfig } from "pg";

const databaseUrl = process.env.DATABASE_URL_POOLER || process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;

const isRemotePostgres = Boolean(databaseUrl && /supabase\.co|render\.com/i.test(databaseUrl));

let poolPromise: Promise<Pool> | null = null;

function buildPoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    ssl: isRemotePostgres
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    max: 5,
    keepAlive: true,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  };
}

async function createPool() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  return new Pool(buildPoolConfig(databaseUrl));
}

async function getPool() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
}

function isTransientConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("connection closed") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("terminating connection") ||
    message.includes("socket hang up") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("enetunreach") ||
    message.includes("queryaaaa") ||
    message.includes("query aaaa") ||
    message.includes("timeout")
  );
}

async function resetPool() {
  const previous = poolPromise;
  poolPromise = null;

  try {
    const pool = previous ? await previous : null;
    if (pool) {
      await pool.end().catch(() => undefined);
    }
  } catch {
    // Si el pool ya estaba roto, lo recreamos en la próxima llamada.
  }
}

async function withRetry<T>(runner: (pool: Pool) => Promise<T>) {
  try {
    const pool = await getPool();
    return await runner(pool);
  } catch (error) {
    if (!isTransientConnectionError(error)) {
      throw error;
    }

    await resetPool();
    const pool = await getPool();
    return runner(pool);
  }
}

export const postgresPool: Pool | null = databaseUrl
  ? (new Proxy({} as Pool, {
      get(_target, prop) {
        if (prop === "query") {
          return async (...args: unknown[]) =>
            withRetry(async (pool) => (pool.query as (...queryArgs: unknown[]) => Promise<unknown>)(...args));
        }

        if (prop === "connect") {
          return async () => withRetry(async (pool) => pool.connect());
        }

        if (prop === "end") {
          return async () => {
            await resetPool();
          };
        }

        return undefined;
      },
    }) as Pool)
  : null;
