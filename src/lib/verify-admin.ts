import { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

export type AdminJwt = JWTPayload & {
  role?: string;
  businessId?: string;
};

function jwtSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return null;
  }
  return new TextEncoder().encode(secret || "dev_only_jwt_secret_not_for_production");
}

export async function verifyAdminToken(req: NextRequest): Promise<AdminJwt | null> {
  const key = jwtSecretKey();
  if (!key) return null;
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as AdminJwt;
  } catch {
    return null;
  }
}

export async function requireSuperAdmin(req: NextRequest): Promise<AdminJwt | null> {
  const p = await verifyAdminToken(req);
  if (!p || p.role !== "superadmin") return null;
  return p;
}

/** Business admin may only act on their own `businessId`; superadmin has full access. */
export async function requireBusinessAccess(
  req: NextRequest,
  businessId: string
): Promise<AdminJwt | null> {
  const p = await verifyAdminToken(req);
  if (!p) return null;
  if (p.role === "superadmin") return p;
  if (p.role === "admin" && p.businessId === businessId) return p;
  return null;
}
