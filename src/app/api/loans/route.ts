import { NextResponse } from "next/server";
import type { Document, WithId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { encrypt, decrypt } from "@/lib/encryption";
import { isSupportedCurrency } from "@/lib/currencies";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";

const COLLECTION = "loans";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify the user can only access their own loans
  if (userId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db } = await connectToDatabase();
  const documents = await db
    .collection(COLLECTION)
    .find({ participants: userId })
    .sort({ createdAt: -1 })
    .toArray();

  const data = documents.map((doc: WithId<Document>) => {
    const decrypted = JSON.parse(decrypt(doc.payload));
    const currency = isSupportedCurrency(decrypted.currency) ? decrypted.currency : "USD";
    return {
      id: doc._id.toString(),
      lenderId: doc.lenderId,
      borrowerId: doc.borrowerId,
      amount: Number(decrypted.amount),
      currency,
      description: decrypted.description,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      dueDate: decrypted.dueDate ?? null,
      externalParty: decrypted.externalParty ?? null,
    };
  });

  return NextResponse.json({ data });
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const body = await req.json();
  const { lenderId, borrowerId, amount, description, dueDate, currency, externalParty } = body ?? {};

  if (!lenderId || !borrowerId || typeof lenderId !== "string" || typeof borrowerId !== "string") {
    return NextResponse.json({ error: "lenderId and borrowerId are required" }, { status: 422 });
  }

  // Verify the user is involved in the loan
  if (lenderId !== req.user.uid && borrowerId !== req.user.uid && lenderId !== "EXTERNAL" && borrowerId !== "EXTERNAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (lenderId === borrowerId && borrowerId !== "EXTERNAL" && lenderId !== "EXTERNAL") {
    return NextResponse.json({ error: "lenderId and borrowerId must differ" }, { status: 422 });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 422 });
  }

  if (!isSupportedCurrency(currency)) {
    return NextResponse.json({ error: "currency is invalid" }, { status: 422 });
  }

  // Build participants array for querying
  const participants = [lenderId, borrowerId].filter(id => id !== "EXTERNAL");

  const payload = encrypt(
    JSON.stringify({
      amount,
      currency,
      description: description ?? "",
      dueDate: dueDate ?? null,
      externalParty: externalParty ?? null,
    })
  );

  const document = {
    lenderId,
    borrowerId,
    participants,
    payload,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { db } = await connectToDatabase();
  const result = await db.collection(COLLECTION).insertOne(document);

  return NextResponse.json(
    {
      data: {
        id: result.insertedId.toString(),
        lenderId,
        borrowerId,
        amount,
        currency,
        description: description ?? "",
        status: document.status,
        createdAt: document.createdAt.toISOString(),
        dueDate: dueDate ?? null,
        externalParty: externalParty ?? null,
      },
    },
    { status: 201 }
  );
});
