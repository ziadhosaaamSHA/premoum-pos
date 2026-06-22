import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "danger" | "primary-green";
type ButtonSize = "default" | "small" | "large";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export default function Button({
  variant = "primary",
  size = "default",
  icon,
  loading = false,
  loadingLabel,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass = variant === "danger" ? "danger-btn" : variant;
  const sizeClass = size === "default" ? "" : size;
  const classes = [variantClass, sizeClass, className].filter(Boolean).join(" ");

  return (
    <button className={classes} disabled={disabled || loading} type={type} {...props}>
      {icon ? <i className={icon}></i> : null}
      {loading ? loadingLabel || "جارٍ الحفظ..." : children}
    </button>
  );
}
