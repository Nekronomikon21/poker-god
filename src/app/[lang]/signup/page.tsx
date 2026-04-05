"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Signup() {
  const router = useRouter();
  const { lang } = useParams<{ lang: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authClient.signUp.email({
        name,
        email,
        password,
        fetchOptions: { onSuccess: () => router.push(`/${lang}/play`) },
      });

      if (res.error) {
        setError(res.error.message ?? "Sign up failed");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign up</h1>
      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4">
        {error && (
          <div className="rounded bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-500">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-bold text-white transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href={`/${lang}/login`} className="text-emerald-500 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
