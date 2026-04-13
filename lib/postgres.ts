import { Pool, type PoolClient, type QueryResult } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __matchControlPool__: Pool | undefined;
}

function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when STORE_MODE=postgres");
  }

  return new Pool({
    connectionString
  });
}

export function getPool(): Pool {
  if (!global.__matchControlPool__) {
    global.__matchControlPool__ = buildPool();
  }
  return global.__matchControlPool__;
}

export async function query<T>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await handler(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
