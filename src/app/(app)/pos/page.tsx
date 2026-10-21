import { getRenderSettings } from "@/lib/settings";
import { getRenderSession } from "@/lib/auth";
import { getProductDetails, listHeldOrders, posCatalog, getOpenShift } from "@/server/queries";
import { PosClient } from "./PosClient";
import { num } from "@/lib/format";
import { normalizeShopMode } from "@/lib/theme";

export default async function PosPage() {
  const [session, settings] = await Promise.all([getRenderSession(), getRenderSettings()]);
  if (!session) return null;
  const shopMode = normalizeShopMode(settings.shop_mode);
  const [{ categories, products: listed }, held, shift] = await Promise.all([
    posCatalog(shopMode),
    listHeldOrders(session.id),
    getOpenShift(session.id),
  ]);
  // Match checkout: when negative stock is allowed, goods that merely ran out stay sellable.
  const allowNegative = settings.allow_negative_stock === "1";
  const products = listed.map((p) =>
    allowNegative && p.kind === "goods" && p.stockStatus === "sold_out" && Number(p.currentStock) <= 0
      ? { ...p, stockStatus: "available" as const }
      : p,
  );
  const details = await getProductDetails(
    products.filter((x) => x.kind === "recipe" || x.useVariants || x.useAddons).map((p) => p.id),
  );
  const catalog = Object.fromEntries(details);
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
