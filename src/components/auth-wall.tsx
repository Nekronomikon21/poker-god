"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface AuthWallContextValue {
  requireAuth: (action: () => void) => void;
}

const AuthWallContext = createContext<AuthWallContextValue>({
  requireAuth: () => {},
});

export function useAuthWall() {
  return useContext(AuthWallContext);
}

export function AuthWallProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const { data: session } = authClient.useSession();
  const [showModal, setShowModal] = useState(false);

  const requireAuth = useCallback((action: () => void) => {
    if (session?.user) {
      action();
    } else {
      setShowModal(true);
    }
  }, [session]);

  return (
    <AuthWallContext value={{ requireAuth }}>
      {children}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 text-center">
              Sign in required
            </h2>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 text-center leading-6">
              Create a free account or log in to use interactive features.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/${lang}/signup`}
                onClick={() => setShowModal(false)}
                className="block w-full rounded bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-center text-sm font-bold text-white transition-all hover:from-emerald-400 hover:to-emerald-600"
              >
                Sign up
              </Link>
              <Link
                href={`/${lang}/login`}
                onClick={() => setShowModal(false)}
                className="block w-full rounded border border-zinc-300 dark:border-zinc-600 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Log in
              </Link>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AuthWallContext>
  );
}
