import { createBrowserRouter, Navigate } from "react-router";
import App from "../App";
import LoginPage from "../domains/auth/pages/login/page";
import SetupPage from "../domains/auth/pages/setup/page";
import PasswordRecoveryPage from "../domains/auth/pages/password-recovery/page";

import AcceptInvitePage from "../domains/auth/pages/accept-invite/page";
import { SelectOrgPage } from "@/domains/auth/pages/select-org/page";
import { DashboardHomePage } from "@/domains/dashboard/pages/page";
import { TicketsPage } from "@/domains/tickets/pages/tickets-page";

import { MembersPage } from "@/domains/member/pages/members-page";
import { RolesPage } from "@/domains/member/pages/roles-page";
import { ContactsPage } from "@/domains/contacts/pages/contacts-page";
import { AgentsPage } from "@/domains/agent/pages/page";
import { WidgetPage } from "@/domains/widget/pages/page";
import { ConversationLayout } from "@/domains/conversation/components/conversation-layout";
import { ConversationsInboxPage } from "@/domains/conversation/pages/inbox-page";
import { ConversationChatPage } from "@/domains/conversation/pages/chat-page";
import { KnowledgeStaticPage } from "@/domains/knowledge/pages/static-page";
import { KnowledgeRealtimePage } from "@/domains/knowledge/pages/realtime-page";
import { GeneralSettingsPage } from "@/domains/settings/pages/general-page";
import { DangerZonePage } from "@/domains/settings/pages/danger-zone-page";
import { PlansPage } from "@/domains/billing/pages/plans-page";
import { UsagePage } from "@/domains/billing/pages/usage-page";
import { BillingSuccessPage } from "@/domains/billing/pages/billing-success-page";
import { BillingFailedPage } from "@/domains/billing/pages/billing-failed-page";
import { WhiteLabelPage } from "@/domains/settings/pages/white-label-page";
import { CreateOrganizationPage } from "@/domains/auth/pages/create-organization/page";
import { DashboardLayout } from "@/shared/layouts/dashboard-layout";
import { ProtectedRoute } from "@/domains/auth/components/protected-route";
import { EeFeatureGate } from "@/shared/components/ee-feature-gate";
import QRCodeGeneratorPage from "@/domains/widget/pages/qr-generator-page";
import QRScannerLandingPage from "@/domains/widget/pages/qr-scanner-landing-page";
import { ChannelsPage } from "@/domains/channels/pages/channels-page";
import { EmailChannelSetupPage } from "@/domains/channels/pages/email-channel-setup";
import { WhatsAppChannelSetupPage } from "@/domains/channels/pages/whatsapp-channel-setup";
import { TelegramChannelSetupPage } from "@/domains/channels/pages/telegram-channel-setup";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
    },
    {
        path: "/auth/login",
        element: <LoginPage />,
    },
    {
        path: "/auth/signup",
        element: <SetupPage />,
    },
    {
        path: "/auth/password-recovery",
        element: <PasswordRecoveryPage />,
    },
    {
        path: "/auth/accept-invite",
        element: <AcceptInvitePage />,
    },
    {
        path: "/select-org",
        element: <SelectOrgPage />,
    },
    {
        path: "/organizations/create",
        element: <CreateOrganizationPage />,
    },
    {
        path: "/dashboard",
        element: (
            <ProtectedRoute requiredRole="agent">
                <DashboardLayout>
                    <DashboardHomePage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },

    {
        path: "/dashboard/conversations",
        element: <Navigate to="/dashboard/conversations/inbox" replace />,
    },
    {
        path: "/dashboard/conversations/inbox",
        element: (
            <ProtectedRoute requiredRole="agent">
                <DashboardLayout>
                    <ConversationLayout>
                        <ConversationsInboxPage />
                    </ConversationLayout>
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/conversations/inbox/chat/:conversationId",
        element: (
            <ProtectedRoute requiredRole="agent">
                <DashboardLayout>
                    <ConversationLayout>
                        <ConversationChatPage />
                    </ConversationLayout>
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/agents",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <AgentsPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/members",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <MembersPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/members/roles",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <RolesPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/tickets",
        element: (
            <ProtectedRoute requiredRole="agent">
                <DashboardLayout>
                    <TicketsPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/contacts/all-contacts",
        element: (
            <ProtectedRoute requiredRole="agent">
                <DashboardLayout>
                    <ContactsPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/widget",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <WidgetPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/widget/qr",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <QRCodeGeneratorPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/c/:publicKey",
        element: <QRScannerLandingPage />,
    },
    {
        path: "/dashboard/channels",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <ChannelsPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/channels/email",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <EmailChannelSetupPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/channels/whatsapp",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <WhatsAppChannelSetupPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/channels/telegram",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <TelegramChannelSetupPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/knowledge",
        element: (
            <DashboardLayout>
                <Navigate to="/dashboard/knowledge/static" replace />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/knowledge/static",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <KnowledgeStaticPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/knowledge/realtime",
        element: (
            <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                    <KnowledgeRealtimePage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/settings",
        element: (
            <DashboardLayout>
                <Navigate to="/dashboard/settings/general" replace />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/settings/general",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <GeneralSettingsPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/settings/billing",
        element: <Navigate to="/dashboard/settings/billing/plans" replace />,
    },
    {
        path: "/dashboard/settings/billing/plans",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <PlansPage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/settings/billing/usage",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <UsagePage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/settings/billing/success",
        element: (
            <DashboardLayout>
                <BillingSuccessPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/settings/billing/failed",
        element: (
            <DashboardLayout>
                <BillingFailedPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/settings/white-label",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <EeFeatureGate feature="white-label">
                        <WhiteLabelPage />
                    </EeFeatureGate>
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/settings/danger-zone",
        element: (
            <ProtectedRoute requiredRole="founder">
                <DashboardLayout>
                    <DangerZonePage />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    },
    {
        path: "/dashboard/organizations/create",
        element: <Navigate to="/organizations/create" replace />,
    },
    {
        path: "/dashboard/*",
        element: (
            <DashboardLayout>
                <div className="flex h-screen w-full items-center justify-center">
                    <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
                </div>
            </DashboardLayout>
        ),
    },
    {
        path: "*",
        element: (
            <div className="flex h-screen w-full items-center justify-center">
                <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
            </div>
        )
    }
]);

export default router;
