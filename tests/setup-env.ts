process.env.DATABASE_URL = "file:./test-data.db";
process.env.AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3000";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "test-resend-key";
process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@example.com";
process.env.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "test-youtube-key";
