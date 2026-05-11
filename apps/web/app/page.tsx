import Link from "next/link";
import { AppFrame } from "./components/AppFrame";
import { TerminalPanel } from "./components/TerminalPanel";
import { apiUrl } from "./lib/api";

const operatingLoop = [
  { label: "Create account", detail: "Secure local auth, profile, sessions" },
  { label: "Create workspace", detail: "Team boundary, ownership, audit scope" },
  { label: "Create project", detail: "Delivery context before Jira mapping" },
  { label: "Connect Jira", detail: "Next source-of-truth integration" },
];

const principles = [
  "PM approval before external writes",
  "Evidence attached to every agent claim",
  "Jira remains source of truth during MVP",
  "Signals become activity, status, and suggestions",
];

export default function Home() {
  return (
    <AppFrame
      eyebrow="Project Intelligence Base"
      title="A PM operating system that starts with trustworthy foundations."
      description="Set up identity, workspace, and project context first. Once those boundaries are clean, Jira, activity mirroring, agent suggestions, and command workflows can be added without turning the product into chaos."
      actions={
        <>
          <Link className="btn-primary" href="/register">Start setup</Link>
          <Link className="btn-secondary" href="/login">Sign in</Link>
          <a className="btn-ghost" href={`${apiUrl}/healthz`}>API health</a>
        </>
      }
      aside={
        <>
          <TerminalPanel title="readiness/base">
            <div className="grid gap-4">
              <div>
                <p className="kicker">Current Base</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-50">Ready for Jira preparation</h2>
                <p className="mt-2 muted-copy">Auth, profile, workspace, and project setup are now the first coherent journey.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Backend" value="Gin" />
                <Metric label="Frontend" value="Next" />
                <Metric label="Auth" value="Local" />
                <Metric label="DB" value="Postgres" />
              </div>
            </div>
          </TerminalPanel>

          <TerminalPanel title="principles/safety">
            <ul className="grid gap-3">
              {principles.map((principle) => (
                <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={principle}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </TerminalPanel>
        </>
      }
    >
      <section className="app-card p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kicker">User Journey</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-50">One path, no ambiguity.</h2>
          </div>
          <Link className="btn-secondary w-fit" href="/setup">Open setup</Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {operatingLoop.map((item, index) => (
            <article className="soft-card p-4" key={item.label}>
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-200 font-mono text-sm font-bold text-zinc-950">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-stone-100">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <TerminalPanel title="flow/auth-profile">
          <p className="kicker">First Flow</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-50">Identity before project state.</h2>
          <p className="mt-3 muted-copy">Users create a secure account, complete profile context, and manage sessions before they can establish workspace/project boundaries.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/register">Create account</Link>
            <Link className="btn-secondary" href="/account">Manage account</Link>
          </div>
        </TerminalPanel>

        <TerminalPanel title="flow/workspace-project">
          <p className="kicker">Second Flow</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-50">Workspace before integrations.</h2>
          <p className="mt-3 muted-copy">The workspace owns members and permissions. The project owns Jira mapping, activity, tasks, agents, and reports.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/setup">Continue setup</Link>
          </div>
        </TerminalPanel>
      </section>
    </AppFrame>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{value}</p>
    </div>
  );
}
