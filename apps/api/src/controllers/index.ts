// Export controllers as namespaces to avoid name collisions (e.g., getProfile, getTeams)
export * as AuthController from "./authController";
export * as ConversationController from "./conversationController";
export * as AgentController from "./agentController";
export * as WidgetController from "./widgetController";
export * as AdminController from "./adminController";
