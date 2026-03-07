import { Card, CardContent } from "@/components/ui/card";
import { Archive } from "lucide-react";

export default function ArchivedPage() {
    return (
        <div className="flex flex-1 items-center justify-center bg-muted/10 w-full h-full">
            <Card className="w-full max-w-lg mx-8 border-muted">
                <CardContent className="text-center p-6">
                    <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        Archived
                    </h3>
                    <p className="text-muted-foreground">
                        View completed and closed conversations. (Coming Soon)
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
