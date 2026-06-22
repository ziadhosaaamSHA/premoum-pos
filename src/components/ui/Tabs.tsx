import { ReactNode } from "react";

export type TabItem<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: string;
  disabled?: boolean;
};

type TabsProps<T extends string> = {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export default function Tabs<T extends string>({
  value,
  items,
  onChange,
  className = "subtabs",
}: TabsProps<T>) {
  return (
    <div className={className}>
      {items.map((item) => (
        <button
          className={`subtab ${value === item.value ? "active" : ""}`}
          disabled={item.disabled}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.icon ? <i className={item.icon}></i> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}
