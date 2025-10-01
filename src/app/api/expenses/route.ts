import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { encrypt, decrypt } from "@/lib/encryption";
import type { WithId, Document } from "mongodb";
import { isSupportedCurrency } from "@/lib/currencies";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";

const COLLECTION = "expenses";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify the user can only access their own expenses
  if (userId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db } = await connectToDatabase();
  const documents = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  const data = documents.map((doc: WithId<Document>) => {
    const decrypted = JSON.parse(decrypt(doc.payload));
    const currency = isSupportedCurrency(decrypted.currency) ? decrypted.currency : "USD";
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      amount: Number(decrypted.amount),
      currency,
      category: decrypted.category,
      description: decrypted.description,
      createdAt: doc.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ data });
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const body = await req.json();
  const { userId, amount, category, description, currency } = body ?? {};

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify the user can only create expenses for themselves
  if (userId !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 422 });
  }

  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "category is required" }, { status: 422 });
  }

  if (!isSupportedCurrency(currency)) {
    return NextResponse.json({ error: "currency is invalid" }, { status: 422 });
  }

  const payload = encrypt(
    JSON.stringify({
      amount,
      currency,
      category,
      description: description ?? "",
    })
  );

  const document = {
    userId,
    payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { db } = await connectToDatabase();
  const result = await db.collection(COLLECTION).insertOne(document);

  return NextResponse.json(
    {
      data: {
        id: result.insertedId.toString(),
        userId,
        amount,
        currency,
        category,
        description: description ?? "",
        createdAt: document.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
});
