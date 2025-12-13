import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache || { conn: null, promise: null };

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

function hasAuthSourceInUri(uri: string): boolean {
  const idx = uri.indexOf('?');
  if (idx === -1) return false;
  return /(^|[?&])authSource=/.test(uri.slice(idx));
}

function inferAuthSource(uri: string): string | undefined {
  const envAuthSource = process.env.MONGODB_AUTH_SOURCE;
  if (envAuthSource) return envAuthSource;

  // If a database name is present in the URI path and authSource isn't specified,
  // Mongo will authenticate against that DB by default. Atlas users are commonly
  // created in `admin`, which would then fail with "Authentication failed".
  // Only apply this heuristic for SRV URIs to avoid surprising self-hosted setups.
  if (!uri.startsWith('mongodb+srv://')) return undefined;
  if (hasAuthSourceInUri(uri)) return undefined;

  try {
    const parsed = new URL(uri);
    const pathname = parsed.pathname || '';
    const hasDbInPath = pathname.length > 1;
    return hasDbInPath ? 'admin' : undefined;
  } catch {
    return undefined;
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI (set it in .env.local)');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const dbName = process.env.MONGODB_DB_NAME;
    const authSource = inferAuthSource(MONGODB_URI);
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ...(dbName ? { dbName } : {}),
      ...(authSource ? { authSource } : {}),
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    const message = e instanceof Error ? e.message : String(e);
    if (/Authentication failed/i.test(message)) {
      throw new Error(
        'MongoDB authentication failed. Double-check MONGODB_URI credentials, URL-encoding for special characters, and (for Atlas) consider adding authSource=admin.',
        { cause: e as any }
      );
    }
    throw e;
  }

  return cached.conn;
}

export default connectDB;
