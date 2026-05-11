import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "./components/app-shell";
import { PageHeader } from "./components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const steps = [
  ["Account", "Create a secure operator identity."],
  ["Workspace", "Create the team boundary."],
  ["Project", "Create the first delivery context."],
  ["Jira", "Connect the first source of truth next."],
];

export default function Home() {
  return (
    <AppShell
      aside={
        <Card>
          <CardHeader>
            <CardTitle>Current foundation</CardTitle>
            <CardDescription>Ready before Jira integration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              "Custom auth",
              "Profile and sessions",
              "Workspace setup",
              "Project setup",
            ].map((item) => (
              <div className="flex items-center gap-2 text-sm" key={item}>
                <CheckCircle2 className="size-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      }
    >
      <PageHeader
        eyebrow="Agentic project management"
        title="Set the foundation before agents touch work."
        description="Start with identity, workspace, and project boundaries. Then connect Jira and let the platform turn project signals into PM intelligence."
        actions={
          <>
            <Button asChild>
              <Link href="/register">Start setup <ArrowRight /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Base journey</CardTitle>
              <CardDescription>Only the necessary steps are shown.</CardDescription>
            </div>
            <Badge variant="secondary">Phase 1</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map(([title, description], index) => (
              <Card className="bg-muted/30" key={title}>
                <CardHeader>
                  <Badge className="w-fit" variant="outline">{index + 1}</Badge>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product rule</CardTitle>
          <CardDescription>External writes stay approval-first. Jira remains the source of truth during MVP.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <div className="flex flex-wrap gap-2">
            <Badge>Evidence-backed</Badge>
            <Badge variant="secondary">PM controlled</Badge>
            <Badge variant="outline">Jira first</Badge>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
