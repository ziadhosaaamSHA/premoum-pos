import { apiRequest } from "@/lib/api";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { ProductsPageState } from "../../hooks/useProductsPage";
import { CategoryRow } from "../../types";

type CategoriesTableProps = Pick<
  ProductsPageState,
  | "categorySizeFilter"
  | "filteredCategories"
  | "loadData"
  | "openCategoryModal"
  | "searchCategories"
  | "setCategorySizeFilter"
  | "setSearchCategories"
>;

export default function CategoriesTable({
  categorySizeFilter,
  filteredCategories,
  loadData,
  openCategoryModal,
  searchCategories,
  setCategorySizeFilter,
  setSearchCategories,
}: CategoriesTableProps) {
  const columns: DataTableColumn<CategoryRow>[] = [
    { header: "الفئة", cell: (category) => category.name, exportValue: (category) => category.name },
    {
      header: "عدد المنتجات",
      cell: (category) => category.productsCount,
      exportValue: (category) => category.productsCount,
    },
    {
      header: "الوصف",
      cell: (category) => category.description || "—",
      exportValue: (category) => category.description || "—",
    },
  ];

  return (
    <TableSection
      title="الفئات"
      search={{
        value: searchCategories,
        onChange: setSearchCategories,
        placeholder: "بحث في الفئات...",
      }}
      filters={[
        {
          value: categorySizeFilter,
          onChange: setCategorySizeFilter,
          options: [
            { value: "", label: "كل الأحجام" },
            { value: "small", label: "صغيرة (< 5)" },
            { value: "large", label: "كبيرة (5+)" },
          ],
        },
      ]}
      primaryAction={{
        label: "إضافة فئة",
        icon: "bx bx-plus",
        onClick: () => openCategoryModal("create"),
      }}
      exportActions={{
        rows: filteredCategories,
        columns: getExportColumns(columns),
        fileName: "products-categories",
        printTitle: "فئات المنتجات",
        tableId: "products-categories-table",
      }}
    >
      <DataTable
        id="products-categories-table"
        rows={filteredCategories}
        columns={columns}
        getRowKey={(category) => category.id}
        actions={(category) => ({
          onView: () => openCategoryModal("view", category.id),
          onEdit: () => openCategoryModal("edit", category.id),
          onDelete: async () => {
            await apiRequest<{ deleted: boolean }>(`/api/products/categories/${category.id}`, {
              method: "DELETE",
            });
            await loadData();
          },
          confirmDeleteText: "سيتم حذف الفئة وجميع المنتجات والوصفات التابعة لها. هل تريد المتابعة؟",
          deleteMessage: "تم حذف الفئة وكافة العناصر المرتبطة",
        })}
      />
    </TableSection>
  );
}
