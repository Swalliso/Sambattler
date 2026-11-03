// `--assert "<path>[@<checkpoint>]<op><value>"` (SPEC §15.2): a checkpoint is the end of round n, `@r<n>`, or tick
// t of its clash, `@r<n>:<t>` (R2a plan Call 17).

export interface Assertion { text: string; path: string; checkpoint?: string; op: string; value: string }

export function parseAssert(text: string): Assertion {
  const m = text.match(/^([^@<>=!]+?)(?:@(r\d+(?::\d+)?))?\s*(<=|>=|!=|=|<|>)\s*(.+)$/);
  if (!m) throw new Error(`bad --assert "${text}" (expected <path>[@r<n> | @r<n>:<tick>]<op><value>)`);
  const a: Assertion = { text, path: m[1]!.trim(), op: m[3]!, value: m[4]!.trim() };
  if (m[2] !== undefined) a.checkpoint = m[2];
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
  const key = a.checkpoint;
  if (key !== undefined) {
    const at = (result.at as Record<string, unknown> | undefined)?.[key];
    if (!at) return `${a.text}: no summary recorded at ${key} (the battle reached round ${String(result.rounds)})`;
    source = at;
  }
  let actual = getPath(source, a.path);
  const numeric = /^-?\d+(\.\d+)?$/.test(a.value);
  if (actual === undefined && numeric && /(merges|events|stats)/.test(a.path)) actual = 0;
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
