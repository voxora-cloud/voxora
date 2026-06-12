import { useState } from "react";
import { authApi } from "@/domains/auth/api/auth.api";
import { EeFeatureGate } from "@/shared/components/ee-feature-gate";
import { apiClient } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type WhiteLabelResponse = {
  success: boolean;
  message: string;
  data?: {
    removeBranding: boolean;
  };
};

export function WhiteLabelPage() {
  const [removeBranding, setRemoveBranding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      setMessage("Organization not found");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await apiClient.patch<WhiteLabelResponse>(`/organizations/${orgId}/white-label`, {
        removeBranding,
      });
      setRemoveBranding(Boolean(res.data?.removeBranding));
      setMessage("White-label settings updated");
    } catch (err: any) {
      setMessage(err?.message || "Failed to update white-label settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EeFeatureGate feature="white-label">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>White-label</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={removeBranding}
                onChange={(event) => setRemoveBranding(event.target.checked)}
              />
              Remove InteraOne branding from customer-facing surfaces
            </label>
            <Button onClick={save} className="cursor-pointer" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </EeFeatureGate>
  );
}
