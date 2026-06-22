import { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  wide?: boolean;
  danger?: boolean;
};

export default function Card({ children, wide = false, danger = false, className, ...props }: CardProps) {
  const classes = ["card", wide ? "wide" : "", danger ? "danger-card" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
