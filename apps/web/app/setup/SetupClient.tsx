"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AppFrame } from "../components/AppFrame";
import { TerminalPanel } from "../components/TerminalPanel";
import { apiRequest, errorMessage } from "../lib/api";
import type { ProfileResponse, Project, ProjectResponse, ProjectsResponse, User, Workspace, WorkspaceResponse, WorkspacesResponse } from "../lib/types";

export function SetupClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspaceID, setSelectedWorkspaceID] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceID) ?? null,
    [selectedWorkspaceID, workspaces],
  );

  const checklist = useMemo(
    () => [
      {
        label: "Profile",
        title: "Complete operator profile",
        done: Boolean(user?.profile_completed_at),
        detail: user?.profile_completed_at ? "Ready for ownership and audit trails" : "Add name and timezone in account settings",
        href: "/account",
      },
      {
        label: "Workspace",
        title: "Create the team boundary",
        done: workspaces.length > 0,
        detail: workspaces.length > 0 ? `${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} available` : "Create the company/team container",
      },
      {
        label: "Project",
        title: "Create the first delivery context",
        done: projects.length > 0,
        detail: projects.length > 0 ? `${projects.length} project${projects.length === 1 ? "" : "s"} in selected workspace` : "Create a project before mapping Jira",
      },
      {
        label: "Jira",
        title: "Connect source of truth",
        done: false,
        detail: "Next implementation slice",
      },
    ],
    [projects.length, user?.profile_completed_at, workspaces.length],
  );

  const completedSteps = checklist.filter((item) => item.done).length;
  const setupPercent = Math.round((completedSteps / checklist.length) * 100);

  const loadProjects = useCallback(async (workspaceID: string) => {
    if (!workspaceID) {
      setProjects([]);
      return;
    }

    const body = await apiRequest<ProjectsResponse>(`/api/v1/projects?workspace_id=${encodeURIComponent(workspaceID)}`);
    setProjects(body.projects);
  }, []);

  const loadSetup = useCallback(async () => {
    try {
      const [profile, workspaceList] = await Promise.all([
        apiRequest<ProfileResponse>("/api/v1/auth/me"),
        apiRequest<WorkspacesResponse>("/api/v1/workspaces"),
      ]);

      setUser(profile.user);
      setWorkspaces(workspaceList.workspaces);
      const firstWorkspaceID = workspaceList.workspaces[0]?.id ?? "";
      setSelectedWorkspaceID(firstWorkspaceID);
      if (firstWorkspaceID) {
        await loadProjects(firstWorkspaceID);
      } else {
        setProjects([]);
      }
      setError(null);
    } catch (requestError) {
      setUser(null);
      setWorkspaces([]);
      setProjects([]);
      setError(errorMessage(requestError, "Sign in before creating a workspace."));
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSetup();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadSetup]);

  function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      workspace_type: String(form.get("workspace_type") ?? "engineering_team"),
    };

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<WorkspaceResponse>("/api/v1/workspaces", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setWorkspaces((items) => [body.workspace, ...items]);
          setSelectedWorkspaceID(body.workspace.id);
          setProjects([]);
          setNotice("Workspace created. Add the first project to activate the base dashboard.");
          formElement.reset();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not create workspace"));
        }
      })();
    });
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!selectedWorkspaceID) {
      setError("Create or select a workspace first.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      workspace_id: selectedWorkspaceID,
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      project_key: String(form.get("project_key") ?? ""),
      project_type: String(form.get("project_type") ?? "software_product"),
      start_date: String(form.get("start_date") ?? ""),
      target_date: String(form.get("target_date") ?? ""),
    };

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<ProjectResponse>("/api/v1/projects", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setProjects((items) => [body.project, ...items]);
          setNotice("Project created. Jira connector is the next product layer.");
          formElement.reset();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not create project"));
        }
      })();
    });
  }

  function selectWorkspace(workspaceID: string) {
    setSelectedWorkspaceID(workspaceID);
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await loadProjects(workspaceID);
        } catch (requestError) {
          setProjects([]);
          setError(errorMessage(requestError, "Could not load projects"));
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

  if (loading) {
    return <SetupLoading />;
  }

  if (!user) {
    return <SetupAuthRequired error={error} />;
  }

  return (
    <AppFrame
      eyebrow="Workspace Setup"
      title="Build the operating boundary before integrations."
      description="The workspace is the permission and audit container. The project is where Jira, activity, task mirrors, reports, and agents will attach."
      actions={
        <>
          <Link className="btn-primary" href="/account">Account</Link>
          <button className="btn-secondary" disabled={isPending} onClick={logout} type="button">Sign out</button>
        </>
      }
      aside={
        <>
          <SetupProgress checklist={checklist} completedSteps={completedSteps} percent={setupPercent} />
          <WorkspaceList selectedWorkspaceID={selectedWorkspaceID} selectWorkspace={selectWorkspace} workspaces={workspaces} />
          <ProjectList projects={projects} />
        </>
      }
    >
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <TerminalPanel title="workspace/create">
          <form className="grid gap-5" onSubmit={createWorkspace}>
            <SectionIntro
              eyebrow="Step 1"
              title="Create a workspace"
              description="This is the company or team container. It owns members, permissions, connectors, and future billing."
            />
            <label className="field-label">
              Workspace name
              <input className="field-input" name="name" placeholder="Acme Engineering" required />
            </label>
            <label className="field-label">
              Workspace type
              <select className="field-input" name="workspace_type" defaultValue="engineering_team">
                <option value="startup">Startup</option>
                <option value="agency">Agency</option>
                <option value="product_team">Product team</option>
                <option value="engineering_team">Engineering team</option>
                <option value="personal_project_workspace">Personal project workspace</option>
              </select>
            </label>
            <label className="field-label">
              Description
              <textarea className="field-input min-h-28 resize-y" name="description" placeholder="What kind of work will agents help coordinate?" />
            </label>
            <button className="btn-primary w-fit" disabled={isPending} type="submit">Create workspace</button>
          </form>
        </TerminalPanel>

        <TerminalPanel title="project/create">
          <form className="grid gap-5" onSubmit={createProject}>
            <SectionIntro
              eyebrow="Step 2"
              title="Create a project"
              description="This is the delivery context that will later receive Jira tasks, GitHub activity, Slack signals, and agent suggestions."
            />
            <label className="field-label">
              Workspace
              <select className="field-input" value={selectedWorkspaceID} onChange={(event) => selectWorkspace(event.target.value)}>
                <option value="">Select workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="field-label">
                Project name
                <input className="field-input" name="name" placeholder="Auth Platform" required />
              </label>
              <label className="field-label">
                Key
                <input className="field-input uppercase" name="project_key" placeholder="AUTH" required />
              </label>
            </div>
            <label className="field-label">
              Project type
              <select className="field-input" name="project_type" defaultValue="software_product">
                <option value="software_product">Software product</option>
                <option value="client_project">Client project</option>
                <option value="internal_tool">Internal tool</option>
                <option value="research_project">Research project</option>
                <option value="maintenance_project">Maintenance project</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                Start date
                <input className="field-input" name="start_date" type="date" />
              </label>
              <label className="field-label">
                Target date
                <input className="field-input" name="target_date" type="date" />
              </label>
            </div>
            <label className="field-label">
              Description
              <textarea className="field-input min-h-28 resize-y" name="description" placeholder="What is this project meant to deliver?" />
            </label>
            <button className="btn-primary w-fit" disabled={isPending || !selectedWorkspaceID} type="submit">Create project</button>
          </form>
        </TerminalPanel>
      </section>

      <section className="app-card p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">Selected Workspace</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-50">
              {selectedWorkspace?.name ?? "No workspace selected"}
            </h2>
            <p className="mt-2 muted-copy">
              {selectedWorkspace?.description || "Select or create a workspace to view its project base."}
            </p>
          </div>
          <span className="w-fit rounded-full border border-zinc-800 bg-black/20 px-3 py-1.5 font-mono text-xs text-zinc-400">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>
    </AppFrame>
  );
}

function SetupLoading() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="app-card w-full max-w-xl p-8">
        <p className="kicker">Setup</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-stone-50">Loading workspace context...</h1>
      </div>
    </main>
  );
}

function SetupAuthRequired({ error }: { error: string | null }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="app-card w-full max-w-xl p-8">
        <p className="kicker">Authentication Required</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-stone-50">Sign in before setup.</h1>
        <p className="mt-4 muted-copy">{error ?? "Workspace and project setup needs an authenticated account."}</p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary" href="/login">Sign in</Link>
          <Link className="btn-secondary" href="/register">Create account</Link>
        </div>
      </div>
    </main>
  );
}

function SetupProgress({
  checklist,
  completedSteps,
  percent,
}: {
  checklist: Array<{ detail: string; done: boolean; href?: string; label: string; title: string }>;
  completedSteps: number;
  percent: number;
}) {
  return (
    <TerminalPanel title="setup/progress">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Setup progress</h2>
          <p className="mt-1 text-sm text-zinc-500">{completedSteps} of {checklist.length} base steps complete</p>
        </div>
        <span className="rounded-full bg-amber-300/10 px-2.5 py-1 font-mono text-xs text-amber-200">{percent}%</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-amber-200" style={{ width: `${percent}%` }} />
      </div>
      <div className="grid gap-3">
        {checklist.map((item) => {
          const content = (
            <div className={`rounded-2xl border p-4 ${item.done ? "border-emerald-400/20 bg-emerald-400/10" : "border-zinc-800 bg-black/20"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-xs ${item.done ? "bg-emerald-300 text-zinc-950" : "bg-zinc-900 text-zinc-500"}`}>
                  {item.done ? "✓" : item.label.slice(0, 1)}
                </span>
                <span>
                  <span className="block font-semibold text-stone-100">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.detail}</span>
                </span>
              </div>
            </div>
          );
          return item.href ? <Link key={item.label} href={item.href}>{content}</Link> : <div key={item.label}>{content}</div>;
        })}
      </div>
    </TerminalPanel>
  );
}

function WorkspaceList({
  selectedWorkspaceID,
  selectWorkspace,
  workspaces,
}: {
  selectedWorkspaceID: string;
  selectWorkspace: (workspaceID: string) => void;
  workspaces: Workspace[];
}) {
  return (
    <TerminalPanel title="workspaces">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-100">Workspaces</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose which workspace project list is shown.</p>
      </div>
      <div className="grid gap-3">
        {workspaces.length === 0 ? (
          <p className="text-sm text-zinc-500">No workspaces yet.</p>
        ) : (
          workspaces.map((workspace) => (
            <button
              className={`rounded-2xl border p-4 text-left transition ${workspace.id === selectedWorkspaceID ? "border-amber-300/40 bg-amber-300/10" : "border-zinc-800 bg-black/20 hover:border-zinc-600"}`}
              key={workspace.id}
              onClick={() => selectWorkspace(workspace.id)}
              type="button"
            >
              <p className="font-semibold text-stone-100">{workspace.name}</p>
              <p className="mt-1 font-mono text-xs text-zinc-500">{workspace.role} / {workspace.workspace_type}</p>
            </button>
          ))
        )}
      </div>
    </TerminalPanel>
  );
}

function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <TerminalPanel title="projects">
      <div className="grid gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects for the selected workspace yet.</p>
        ) : (
          projects.map((project) => (
            <article className="soft-card p-4" key={project.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-100">{project.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{project.description || "No description"}</p>
                </div>
                <span className="rounded-lg bg-zinc-900 px-2 py-1 font-mono text-xs text-amber-200">{project.project_key}</span>
              </div>
              <p className="mt-3 font-mono text-xs text-zinc-600">{project.project_type} / {project.status}</p>
            </article>
          ))
        )}
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
