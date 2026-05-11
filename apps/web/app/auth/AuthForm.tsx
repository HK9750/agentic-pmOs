"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { apiRequest, errorMessage } from "../lib/api";
import type { AuthResponse } from "../lib/types";
import { Notice } from "../components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isRegister = mode === "register";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    if (isRegister) {
      payload.name = String(form.get("name") ?? "");
    }

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<AuthResponse>(`/api/v1/auth/${mode}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setMessage(`Signed in as ${body.user.email}.`);
          router.push("/account");
          router.refresh();
        } catch (requestError) {
          setError(errorMessage(requestError, "Authentication failed"));
        }
      })();
    });
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegister ? "Create account" : "Sign in"}</CardTitle>
          <CardDescription>
            {isRegister ? "Create the operator account used for approvals and audit." : "Continue workspace setup."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            {isRegister ? (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Hasnain Ali" required />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" placeholder="you@company.com" type="email" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" minLength={10} name="password" placeholder="10+ chars with letter and number" type="password" required />
            </div>

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </Button>

            {error ? <Notice message={error} title="Could not continue" variant="destructive" /> : null}
            {message ? <Notice message={message} title="Success" /> : null}
          </form>

          <Separator className="my-5" />

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{isRegister ? "Already registered?" : "Need an account?"}</span>
            <Button asChild variant="ghost">
              <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create one"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
