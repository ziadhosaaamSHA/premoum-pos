import { ReactNode } from "react";

export type DetailListItem = {
  label: ReactNode;
  value: ReactNode;
  hidden?: boolean;
};

type DetailListProps = {
  items: DetailListItem[];
};

export default function DetailList({ items }: DetailListProps) {
  return (
    <div className="modal-body">
      <div className="list">
        {items
          .filter((item) => !item.hidden)
          .map((item, index) => (
            <div className="row-line" key={index}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}
