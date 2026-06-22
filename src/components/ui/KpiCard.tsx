import { ReactNode } from "react";

type KpiCardProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: string;
};

export default function KpiCard({ label, value, description, icon }: KpiCardProps) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {description ? <small>{description}</small> : null}
      {icon ? <i className={icon}></i> : null}
    </div>
  );
}
