import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function addSseClient(username: string, res: Response): void {
  if (!clients.has(username)) clients.set(username, new Set());
  clients.get(username)!.add(res);
}

export function removeSseClient(username: string, res: Response): void {
  clients.get(username)?.delete(res);
  if ((clients.get(username)?.size ?? 0) === 0) clients.delete(username);
}

function send(res: Response, data: object): void {
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
}

export function pushEvent(toUser: string, payload: object): void {
  clients.get(toUser)?.forEach(res => send(res, payload));
}

export function pushToAll(payload: object): void {
  clients.forEach(conns => conns.forEach(res => send(res, payload)));
}

export function connectedUsers(): string[] {
  return [...clients.keys()];
}
