import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";
import { decrypt, encrypt, sanitizeInput, isValidNumber } from "@/utils";
import { isSupportedCurrency } from "@/constants";

const COLLECTION = "loans";

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  props: { params: Promise<{ id: string }> }
) => {
  const { id: loanId } = await props.params;
  if (!loanId) {
    return NextResponse.json({ error: "Loan ID required" }, { status: 400 });
  }

  const rawBody = await req.json();
  const sanitized = sanitizeInput(rawBody) as any;
  const { status, payment } = sanitized;

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

  const decrypted = JSON.parse(decrypt(doc.payload));
  const currency = isSupportedCurrency(decrypted.currency) ? decrypted.currency : "USD";

  // Handle payment addition
  if (payment) {
    if (!isValidNumber(payment.amount) || Number(payment.amount) <= 0) {
      return NextResponse.json({ error: "Payment amount must be positive" }, { status: 422 });
    }

    const payments = decrypted.payments || [];
    const newPayment = {
      id: new ObjectId().toString(),
      amount: Number(payment.amount),
      date: new Date().toISOString(),
      note: payment.note || "",
    };

    payments.push(newPayment);
    decrypted.payments = payments;

    // Calculate remaining amount and auto-settle if fully paid
    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remainingAmount = Number(decrypted.amount) - totalPaid;
    
    let newStatus = doc.status;
    if (remainingAmount <= 0) {
      newStatus = "settled";
    }

    const newPayload = encrypt(JSON.stringify(decrypted));

    await db
      .collection(COLLECTION)
      .updateOne({ _id }, { $set: { payload: newPayload, status: newStatus, updatedAt: new Date() } });

    return NextResponse.json({
      data: {
        id: loanId,
        lenderId: doc.lenderId,
        borrowerId: doc.borrowerId,
        amount: Number(decrypted.amount),
        currency,
        description: decrypted.description,
        status: newStatus,
        createdAt: doc.createdAt.toISOString(),
        dueDate: decrypted.dueDate ?? null,
        externalParty: decrypted.externalParty ?? null,
        payments,
        remainingAmount: Math.max(0, remainingAmount),
      },
    });
  }

  // Handle status change
  if (status && ["pending", "active", "settled"].includes(status)) {
    await db
      .collection(COLLECTION)
      .updateOne({ _id }, { $set: { status, updatedAt: new Date() } });

    const payments = decrypted.payments || [];
    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remainingAmount = Number(decrypted.amount) - totalPaid;

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
        payments,
        remainingAmount: Math.max(0, remainingAmount),
      },
    });
  }

  return NextResponse.json({ error: "No valid update provided" }, { status: 422 });
});

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  props: { params: Promise<{ id: string }> }
) => {
  const { id: loanId } = await props.params;
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
