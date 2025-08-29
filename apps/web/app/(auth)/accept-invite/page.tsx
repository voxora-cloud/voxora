export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AcceptInvitePageClient from "./AcceptInvitePageClient";

export default function AcceptInvitePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInvitePageClient />
    </Suspense>
  );
}
