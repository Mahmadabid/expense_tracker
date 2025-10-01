import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";

const COLLECTION = "expenses";

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => {
  const expenseId = context?.params?.id;
  if (!expenseId) {
    return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
  }

  const { db } = await connectToDatabase();

  const _id = new ObjectId(expenseId);
  const doc = await db.collection(COLLECTION).findOne({ _id });

  if (!doc) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Verify the user owns this expense
  if (doc.userId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.collection(COLLECTION).deleteOne({ _id });

  return NextResponse.json({ success: true, id: expenseId });
});
