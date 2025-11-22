class WsHub {
  private subscribers = new Map<string, Set<any>>();

  subscribe(orderId: string, stream: any) {
    if (!this.subscribers.has(orderId)) this.subscribers.set(orderId, new Set());
    this.subscribers.get(orderId)!.add(stream);
    stream.socket.on('close', () => {
      this.subscribers.get(orderId)?.delete(stream);
      if (this.subscribers.get(orderId)?.size === 0) this.subscribers.delete(orderId);
    });
  }

  publish(orderId: string, data: any) {
    const payload = JSON.stringify(data);
    this.subscribers.get(orderId)?.forEach((s) => s.socket.send(payload));
  }

  async closeAll() {
    this.subscribers.forEach((set) => set.forEach((s) => s.socket.close()));
    this.subscribers.clear();
  }
}

export const wsHub = new WsHub();
