import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function PageHeader({ title, description, crumbs, actions, icon, className, gradient = true }: Props) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 md:p-8",
        gradient && "bg-gradient-mesh bg-card",
        className,
      )}
    >
      {gradient && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "var(--gradient-mesh)" }}
        />
      )}
      <div className="relative">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
              <Home className="h-3 w-3" /> Home
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3 opacity-50" />
                {c.to ? (
                  <Link to={c.to} className="hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="shrink-0 rounded-2xl bg-primary/10 p-2.5 text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold font-display md:text-3xl">{title}</h1>
              {description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
