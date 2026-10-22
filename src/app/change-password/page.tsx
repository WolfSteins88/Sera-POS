import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { changePasswordAction, logoutAction } from "@/app/actions/auth";
import { Field } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { FormPending } from "@/components/FormPending";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  return (
    <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
      <div className="login-field" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <section className="login-glass relative z-10 w-full max-w-md px-5 py-8 sm:px-10">
        <form action={changePasswordAction} className="mx-auto w-full max-w-[380px]">
          <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-white">
            <KeyRound size={22} aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Buat password baru</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            {session.mustChangePassword
              ? `Password ${session.name} baru saja direset. Buat password Anda sendiri untuk melanjutkan.`
              : "Ganti password akun Anda."}
          </p>
          <div className="space-y-4">
            <Field label="Password baru">
              <input name="password" type="password" autoComplete="new-password" required minLength={6} className="login-input" />
            </Field>
            <Field label="Ulangi password baru" error={params.error}>
              <input name="confirm" type="password" autoComplete="new-password" required minLength={6} className="login-input" />
            </Field>
            <button type="submit" className="btn pressable mt-2 w-full rounded-full bg-accent text-sm font-semibold text-white">
              Simpan password
              <FormPending />
            </button>
          </div>
        </form>
        <form action={logoutAction} className="mx-auto mt-4 w-full max-w-[380px]">
          <button type="submit" className="text-sm text-muted underline">
            Keluar
            <FormPending size="xs" />
          </button>
        </form>
      </section>
    </div>
  );
}
