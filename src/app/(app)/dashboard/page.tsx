import { getRenderSession } from "@/lib/auth";
import { getRenderSetting } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { fnbDashboard, retailDashboard } from "@/server/queries";
import { FnbDashboard } from "./FnbDashboard";
import { RetailDashboard } from "./RetailDashboard";

export default async function DashboardPage() {
  const [session, mode] = await Promise.all([getRenderSession(), getRenderSetting("shop_mode", "fnb")]);
  if (!session) return null;
  const shopMode = normalizeShopMode(mode);
  if (shopMode === "retail") {
    return <RetailDashboard data={await retailDashboard()} userName={session.name} />;
  }
  const data = await fnbDashboard();
  return <FnbDashboard data={data} userName={session.name} />;
}
