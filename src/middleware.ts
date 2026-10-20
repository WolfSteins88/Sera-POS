import { NextRequest, NextResponse } from "next/server";
import { can, type ModuleKey } from "@/lib/rbac";
import { decodeSession } from "@/lib/session";

const PUBLIC = ["/login"];

const MODULE_BY_PATH: Record<string, ModuleKey> = {
  "/dashboard": "dashboard",
  "/pos": "pos",
  "/transactions": "transactions",
  "/products": "products",
  "/categories": "categories",
  "/inventory": "inventory",
  "/recipes": "recipes",
  "/reports": "reports",
  "/shifts": "shifts",
  "/users": "users",
  "/printer": "printer",
  "/settings": "settings",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }
  if (PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await decodeSession(req.cookies.get("umkm_pos_session")?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const moduleKey = Object.entries(MODULE_BY_PATH).find(
    ([p]) => pathname === p || pathname.startsWith(`${p}/`),
  )?.[1];
  if (moduleKey) {
    if (!can(session.role, moduleKey)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
