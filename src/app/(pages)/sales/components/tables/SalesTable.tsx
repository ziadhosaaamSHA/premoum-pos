import { money } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, IconButton, RowActions, TableSection } from "@/components/ui";
import { SalesPageState } from "../../hooks/useSalesPage";
import { SaleRow, saleStatusBadge, saleStatusLabel } from "../../types";

type SalesTableProps = Pick<
  SalesPageState,
  | "canApproveSales"
  | "canCreateSales"
  | "canDeleteSales"
  | "canEditSales"
  | "filteredSales"
  | "loading"
  | "openCreateModal"
  | "removeSales"
  | "searchSales"
  | "setApproveSaleId"
  | "setDeleteSaleId"
  | "setReceiptSaleId"
  | "setSearchSales"
  | "setSelectedSaleId"
  | "setStatusFilter"
  | "startEdit"
  | "statusFilter"
>;

export default function SalesTable({
  canApproveSales,
  canCreateSales,
  canDeleteSales,
  canEditSales,
  filteredSales,
  loading,
  openCreateModal,
  removeSales,
  searchSales,
  setApproveSaleId,
  setDeleteSaleId,
  setReceiptSaleId,
  setSearchSales,
  setSelectedSaleId,
  setStatusFilter,
  startEdit,
  statusFilter,
}: SalesTableProps) {
  const columns: DataTableColumn<SaleRow>[] = [
    { header: "رقم الفاتورة", cell: (sale) => sale.invoiceNo, exportValue: (sale) => sale.invoiceNo },
    { header: "التاريخ", cell: (sale) => sale.date, exportValue: (sale) => sale.date },
    { header: "العميل", cell: (sale) => sale.customer, exportValue: (sale) => sale.customer },
    {
      header: "رقم العميل",
      cell: (sale) => sale.customerPhone || "—",
      exportValue: (sale) => sale.customerPhone || "",
    },
    { header: "الإجمالي", cell: (sale) => money(sale.total), exportValue: (sale) => sale.total },
    {
      header: "الحالة",
      cell: (sale) => <span className={`badge ${saleStatusBadge(sale.status)}`}>{saleStatusLabel(sale.status)}</span>,
      exportValue: (sale) => saleStatusLabel(sale.status),
    },
    {
      header: "الإجراءات",
      cell: (sale) => (
        <div className="table-actions">
          {sale.status === "draft" && !sale.orderId && canApproveSales ? (
            <IconButton
              icon="bx bx-check-circle"
              variant="approve"
              title="اعتماد الفاتورة"
              onClick={() => setApproveSaleId(sale.id)}
            />
          ) : null}
          <RowActions
            onView={() => setSelectedSaleId(sale.id)}
            onEdit={canEditSales ? () => startEdit(sale.id) : undefined}
            onDelete={canDeleteSales ? () => setDeleteSaleId(sale.id) : undefined}
            onPrint={sale.orderReceipt ? () => setReceiptSaleId(sale.id) : undefined}
            printMessage="تم فتح إيصال الطلب"
            disableEdit={!canEditSales || sale.status !== "draft" || Boolean(sale.orderId)}
            disableDelete={!canDeleteSales}
            confirmDelete={false}
          />
        </div>
      ),
    },
  ];

  return (
    <TableSection
      title="فواتير المبيعات"
      search={{
        value: searchSales,
        onChange: setSearchSales,
        placeholder: "بحث في الفواتير...",
      }}
      filters={[
        {
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: "", label: "كل الحالات" },
            { value: "paid", label: "مدفوع" },
            { value: "draft", label: "مسودة" },
            { value: "void", label: "محذوف" },
          ],
        },
      ]}
      primaryAction={
        canCreateSales
          ? {
              label: "إضافة فاتورة",
              icon: "bx bx-plus",
              onClick: openCreateModal,
            }
          : undefined
      }
      exportActions={{
        rows: filteredSales,
        columns: getExportColumns(columns),
        fileName: "sales-invoices",
        printTitle: "فواتير المبيعات",
        tableId: "sales-table",
      }}
    >
      {loading ? (
        <p className="hint">جارٍ تحميل الفواتير...</p>
      ) : (
        <DataTable
          id="sales-table"
          rows={filteredSales}
          columns={columns}
          getRowKey={(sale) => sale.id}
          batchDelete={{
            enabled: canDeleteSales,
            onDeleteSelected: (selectedRows) => removeSales(selectedRows.map((sale) => sale.id)),
            confirmText: (count) => `سيتم حذف ${count} فاتورة محددة. هل تريد المتابعة؟`,
            successMessage: (count) => `تم حذف ${count} فاتورة`,
          }}
        />
      )}
    </TableSection>
  );
}
