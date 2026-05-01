import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isAdminDashboard = req.nextUrl.pathname.startsWith("/admin-dashboard");
  const isLogin = req.nextUrl.pathname === "/login";
  const isApiBusinessPost =
    req.nextUrl.pathname === "/api/businesses" && req.method === "POST";

  // Redirect to login if trying to access protected routes without token
  if ((isDashboard || isAdminDashboard) && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let decodedToken: any = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "default_secret"
      );
      const { payload } = await jwtVerify(token, secret);
      decodedToken = payload;
    } catch (e) {
      if (isApiBusinessPost) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (isDashboard || isAdminDashboard) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  }

  // Redirect from login page if already authenticated
  if (isLogin && decodedToken) {
    if (decodedToken.role === "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/admin-dashboard", req.url));
    }
  }

  // Role-based route protection
  if (decodedToken) {
    if (isDashboard && decodedToken.role !== "superadmin") {
      return NextResponse.redirect(new URL("/admin-dashboard", req.url));
    }
    if (isAdminDashboard && decodedToken.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (isApiBusinessPost && decodedToken.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (isApiBusinessPost && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin-dashboard/:path*", "/login", "/api/businesses"],
};

