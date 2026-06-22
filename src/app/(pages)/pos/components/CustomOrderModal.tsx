"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { CustomCartItem, PosMaterial, PosProduct } from "../types";

type MaterialDraft = {
  id: string;
  materialId: string;
  quantity: number;
};

type Props = {
  open: boolean;
  products: PosProduct[];
  materials: PosMaterial[];
  onClose: () => void;
  onAdd: (item: Omit<CustomCartItem, "id" | "type" | "qty">) => boolean;
};

export default function CustomOrderModal({ open, products, materials, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [recipeProductId, setRecipeProductId] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialDraft[]>([]);

  const recipeProduct = useMemo(
    () => products.find((product) => product.id === recipeProductId) || null,
    [products, recipeProductId]
  );

  const reset = () => {
    setName("");
    setUnitPrice(0);
    setRecipeProductId("");
    setMaterialRows([]);
  };

  const addMaterialRow = () => {
    setMaterialRows((prev) => [
      ...prev,
      {
        id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        materialId: materials[0]?.id || "",
        quantity: 1,
      },
    ]);
  };

  const submit = () => {
    const added = onAdd({
      name,
      unitPrice,
      recipeProductId: recipeProductId || null,
      materials: materialRows
        .filter((row) => row.materialId && row.quantity > 0)
        .map((row) => ({ materialId: row.materialId, quantity: row.quantity })),
    });

    if (!added) return;
    reset();
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`} onClick={onClose}>
      <div className="modal custom-order-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>طلب خاص</h3>
          <button className="close-modal" type="button" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="form">
            <label>
              اسم الطلب
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: أوردر مخصوص" />
            </label>

            <label>
              السعر
              <input
                type="number"
                min={0}
                step={0.01}
                value={unitPrice}
                onChange={(event) => setUnitPrice(Number(event.target.value || 0))}
              />
            </label>

            <label>
              خصم مكونات وصفة
              <select value={recipeProductId} onChange={(event) => setRecipeProductId(event.target.value)}>
                <option value="">بدون وصفة</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            {recipeProduct ? (
              <div className="custom-order-recipe-note">
                سيتم خصم مكونات وصفة {recipeProduct.name} لكل وحدة من هذا الطلب.
              </div>
            ) : null}

            <div className="custom-order-materials">
              <div className="field-title">
                <label>خصم مباشر من المخزون</label>
                <button className="ghost small" type="button" onClick={addMaterialRow} disabled={materials.length === 0}>
                  <i className="bx bx-plus"></i>
                  مادة
                </button>
              </div>

              {materialRows.length === 0 ? (
                <p className="hint">اختياري: أضف مواد خام وكميات لخصمها عند تأكيد الطلب.</p>
              ) : (
                <div className="custom-material-list">
                  {materialRows.map((row) => {
                    const material = materials.find((entry) => entry.id === row.materialId);
                    return (
                      <div className="custom-material-row" key={row.id}>
                        <select
                          value={row.materialId}
                          onChange={(event) =>
                            setMaterialRows((prev) =>
                              prev.map((entry) =>
                                entry.id === row.id ? { ...entry, materialId: event.target.value } : entry
                              )
                            )
                          }
                        >
                          {materials.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name} ({entry.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0.001}
                          step={0.001}
                          value={row.quantity}
                          onChange={(event) =>
                            setMaterialRows((prev) =>
                              prev.map((entry) =>
                                entry.id === row.id ? { ...entry, quantity: Number(event.target.value || 0) } : entry
                              )
                            )
                          }
                        />
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => setMaterialRows((prev) => prev.filter((entry) => entry.id !== row.id))}
                          aria-label="حذف المادة"
                        >
                          ×
                        </button>
                        <span className="hint">متاح {material ? `${material.stock} ${material.unit}` : "-"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="custom-order-total">
              <span>سيضاف للسلة</span>
              <strong>{money(unitPrice)}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="ghost" type="button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary" type="button" onClick={submit}>
            <i className="bx bx-plus-circle"></i>
            إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  );
}
