import { Socket } from "socket.io-client";

export const PROTO_VERSION = '1';

const RUNTIME_API_URL = '__API_URL_PRODUCTION__';
const params = new URLSearchParams(window.location.search);

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
  _streamText: "",
  _streamRenderedText: "",
  _streamFlushTimer: null as NodeJS.Timeout | number | null,
  _thoughtText: "",
  _thoughtSteps: [] as string[],
  parentOrigin: params.get('origin') || null,
  _connectTimeout: null as NodeJS.Timeout | number | null,
  _isMaximized: false,
  _uiConfig: { appearance: {}, features: {} } as any,
  currentSessionId: null as string | null,
  interactionSource: params.get('source') || 'unknown',
  _historyCached: [] as any[],
};
