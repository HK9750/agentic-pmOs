import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function TerminalPanel({ title, children }: Props) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-900/35 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-200" />
          <span className="font-mono text-xs text-zinc-500">{title}</span>
        </div>
        <span className="rounded-full border border-zinc-800 bg-black/20 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-600">
          live
        </span>
      </div>
      <div className="p-5 sm:p-6 lg:p-7">{children}</div>
    </section>
  );
}
