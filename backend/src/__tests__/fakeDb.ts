export type Result = { data?: unknown; error?: { code?: string; message?: string } | null; count?: number | null };
export type Call = { table: string; op: string; chain: Array<[string, unknown[]]> };

/** A supabase stand-in: each `table.op` has a queue of results, one consumed per awaited query. */
export function fakeDb(results: Record<string, Result[]>) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: 'select', chain: [] };
    const builder: any = new Proxy({}, {
      get(_t, name: string) {
        if (name === 'then') {
          return (resolve: (v: Result) => void) => {
            calls.push(call);
            const next = results[`${table}.${call.op}`]?.shift() ?? { data: null, error: null };
            resolve({ error: null, ...next });
          };
        }
        return (...args: unknown[]) => {
          if (name === 'insert' || name === 'update' || name === 'delete' || name === 'upsert') call.op = name;
          call.chain.push([name, args]);
          return builder;
        };
      },
    });
    return builder;
  };
  return { from, calls };
}
