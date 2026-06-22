import { money, translateStatus } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";
import { OrderRow, OrderStatusUi, statusBadge, statusOptions, statusUpdateOptions } from "../../types";

type OrdersTableProps = Pick<
  OrdersPageState,
  | "filterQuery"
  | "handleDeleteOrders"
  | "handleOrderStatusChange"
  | "setFilterQuery"
  | "setOrderDeleteId"
  | "setReceiptOrderId"
  | "setSelectedOrderId"
  | "setStatusFilter"
  | "statusFilter"
> & {
  rows: OrderRow[];
  tableId: string;
  title: string;
  fileName: string;
  includeDate?: boolean;
  includeStatusUpdate?: boolean;
};

export default function OrdersTable({
  fileName,
  filterQuery,
  handleDeleteOrders,
  handleOrderStatusChange,
  includeDate = false,
  includeStatusUpdate = false,
  rows,
  setFilterQuery,
  setOrderDeleteId,
  setReceiptOrderId,
  setSelectedOrderId,
  setStatusFilter,
  statusFilter,
  tableId,
  title,
}: OrdersTableProps) {
  const columns: DataTableColumn<OrderRow>[] = [
    { header: "رقم الطلب", cell: (order) => order.code, exportValue: (order) => order.code },
    ...(includeDate
      ? [
          {
            header: "التاريخ",
            cell: (order: OrderRow) => new Date(order.createdAt).toLocaleDateString("ar-EG"),
            exportValue: (order: OrderRow) => new Date(order.createdAt).toLocaleDateString("ar-EG"),
          },
        ]
      : []),
    { header: "النوع", cell: (order) => translateStatus(order.type), exportValue: (order) => translateStatus(order.type) },
    ...(!includeDate
      ? [{ header: "العميل", cell: (order: OrderRow) => order.customer, exportValue: (order: OrderRow) => order.customer }]
      : []),
    {
      header: "الحالة",
      cell: (order) => <span className={`badge ${statusBadge(order.status)}`}>{translateStatus(order.status)}</span>,
      exportValue: (order) => translateStatus(order.status),
    },
    { header: "الإجمالي", cell: (order) => money(order.total), exportValue: (order) => order.total },
    ...(includeStatusUpdate
      ? [
          {
            header: "تحديث الحالة",
            cell: (order: OrderRow) => (
              <select
                className="select-filter"
                value={order.status}
                onChange={(event) => void handleOrderStatusChange(order.id, event.target.value as OrderStatusUi)}
              >
                {statusUpdateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ),
          },
        ]
      : []),
  ];

  return (
    <TableSection
      title={title}
      search={{
        value: filterQuery,
        onChange: setFilterQuery,
        placeholder: includeDate ? "بحث في السجل..." : "بحث في الطلبات...",
      }}
      filters={[{ value: statusFilter, onChange: setStatusFilter, options: statusOptions }]}
      exportActions={{
        rows,
        columns: getExportColumns(columns),
        fileName,
        printTitle: title,
        tableId,
      }}
    >
      <DataTable
        id={tableId}
        rows={rows}
        columns={columns}
        getRowKey={(order) => order.id}
        getRowProps={(order) => ({ className: `status-row ${order.status}` })}
        actions={(order) => ({
          onView: () => setSelectedOrderId(order.id),
          onDelete: () => setOrderDeleteId(order.id),
          onPrint: () => setReceiptOrderId(order.id),
          printMessage: "تم فتح إيصال الطلب",
          confirmDelete: false,
        })}
        batchDelete={{
          onDeleteSelected: (selectedRows) => handleDeleteOrders(selectedRows.map((order) => order.id)),
          confirmText: (count) => `سيتم حذف ${count} طلب محدد. هل تريد المتابعة؟`,
          successMessage: (count) => `تم حذف ${count} طلب`,
        }}
      />
    </TableSection>
  );
}
