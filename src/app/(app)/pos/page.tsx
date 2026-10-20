import { getSettingsMap } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { getProductDetail, listHeldOrders, posCatalog, getOpenShift } from "@/server/queries";
import { PosClient } from "./PosClient";
import { num } from "@/lib/format";
import { normalizeShopMode } from "@/lib/theme";

export default async function PosPage() {
  const session = await getSession();
  if (!session) return null;
  const settings = await getSettingsMap();
  const shopMode = normalizeShopMode(settings.shop_mode);
  const { categories, products: listed } = await posCatalog(shopMode);
  // Match checkout: when negative stock is allowed, goods that merely ran out stay sellable.
  const allowNegative = settings.allow_negative_stock === "1";
  const products = listed.map((p) =>
    allowNegative && p.kind === "goods" && p.stockStatus === "sold_out" && Number(p.currentStock) <= 0
      ? { ...p, stockStatus: "available" as const }
      : p,
  );
  const catalog: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {};
  for (const p of products.filter((x) => x.kind === "recipe" || x.useVariants || x.useAddons)) {
    catalog[p.id] = await getProductDetail(p.id);
  }
  const held = await listHeldOrders(session.id);
  const shift = await getOpenShift(session.id);
  return (
    <PosClient
        shopMode={shopMode}
        taxPercent={num(settings.tax_percent)}
        servicePercent={num(settings.service_charge_percent)}
        currency={settings.currency || "Rp"}
        categories={categories}
        products={products}
        catalog={catalog as never}
        held={held}
        shiftOpen={!!shift}
      />
  );
}
