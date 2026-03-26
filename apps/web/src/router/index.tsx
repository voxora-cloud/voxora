import { createBrowserRouter, Navigate } from "react-router";
import App from "../App";
import LoginPage from "../domains/auth/pages/login/page";
import SetupPage from "../domains/auth/pages/setup/page";
import PasswordRecoveryPage from "../domains/auth/pages/password-recovery/page";
import AcceptInvitePage from "../domains/auth/pages/accept-invite/page";
import { SelectOrgPage } from "@/domains/auth/pages/select-org/page";
import { DashboardHomePage } from "@/domains/dashboard/pages/page";
import { TeamsPage } from "@/domains/teams/pages/page";
import { MembersPage } from "@/domains/member/pages/members-page";
import { RolesPage } from "@/domains/member/pages/roles-page";
import { ContactsPage } from "@/domains/contacts/pages/contacts-page";
import { AgentsPage } from "@/domains/agent/pages/page";
import { ContactSegmentsPage } from "@/domains/contacts/pages/segments-page";
import { WidgetPage } from "@/domains/widget/pages/page";
import { ConversationLayout } from "@/domains/conversation/components/conversation-layout";
import { ConversationsInboxPage } from "@/domains/conversation/pages/inbox-page";
import { ConversationChatPage } from "@/domains/conversation/pages/chat-page";
import { KnowledgeStaticPage } from "@/domains/knowledge/pages/static-page";
import { KnowledgeRealtimePage } from "@/domains/knowledge/pages/realtime-page";
import { GeneralSettingsPage } from "@/domains/settings/pages/general-page";
import { DangerZonePage } from "@/domains/settings/pages/danger-zone-page";
import { CreateOrganizationPage } from "@/domains/organization/pages/create-organization-page";
import { DashboardLayout } from "@/shared/layouts/dashboard-layout";
import QRCodeGeneratorPage from "@/domains/widget/pages/qr-generator-page";
import QRScannerLandingPage from "@/domains/widget/pages/qr-scanner-landing-page";

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
        path: "/auth/setup",
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
            <DashboardLayout>
                <DashboardHomePage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/teams",
        element: (
            <DashboardLayout>
                <TeamsPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/conversations/inbox",
        element: (
            <DashboardLayout>
                <ConversationLayout>
                    <ConversationsInboxPage />
                </ConversationLayout>
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/conversations/inbox/chat/:conversationId",
        element: (
            <DashboardLayout>
                <ConversationLayout>
                    <ConversationChatPage />
                </ConversationLayout>
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/agents",
        element: (
            <DashboardLayout>
                <AgentsPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/members",
        element: (
            <DashboardLayout>
                <MembersPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/members/roles",
        element: (
            <DashboardLayout>
                <RolesPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/contacts/all-contacts",
        element: (
            <DashboardLayout>
                <ContactsPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/contacts/segments",
        element: (
            <DashboardLayout>
                <ContactSegmentsPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/widget",
        element: (
            <DashboardLayout>
                <WidgetPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/widget/qr",
        element: (
            <DashboardLayout>
                <QRCodeGeneratorPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/c/:publicKey",
        element: <QRScannerLandingPage />,
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
            <DashboardLayout>
                <KnowledgeStaticPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/knowledge/realtime",
        element: (
            <DashboardLayout>
                <KnowledgeRealtimePage />
            </DashboardLayout>
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
            <DashboardLayout>
                <GeneralSettingsPage />
            </DashboardLayout>
        ),
    },
    {
        path: "/dashboard/settings/danger-zone",
        element: (
            <DashboardLayout>
                <DangerZonePage />
            </DashboardLayout>
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
        path:"*",
        element: (
            <div className="flex h-screen w-full items-center justify-center">
                <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
            </div>
        )   
    }
]);

export default router;