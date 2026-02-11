/**
 * Voxora Widget Configuration Types
 */
export interface WidgetConfig {
  apiUrl?: string;
  publicKey: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  displayName?: string;
  logoUrl?: string;
  backgroundColor?: string;
}

export interface WidgetState {
  isOpen: boolean;
  unreadCount: number;
  token: string | null;
  conversationId: string | null;
}

export interface WidgetMessage {
  type: 'MINIMIZE_WIDGET' | 'NEW_MESSAGE' | 'READY';
  data?: any;
}

export interface WidgetAuthResponse {
  success: boolean;
  data: {
    token: string;
    config?: {
      displayName: string;
      backgroundColor: string;
      logoUrl: string;
    };
  };
}
