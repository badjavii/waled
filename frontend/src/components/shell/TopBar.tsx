import type { BcvRate } from "@/ipc/types";
import { BcvWidget } from "./BcvWidget";

interface TopBarProps {
  title: string;
  subtitle: string;
  rate: BcvRate | null | undefined;
  loading: boolean;
}

export function TopBar({ title, subtitle, rate, loading }: TopBarProps) {
  return (
    <header className="h-[66px] flex-shrink-0 border-b border-border-muted flex items-center justify-between px-8">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-tight truncate">
          {title}
        </h2>
        <p className="text-xs text-text-muted font-medium truncate">
          {subtitle}
        </p>
      </div>
      <BcvWidget rate={rate} loading={loading} />
    </header>
  );
}
