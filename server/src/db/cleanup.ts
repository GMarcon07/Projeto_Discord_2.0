import { db } from './database';

export function runMessageCleanup(): number {
  try {
    const result = db.prepare(`
      DELETE FROM messages 
      WHERE created_at < datetime('now', '-7 days')
    `).run();

    if (result.changes > 0) {
      console.log(`[CLEANUP] Foram removidas ${result.changes} mensagens com mais de 7 dias.`);
    }
    return result.changes;
  } catch (err) {
    console.error('[CLEANUP] Erro ao limpar mensagens antigas:', err);
    return 0;
  }
}

export function startCleanupScheduler(intervalMs = 60 * 60 * 1000) {
  // Run on startup
  runMessageCleanup();

  // Schedule periodic cleanup (default: every 1 hour)
  const timer = setInterval(() => {
    runMessageCleanup();
  }, intervalMs);

  return timer;
}
