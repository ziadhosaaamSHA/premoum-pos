import { num2 } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";
import { MaterialRow } from "../../types";

type StockAlertsPanelProps = Pick<
  InventoryPageState,
  | "filteredStock"
  | "searchStock"
  | "setSearchStock"
  | "stockLevelFilter"
  | "setStockLevelFilter"
  | "openMaterialModal"
>;

export default function StockAlertsPanel({
  filteredStock,
  searchStock,
  setSearchStock,
  stockLevelFilter,
  setStockLevelFilter,
  openMaterialModal,
}: StockAlertsPanelProps) {
  const columns: DataTableColumn<MaterialRow>[] = [
    { header: "المادة", cell: (item) => item.name, exportValue: (item) => item.name },
    { header: "المتاح", cell: (item) => num2(item.stock), exportValue: (item) => item.stock },
    { header: "الحد الأدنى", cell: (item) => num2(item.minStock), exportValue: (item) => item.minStock },
    {
      header: "الحالة",
      cell: (item) => {
        const ratio = item.minStock > 0 ? item.stock / item.minStock : 0;
        const critical = ratio <= 0.5;
        return <span className={`badge ${critical ? "danger" : "warn"}`}>{critical ? "حرج" : "تنبيه"}</span>;
      },
      exportValue: (item) => (item.minStock > 0 && item.stock / item.minStock <= 0.5 ? "حرج" : "تنبيه"),
    },
  ];

  return (
    <TableSection
      title="تنبيهات المخزون"
      search={{
        value: searchStock,
        onChange: setSearchStock,
        placeholder: "بحث في التنبيهات...",
      }}
      filters={[
        {
          value: stockLevelFilter,
          onChange: setStockLevelFilter,
          options: [
            { value: "", label: "كل التنبيهات" },
            { value: "critical", label: "حرج" },
            { value: "warning", label: "تنبيه" },
          ],
        },
      ]}
      exportActions={{
        rows: filteredStock,
        columns: getExportColumns(columns),
        fileName: "inventory-alerts",
        printTitle: "تنبيهات المخزون",
        tableId: "inventory-alerts-table",
      }}
    >
        <DataTable
          id="inventory-alerts-table"
          rows={filteredStock}
          getRowKey={(item) => item.id}
          getRowProps={() => ({ "data-status": "low" })}
          columns={columns}
          actions={(item) => ({
            onView: () => openMaterialModal("view", item.id),
            onEdit: () => openMaterialModal("edit", item.id),
          })}
        />
    </TableSection>
  );
}
