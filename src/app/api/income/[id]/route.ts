import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";
import { isValidObjectId } from "@/utils";

const COLLECTION = "income";

async function deleteIncome(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const document = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });

  if (!document) {
    return NextResponse.json({ error: "Income not found" }, { status: 404 });
  }

  // Verify the user owns this income record
  if (document.userId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}

export const DELETE = withAuth(deleteIncome);
