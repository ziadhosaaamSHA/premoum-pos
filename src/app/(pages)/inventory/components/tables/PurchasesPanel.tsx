import { apiRequest } from "@/lib/api";
import { money, num2, translateStatus } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";
import { PurchaseRow } from "../../types";

type PurchasesPanelProps = Pick<
  InventoryPageState,
  | "filteredPurchases"
  | "searchPurchases"
  | "setSearchPurchases"
  | "purchaseStatusFilter"
  | "setPurchaseStatusFilter"
  | "openPurchaseModal"
  | "loadInventory"
>;

export default function PurchasesPanel({
  filteredPurchases,
  searchPurchases,
  setSearchPurchases,
  purchaseStatusFilter,
  setPurchaseStatusFilter,
  openPurchaseModal,
  loadInventory,
}: PurchasesPanelProps) {
  const columns: DataTableColumn<PurchaseRow>[] = [
    { header: "الكود", cell: (item) => item.code, exportValue: (item) => item.code },
    { header: "التاريخ", cell: (item) => item.date, exportValue: (item) => item.date },
    { header: "المنتج", cell: (item) => item.material, exportValue: (item) => item.material },
    { header: "الكمية", cell: (item) => num2(item.quantity), exportValue: (item) => item.quantity },
    { header: "المورد", cell: (item) => item.supplier, exportValue: (item) => item.supplier },
    { header: "الإجمالي", cell: (item) => money(item.total), exportValue: (item) => item.total },
    {
      header: "الحالة",
      cell: (item) => (
        <span
          className={`badge ${item.status === "posted" ? "ok" : item.status === "draft" ? "warn" : "danger"}`}
        >
          {translateStatus(item.status)}
        </span>
      ),
      exportValue: (item) => translateStatus(item.status),
    },
  ];

  return (
    <TableSection
      title="فواتير المشتريات"
      search={{
        value: searchPurchases,
        onChange: setSearchPurchases,
        placeholder: "بحث في المشتريات...",
      }}
      filters={[
        {
          value: purchaseStatusFilter,
          onChange: setPurchaseStatusFilter,
          options: [
            { value: "", label: "كل الحالات" },
            { value: "posted", label: "مرحلة" },
            { value: "draft", label: "مسودة" },
            { value: "cancelled", label: "ملغاة" },
          ],
        },
      ]}
      primaryAction={{
        label: "إضافة مشتريات",
        icon: "bx bx-plus",
        onClick: () => openPurchaseModal("create"),
      }}
      exportActions={{
        rows: filteredPurchases,
        columns: getExportColumns(columns),
        fileName: "inventory-purchases",
        printTitle: "فواتير المشتريات",
        tableId: "inventory-purchases-table",
      }}
    >
        <DataTable
          id="inventory-purchases-table"
          rows={filteredPurchases}
          getRowKey={(item) => item.id}
          getRowProps={(item) => ({ "data-status": item.status })}
          columns={columns}
          actions={(item) => ({
            onView: () => openPurchaseModal("view", item.id),
            onEdit: () => openPurchaseModal("edit", item.id),
            onDelete: async () => {
              await apiRequest<{ deleted: boolean }>(`/api/inventory/purchases/${item.id}`, {
                method: "DELETE",
              });
              await loadInventory();
            },
            disableDelete: item.status !== "draft",
            confirmDeleteText: "يمكن حذف فواتير المشتريات المسودة فقط. تأكيد الحذف؟",
            deleteMessage: "تم حذف فاتورة المشتريات",
          })}
        />
    </TableSection>
  );
}
