import { apiRequest } from "@/lib/api";
import { money, num2, translateStatus } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";
import { MaterialRow } from "../../types";

type MaterialsPanelProps = Pick<
  InventoryPageState,
  | "filteredMaterials"
  | "searchMaterials"
  | "setSearchMaterials"
  | "materialStatusFilter"
  | "setMaterialStatusFilter"
  | "openMaterialModal"
  | "loadInventory"
>;

export default function MaterialsPanel({
  filteredMaterials,
  searchMaterials,
  setSearchMaterials,
  materialStatusFilter,
  setMaterialStatusFilter,
  openMaterialModal,
  loadInventory,
}: MaterialsPanelProps) {
  const columns: DataTableColumn<MaterialRow>[] = [
    { header: "المادة", cell: (item) => item.name, exportValue: (item) => item.name },
    { header: "الوحدة", cell: (item) => item.unit, exportValue: (item) => item.unit },
    { header: "تكلفة الوحدة", cell: (item) => money(item.cost), exportValue: (item) => item.cost },
    { header: "المتاح", cell: (item) => num2(item.stock), exportValue: (item) => item.stock },
    { header: "الحد الأدنى", cell: (item) => num2(item.minStock), exportValue: (item) => item.minStock },
    {
      header: "الحالة",
      cell: (item) => (
        <span className={`badge ${item.status === "low" ? "danger" : "ok"}`}>
          {translateStatus(item.status)}
        </span>
      ),
      exportValue: (item) => translateStatus(item.status),
    },
  ];

  return (
    <TableSection
      title="المواد الخام"
      search={{
        value: searchMaterials,
        onChange: setSearchMaterials,
        placeholder: "بحث في المواد...",
      }}
      filters={[
        {
          value: materialStatusFilter,
          onChange: setMaterialStatusFilter,
          options: [
            { value: "", label: "كل الحالات" },
            { value: "ok", label: "آمن" },
            { value: "low", label: "منخفض" },
          ],
        },
      ]}
      primaryAction={{
        label: "إضافة مادة خام",
        icon: "bx bx-plus",
        onClick: () => openMaterialModal("create"),
      }}
      exportActions={{
        rows: filteredMaterials,
        columns: getExportColumns(columns),
        fileName: "inventory-materials",
        printTitle: "المواد الخام",
        tableId: "inventory-materials-table",
      }}
    >
        <DataTable
          id="inventory-materials-table"
          rows={filteredMaterials}
          getRowKey={(item) => item.id}
          getRowProps={(item) => ({ "data-status": item.status })}
          columns={columns}
          actions={(item) => ({
            onView: () => openMaterialModal("view", item.id),
            onEdit: () => openMaterialModal("edit", item.id),
            onDelete: async () => {
              await apiRequest<{ deleted: boolean }>(`/api/inventory/materials/${item.id}`, {
                method: "DELETE",
              });
              await loadInventory();
            },
            confirmDeleteText: "هل تريد حذف المادة؟",
            deleteMessage: "تم حذف المادة",
          })}
        />
    </TableSection>
  );
}
