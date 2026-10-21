import { redirect } from "next/navigation";
import { getRenderSession } from "@/lib/auth";
import { getRenderSettings } from "@/lib/settings";
import { AppShell } from "@/components/AppShell";
import { normalizeShopMode } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getRenderSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");
  const settings = await getRenderSettings();
  const shopName = settings.shop_name ?? "Toko";
  const shopMode = normalizeShopMode(settings.shop_mode ?? "fnb");
  return (
    <AppShell user={session} shopName={shopName} shopMode={shopMode}>
      {children}
    </AppShell>
  );
}
