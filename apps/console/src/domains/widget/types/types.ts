export interface WidgetAppearanceSettings {
  theme: "dark" | "light";
  welcomeMessage: string;
  pattern?:
    | "none"
    | "uiverse-alexruix"
    | "dots"
    | "grid"
    | "island"
    | "3d-cubes"
    | "checkerboard"
    | "hexagonal"
    | "polka"
    | "radial-stripes"
    | "plaid"
    | "diagonal-lines"
    | "waves"
    | "circuit"
    | "blueprint"
    | "carbon"
    | "aurora"
    | "confetti"
    | "topography";
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
  faqId?: string | null;
}

export interface VerifiedWidgetDomain {
  _id: string;
  domain: string;
  verificationToken?: string | null;
  status: "pending" | "verified";
  includeSubdomains: boolean;
  verifiedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  verifiedDomains?: VerifiedWidgetDomain[];
  // Temporary compatibility fields returned for older widget records.
  verifiedDomain?: string | null;
  domainVerificationToken?: string | null;
  domainVerificationStatus?: "pending" | "verified" | null;
}

export interface UpdateWidgetData {
  displayName?: string;

  appearance?: WidgetAppearanceSettings;
  behavior?: WidgetBehaviorSettings;
  ai?: WidgetAiSettings;
  conversation?: WidgetConversationSettings;
  features?: WidgetFeatureSettings;
  suggestions?: WidgetSuggestion[];
  verifiedDomain?: string | null;
  domainVerificationToken?: string | null;
  domainVerificationStatus?: "pending" | "verified" | null;
}

export interface Widget extends CreateWidgetData {
  createdAt?: Date;
  updatedAt?: Date;
  verifiedDomain?: string | null;
  domainVerificationToken?: string | null;
  domainVerificationStatus?: "pending" | "verified" | null;
}

export interface WidgetResponse {
  success: boolean;
  data: Widget;
}

export interface WidgetDomainsResponse {
  success: boolean;
  data: VerifiedWidgetDomain[];
}

export interface WidgetDomainResponse {
  success: boolean;
  data: VerifiedWidgetDomain;
}
