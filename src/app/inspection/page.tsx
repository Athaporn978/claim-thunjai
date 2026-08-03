import { redirect } from "next/navigation";

// The original /inspection was a stand-alone demo. Real flow now lives under
// /admin/inspection (admin creates cases) and /inspect/[token] (customer capture).
export default function InspectionRedirect() {
  redirect("/admin/inspection");
}
