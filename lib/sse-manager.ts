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
  console.info('SSE Manager: Broadcasting to event:', eventId);

  const clients = connectedClients.get(eventId);
  console.info('SSE Manager: Number of connected clients:', clients?.length || 0);

  if (clients) {
    const messageStr = `data: ${message}\n\n`;
    console.info('SSE Manager: Sending message to clients:', messageStr);

    clients.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(messageStr));
        console.info('SSE Manager: Message sent to client successfully');
      } catch (error) {
        console.error('SSE Manager: Error broadcasting to client:', error);
      }
    });
  } else {
    console.info('SSE Manager: No connected clients for event:', eventId);
  }
}
