export interface RouteBase {
  reason?: string;
  cleanText?: string;
}

export interface EscalationRoute extends RouteBase {
  type: "escalation";
  reason: string;
}

export interface ResolutionRoute extends RouteBase {
  type: "resolution";
  reason: string;
}

export interface ReplyRoute extends RouteBase {
  type: "reply";
  cleanText: string;
}

export type RouteDecision = EscalationRoute | ResolutionRoute | ReplyRoute;
