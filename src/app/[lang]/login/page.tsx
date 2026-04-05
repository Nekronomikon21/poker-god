"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const router = useRouter();
  const { lang } = useParams<{ lang: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await authClient.signIn.email({ email, password });

    if (res.error) {
      setError(res.error.message ?? "Sign in failed");
      setLoading(false);
    } else {
      router.push(`/${lang}/play`);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Log in</h1>
      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4">
        {error && (
          <div className="rounded bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-500">
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-bold text-white transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href={`/${lang}/signup`} className="text-emerald-500 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
