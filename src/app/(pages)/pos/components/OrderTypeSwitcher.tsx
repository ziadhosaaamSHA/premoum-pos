import { OrderTypeUi } from "../types";

const orderTypes: Array<{ id: OrderTypeUi; label: string }> = [
  { id: "dine_in", label: "صالة" },
  { id: "takeaway", label: "تيك أواي" },
  { id: "delivery", label: "توصيل" },
];

type OrderTypeSwitcherProps = {
  orderType: OrderTypeUi;
  onChange: (value: OrderTypeUi) => void;
};

export default function OrderTypeSwitcher({ orderType, onChange }: OrderTypeSwitcherProps) {
  return (
    <div className="order-types">
      {orderTypes.map((type) => (
        <button
          key={type.id}
          type="button"
          className={`pill ${orderType === type.id ? "active" : ""}`}
          onClick={() => onChange(type.id)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
