export interface Environment {
  // MongoDB
  MONGODB_URI: string;
  MONGODB_DB_NAME?: string;
  MONGODB_AUTH_SOURCE?: string;
  
  // Firebase
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  
  // Firebase Client Config
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  
  // Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  GUEST_TOKEN_SECRET: string;
  
  // Rate Limiting
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW: string;
  
  // Email (optional)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}