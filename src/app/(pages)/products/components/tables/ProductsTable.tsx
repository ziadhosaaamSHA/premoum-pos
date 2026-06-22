import { apiRequest } from "@/lib/api";
import { money, num2 } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { ProductsPageState } from "../../hooks/useProductsPage";
import { ProductRow } from "../../types";

type ProductsTableProps = Pick<
  ProductsPageState,
  | "categories"
  | "filteredProducts"
  | "loadData"
  | "openProductModal"
  | "productCategoryFilter"
  | "searchProducts"
  | "setProductCategoryFilter"
  | "setSearchProducts"
>;

export default function ProductsTable({
  categories,
  filteredProducts,
  loadData,
  openProductModal,
  productCategoryFilter,
  searchProducts,
  setProductCategoryFilter,
  setSearchProducts,
}: ProductsTableProps) {
  const columns: DataTableColumn<ProductRow>[] = [
    { header: "المنتج", cell: (product) => product.name, exportValue: (product) => product.name },
    { header: "الفئة", cell: (product) => product.categoryName, exportValue: (product) => product.categoryName },
    { header: "سعر البيع", cell: (product) => money(product.price), exportValue: (product) => product.price },
    { header: "تكلفة المنتج", cell: (product) => money(product.cost), exportValue: (product) => product.cost },
    { header: "هامش الربح", cell: (product) => `${num2(product.margin)}%`, exportValue: (product) => product.margin },
  ];

  return (
    <TableSection
      title="المنتجات"
      search={{
        value: searchProducts,
        onChange: setSearchProducts,
        placeholder: "بحث في المنتجات...",
      }}
      filters={[
        {
          value: productCategoryFilter,
          onChange: setProductCategoryFilter,
          options: [
            { value: "", label: "كل الفئات" },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ],
        },
      ]}
      primaryAction={{
        label: "إضافة منتج",
        icon: "bx bx-plus",
        onClick: () => openProductModal("create"),
      }}
      exportActions={{
        rows: filteredProducts,
        columns: getExportColumns(columns),
        fileName: "products-list",
        printTitle: "المنتجات",
        tableId: "products-table",
      }}
    >
      <DataTable
        id="products-table"
        rows={filteredProducts}
        columns={columns}
        getRowKey={(product) => product.id}
        actions={(product) => ({
          onView: () => openProductModal("view", product.id),
          onEdit: () => openProductModal("edit", product.id),
          onDelete: async () => {
            await apiRequest<{ deleted: boolean }>(`/api/products/${product.id}`, {
              method: "DELETE",
            });
            await loadData();
          },
          confirmDeleteText: "هل تريد حذف المنتج؟",
          deleteMessage: "تم حذف المنتج",
        })}
      />
    </TableSection>
  );
}
