"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AppShell } from "../components/app-shell";
import { Notice } from "../components/notice";
import { PageHeader } from "../components/page-header";
import { apiRequest, errorMessage } from "../lib/api";
import type { ProfileResponse, Project, ProjectResponse, ProjectsResponse, User, Workspace, WorkspaceResponse, WorkspacesResponse } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SetupClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspaceID, setSelectedWorkspaceID] = useState("");
  const [workspaceType, setWorkspaceType] = useState("engineering_team");
  const [projectType, setProjectType] = useState("software_product");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedWorkspace = useMemo(() => workspaces.find((item) => item.id === selectedWorkspaceID), [selectedWorkspaceID, workspaces]);
  const completion = useMemo(() => {
    const done = [Boolean(user?.profile_completed_at), workspaces.length > 0, projects.length > 0].filter(Boolean).length;
    return Math.round((done / 4) * 100);
  }, [projects.length, user?.profile_completed_at, workspaces.length]);

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
      await loadProjects(firstWorkspaceID);
      setError(null);
    } catch (requestError) {
      setUser(null);
      setError(errorMessage(requestError, "Sign in before setup."));
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSetup(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSetup]);

  function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<WorkspaceResponse>("/api/v1/workspaces", {
            method: "POST",
            body: JSON.stringify({
              name: String(form.get("name") ?? ""),
              description: String(form.get("description") ?? ""),
              workspace_type: workspaceType,
            }),
          });
          setWorkspaces((items) => [body.workspace, ...items]);
          setSelectedWorkspaceID(body.workspace.id);
          setProjects([]);
          setNotice("Workspace created.");
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
      setError("Select a workspace first.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    startTransition(() => {
      void (async () => {
        try {
          const body = await apiRequest<ProjectResponse>("/api/v1/projects", {
            method: "POST",
            body: JSON.stringify({
              workspace_id: selectedWorkspaceID,
              name: String(form.get("name") ?? ""),
              description: String(form.get("description") ?? ""),
              project_key: String(form.get("project_key") ?? ""),
              project_type: projectType,
              start_date: String(form.get("start_date") ?? ""),
              target_date: String(form.get("target_date") ?? ""),
            }),
          });
          setProjects((items) => [body.project, ...items]);
          setNotice("Project created.");
          formElement.reset();
        } catch (requestError) {
          setError(errorMessage(requestError, "Could not create project"));
        }
      })();
    });
  }

  function selectWorkspace(workspaceID: string) {
    setSelectedWorkspaceID(workspaceID);
    startTransition(() => void loadProjects(workspaceID));
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

  if (loading) return <CenteredCard title="Loading setup" description="Fetching workspace context." />;
  if (!user) return <AuthRequired message={error ?? "Sign in before setup."} />;

  return (
    <AppShell aside={<SetupAside completion={completion} projects={projects} selectWorkspace={selectWorkspace} selectedWorkspaceID={selectedWorkspaceID} workspaces={workspaces} />}>
      <PageHeader
        eyebrow="Setup"
        title="Create the workspace and first project."
        description="These two records become the permission, audit, and integration boundary for Jira and future agents."
        actions={<Button onClick={logout} variant="outline">Sign out</Button>}
      />

      {error ? <Notice message={error} title="Error" variant="destructive" /> : null}
      {notice ? <Notice message={notice} title="Saved" /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create workspace</CardTitle>
            <CardDescription>The creator becomes owner.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={createWorkspace}>
              <Field label="Workspace name" name="name" placeholder="Acme Engineering" required />
              <div className="grid gap-2">
                <Label>Workspace type</Label>
                <Select onValueChange={setWorkspaceType} value={workspaceType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="product_team">Product team</SelectItem>
                    <SelectItem value="engineering_team">Engineering team</SelectItem>
                    <SelectItem value="personal_project_workspace">Personal project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workspace-description">Description</Label>
                <Textarea id="workspace-description" name="description" placeholder="What does this team build?" />
              </div>
              <Button className="w-fit" disabled={isPending} type="submit">Create workspace</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>{selectedWorkspace ? `Inside ${selectedWorkspace.name}` : "Select a workspace first."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={createProject}>
              <div className="grid gap-2">
                <Label>Workspace</Label>
                <Select onValueChange={selectWorkspace} value={selectedWorkspaceID}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select workspace" /></SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                <Field label="Project name" name="name" placeholder="Auth Platform" required />
                <Field label="Key" name="project_key" placeholder="AUTH" required />
              </div>
              <div className="grid gap-2">
                <Label>Project type</Label>
                <Select onValueChange={setProjectType} value={projectType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software_product">Software product</SelectItem>
                    <SelectItem value="client_project">Client project</SelectItem>
                    <SelectItem value="internal_tool">Internal tool</SelectItem>
                    <SelectItem value="research_project">Research project</SelectItem>
                    <SelectItem value="maintenance_project">Maintenance project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Start date" name="start_date" type="date" />
                <Field label="Target date" name="target_date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" name="description" placeholder="What should this project deliver?" />
              </div>
              <Button className="w-fit" disabled={isPending || !selectedWorkspaceID} type="submit">Create project</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function SetupAside({ completion, projects, selectWorkspace, selectedWorkspaceID, workspaces }: { completion: number; projects: Project[]; selectWorkspace: (id: string) => void; selectedWorkspaceID: string; workspaces: Workspace[] }) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle>Progress</CardTitle><CardDescription>Jira unlocks after project setup.</CardDescription></CardHeader>
        <CardContent className="grid gap-4"><Progress value={completion} /><Badge className="w-fit" variant="secondary">{completion}% complete</Badge></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Workspaces</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {workspaces.length === 0 ? <p className="text-sm text-muted-foreground">No workspaces yet.</p> : workspaces.map((workspace) => (
            <Button className="justify-start" key={workspace.id} onClick={() => selectWorkspace(workspace.id)} variant={workspace.id === selectedWorkspaceID ? "secondary" : "ghost"}>{workspace.name}</Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects in selected workspace.</p> : projects.map((project) => (
            <div className="rounded-lg border p-3" key={project.id}><div className="flex items-center justify-between gap-2"><span className="font-medium">{project.name}</span><Badge variant="outline">{project.project_key}</Badge></div></div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, name, placeholder, required, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} placeholder={placeholder} required={required} type={type} /></div>;
}

function CenteredCard({ description, title }: { description: string; title: string }) {
  return <main className="grid min-h-screen place-items-center px-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card></main>;
}

function AuthRequired({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center px-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Sign in required</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent className="flex gap-2"><Button asChild><Link href="/login">Sign in</Link></Button><Button asChild variant="outline"><Link href="/register">Create account</Link></Button></CardContent></Card></main>;
}
