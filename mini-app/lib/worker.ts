// @ts-nocheck
const ctx: Worker = self as any;

let heartbeatInterval: number | null = null;

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    ctx.postMessage({ type: 'heartbeat', timestamp: Date.now() });
  }, 30000); // Send heartbeat every 30 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

ctx.addEventListener('message', (event) => {
  if (event.data === 'start') {
    startHeartbeat();
  } else if (event.data === 'stop') {
    stopHeartbeat();
  }
});

ctx.addEventListener('beforeunload', () => {
  stopHeartbeat();
}); 