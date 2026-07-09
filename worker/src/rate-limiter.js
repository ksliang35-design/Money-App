import { DurableObject } from 'cloudflare:workers';

const WINDOW_MS = 60_000;
const LIMIT = 30;

// One instance per IP (see getByName in index.js). Because a Durable Object processes
// requests for a given instance one at a time, and sql.exec() is synchronous, the
// read-then-write below never yields between the check and the update - unlike the
// previous KV-based counter, this can't let extra requests slip through a race.
export class RateLimiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS bucket (
          id INTEGER PRIMARY KEY CHECK (id = 0),
          window_start INTEGER NOT NULL,
          count INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(
        'INSERT OR IGNORE INTO bucket (id, window_start, count) VALUES (0, ?, 0)',
        Date.now(),
      );
    });
  }

  hit() {
    const now = Date.now();
    const { window_start: windowStart, count } = this.ctx.storage.sql
      .exec('SELECT window_start, count FROM bucket WHERE id = 0')
      .one();

    if (now - windowStart >= WINDOW_MS) {
      this.ctx.storage.sql.exec('UPDATE bucket SET window_start = ?, count = 1 WHERE id = 0', now);
      return { allowed: true };
    }

    if (count >= LIMIT) {
      return { allowed: false };
    }

    this.ctx.storage.sql.exec('UPDATE bucket SET count = count + 1 WHERE id = 0');
    return { allowed: true };
  }
}
