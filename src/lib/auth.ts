import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./sqlite.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const auth = betterAuth({
  database: {
    type: "sqlite",
    db: client,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: false,
    autoSignIn: true,
  },
});
