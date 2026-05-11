export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  title: string;
  timezone: string;
  bio: string;
  email_verified_at?: string;
  profile_completed_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
};

export type SessionInfo = {
  id: string;
  current: boolean;
  user_agent: string;
  ip_address: string;
  expires_at: string;
  last_seen_at: string;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  description: string;
  workspace_type: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  project_key: string;
  project_type: string;
  status: string;
  role: string;
  start_date?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  user: User;
};

export type ProfileResponse = {
  user: User;
  session: SessionInfo;
};

export type SessionsResponse = {
  sessions: SessionInfo[];
};

export type WorkspacesResponse = {
  workspaces: Workspace[];
};

export type WorkspaceResponse = {
  workspace: Workspace;
};

export type ProjectsResponse = {
  projects: Project[];
};

export type ProjectResponse = {
  project: Project;
};
