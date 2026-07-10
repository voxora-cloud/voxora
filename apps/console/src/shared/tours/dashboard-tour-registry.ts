import type { DriveStep } from "driver.js";

export type DashboardTourStep = DriveStep;

const tourSelector = (id: string) => `[data-tour-id="${id}"]`;

const step = (
  id: string,
  title: string,
  description: string,
  side: NonNullable<DriveStep["popover"]>["side"] = "bottom",
  align: NonNullable<DriveStep["popover"]>["align"] = "start",
): DashboardTourStep => ({
  element: tourSelector(id),
  popover: {
    title,
    description,
    side,
    align,
  },
});

const pageTours: Record<string, DashboardTourStep[]> = {
  dashboard: [
    step("dashboard-org-switcher", "Your organization", "This box shows the active organization for the dashboard. Switch it before making workspace changes or reviewing organization data.", "right"),
    step("page-dashboard-heading", "Analytics dashboard", "Track organization performance, message flow, and support outcomes from this overview."),
    step("page-dashboard-actions", "Refresh analytics", "Reload the latest dashboard metrics when you need a fresh read."),
    step("page-dashboard-metrics", "Summary metrics", "Scan the headline numbers for conversations, messages, response time, and resolution health."),
    step("page-dashboard-charts", "Trends and charts", "Use these charts to spot volume patterns and conversation status changes."),
    step("page-dashboard-most-asked-questions", "Most asked questions", "Review recurring customer prompts from recent AI conversations.", "top"),
    step("page-dashboard-interaction-sources", "AI interaction sources", "See where AI conversations are coming from, including widget, QR, link, email, and messaging channels.", "top"),
  ],
  inbox: [
    step("sidebar-nav-inbox", "Inbox navigation", "This opens the conversation inbox for unassigned and assigned conversations.", "right"),
    step("page-inbox-heading", "Conversation inbox", "Manage customer conversations from the shared support inbox."),
    step("page-inbox-tabs", "Inbox views", "Switch between unassigned and assigned conversations based on your workflow."),
    step("page-inbox-search", "Conversation search", "Filter the inbox when you need to find a specific conversation quickly."),
    step("page-inbox-list", "Conversation list", "Select a conversation to inspect details and continue the exchange."),
  ],
  "conversation-detail": [
    step("sidebar-nav-inbox", "Inbox navigation", "Return to the inbox whenever you need to switch conversations.", "right"),
    step("page-conversation-detail", "Conversation workspace", "Review the thread, customer context, and available conversation actions here."),
  ],
  tickets: [
    step("sidebar-nav-tickets", "Tickets navigation", "Tickets collect tracked issues that need follow-up or resolution.", "right"),
    step("page-tickets-heading", "Tickets management", "Monitor and triage support tickets from this queue."),
    step("page-tickets-metrics", "Ticket metrics", "Use these cards to understand ticket volume and current workload."),
    step("page-tickets-filters", "Queue filters", "Search, filter, and sort the queue to focus on the right tickets."),
    step("page-tickets-list", "Ticket queue", "Open a ticket to inspect its timeline, contact details, and notes."),
  ],
  "ticket-detail": [
    step("sidebar-nav-tickets", "Tickets navigation", "Return to the ticket queue from the sidebar when you are done reviewing details.", "right"),
    step("page-ticket-detail-heading", "Ticket detail", "Review title, status, priority, assignment, and key ticket metadata."),
    step("page-ticket-detail-description", "Description", "Use the description to understand the customer issue and expected outcome."),
    step("page-ticket-detail-timeline", "Timeline", "Follow notes and resolution activity from the ticket lifecycle."),
    step("page-ticket-detail-contact", "Contact context", "Use customer details to personalize follow-up and verify ownership."),
  ],
  contacts: [
    step("sidebar-nav-contacts", "Contacts navigation", "All Contacts keeps customer profiles and activity in one searchable place.", "right"),
    step("page-contacts-heading", "Contacts", "Manage customer records, tags, and recent activity."),
    step("page-contacts-primary-action", "Add contact", "Create a new customer profile manually when needed."),
    step("page-contacts-filters", "Contact filters", "Filter contacts by activity, volume, and sorting preference."),
    step("page-contacts-search", "Contact search", "Search by name, email, phone, or company."),
    step("page-contacts-list", "Contacts table", "Review profiles, select rows, and use bulk actions from the contact list."),
  ],
  channels: [
    step("sidebar-nav-channels", "Channels navigation", "Channels connect external sources like email, WhatsApp, and Telegram.", "right"),
    step("page-channels-heading", "Channels", "Set up and monitor the communication channels that feed your inbox."),
    step("page-channels-email", "Email channel", "Connect support email addresses and manage their inbound routing."),
    step("page-channels-whatsapp", "WhatsApp channel", "Connect WhatsApp through provider credentials and webhook settings."),
    step("page-channels-telegram", "Telegram channel", "Connect a Telegram bot so customer messages reach InteraOne."),
  ],
  agents: [
    step("sidebar-nav-agents", "Agents navigation", "Agents are the support users assigned to live customer work.", "right"),
    step("page-agents-heading", "Agents", "Review invited and active agents for the organization."),
    step("page-agents-table", "Agent table", "Search, filter, inspect, and manage agents from this table."),
  ],
  members: [
    step("sidebar-nav-members", "Members navigation", "Members includes everyone with organization access and their roles.", "right"),
    step("page-members-heading", "Organization members", "Invite teammates and manage access from this page."),
    step("page-members-primary-action", "Invite member", "Invite a teammate and choose their role."),
    step("page-members-table", "Members table", "Review status, role, and available member actions."),
  ],
  "knowledge-static": [
    step("sidebar-nav-knowledge-static", "Static knowledge", "Static knowledge stores uploaded documents, text, and FAQs for AI answers.", "right"),
    step("page-knowledge-static-heading", "Knowledge base", "Manage the static content your AI assistant can retrieve from."),
    step("page-knowledge-static-primary-action", "Add knowledge", "Add documents, text, or FAQs to improve AI responses."),
    step("page-knowledge-static-tabs", "Documents and FAQs", "Switch between document-style knowledge and frequently asked questions."),
    step("page-knowledge-static-list", "Knowledge list", "Review status, indexing details, and item actions."),
  ],
  "knowledge-realtime": [
    step("sidebar-nav-knowledge-realtime", "Realtime knowledge", "Realtime knowledge syncs live URLs so AI answers stay current.", "right"),
    step("page-knowledge-realtime-heading", "Realtime knowledge", "Manage live web sources that are fetched or crawled for AI retrieval."),
    step("page-knowledge-realtime-primary-action", "Add live source", "Connect a URL and choose how often it should sync."),
    step("page-knowledge-realtime-list", "Live source table", "Track source health, sync status, and available source actions."),
  ],
  widget: [
    step("sidebar-nav-widget", "Widget navigation", "Configure the customer-facing chat widget from this page.", "right"),
    step("page-widget-heading", "Widget setup", "Control how the embedded support widget appears and behaves."),
    step("page-widget-appearance", "Display name", "Set the widget identity visitors see in the chat experience."),
    step("page-widget-features", "Features", "Tune AI, conversation collection, visibility, and advanced widget behavior."),
    step("page-widget-installation", "Installation", "Copy the embed code after the widget is configured."),
    step("page-widget-actions", "Save and summary", "Review the configuration and save changes from the action panel."),
  ],
  qr: [
    step("sidebar-nav-qr-codes", "QR Codes navigation", "QR Codes let visitors open your support widget from a scan.", "right"),
    step("page-qr-heading", "QR code access", "Create a branded QR entry point for the support widget."),
    step("page-qr-preview", "QR preview", "Inspect the generated code before downloading or sharing it."),
    step("page-qr-actions", "QR actions", "Download, copy, or customize the QR code for your use case."),
  ],
  settings: [
    step("sidebar-nav-general", "General settings", "General settings control organization-level profile details.", "right"),
    step("page-settings-general-heading", "General settings", "Manage your organization name and basic account information."),
    step("page-settings-general-form", "Organization form", "Update the organization name shown across the platform."),
  ],
  "danger-zone": [
    step("sidebar-nav-danger-zone", "Danger Zone", "This area contains destructive organization-level actions.", "right"),
    step("page-danger-zone-heading", "Danger Zone", "Review irreversible actions carefully before proceeding."),
    step("page-danger-zone-action", "Delete organization", "Deleting an organization removes its workspace data and requires confirmation."),
  ],
};

export function getDashboardTourRouteKey(pathname: string) {
  if (pathname === "/dashboard" || pathname === "/dashboard/") return "dashboard";
  if (/^\/dashboard\/conversations\/inbox\/chat\/[^/]+\/?$/.test(pathname)) return "conversation-detail";
  if (pathname.startsWith("/dashboard/conversations/inbox")) return "inbox";
  if (/^\/dashboard\/tickets\/[^/]+\/?$/.test(pathname)) return "ticket-detail";
  if (pathname.startsWith("/dashboard/tickets")) return "tickets";
  if (pathname.startsWith("/dashboard/contacts")) return "contacts";
  if (pathname.startsWith("/dashboard/channels")) return "channels";
  if (pathname.startsWith("/dashboard/agents")) return "agents";
  if (pathname.startsWith("/dashboard/members")) return "members";
  if (pathname.startsWith("/dashboard/knowledge/realtime")) return "knowledge-realtime";
  if (pathname.startsWith("/dashboard/knowledge/static")) return "knowledge-static";
  if (pathname.startsWith("/dashboard/widget/qr")) return "qr";
  if (pathname.startsWith("/dashboard/widget")) return "widget";
  if (pathname.startsWith("/dashboard/settings/danger-zone")) return "danger-zone";
  if (pathname.startsWith("/dashboard/settings/general")) return "settings";
  return "shell";
}

export function getDashboardTourSteps(pathname: string) {
  const routeKey = getDashboardTourRouteKey(pathname);
  return pageTours[routeKey] || [];
}
