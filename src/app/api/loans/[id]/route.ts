import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import { isSupportedCurrency } from "@/lib/currencies";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";

const COLLECTION = "loans";

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => {
  const loanId = context?.params?.id;
  if (!loanId) {
    return NextResponse.json({ error: "Loan ID required" }, { status: 400 });
  }

  const body = await req.json();
  const status = body?.status;

  if (!status || !["pending", "active", "settled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const { db } = await connectToDatabase();

  const _id = new ObjectId(loanId);
  const doc = await db.collection(COLLECTION).findOne({ _id });

  if (!doc) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  // Verify the user is involved in the loan
  if (doc.lenderId !== req.user.uid && doc.borrowerId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .collection(COLLECTION)
    .updateOne({ _id }, { $set: { status, updatedAt: new Date() } });

  const decrypted = JSON.parse(decrypt(doc.payload));
  const currency = isSupportedCurrency(decrypted.currency) ? decrypted.currency : "USD";

  return NextResponse.json({
    data: {
      id: loanId,
      lenderId: doc.lenderId,
      borrowerId: doc.borrowerId,
      amount: Number(decrypted.amount),
      currency,
      description: decrypted.description,
      status,
      createdAt: doc.createdAt.toISOString(),
      dueDate: decrypted.dueDate ?? null,
      externalParty: decrypted.externalParty ?? null,
    },
  });
});

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => {
  const loanId = context?.params?.id;
  if (!loanId) {
    return NextResponse.json({ error: "Loan ID required" }, { status: 400 });
  }

  const { db } = await connectToDatabase();

  const _id = new ObjectId(loanId);
  const doc = await db.collection(COLLECTION).findOne({ _id });

  if (!doc) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  // Verify the user is involved in the loan
  if (doc.lenderId !== req.user.uid && doc.borrowerId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.collection(COLLECTION).deleteOne({ _id });

  return NextResponse.json({ success: true, id: loanId });
});
