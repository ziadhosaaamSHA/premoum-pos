import Image from "next/image";
import { Button, EntityModal, ModalForm } from "@/components/ui";
import { money, num2 } from "@/lib/format";
import { ProductsPageState } from "../../hooks/useProductsPage";

type ProductModalProps = Pick<
  ProductsPageState,
  | "addRecipeLine"
  | "categories"
  | "handleProductImageUpload"
  | "materials"
  | "productForm"
  | "productModal"
  | "recipeEstimatedCost"
  | "recipeForm"
  | "removeRecipeLine"
  | "selectedProduct"
  | "setProductForm"
  | "setProductModal"
  | "submitProduct"
  | "submitting"
  | "updateRecipeLine"
>;

function ProductImagePreview({ imageUrl, alt, size = 72 }: { imageUrl: string | null; alt: string; size?: number }) {
  return (
    <div className="receipt-logo" style={{ width: size, height: size, padding: 0, overflow: "hidden", position: "relative" }}>
      {imageUrl ? (
        <Image alt={alt} fill src={imageUrl} style={{ objectFit: "cover" }} unoptimized />
      ) : (
        <div className="product-thumb-placeholder" style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}

export default function ProductModal({
  addRecipeLine,
  categories,
  handleProductImageUpload,
  materials,
  productForm,
  productModal,
  recipeEstimatedCost,
  recipeForm,
  removeRecipeLine,
  selectedProduct,
  setProductForm,
  setProductModal,
  submitProduct,
  submitting,
  updateRecipeLine,
}: ProductModalProps) {
  const title =
    productModal?.mode === "create" ? "إضافة منتج" : productModal?.mode === "edit" ? "تعديل منتج" : "تفاصيل المنتج";

  const isView = productModal?.mode === "view" && Boolean(selectedProduct);

  return (
    <EntityModal
      open={Boolean(productModal)}
      title={title}
      onClose={() => setProductModal(null)}
      isView={isView}
      details={
        selectedProduct
          ? [
              { label: "اسم المنتج", value: selectedProduct.name },
              { label: "الفئة", value: selectedProduct.categoryName },
              { label: "السعر", value: money(selectedProduct.price) },
              { label: "تكلفة المنتج", value: money(selectedProduct.cost) },
            ]
          : []
      }
      viewExtra={
        selectedProduct ? (
          <>
            <div className="receipt-brand" style={{ marginBottom: 12 }}>
              <ProductImagePreview alt={selectedProduct.name} imageUrl={selectedProduct.imageUrl} size={64} />
              <div className="receipt-brand-text">
                <strong>{selectedProduct.name}</strong>
                <span>{selectedProduct.categoryName}</span>
              </div>
            </div>
            <table className="view-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الكمية</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct.recipe.length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا توجد وصفة</td>
                  </tr>
                ) : (
                  selectedProduct.recipe.map((line) => (
                    <tr key={line.id}>
                      <td>{line.materialName}</td>
                      <td>
                        {num2(line.qty)} {line.unit}
                      </td>
                      <td>{money(line.materialCost * line.qty)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : null
      }
    >
      <ModalForm onSubmit={submitProduct} submitting={submitting}>
        <label>اسم المنتج</label>
        <input
          type="text"
          value={productForm.name}
          onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />

        <label>الفئة</label>
        <select
          value={productForm.categoryId}
          onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
          required
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label>سعر البيع</label>
        <input
          type="number"
          value={productForm.price}
          onChange={(event) => setProductForm((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
          required
        />

        <label>صورة المنتج</label>
        <div className="recipe-editor">
          <div className="receipt-brand" style={{ alignItems: "center" }}>
            <ProductImagePreview alt="معاينة صورة المنتج" imageUrl={productForm.imageUrl} />
            <div className="row-actions">
              <label className="ghost" style={{ cursor: "pointer" }}>
                <i className="bx bx-image-add"></i>
                رفع صورة
                <input type="file" accept="image/*" hidden onChange={handleProductImageUpload} />
              </label>
              <Button
                variant="ghost"
                icon="bx bx-trash"
                onClick={() => setProductForm((prev) => ({ ...prev, imageUrl: "" }))}
                disabled={!productForm.imageUrl}
              >
                إزالة
              </Button>
            </div>
          </div>
          <input
            type="text"
            value={productForm.imageUrl}
            onChange={(event) => setProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="أو ضع رابط الصورة مباشرة"
          />
          <p className="hint">إذا لم تُحدد صورة، سيتم عرض مساحة لونية بدون أحرف في الكاشير.</p>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={productForm.isActive}
            onChange={(event) => setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          المنتج نشط ومتاح في البيع
        </label>

        <div className="section-header-actions no-tip" style={{ marginTop: 6 }}>
          <h3>الوصفة</h3>
          <Button variant="ghost" icon="bx bx-plus" onClick={addRecipeLine}>
            إضافة مكون
          </Button>
        </div>

        {recipeForm.length === 0 ? (
          <p className="hint">لا توجد مكونات. يمكنك الحفظ بدون وصفة.</p>
        ) : (
          <div className="recipe-editor">
            <div className="recipe-header">
              <span>المادة</span>
              <span>الكمية</span>
              <span>الوحدة</span>
              <span>التكلفة</span>
              <span>إجراء</span>
            </div>
            {recipeForm.map((line, index) => {
              const material = materials.find((entry) => entry.id === line.materialId);
              const unit = material?.unit || "—";
              const lineCost = material ? material.cost * line.quantity : 0;
              return (
                <div key={`${line.materialId}-${index}`} className="recipe-row">
                  <select
                    value={line.materialId}
                    onChange={(event) => updateRecipeLine(index, { materialId: event.target.value })}
                  >
                    {materials.map((materialOption) => (
                      <option key={materialOption.id} value={materialOption.id}>
                        {materialOption.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={line.quantity}
                    min={0.001}
                    step="0.001"
                    onChange={(event) => updateRecipeLine(index, { quantity: Number(event.target.value || 0) })}
                  />
                  <span className="recipe-unit">{unit}</span>
                  <span className="recipe-cost">{money(lineCost)}</span>
                  <Button variant="danger" icon="bx bx-trash" onClick={() => removeRecipeLine(index)} />
                </div>
              );
            })}
            <div className="recipe-summary">
              <span>إجمالي تكلفة الوصفة</span>
              <strong>{money(recipeEstimatedCost)}</strong>
            </div>
          </div>
        )}
      </ModalForm>
    </EntityModal>
  );
}
