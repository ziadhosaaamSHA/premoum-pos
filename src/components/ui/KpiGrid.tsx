import { ReactNode } from "react";

type KpiGridProps = {
  children: ReactNode;
};

export default function KpiGrid({ children }: KpiGridProps) {
  return <section className="kpis">{children}</section>;
}
