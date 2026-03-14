import { Card, CardContent } from "@/shared/ui/card";
import { Layers } from "lucide-react";

export function ContactSegmentsPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/10 w-full h-full">
      <Card className="w-full max-w-lg mx-8 border-muted">
        <CardContent className="text-center p-6">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Segments
          </h3>
          <p className="text-muted-foreground">
            Organize your contacts into smart segments. (Coming Soon)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
