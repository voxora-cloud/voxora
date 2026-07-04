import { Socket } from "socket.io-client";

export const PROTO_VERSION = '1';

const RUNTIME_API_URL = '__API_URL_PRODUCTION__';
const params = new URLSearchParams(window.location.search);

export type InteractionSource = 'widget' | 'qr' | 'link';

export interface StreamingMessage {
  content: string;
  element: HTMLElement;
  lastSequence: number;
  status: 'streaming' | 'completed';
}

export function normalizeInteractionSource(value: unknown): InteractionSource {
  if (typeof value !== 'string') return 'widget';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'widget' || normalized === 'qr' || normalized === 'link') {
    return normalized;
  }
  return 'widget';
}

let apiUrl = params.get('apiUrl');
if (!apiUrl && RUNTIME_API_URL && !RUNTIME_API_URL.startsWith('__')) {
  apiUrl = RUNTIME_API_URL;
}
export const API_BASE_URL = apiUrl || 'http://localhost:3002';

console.log('[InteraOneWidget] API URL:', API_BASE_URL);

// Global Mutable State
export const state = {
  chatId: null as string | null,
  userName: "",
  userEmail: "",
  isConnected: false,
  widgetToken: null as string | null,
  InteraOnePublicKey: params.get('publicKey') || params.get('InteraOnePublicKey') || null,
  socket: null as Socket | null,
  typingTimeout: null as NodeJS.Timeout | number | null,
  isTyping: false,
  _escalationShown: false,
  _streamBubbleEl: null as HTMLElement | null,
  _streamMessageId: null as string | null,
  _streamMessages: new Map<string, StreamingMessage>(),
  _completedStreamMessageIds: new Set<string>(),
  parentOrigin: params.get('origin') || null,
  _connectTimeout: null as NodeJS.Timeout | number | null,
  _isMaximized: false,
  _uiConfig: { appearance: {}, features: {} } as any,
  currentSessionId: null as string | null,
  interactionSource: normalizeInteractionSource(params.get('source')),
  _historyCached: [] as any[],
  _aiResponding: false,
  _toolStepsEl: null as HTMLElement | null,
};
