import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, secondaryAction, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-primary">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold font-display">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
