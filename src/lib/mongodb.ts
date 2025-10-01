import { MongoClient, type MongoClientOptions, type Db } from "mongodb"
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error("MONGODB_URI is not set in environment variables");
}

if (!dbName) {
  throw new Error("MONGODB_DB is not set in environment variables");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const options: MongoClientOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  };

  const client = new MongoClient(uri || "", options);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
