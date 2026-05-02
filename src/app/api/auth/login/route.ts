import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    const { email, password } = await req.json();
    let tokenPayload: any = null;

    if (!email) {
      // Super Admin login
      if (password !== process.env.SUPER_ADMIN_PASSWORD) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
      tokenPayload = { role: "superadmin" };
    } else {
      // Business Admin login
      await connectDB();
      const user:any = await User.findOne({ email });
      if (!user) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
      
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
      tokenPayload = { role: "admin", businessId: user?.businessId.toString() };
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev_only_jwt_secret_not_for_production"
    );
    const token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ success: true, role: tokenPayload.role });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
