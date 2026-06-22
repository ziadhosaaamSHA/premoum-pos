import { apiRequest } from "@/lib/api";
import { money, num2 } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";
import { WasteRow } from "../../types";

type WastePanelProps = Pick<
  InventoryPageState,
  | "filteredWaste"
  | "searchWaste"
  | "setSearchWaste"
  | "wasteCostFilter"
  | "setWasteCostFilter"
  | "openWasteModal"
  | "loadInventory"
>;

export default function WastePanel({
  filteredWaste,
  searchWaste,
  setSearchWaste,
  wasteCostFilter,
  setWasteCostFilter,
  openWasteModal,
  loadInventory,
}: WastePanelProps) {
  const columns: DataTableColumn<WasteRow>[] = [
    { header: "التاريخ", cell: (entry) => entry.date, exportValue: (entry) => entry.date },
    { header: "المادة", cell: (entry) => entry.material, exportValue: (entry) => entry.material },
    { header: "الكمية", cell: (entry) => num2(entry.qty), exportValue: (entry) => entry.qty },
    { header: "السبب", cell: (entry) => entry.reason, exportValue: (entry) => entry.reason },
    { header: "التكلفة", cell: (entry) => money(entry.cost), exportValue: (entry) => entry.cost },
  ];

  return (
    <TableSection
      title="الهدر"
      search={{
        value: searchWaste,
        onChange: setSearchWaste,
        placeholder: "بحث في الهدر...",
      }}
      filters={[
        {
          value: wasteCostFilter,
          onChange: setWasteCostFilter,
          options: [
            { value: "", label: "كل التكاليف" },
            { value: "low", label: "أقل من 100" },
            { value: "high", label: "100 فأكثر" },
          ],
        },
      ]}
      primaryAction={{
        label: "تسجيل هدر",
        icon: "bx bx-plus",
        onClick: () => openWasteModal("create"),
      }}
      exportActions={{
        rows: filteredWaste,
        columns: getExportColumns(columns),
        fileName: "inventory-waste",
        printTitle: "سجل الهدر",
        tableId: "inventory-waste-table",
      }}
    >
        <DataTable
          id="inventory-waste-table"
          rows={filteredWaste}
          getRowKey={(entry) => entry.id}
          columns={columns}
          actions={(entry) => ({
            onView: () => openWasteModal("view", entry.id),
            onEdit: () => openWasteModal("edit", entry.id),
            onDelete: async () => {
              await apiRequest<{ deleted: boolean }>(`/api/inventory/waste/${entry.id}`, {
                method: "DELETE",
              });
              await loadInventory();
            },
            confirmDeleteText: "هل تريد حذف سجل الهدر؟",
            deleteMessage: "تم حذف سجل الهدر",
          })}
        />
    </TableSection>
  );
}
