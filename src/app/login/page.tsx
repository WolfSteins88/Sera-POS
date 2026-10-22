import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Boxes, Coffee, ShoppingBag, ShoppingCart } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Field } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getSettingsMap } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { FormPending } from "@/components/FormPending";

const COPY = {
  fnb: {
    headline: "Kelola coffee shop Anda dengan lebih tenang.",
    sub: "Kasir, stok racikan, shift, dan laporan dalam satu layar yang ringkas untuk coffee shop harian.",
    brand: Coffee,
    features: [
      { icon: ShoppingCart, title: "Kasir", text: "Dine-in atau bawa pulang, meja, dan struk cepat." },
      { icon: Boxes, title: "Stok & Resep", text: "Bahan baku terpotong otomatis saat racikan terjual." },
      { icon: BarChart3, title: "Laporan", text: "Omzet harian dan shift tanpa spreadsheet terpisah." },
    ],
  },
  retail: {
    headline: "Kelola toko ritel Anda dengan lebih tenang.",
    sub: "Kasir barang, stok SKU, shift, dan laporan untuk warung atau toko harian.",
    brand: ShoppingBag,
    features: [
      { icon: ShoppingCart, title: "Kasir", text: "Tap barang masuk keranjang, bayar tunai atau non-tunai." },
      { icon: Boxes, title: "Stok barang", text: "SKU dan stok minimum terlihat sebelum habis." },
      { icon: BarChart3, title: "Laporan", text: "Omzet harian dan shift tanpa spreadsheet terpisah." },
    ],
  },
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "CASHIER" ? "/pos" : "/dashboard");
  }
  const params = await searchParams;
  let shopName = "Toko";
  let mode: keyof typeof COPY = "fnb";
  try {
    const s = await getSettingsMap();
    shopName = s.shop_name || "Toko";
    mode = normalizeShopMode(s.shop_mode);
  } catch {
    shopName = "Toko";
  }
  const copy = COPY[mode];
  const BrandIcon = copy.brand;
  const year = new Date().getFullYear();
  return (
    <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
      <div className="login-field" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="login-glass relative z-10 grid w-full max-w-5xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="login-hero hidden flex-col justify-between p-9 text-white md:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
              <BrandIcon size={16} aria-hidden />
              {shopName}
            </span>
            <h1 className="mt-10 max-w-md text-4xl leading-tight font-semibold tracking-[-0.03em] lg:text-[2.6rem]">
              {copy.headline}
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/75">{copy.sub}</p>
            <ul className="mt-8 space-y-2.5">
              {copy.features.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="login-hero-item flex items-center gap-3 p-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/12">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold">{item.title}</span>
                      <span className="block text-sm text-white/70">{item.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-10 text-xs text-white/55">© {year} {shopName}</p>
        </aside>

        <section className="flex flex-col justify-center px-5 py-8 sm:px-10 md:py-12">
          <div className="mx-auto w-full max-w-[380px]">
            <p className="mb-10 flex items-center gap-2.5 text-lg font-semibold tracking-[-0.02em]">
              <span className="brand-orb" aria-hidden />
              Sera POS
            </p>
            <form action={loginAction}>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-chip px-3 py-1.5 text-sm font-medium md:hidden">
                <BrandIcon size={16} aria-hidden />
                {shopName}
              </span>
              <h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">Masuk ke akun Anda</h2>
              <p className="mt-1.5 mb-7 text-sm text-muted">Gunakan akun toko di perangkat ini.</p>
              <div className="space-y-4">
                <Field label="Username">
                  <input name="username" autoComplete="username" required className="login-input" />
                </Field>
                <Field
                  label="Password"
                  error={params.error ? "Username atau password salah." : undefined}
                >
                  <input name="password" type="password" autoComplete="current-password" required className="login-input" />
                </Field>
                <button
                  type="submit"
                  className="btn pressable mt-2 flex w-full items-center justify-between rounded-full bg-accent py-1.5 pr-1.5 pl-6 text-sm font-semibold text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    Masuk
                    <FormPending />
                  </span>
                  <span className="login-go inline-flex size-9 items-center justify-center rounded-full">
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </button>
              </div>
            </form>
            <p className="mt-10 text-center text-xs text-muted">
              Sera POS · bagian dari <span className="font-semibold text-ink">aosera</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
