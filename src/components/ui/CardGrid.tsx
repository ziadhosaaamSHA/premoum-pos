import { ReactNode } from "react";

type CardGridProps = {
  children: ReactNode;
  className?: string;
};

export default function CardGrid({ children, className }: CardGridProps) {
  const classes = ["grid", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
