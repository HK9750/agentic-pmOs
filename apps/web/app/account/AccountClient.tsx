"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { AppFrame } from "../components/AppFrame";
import { TerminalPanel } from "../components/TerminalPanel";
import { apiRequest, errorMessage } from "../lib/api";
import type { ProfileResponse, SessionInfo, SessionsResponse, User } from "../lib/types";

export function AccountClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshSessions = useCallback(async () => {
    const body = await apiRequest<SessionsResponse>("/api/v1/auth/sessions");
    setSessions(body.sessions);
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const [profile, sessionList] = await Promise.all([
        apiRequest<ProfileResponse>("/api/v1/auth/me"),
        apiRequest<SessionsResponse>("/api/v1/auth/sessions"),
      ]);
      setUser(profile.user);
      setSessions(sessionList.sessions);
      setError(null);
    } catch (requestError) {
      setUser(null);
      setSessions([]);
      setError(errorMessage(requestError, "You need to sign in before managing your account."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAccount();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadAccount]);

  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      title: String(form.get("title") ?? ""),
      timezone: String(form.get("timezone") ?? "UTC"),
      avatar_url: String(form.get("avatar_url") ?? ""),
      bio: String(form.get("bio") ?? ""),
    };

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<{ user: User }>("/api/v1/profile", {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          setUser(body.user);
          setNotice("Profile saved. This identity is now ready for workspace actions.");
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not update profile"));
        }
      })();
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      current_password: String(form.get("current_password") ?? ""),
      new_password: String(form.get("new_password") ?? ""),
      logout_other_sessions: form.get("logout_other_sessions") === "on",
    };

    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/password", {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          formElement.reset();
          setNotice("Password changed. Session list refreshed.");
          await refreshSessions();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not change password"));
        }
      })();
    });
  }

  function revokeSession(sessionID: string) {
    setError(null);
    setNotice(null);

    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/sessions/revoke", {
            method: "POST",
            body: JSON.stringify({ session_id: sessionID }),
          });
          setNotice("Session revoked.");
          await refreshSessions();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not revoke session"));
        }
      })();
    });
  }

  function logoutAll() {
    setError(null);
    setNotice(null);

    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/logout-all", {
            method: "POST",
            body: JSON.stringify({ keep_current: true }),
          });
          setNotice("Other sessions revoked.");
          await refreshSessions();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not revoke sessions"));
        }
      })();
    });
  }

  function logoutCurrent() {
    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
        } finally {
          setUser(null);
          setSessions([]);
          router.push("/login");
          router.refresh();
        }
      })();
    });
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <UnauthenticatedState error={error} />;
  }

  const completion = profileCompletion(user);

  return (
    <AppFrame
      eyebrow="Account Foundation"
      title="Make the operator profile trustworthy before project work begins."
      description="This identity is used for workspace ownership, approvals, session history, and every future audit event. Keep it complete and secure before connecting external tools."
      actions={
        <>
          <Link className="btn-primary" href="/setup">Continue setup</Link>
          <button className="btn-secondary" disabled={isPending} onClick={logoutCurrent} type="button">Sign out</button>
        </>
      }
      aside={
        <>
          <IdentityCard completion={completion} user={user} />
          <SessionsCard isPending={isPending} logoutAll={logoutAll} revokeSession={revokeSession} sessions={sessions} />
        </>
      }
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <TerminalPanel title="profile/details">
        <form className="grid gap-5" key={user.updated_at} onSubmit={updateProfile}>
          <SectionIntro
            eyebrow="Profile"
            title="Human context for workspace activity"
            description="Agents and teammates need a clear identity for assignments, approvals, reports, and future follow-ups."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Full name
              <input className="field-input" name="name" defaultValue={user.name} maxLength={120} required />
            </label>
            <label className="field-label">
              Role or title
              <input className="field-input" name="title" defaultValue={user.title} maxLength={120} placeholder="Project Manager" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Timezone
              <input className="field-input" name="timezone" defaultValue={user.timezone || "UTC"} maxLength={80} required />
            </label>
            <label className="field-label">
              Avatar URL
              <input className="field-input" name="avatar_url" defaultValue={user.avatar_url} maxLength={500} placeholder="https://..." />
            </label>
          </div>

          <label className="field-label">
            Bio
            <textarea
              className="field-input min-h-32 resize-y"
              name="bio"
              defaultValue={user.bio}
              maxLength={800}
              placeholder="Short context for teammates, reports, and future agent handoffs."
            />
          </label>

          <button className="btn-primary w-fit" disabled={isPending} type="submit">Save profile</button>
        </form>
      </TerminalPanel>

      <TerminalPanel title="security/password">
        <form className="grid gap-5" onSubmit={changePassword}>
          <SectionIntro
            eyebrow="Security"
            title="Password and session hygiene"
            description="Use a strong password and revoke old sessions before this account starts approving external actions."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Current password
              <input className="field-input" name="current_password" type="password" autoComplete="current-password" required />
            </label>
            <label className="field-label">
              New password
              <input className="field-input" name="new_password" type="password" autoComplete="new-password" minLength={10} required />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">
            <input className="h-4 w-4 accent-amber-300" name="logout_other_sessions" type="checkbox" defaultChecked />
            Revoke other sessions after changing password
          </label>

          <button className="btn-secondary w-fit" disabled={isPending} type="submit">Change password</button>
        </form>
      </TerminalPanel>
    </AppFrame>
  );
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="app-card w-full max-w-xl p-8">
        <p className="kicker">Account</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-stone-50">Loading secure account context...</h1>
      </div>
    </main>
  );
}

function UnauthenticatedState({ error }: { error: string | null }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="app-card w-full max-w-xl p-8">
        <p className="kicker">Authentication Required</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-stone-50">Sign in to manage your account.</h1>
        <p className="mt-4 muted-copy">{error ?? "Your account context is required before workspace and project setup."}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/login">Sign in</Link>
          <Link className="btn-secondary" href="/register">Create account</Link>
        </div>
      </div>
    </main>
  );
}

function IdentityCard({ completion, user }: { completion: number; user: User }) {
  return (
    <TerminalPanel title="identity/summary">
      <div className="flex items-center gap-4">
        <Avatar user={user} />
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-stone-50">{user.name || "Unnamed operator"}</h2>
          <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
          <p className="mt-1 text-sm text-zinc-400">{user.title || "No title yet"}</p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-amber-200" style={{ width: `${completion}%` }} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm">
        <StateRow label="Profile" value={user.profile_completed_at ? "complete" : "incomplete"} />
        <StateRow label="Completion" value={`${completion}%`} />
        <StateRow label="Timezone" value={user.timezone || "UTC"} />
        <StateRow label="Last login" value={user.last_login_at ? formatDate(user.last_login_at) : "now"} />
      </dl>
    </TerminalPanel>
  );
}

function SessionsCard({
  isPending,
  logoutAll,
  revokeSession,
  sessions,
}: {
  isPending: boolean;
  logoutAll: () => void;
  revokeSession: (sessionID: string) => void;
  sessions: SessionInfo[];
}) {
  return (
    <TerminalPanel title="security/sessions">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Active sessions</h2>
          <p className="mt-1 text-sm text-zinc-500">Revoke devices you do not recognize.</p>
        </div>
        <button className="btn-secondary shrink-0" disabled={isPending || sessions.length <= 1} onClick={logoutAll} type="button">
          Revoke others
        </button>
      </div>

      <div className="grid gap-3">
        {sessions.map((session) => (
          <article className="soft-card p-4" key={session.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-zinc-500">{session.id.slice(0, 8)}</p>
              {session.current ? (
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-200">Current</span>
              ) : (
                <button className="text-xs font-semibold text-amber-200 hover:text-amber-100" disabled={isPending} onClick={() => revokeSession(session.id)} type="button">
                  Revoke
                </button>
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-400">{session.user_agent || "Unknown device"}</p>
            <p className="mt-3 font-mono text-xs text-zinc-600">Seen {formatDate(session.last_seen_at)}</p>
          </article>
        ))}
      </div>
    </TerminalPanel>
  );
}

function SectionIntro({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="kicker">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-50">{title}</h2>
      <p className="mt-2 muted-copy">{description}</p>
    </div>
  );
}

function Avatar({ user }: { user: User }) {
  if (user.avatar_url) {
    return <div aria-label="Profile avatar" className="h-20 w-20 rounded-3xl border border-zinc-800 bg-cover bg-center" style={{ backgroundImage: `url(${user.avatar_url})` }} />;
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <div className="grid h-20 w-20 place-items-center rounded-3xl border border-amber-300/20 bg-amber-300/10 font-mono text-xl font-semibold text-amber-100">
      {initials}
    </div>
  );
}

function Alert({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  const classes = tone === "error" ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  return <p className={`rounded-2xl border px-4 py-3 text-sm ${classes}`}>{children}</p>;
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono text-xs text-zinc-300">{value}</dd>
    </div>
  );
}

function profileCompletion(user: User) {
  const fields = [user.name, user.title, user.timezone, user.bio];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
