import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function jwtSecretBytes(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return null;
  }
  return new TextEncoder().encode(secret || "dev_only_jwt_secret_not_for_production");
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isAdminDashboard = req.nextUrl.pathname.startsWith("/admin-dashboard");
  const isLogin = req.nextUrl.pathname === "/login";
  const isApiBusinesses = req.nextUrl.pathname === "/api/businesses";
  const isApiBusinessPost = isApiBusinesses && req.method === "POST";
  const isApiBusinessGet = isApiBusinesses && req.method === "GET";

  const key = jwtSecretBytes();
  if (!key && (isDashboard || isAdminDashboard || isApiBusinessGet || isApiBusinessPost)) {
    if (isApiBusinessGet || isApiBusinessPost) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 })
      );
    }
    return withSecurityHeaders(
      new NextResponse("Service temporarily unavailable", { status: 503 })
    );
  }

  // Redirect to login if trying to access protected routes without token
  if ((isDashboard || isAdminDashboard) && !token) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)));
  }

  let decodedToken: any = null;

  if (token && key) {
    try {
      const { payload } = await jwtVerify(token, key);
      decodedToken = payload;
    } catch (e) {
      if (isApiBusinessPost || isApiBusinessGet) {
        return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
      }
      if (isDashboard || isAdminDashboard) {
        return withSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)));
      }
    }
  }

  if (isApiBusinessGet && !token) {
    return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (isApiBusinessGet && decodedToken && decodedToken.role !== "superadmin") {
    return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  // Redirect from login page if already authenticated
  if (isLogin && decodedToken) {
    if (decodedToken.role === "superadmin") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
    return withSecurityHeaders(NextResponse.redirect(new URL("/admin-dashboard", req.url)));
  }

  // Role-based route protection
  if (decodedToken) {
    if (isDashboard && decodedToken.role !== "superadmin") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin-dashboard", req.url)));
    }
    if (isAdminDashboard && decodedToken.role !== "admin") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
    if (isApiBusinessPost && decodedToken.role !== "superadmin") {
      return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
  }

  if (isApiBusinessPost && !token) {
    return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin-dashboard/:path*", "/login", "/api/businesses"],
};

