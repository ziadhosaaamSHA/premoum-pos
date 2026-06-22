import { money, num2 } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { ProductsPageState } from "../../hooks/useProductsPage";
import { ProductRow } from "../../types";

type RecipesTableProps = Pick<
  ProductsPageState,
  "filteredRecipes" | "recipeCostFilter" | "searchRecipes" | "setRecipeCostFilter" | "setSearchRecipes"
>;

function recipeIngredients(product: ProductRow) {
  return product.recipe.map((line) => `${line.materialName} ${num2(line.qty)} ${line.unit}`).join("، ");
}

export default function RecipesTable({
  filteredRecipes,
  recipeCostFilter,
  searchRecipes,
  setRecipeCostFilter,
  setSearchRecipes,
}: RecipesTableProps) {
  const columns: DataTableColumn<ProductRow>[] = [
    { header: "المنتج", cell: (product) => product.name, exportValue: (product) => product.name },
    {
      header: "المكونات",
      cell: (product) => recipeIngredients(product) || "لا توجد مكونات",
      exportValue: (product) => recipeIngredients(product),
    },
    { header: "تكلفة الوحدة", cell: (product) => money(product.cost), exportValue: (product) => product.cost },
    { header: "ملاحظات", cell: () => "تخصم تلقائيًا من المخزون" },
  ];

  return (
    <TableSection
      title="الوصفات (مكونات كل منتج)"
      search={{
        value: searchRecipes,
        onChange: setSearchRecipes,
        placeholder: "بحث في الوصفات...",
      }}
      filters={[
        {
          value: recipeCostFilter,
          onChange: setRecipeCostFilter,
          options: [
            { value: "", label: "كل التكاليف" },
            { value: "low", label: "أقل من 20" },
            { value: "high", label: "20 فأكثر" },
          ],
        },
      ]}
      exportActions={{
        rows: filteredRecipes,
        columns: getExportColumns(columns),
        fileName: "products-recipes",
        printTitle: "الوصفات",
        tableId: "products-recipes-table",
      }}
    >
      <DataTable
        id="products-recipes-table"
        rows={filteredRecipes}
        columns={columns}
        getRowKey={(product) => product.id}
      />
    </TableSection>
  );
}
