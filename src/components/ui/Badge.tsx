import { ReactNode } from "react";

type BadgeTone = "ok" | "warn" | "danger" | "neutral";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
