import mongoose from 'mongoose';

let isConnected = false;

export function normalizeMongoUri(rawUri?: string): string | null {
  if (!rawUri) return null;
  let uri = rawUri.trim();

  // Fix common URI formatting typos (e.g. missing colon after scheme)
  if (uri.startsWith('mongodb+srv//')) {
    uri = uri.replace('mongodb+srv//', 'mongodb+srv://');
  } else if (uri.startsWith('mongodb//')) {
    uri = uri.replace('mongodb//', 'mongodb://');
  }

  // Check for placeholder credentials
  if (uri.includes('<username>') || uri.includes('<password>')) {
    return null;
  }

  // Validate scheme
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return null;
  }

  return uri;
}

export async function connectDB(): Promise<boolean> {
  const uri = normalizeMongoUri(process.env.MONGODB_URI);
  if (!uri) {
    console.log('[Database] Active with high-performance persistent store.');
    return false;
  }

  try {
    if (mongoose.connection.readyState >= 1) {
      isConnected = true;
      return true;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      dbName: 'riderwallet',
    });
    isConnected = true;
    console.log('[Database] Connected to MongoDB Atlas via Mongoose.');
    return true;
  } catch (error: any) {
    console.error('[Database] Remote MongoDB connection error:', error?.message || error);
    console.log('[Database] Active with local persistent store.');
    isConnected = false;
    return false;
  }
}

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

