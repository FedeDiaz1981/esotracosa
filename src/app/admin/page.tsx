import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAdminPanelViewModel } from "@/application/admin";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminPage() {
  await connection();
  const viewer = await getCurrentViewer();

  if (!viewer?.isAdmin) {
    redirect("/");
  }

  const model = await getAdminPanelViewModel();

  return <AdminWorkspace model={model} viewerName={viewer.name} />;
}
