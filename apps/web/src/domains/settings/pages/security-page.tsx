import { ShieldCheck, Lock, Smartphone, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

export function SecuritySettingsPage() {
  const securityFeatures = [
    {
      title: "Two-Factor Authentication",
      description:
        "Add an extra layer of security to your account by requiring more than just a password to log in.",
      icon: <Smartphone className="h-5 w-5 text-blue-500" />,
      status: "Recommended",
      comingSoon: true,
    },
    {
      title: "SAML SSO",
      description:
        "Allow members to log in with their corporate identity provider like Okta or Azure AD.",
      icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
      comingSoon: true,
    },
    {
      title: "Domain Restricted Access",
      description:
        "Restrict organization access to specific email domains (e.g., only @company.com).",
      icon: <Lock className="h-5 w-5 text-purple-500" />,
      comingSoon: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization&apos;s security and authentication policies.
        </p>
      </div>

      <div className="space-y-4">
        {securityFeatures.map((feature) => (
          <div
            key={feature.title}
            className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start justify-between"
          >
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-muted/50 rounded-lg">
                {feature.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  {feature.status && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {feature.status}
                    </Badge>
                  )}
                  {feature.comingSoon && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground uppercase"
                    >
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                  {feature.description}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex" disabled>
              Configure <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-500/5 p-6 rounded-xl border border-blue-500/20">
        <h3 className="text-blue-500 font-semibold mb-2">
          Need Enterprise-grade Security?
        </h3>
        <p className="text-sm text-blue-500/80">
          Our Enterprise plan includes SAML SSO, audit logs, and custom data retention policies.
          Contact sales to learn more.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 border-blue-500/20 hover:bg-blue-500/10 text-blue-500"
        >
          Contact Sales
        </Button>
      </div>
    </div>
  );
}
