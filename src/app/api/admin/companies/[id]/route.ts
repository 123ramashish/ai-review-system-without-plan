import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Business from "@/models/Business";

// DELETE /api/admin/companies/[id] — delete a company (super admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();
        const { id } = params;

        // Delete all businesses owned by this company
        await Business.deleteMany({ ownerId: id });

        // Delete the company user
        await User.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/admin/companies/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete company" },
            { status: 500 }
        );
    }
}