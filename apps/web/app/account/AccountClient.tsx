"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { AppShell } from "../components/app-shell";
import { Notice } from "../components/notice";
import { PageHeader } from "../components/page-header";
import { apiRequest, errorMessage } from "../lib/api";
import type { ProfileResponse, SessionInfo, SessionsResponse, User } from "../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function AccountClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setError(errorMessage(requestError, "Sign in to manage your account."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAccount(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadAccount]);

  async function refreshSessions() {
    const body = await apiRequest<SessionsResponse>("/api/v1/auth/sessions");
    setSessions(body.sessions);
  }

  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<{ user: User }>("/api/v1/profile", {
            method: "PATCH",
            body: JSON.stringify({
              name: String(form.get("name") ?? ""),
              title: String(form.get("title") ?? ""),
              timezone: String(form.get("timezone") ?? "UTC"),
              avatar_url: String(form.get("avatar_url") ?? ""),
              bio: String(form.get("bio") ?? ""),
            }),
          });
          setUser(body.user);
          setNotice("Profile saved.");
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not save profile"));
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

    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/password", {
            method: "PATCH",
            body: JSON.stringify({
              current_password: String(form.get("current_password") ?? ""),
              new_password: String(form.get("new_password") ?? ""),
              logout_other_sessions: form.get("logout_other_sessions") === "on",
            }),
          });
          formElement.reset();
          await refreshSessions();
          setNotice("Password changed.");
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not change password"));
        }
      })();
    });
  }

  function revokeSession(sessionID: string) {
    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/sessions/revoke", {
            method: "POST",
            body: JSON.stringify({ session_id: sessionID }),
          });
          await refreshSessions();
          setNotice("Session revoked.");
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not revoke session"));
        }
      })();
    });
  }

  function logout() {
    startTransition(() => {
      void (async () => {
        try {
          await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
        } finally {
          router.push("/login");
          router.refresh();
        }
      })();
    });
  }

  if (loading) return <CenteredCard title="Loading account" description="Fetching your secure session." />;
  if (!user) return <AuthRequired message={error ?? "Authentication required."} />;

  const completion = profileCompletion(user);

  return (
    <AppShell aside={<AccountAside completion={completion} revokeSession={revokeSession} sessions={sessions} user={user} />}>
      <PageHeader
        eyebrow="Account"
        title="Profile and security"
        description="This identity owns workspace actions, approvals, sessions, and audit records."
        actions={
          <>
            <Button asChild><Link href="/setup">Continue setup</Link></Button>
            <Button onClick={logout} variant="outline">Sign out</Button>
          </>
        }
      />

      {error ? <Notice message={error} title="Error" variant="destructive" /> : null}
      {notice ? <Notice message={notice} title="Saved" /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Used for workspace membership and project activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={updateProfile}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field defaultValue={user.name} label="Name" name="name" required />
              <Field defaultValue={user.title} label="Title" name="title" placeholder="Project Manager" />
              <Field defaultValue={user.timezone || "UTC"} label="Timezone" name="timezone" required />
              <Field defaultValue={user.avatar_url} label="Avatar URL" name="avatar_url" placeholder="https://..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea defaultValue={user.bio} id="bio" name="bio" placeholder="Short context for teammates and future agent handoffs." />
            </div>
            <Button className="w-fit" disabled={isPending} type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use at least 10 characters with a letter and number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={changePassword}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current password" name="current_password" required type="password" />
              <Field label="New password" name="new_password" required type="password" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input className="accent-primary" defaultChecked name="logout_other_sessions" type="checkbox" />
              Revoke other sessions
            </label>
            <Button className="w-fit" disabled={isPending} type="submit" variant="outline">Change password</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function AccountAside({ completion, revokeSession, sessions, user }: { completion: number; revokeSession: (id: string) => void; sessions: SessionInfo[]; user: User }) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{(user.name || user.email).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.name || "Unnamed user"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="mb-2 flex justify-between text-sm"><span>Profile</span><span>{completion}%</span></div>
            <Progress value={completion} />
          </div>
          <Badge variant="secondary">{user.timezone || "UTC"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Active devices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {sessions.map((session) => (
            <div className="rounded-lg border p-3" key={session.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{session.id.slice(0, 8)}</span>
                {session.current ? <Badge>Current</Badge> : <Button onClick={() => revokeSession(session.id)} size="sm" variant="ghost">Revoke</Button>}
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{session.user_agent || "Unknown device"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function Field({ defaultValue, label, name, placeholder, required, type = "text" }: { defaultValue?: string; label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={defaultValue} id={name} name={name} placeholder={placeholder} required={required} type={type} />
    </div>
  );
}

function CenteredCard({ description, title }: { description: string; title: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>
    </main>
  );
}

function AuthRequired({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Sign in required</CardTitle><CardDescription>{message}</CardDescription></CardHeader>
        <CardContent className="flex gap-2"><Button asChild><Link href="/login">Sign in</Link></Button><Button asChild variant="outline"><Link href="/register">Create account</Link></Button></CardContent>
      </Card>
    </main>
  );
}

function profileCompletion(user: User) {
  return Math.round(([user.name, user.title, user.timezone, user.bio].filter(Boolean).length / 4) * 100);
}
