import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/account", label: "Account" },
  { href: "/setup", label: "Setup" },
];

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function AppFrame({ eyebrow, title, description, actions, aside, children }: Props) {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="app-card hidden h-[calc(100vh-2rem)] sticky top-4 p-4 lg:block">
          <Link className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/20 p-3" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-200 font-mono text-sm font-black text-zinc-950">AP</span>
            <span>
              <span className="block text-sm font-semibold text-stone-100">Agentic PM</span>
              <span className="block font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500">local base</span>
            </span>
          </Link>

          <nav className="mt-6 grid gap-1">
            {navigation.map((item) => (
              <Link className="rounded-2xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-stone-100" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">Next</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Finish workspace base, then attach Jira as the first source of truth.</p>
          </div>
        </aside>

        <section className="grid gap-5">
          <header className="app-card p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="kicker">{eyebrow}</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-stone-50 sm:text-5xl lg:text-6xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">{description}</p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </header>

          <div className={aside ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]" : "grid gap-5"}>
            <div className="grid content-start gap-5">{children}</div>
            {aside ? <aside className="grid content-start gap-5">{aside}</aside> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
