// Module state lives on globalThis so the ESM and CJS builds, and duplicate installs, share one system.
const k_datamine_globals_symbol = Symbol.for("@blamnetwork/datamine");

type t_datamine_globals_table = Record<string, unknown>;

function datamine_globals_table(): t_datamine_globals_table {
  const holder = globalThis as unknown as Record<
    symbol,
    t_datamine_globals_table | undefined
  >;
  let table = holder[k_datamine_globals_symbol];
  if (table === undefined) {
    table = {};
    holder[k_datamine_globals_symbol] = table;
  }
  return table;
}

export function datamine_globals_get<T>(key: string, create: () => T): T {
  const table = datamine_globals_table();
  if (!(key in table)) {
    table[key] = create();
  }
  return table[key] as T;
}
