import Button from "./Button";

type PrimaryToolbarActionProps = {
  label: string;
  icon?: string;
  onClick: () => void;
};

export default function PrimaryToolbarAction({ label, icon, onClick }: PrimaryToolbarActionProps) {
  return (
    <Button icon={icon} onClick={onClick}>
      {label}
    </Button>
  );
}
