export const DEFAULT_WIDGET_CONFIG = {
    backgroundColor: "#845C6C",
    appearance: {
        theme: "dark" as const,
        primaryColor: "#845C6C",
        welcomeMessage: "Welcome to our support chat. Ask a question and we will help you find the right answer or connect you with our team.",
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
