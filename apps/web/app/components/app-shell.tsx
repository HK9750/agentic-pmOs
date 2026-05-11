import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const nav = [
  { href: "/", label: "Home" },
  { href: "/account", label: "Account" },
  { href: "/setup", label: "Setup" },
];

type AppShellProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function AppShell({ aside, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-4 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card className="sticky top-4 h-[calc(100vh-2rem)] bg-card/70 backdrop-blur">
            <CardContent className="flex h-full flex-col p-4">
              <Link className="flex items-center gap-3 rounded-lg p-2" href="/">
                <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">A</span>
                <span>
                  <span className="block text-sm font-medium">Agentic PM</span>
                  <span className="block text-xs text-muted-foreground">foundation</span>
                </span>
              </Link>

              <nav className="mt-6 grid gap-1">
                {nav.map((item) => (
                  <Button asChild className="justify-start" key={item.href} variant="ghost">
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>

              <div className="mt-auto rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next</p>
                <p className="mt-2 text-sm">Connect Jira after workspace and project setup.</p>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="grid gap-6">
          <div className={aside ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-6"}>
            <div className="grid content-start gap-6">{children}</div>
            {aside ? <aside className="grid content-start gap-6">{aside}</aside> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
