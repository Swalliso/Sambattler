// Persistence is injected (SPEC §13.2, §13.8): the run layer only sees this interface. The browser
// passes a localStorage-backed implementation; tests and tools use the in-memory one.

export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get(key: string): string | null { return this.data.get(key) ?? null; }
  set(key: string, value: string): void { this.data.set(key, value); }
  remove(key: string): void { this.data.delete(key); }
}
