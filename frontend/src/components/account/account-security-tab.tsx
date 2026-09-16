import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";

export function AccountSecurityTab() {
  return (
    <div className="mt-8 max-w-[680px]">
      <div className={cn(dashboardStatCardClassName, "p-6")}>
        <h2 className="text-base font-bold text-foreground">Security settings</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Password updates, two-factor authentication, and active sessions are
          coming soon. Developer API keys are managed from the API keys tab.
        </p>
      </div>
    </div>
  );
}
