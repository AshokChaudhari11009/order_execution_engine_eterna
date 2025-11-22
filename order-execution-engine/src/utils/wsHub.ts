class WsHub {
  private subscribers = new Map<string, Set<any>>();

  subscribe(orderId: string, connection: any) {
    if (!this.subscribers.has(orderId)) this.subscribers.set(orderId, new Set());
    
    // Fastify WebSocket: connection.socket is the WebSocket instance
    // Handle both connection.socket and direct socket
    const socket = connection.socket || connection;
    
    if (!socket) {
      console.error('WebSocket connection has no socket property');
      return;
    }
    
    this.subscribers.get(orderId)!.add(connection);
    
    // Listen for close event
    socket.on('close', () => {
      this.subscribers.get(orderId)?.delete(connection);
      if (this.subscribers.get(orderId)?.size === 0) this.subscribers.delete(orderId);
    });
  }

  publish(orderId: string, data: any) {
    const payload = JSON.stringify(data);
    this.subscribers.get(orderId)?.forEach((conn) => {
      const socket = conn.socket || conn;
      if (socket && socket.readyState === 1) { // WebSocket.OPEN
        socket.send(payload);
      }
    });
  }

  async closeAll() {
    this.subscribers.forEach((set) => {
      set.forEach((conn) => {
        const socket = conn.socket || conn;
        if (socket) {
          socket.close();
        }
      });
    });
    this.subscribers.clear();
  }
}

export const wsHub = new WsHub();
