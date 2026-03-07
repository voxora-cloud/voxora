"use client";

import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export default function RolesAndPermissionsPage() {
    const roles = [
        {
            title: "Owner",
            icon: ShieldAlert,
            color: "text-rose-500",
            bgClass: "bg-rose-500/10 border-rose-500/20",
            description: "Full control over the organization. Can manage billing, delete the workspace, and change anyone's role.",
            permissions: [
                "Manage Organization Settings",
                "Delete Workspace",
                "Manage Billing",
                "Invite & Remove Members",
                "Change Member Roles (including other Owners)",
                "Manage API Keys & Integrations",
                "Access All Chats & Analytics",
            ],
        },
        {
            title: "Admin",
            icon: ShieldCheck,
            color: "text-blue-500",
            bgClass: "bg-blue-500/10 border-blue-500/20",
            description: "Administrative access to run the support team. Can manage teams, view analytics, and adjust workflow settings.",
            permissions: [
                "Manage Organization Settings (General)",
                "Invite & Remove Agents",
                "Change Agent Roles (cannot modify Owners)",
                "Create & Manage Teams",
                "Configure Widget & Flow",
                "Access All Chats & Analytics",
            ],
        },
        {
            title: "Agent",
            icon: Shield,
            color: "text-emerald-500",
            bgClass: "bg-emerald-500/10 border-emerald-500/20",
            description: "Support staff access. Can interact with assigned conversations and manage their own profile.",
            permissions: [
                "View and respond to assigned Conversations",
                "Manage personal Profile & Preferences",
                "Transfer chats to other available Agents or Teams",
                "View basic team statistics",
            ],
        },
    ];

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">Roles & Permissions</h1>
                <p className="text-muted-foreground">
                    Review the access levels and capabilities for different roles within your organization.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                        <div key={role.title} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-full">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className={`p-3 rounded-lg border ${role.bgClass}`}>
                                    <Icon className={`w-6 h-6 ${role.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold">{role.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                {role.description}
                            </p>

                            <div className="mt-auto">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Permissions Included
                                </h4>
                                <ul className="space-y-2">
                                    {role.permissions.map((perm, idx) => (
                                        <li key={idx} className="flex items-start">
                                            <div className={`mt-1 h-1.5 w-1.5 rounded-full ${role.color} mr-2 flex-shrink-0`} />
                                            <span className="text-sm text-foreground">{perm}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-lg bg-accent/50 border border-border p-4 flex items-start space-x-3 mt-8">
                <ShieldCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                    <h4 className="text-sm font-medium">Have a special permission request?</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        Custom roles and granular permission matrices are available on the Enterprise tier.
                    </p>
                </div>
            </div>
        </div>
    );
}
