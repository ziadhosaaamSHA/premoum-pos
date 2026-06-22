import { HTMLAttributes, ReactNode } from "react";

type PageProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export default function Page({ children, className, ...props }: PageProps) {
  const classes = ["page", "active", className].filter(Boolean).join(" ");

  return (
    <section className={classes} {...props}>
      {children}
    </section>
  );
}
