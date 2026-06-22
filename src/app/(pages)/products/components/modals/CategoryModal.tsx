import { EntityModal, ModalForm } from "@/components/ui";
import { ProductsPageState } from "../../hooks/useProductsPage";

type CategoryModalProps = Pick<
  ProductsPageState,
  | "categoryForm"
  | "categoryModal"
  | "selectedCategory"
  | "setCategoryForm"
  | "setCategoryModal"
  | "submitCategory"
  | "submitting"
>;

export default function CategoryModal({
  categoryForm,
  categoryModal,
  selectedCategory,
  setCategoryForm,
  setCategoryModal,
  submitCategory,
  submitting,
}: CategoryModalProps) {
  const title =
    categoryModal?.mode === "create" ? "إضافة فئة" : categoryModal?.mode === "edit" ? "تعديل فئة" : "تفاصيل الفئة";

  return (
    <EntityModal
      open={Boolean(categoryModal)}
      title={title}
      onClose={() => setCategoryModal(null)}
      isView={categoryModal?.mode === "view" && Boolean(selectedCategory)}
      details={
        selectedCategory
          ? [
              { label: "اسم الفئة", value: selectedCategory.name },
              { label: "عدد المنتجات", value: selectedCategory.productsCount },
              { label: "الوصف", value: selectedCategory.description || "—" },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitCategory} submitting={submitting}>
        <label>اسم الفئة</label>
        <input
          type="text"
          value={categoryForm.name}
          onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <label>الوصف</label>
        <input
          type="text"
          value={categoryForm.description}
          onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </ModalForm>
    </EntityModal>
  );
}
