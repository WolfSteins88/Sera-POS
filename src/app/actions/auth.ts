"use server";

import { redirect } from "next/navigation";
import { changeOwnPassword, getSession, login, logout } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await login(username, password);
  if (!user) {
    redirect("/login?error=1");
  }
  if (user.mustChangePassword) redirect("/change-password");
  redirect(user.role === "CASHIER" ? "/pos" : "/dashboard");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fail = (message: string) => redirect(`/change-password?error=${encodeURIComponent(message)}`);
  if (password.length < 6) fail("Password minimal 6 karakter.");
  if (password !== confirm) fail("Konfirmasi password tidak sama.");
  try {
    await changeOwnPassword(session, password);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Gagal menyimpan password.");
  }
  redirect(session.role === "CASHIER" ? "/pos" : "/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
