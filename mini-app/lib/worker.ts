declare const self: Worker;

let heartbeatInterval: number | null = null;

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    self.postMessage({ type: 'heartbeat', timestamp: Date.now() });
  }, 30000); // Send heartbeat every 30 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'start') {
    startHeartbeat();
  } else if (event.data === 'stop') {
    stopHeartbeat();
  }
});

self.addEventListener('beforeunload', () => {
  stopHeartbeat();
}); 