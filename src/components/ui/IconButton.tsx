import { ButtonHTMLAttributes } from "react";

type IconButtonVariant = "view" | "edit" | "print" | "delete" | "approve" | "default";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  variant?: IconButtonVariant;
  compact?: boolean;
};

export default function IconButton({
  icon,
  variant = "default",
  compact = false,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = [
    "action-btn",
    variant === "default" ? "" : variant,
    compact ? "compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      <i className={icon}></i>
    </button>
  );
}
