import type { SupabaseClient } from '@supabase/supabase-js';

export interface QueryResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

export interface MockBuilder {
  eqCalls: Array<[string, unknown]>;
  inserted: unknown[];
  updated: unknown[];
  rangeCalls: Array<[number, number]>;
  select(...args: unknown[]): MockBuilder;
  eq(column: string, value: unknown): MockBuilder;
  in(column: string, values: unknown[]): MockBuilder;
  order(...args: unknown[]): MockBuilder;
  insert(row: unknown): MockBuilder;
  update(row: unknown): MockBuilder;
  limit(n: number): MockBuilder;
  range(from: number, to: number): MockBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2>;
}

/** A chainable, awaitable stand-in for a supabase-js query builder. */
export function mockQuery(result: QueryResult): MockBuilder {
  const builder: MockBuilder = {
    eqCalls: [],
    inserted: [],
    updated: [],
    rangeCalls: [],
    select: () => builder,
    eq: (column, value) => {
      builder.eqCalls.push([column, value]);
      return builder;
    },
    in: () => builder,
    order: () => builder,
    insert: (row) => {
      builder.inserted.push(row);
      return builder;
    },
    update: (row) => {
      builder.updated.push(row);
      return builder;
    },
    limit: () => builder,
    range: (from, to) => {
      builder.rangeCalls.push([from, to]);
      return builder;
    },
    maybeSingle: async () => result,
    single: async () => result,
    then: (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return builder;
}

/**
 * Map table name → builder. Pass an array to return a different builder on
 * each successive `from(table)` call.
 */
export function mockSupabase(tables: Record<string, MockBuilder | MockBuilder[]>): SupabaseClient {
  return {
    from(table: string) {
      const entry = tables[table];
      if (!entry) throw new Error(`Unexpected table in test: ${table}`);
      if (Array.isArray(entry)) {
        const next = entry.shift();
        if (!next) throw new Error(`No more mock results for table: ${table}`);
        return next;
      }
      return entry;
    },
  } as unknown as SupabaseClient;
}
