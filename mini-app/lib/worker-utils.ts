export function createWorker() {
  if (typeof window === 'undefined') return null;
  
  const worker = new Worker(
    new URL('./heartbeat.worker.ts', import.meta.url),
    { type: 'module' }
  );
  
  return worker;
} 