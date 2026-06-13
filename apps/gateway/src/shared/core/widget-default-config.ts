export const DEFAULT_WIDGET_CONFIG = {
    appearance: {
        theme: "dark" as const,
        welcomeMessage: "Need help? Ask here and we’ll point you in the right direction.",
    },
    behavior: {
        showWidget: true,
        showOnlyOnSelectedPages: false,
        allowedPageRules: [],
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
    suggestions: [
        { text: "Get help with a question", showOutside: true },
        { text: "Learn about services", showOutside: false },
        { text: "Contact support", showOutside: true },]
};

export const buildDefaultWidgetConfig = () => ({
    appearance: { ...DEFAULT_WIDGET_CONFIG.appearance },
    behavior: { ...DEFAULT_WIDGET_CONFIG.behavior },
    ai: { ...DEFAULT_WIDGET_CONFIG.ai },
    conversation: {
        collectUserInfo: { ...DEFAULT_WIDGET_CONFIG.conversation.collectUserInfo },
    },
    features: { ...DEFAULT_WIDGET_CONFIG.features },
    suggestions: DEFAULT_WIDGET_CONFIG.suggestions.map((item) => ({ ...item })),
});
