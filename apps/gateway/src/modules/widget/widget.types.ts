export type ServiceError = Error & { statusCode?: number };

export type AIInteractionSource = "widget" | "qr" | "link";
