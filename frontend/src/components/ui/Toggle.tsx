import { clsx } from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        "flex items-center gap-3 bg-bg-main border border-[#2a3441] rounded-[10px] px-3.5 py-3 text-left w-full transition-colors",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-bg-row cursor-pointer"
      )}
    >
      <div
        className={clsx(
          "w-[38px] h-[22px] rounded-full relative flex-shrink-0 transition-colors",
          checked ? "bg-brand" : "bg-[#2a3441]"
        )}
      >
        <div
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all"
          style={{ left: checked ? "18px" : "2px" }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text-main">{label}</div>
        {hint && (
          <div className="text-[11px] text-text-muted mt-0.5 leading-snug">
            {hint}
          </div>
        )}
      </div>
    </button>
  );
}
