import { apiRequest } from "@/lib/api";
import { translateStatus } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { SuppliersPageState } from "../../hooks/useSuppliersPage";
import { SupplierRow } from "../../types";

type SuppliersTableProps = Pick<
  SuppliersPageState,
  | "filtered"
  | "search"
  | "setSearch"
  | "statusFilter"
  | "setStatusFilter"
  | "openSupplierModal"
  | "loadSuppliers"
>;

export default function SuppliersTable({
  filtered,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  openSupplierModal,
  loadSuppliers,
}: SuppliersTableProps) {
  const columns: DataTableColumn<SupplierRow>[] = [
    { header: "المورد", cell: (row) => row.name, exportValue: (row) => row.name },
    { header: "الهاتف", cell: (row) => row.phone || "—", exportValue: (row) => row.phone || "—" },
    { header: "البريد", cell: (row) => row.email || "—", exportValue: (row) => row.email || "—" },
    {
      header: "الحالة",
      cell: (row) => (
        <span className={`badge ${row.status === "active" ? "ok" : "neutral"}`}>
          {translateStatus(row.status)}
        </span>
      ),
      exportValue: (row) => translateStatus(row.status),
    },
    { header: "عدد المشتريات", cell: (row) => row.purchasesCount, exportValue: (row) => row.purchasesCount },
  ];

  return (
    <TableSection
      title="الموردون"
      search={{ value: search, onChange: setSearch, placeholder: "بحث في الموردين..." }}
      filters={[
        {
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: "", label: "كل الحالات" },
            { value: "active", label: "نشط" },
            { value: "inactive", label: "غير نشط" },
          ],
        },
      ]}
      primaryAction={{
        label: "مورد جديد",
        icon: "bx bx-plus",
        onClick: () => openSupplierModal("create"),
      }}
      exportActions={{
        rows: filtered,
        columns: getExportColumns(columns),
        fileName: "suppliers",
        printTitle: "الموردون",
        tableId: "suppliers-table",
      }}
    >
      <DataTable
        id="suppliers-table"
        rows={filtered}
        getRowKey={(supplier) => supplier.id}
        getRowProps={(supplier) => ({ "data-status": supplier.status })}
        columns={columns}
        actions={(supplier) => ({
          onView: () => openSupplierModal("view", supplier.id),
          onEdit: () => openSupplierModal("edit", supplier.id),
          onDelete: async () => {
            await apiRequest<{ deleted: boolean; mode: string }>(`/api/suppliers/${supplier.id}`, {
              method: "DELETE",
            });
            await loadSuppliers();
          },
          confirmDeleteText: "سيتم حذف المورد أو تعطيله تلقائياً إذا كان مرتبطاً بمشتريات. متابعة؟",
          deleteMessage: "تم تنفيذ إجراء حذف المورد",
        })}
      />
    </TableSection>
  );
}
