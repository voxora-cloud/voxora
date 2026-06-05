type WidgetDefaultSuggestion = {
  text: string;
  showOutside: boolean;
  enabled: boolean;
  source: "manual" | "faq";
  knowledgeId?: string;
};

export const DEFAULT_WIDGET_CONFIG = {
  backgroundColor: "#845C6C",
  appearance: {
    theme: "dark" as const,
    primaryColor: "#845C6C",
    welcomeMessage: "Hi there! How can we help you today?",
  },
  behavior: {
    autoOpen: false,
    showOnMobile: true,
    showOnDesktop: true,
  },
  ai: {
    enabled: true,
    fallbackToAgent: true,
  },
  conversation: {
    collectUserInfo: {
      name: true,
      email: true,
      phone: false,
    },
  },
  features: {
    endUserDomAccess: false,
  },
  suggestions: [] as WidgetDefaultSuggestion[],
};

export const buildDefaultWidgetConfig = () => ({
  backgroundColor: DEFAULT_WIDGET_CONFIG.backgroundColor,
  appearance: { ...DEFAULT_WIDGET_CONFIG.appearance },
  behavior: { ...DEFAULT_WIDGET_CONFIG.behavior },
  ai: { ...DEFAULT_WIDGET_CONFIG.ai },
  conversation: {
    collectUserInfo: { ...DEFAULT_WIDGET_CONFIG.conversation.collectUserInfo },
  },
  features: { ...DEFAULT_WIDGET_CONFIG.features },
  suggestions: DEFAULT_WIDGET_CONFIG.suggestions.map((item) => ({ ...item })),
});
