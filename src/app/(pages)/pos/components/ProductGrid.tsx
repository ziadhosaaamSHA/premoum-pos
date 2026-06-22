import Image from "next/image";
import { money } from "@/lib/format";
import { PosProduct } from "../types";

type ProductGridProps = {
  products: PosProduct[];
  getProductAvailability: (product: PosProduct) => {
    disabled: boolean;
    reason: string;
    remaining: number | null;
  };
  onAdd: (productId: string) => void;
};

export default function ProductGrid({ products, getProductAvailability, onAdd }: ProductGridProps) {
  return (
    <div className="pos-products-scroll">
      <div className="product-grid">
        {products.map((product) => {
          const availability = getProductAvailability(product);
          return (
            <button
              key={product.id}
              type="button"
              className={`product-card ${availability.disabled ? "disabled" : ""}`}
              onClick={() => onAdd(product.id)}
              disabled={availability.disabled}
            >
              <div className="product-thumb" style={{ position: "relative", overflow: "hidden" }}>
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    className="product-thumb-image"
                    fill
                    sizes="120px"
                    unoptimized
                  />
                ) : (
                  <div className="product-thumb-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="product-name">{product.name}</div>
              <div className="product-meta">
                <span className="product-price">{money(product.price)}</span>
                {availability.disabled && availability.reason ? (
                  <span className="product-status">{availability.reason}</span>
                ) : null}
              </div>
              <div className="product-action">
                <span>{availability.disabled ? "غير متاح" : "إضافة للسلة"}</span>
                <i className="bx bx-plus"></i>
              </div>
            </button>
          );
        })}
      </div>
      {products.length === 0 ? <p className="hint">لا توجد منتجات مطابقة للفلتر الحالي.</p> : null}
    </div>
  );
}
