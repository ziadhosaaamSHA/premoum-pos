import { FormEvent, ReactNode } from "react";
import Button from "./Button";

type ModalFormProps = {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
};

export default function ModalForm({
  children,
  onSubmit,
  submitting = false,
  submitLabel = "حفظ التغييرات",
  submittingLabel = "جارٍ الحفظ...",
}: ModalFormProps) {
  return (
    <form className="form" onSubmit={onSubmit}>
      {children}
      <Button type="submit" loading={submitting} loadingLabel={submittingLabel}>
        {submitLabel}
      </Button>
    </form>
  );
}
