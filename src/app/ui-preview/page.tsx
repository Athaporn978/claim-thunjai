import { UiPreviewClient } from "./UiPreviewClient";

// Standalone design preview — see UiPreviewClient for why this is isolated.
export const metadata = { title: "UI Preview · ClaimThunJai" };

export default function UiPreviewPage() {
  return <UiPreviewClient />;
}
