"use client";

import React from "react";
import { Download, FileDown, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DataExportSettingsPage() {
    const exportItems = [
        {
            title: "Organization Activity",
            description: "A complete record of all configuration changes and member activities in CSV format.",
            icon: <History className="h-5 w-5 text-zinc-500" />,
            size: "approx. 150KB"
        },
        {
            title: "Conversation Data",
            description: "All messages, metadata, and visitor profiles from your chat history in JSON format.",
            icon: <FileDown className="h-5 w-5 text-zinc-500" />,
            size: "approx. 45MB"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Data & Export</h1>
                <p className="text-muted-foreground mt-2">
                    Download your organization&apos;s data for backup or analytical purposes.
                </p>
            </div>

            <Alert className="mb-8 border-zinc-200 bg-zinc-50">
                <Info className="h-4 w-4 text-zinc-500" />
                <AlertTitle className="text-zinc-700">Data Privacy Note</AlertTitle>
                <AlertDescription className="text-zinc-600">
                    Exported data may contain sensitive information. Please ensure you handle it in accordance with your local data protection laws (e.g., GDPR).
                </AlertDescription>
            </Alert>

            <div className="space-y-4">
                {exportItems.map((item, index) => (
                    <div key={index} className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="p-2 bg-muted/50 rounded-lg">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{item.title}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {item.description}
                                </p>
                                <span className="text-[10px] text-muted-foreground uppercase mt-1 inline-block">Estimated size: {item.size}</span>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" disabled>
                            <Download className="mr-2 h-4 w-4" />
                            Prepare Export
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-8 border-t border-border">
                <h3 className="font-semibold text-foreground mb-4 italic">Automated Sync</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Need to sync data to your own data warehouse in real-time? We support webhooks and S3 exports.
                </p>
                <Button variant="secondary" size="sm" disabled>
                    Configure Webhooks (Coming Soon)
                </Button>
            </div>
        </div>
    );
}
