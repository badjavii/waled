import { ChevronDown } from "lucide-react";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel?: string;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
}: SelectProps<T>) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={ariaLabel}
        disabled={disabled}
        className="input appearance-none pr-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
    </div>
  );
}
