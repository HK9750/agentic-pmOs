"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { apiRequest, errorMessage } from "../lib/api";
import type { AuthResponse } from "../lib/types";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

const authBullets = [
  "Session-based auth with HTTP-only cookies",
  "Profile becomes workspace identity",
  "Workspace and project setup follows immediately",
];

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    if (mode === "register") {
      payload.name = String(form.get("name") ?? "");
    }

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<AuthResponse>(`/api/v1/auth/${mode}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setMessage(`Signed in as ${body.user.email}. Loading account...`);
          router.push("/account");
          router.refresh();
        } catch (requestError) {
          setError(errorMessage(requestError, "Authentication failed"));
        }
      })();
    });
  }

  const isRegister = mode === "register";

  return (
    <section className="app-card grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden min-h-[620px] border-r border-zinc-800 bg-zinc-950/80 p-8 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(251,191,36,0.18),transparent_22rem)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <Link className="inline-flex items-center gap-3" href="/">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-200 font-mono text-sm font-black text-zinc-950">AP</span>
              <span>
                <span className="block text-sm font-semibold text-stone-100">Agentic PM OS</span>
                <span className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">foundation</span>
              </span>
            </Link>

            <div className="mt-16">
              <p className="kicker">Good Product Flow</p>
              <h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.06em] text-stone-50">
                Start with identity. Then workspace. Then project.
              </h2>
              <p className="mt-5 text-sm leading-7 text-zinc-400">
                The account is not a throwaway login screen. It is the root of audit history, approvals, ownership, and future agent accountability.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {authBullets.map((bullet) => (
              <div className="rounded-2xl border border-zinc-800 bg-black/25 p-4" key={bullet}>
                <p className="text-sm leading-6 text-zinc-300">{bullet}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <form className="grid content-center gap-5 p-5 sm:p-8 lg:p-10" onSubmit={onSubmit}>
        <div>
          <p className="kicker">{isRegister ? "Create Account" : "Welcome Back"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.06em] text-stone-50 sm:text-5xl">
            {isRegister ? "Set up your operator profile." : "Continue your workspace setup."}
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            {isRegister
              ? "Create the account that will own approvals, workspace actions, and project audit trails."
              : "Sign in to continue profile, workspace, and project setup."}
          </p>
        </div>

        {isRegister ? (
          <label className="field-label">
            Full name
            <input className="field-input" name="name" autoComplete="name" placeholder="Hasnain Ali" required />
          </label>
        ) : null}

        <label className="field-label">
          Work email
          <input className="field-input" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </label>

        <label className="field-label">
          Password
          <input
            className="field-input"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={10}
            placeholder="10+ characters with letter and number"
            required
          />
        </label>

        <button className="btn-primary mt-1 w-full" type="submit" disabled={isPending}>
          {isPending ? "Securing session..." : isRegister ? "Create account" : "Sign in"}
        </button>

        {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            {isRegister ? "Already have an account?" : "Need an account?"}
          </p>
          <Link className="btn-secondary w-fit" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </div>
      </form>
    </section>
  );
}
