import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p> : null}
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
