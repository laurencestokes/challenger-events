// In-memory store for connected SSE clients (in production, use Redis or similar)
const connectedClients = new Map<string, ReadableStreamDefaultController[]>();

export function addSSEClient(eventId: string, controller: ReadableStreamDefaultController) {
  if (!connectedClients.has(eventId)) {
    connectedClients.set(eventId, []);
  }
  connectedClients.get(eventId)!.push(controller);
}

export function removeSSEClient(eventId: string, controller: ReadableStreamDefaultController) {
  const clients = connectedClients.get(eventId);
  if (clients) {
    const index = clients.indexOf(controller);
    if (index > -1) {
      clients.splice(index, 1);
    }
  }
}

export function broadcastToEvent(eventId: string, message: string) {
  const clients = connectedClients.get(eventId);
  if (clients) {
    const messageStr = `data: ${JSON.stringify(message)}\n\n`;
    clients.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(messageStr));
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    });
  }
}
