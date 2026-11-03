// `--assert "<path>[@<checkpoint>]<op><value>"` (SPEC §15.2). v1's checkpoint is a tick, `@<tick>`. A battle in
// rounds' is the end of round n, `@r<n>`, or tick t of its clash, `@r<n>:<t>` (R2a plan Call 17).

export interface Assertion { text: string; path: string; tick?: number; checkpoint?: string; op: string; value: string }

export function parseAssert(text: string): Assertion {
  const m = text.match(/^([^@<>=!]+?)(?:@(?:(\d+)|(r\d+(?::\d+)?)))?\s*(<=|>=|!=|=|<|>)\s*(.+)$/);
  if (!m) throw new Error(`bad --assert "${text}" (expected <path>[@<tick> | @r<n> | @r<n>:<tick>]<op><value>)`);
  const a: Assertion = { text, path: m[1]!.trim(), op: m[4]!, value: m[5]!.trim() };
  if (m[2] !== undefined) a.tick = Number(m[2]);
  if (m[3] !== undefined) a.checkpoint = m[3];
  return a;
}

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.match(/[^.[\]]+/g) ?? []) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Returns null if the assertion holds, else a description of the failure. */
export function checkAssert(result: Record<string, unknown>, a: Assertion): string | null {
  let source: unknown = result;
  const key = a.tick !== undefined ? String(a.tick) : a.checkpoint;
  if (key !== undefined) {
    const at = (result.at as Record<string, unknown> | undefined)?.[key];
    if (!at) {
      return a.tick !== undefined
        ? `${a.text}: no summary recorded at tick ${a.tick} (battle ended at ${String(result.durationTicks)})`
        : `${a.text}: no summary recorded at ${key} (the battle reached round ${String(result.rounds)})`;
    }
    source = at;
  }
  let actual = getPath(source, a.path);
  const numeric = /^-?\d+(\.\d+)?$/.test(a.value);
  if (actual === undefined && numeric && /(spawned|merges|events|stats)/.test(a.path)) actual = 0;
  let ok: boolean;
  if (numeric && typeof actual === 'number') {
    const v = Number(a.value);
    ok = a.op === '=' ? actual === v : a.op === '!=' ? actual !== v : a.op === '<' ? actual < v
      : a.op === '<=' ? actual <= v : a.op === '>' ? actual > v : actual >= v;
  } else {
    const s = String(actual);
    if (a.op === '=') ok = s === a.value;
    else if (a.op === '!=') ok = s !== a.value;
    else return `${a.text}: operator ${a.op} needs a number, got ${JSON.stringify(actual)}`;
  }
  return ok ? null : `${a.text}: actual ${JSON.stringify(actual)}`;
}
