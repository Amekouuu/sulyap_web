// The migration and seed code talks to the database through a small "executor" object,
// so the same code runs against Supabase (node-postgres) and the in-memory check database (PGlite).
//   exec(sql)            run one or more statements with no parameters
//   query(text, params)  run one statement with $1, $2... parameters, returns { rows }

export function pgExecutor(client) {
  return {
    exec: (sql) => client.query(sql),
    query: (text, params) => client.query(text, params),
  };
}

export function pgliteExecutor(db) {
  return {
    exec: (sql) => db.exec(sql),
    query: (text, params) => db.query(text, params),
  };
}

// Runs fn inside BEGIN/COMMIT on the given executor.
export async function inTransaction(executor, fn) {
  await executor.exec('BEGIN');
  try {
    const result = await fn();
    await executor.exec('COMMIT');
    return result;
  } catch (error) {
    await executor.exec('ROLLBACK');
    throw error;
  }
}
