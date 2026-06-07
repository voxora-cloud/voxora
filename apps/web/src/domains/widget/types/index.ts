export interface WidgetAppearanceSettings {
  theme: "dark" | "light";
  welcomeMessage: string;
}

export interface WidgetBehaviorSettings {
  showWidget: boolean;
  showOnlyOnSelectedPages: boolean;
  allowedPageRules: string[];
  autoOpen: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
}

export interface WidgetAiSettings {
  enabled: boolean;
  model: string;
  fallbackToAgent: boolean;
}

export interface WidgetConversationSettings {
  collectUserInfo: {
    name: boolean;
    email: boolean;
    phone?: boolean;
  };
}

export interface WidgetFeatureSettings {
  endUserDomAccess: boolean;
}

export interface WidgetSuggestion {
  text: string;
  showOutside: boolean;
}

export interface CreateWidgetData {
  _id?: string;
  displayName: string;

  appearance: WidgetAppearanceSettings;
  behavior: WidgetBehaviorSettings;
  ai: WidgetAiSettings;
  conversation: WidgetConversationSettings;
  features: WidgetFeatureSettings;
  suggestions: WidgetSuggestion[];
}

export interface UpdateWidgetData {
  displayName?: string;

  appearance?: WidgetAppearanceSettings;
  behavior?: WidgetBehaviorSettings;
  ai?: WidgetAiSettings;
  conversation?: WidgetConversationSettings;
  features?: WidgetFeatureSettings;
  suggestions?: WidgetSuggestion[];
}

export interface Widget extends CreateWidgetData {
  createdAt?: Date;
  updatedAt?: Date;
}


export interface WidgetResponse {
  success: boolean;
  data: Widget;
}
