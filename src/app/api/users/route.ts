import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { encrypt, decrypt } from "@/lib/encryption";
import type { Collection, WithId } from "mongodb";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth";

const COLLECTION = "users";

type ProfilePayload = {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type UserDoc = {
  _id: string;
  profileCipher: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeen?: Date;
};

function buildResponse(id: string, payload: ProfilePayload, lastSeen?: Date | null) {
  return {
    id,
    email: payload.email,
    displayName: payload.displayName,
    photoURL: payload.photoURL,
    lastSeen: lastSeen?.toISOString() ?? null,
  };
}

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const { db } = await connectToDatabase();
  const collection: Collection<UserDoc> = db.collection<UserDoc>(COLLECTION);

  if (uid) {
    const doc = await collection.findOne({ _id: uid });

    if (!doc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = JSON.parse(decrypt(doc.profileCipher)) as ProfilePayload;
    return NextResponse.json({ data: buildResponse(doc._id.toString(), profile, doc.lastSeen ?? null) });
  }

  const documents = await collection.find().sort({ createdAt: 1 }).toArray();

  const data = documents.map((doc: WithId<UserDoc>) => {
    const profile = JSON.parse(decrypt(doc.profileCipher)) as ProfilePayload;
    return buildResponse(doc._id.toString(), profile, doc.lastSeen ?? null);
  });

  return NextResponse.json({ data });
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const body = await req.json();
  const { uid, email, displayName, photoURL } = body ?? {};

  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "uid is required" }, { status: 422 });
  }

  // Verify the user can only update their own profile
  if (uid !== req.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile: ProfilePayload = {
    email: email ?? null,
    displayName: displayName ?? null,
    photoURL: photoURL ?? null,
  };

  const profileCipher = encrypt(JSON.stringify(profile));

  const { db } = await connectToDatabase();
  const collection: Collection<UserDoc> = db.collection<UserDoc>(COLLECTION);
  await collection.updateOne(
    { _id: uid },
    {
      $set: {
        profileCipher,
        updatedAt: new Date(),
        lastSeen: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ data: buildResponse(uid, profile, new Date()) });
});
