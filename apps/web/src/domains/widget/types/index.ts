export interface WidgetAppearanceSettings {
  primaryColor: string;
  textColor?: string;
  position: "bottom-right" | "bottom-left";
  launcherText: string;
  welcomeMessage: string;
  logoUrl?: string;
}

export interface WidgetBehaviorSettings {
  autoOpen: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
}

export interface WidgetAiSettings {
  enabled: boolean;
  model: string;
  fallbackToAgent: boolean;
  autoAssign: boolean;
  assignmentStrategy: "round-robin" | "least-loaded";
}

export interface WidgetConversationSettings {
  collectUserInfo: {
    name: boolean;
    email: boolean;
    phone?: boolean;
  };
}

export interface WidgetFeatureSettings {
  acceptMediaFiles: boolean;
  endUserDomAccess: boolean;
}

export interface CreateWidgetData {
  _id?: string;
  displayName: string;
  backgroundColor: string;
  logoUrl: string;
  logoFileKey?: string;
  appearance: WidgetAppearanceSettings;
  behavior: WidgetBehaviorSettings;
  ai: WidgetAiSettings;
  conversation: WidgetConversationSettings;
  features: WidgetFeatureSettings;
}

export interface UpdateWidgetData {
  displayName?: string;
  backgroundColor?: string;
  logoUrl?: string;
  appearance?: WidgetAppearanceSettings;
  behavior?: WidgetBehaviorSettings;
  ai?: WidgetAiSettings;
  conversation?: WidgetConversationSettings;
  features?: WidgetFeatureSettings;
}

export interface Widget extends CreateWidgetData {
  createdAt?: Date;
  updatedAt?: Date;
}


export interface WidgetResponse {
  success: boolean;
  data: Widget;
}
