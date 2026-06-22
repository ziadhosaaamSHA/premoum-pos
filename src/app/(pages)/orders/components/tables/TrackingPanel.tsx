import { translateStatus } from "@/lib/format";
import { Card, SearchInput, SelectFilter } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";
import { OrderStatusUi, statusOptions, statusUpdateOptions } from "../../types";

const trackingColumns = [
  { key: "preparing", title: "قيد التحضير" },
  { key: "ready", title: "جاهز" },
  { key: "out", title: "خارج للتوصيل" },
  { key: "delivered", title: "تم التسليم" },
] satisfies Array<{ key: OrderStatusUi; title: string }>;

type TrackingPanelProps = Pick<
  OrdersPageState,
  "filterQuery" | "filteredOrders" | "handleOrderStatusChange" | "setFilterQuery" | "setStatusFilter" | "statusFilter"
>;

export default function TrackingPanel({
  filterQuery,
  filteredOrders,
  handleOrderStatusChange,
  setFilterQuery,
  setStatusFilter,
  statusFilter,
}: TrackingPanelProps) {
  return (
    <div className="subtab-panel active">
      <Card wide>
        <div className="section-header-actions">
          <h2>متابعة الطلبات</h2>
          <div className="table-toolbar">
            <SearchInput value={filterQuery} onChange={setFilterQuery} placeholder="بحث سريع..." />
            <SelectFilter value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          </div>
        </div>
        <div className="tracking-board">
          {trackingColumns.map((col) => {
            const items = filteredOrders.filter((order) => order.status === col.key);
            return (
              <div key={col.key} className="tracking-column">
                <h4>
                  {col.title} ({items.length})
                </h4>
                {items.length === 0 ? (
                  <div className="alert-empty">لا توجد طلبات</div>
                ) : (
                  items.map((order) => (
                    <div key={order.id} className="tracking-card">
                      <strong>{order.code}</strong>
                      <span>
                        {translateStatus(order.type)} · {order.customer}
                      </span>
                      <span className={`status-pill ${col.key}`}>{translateStatus(order.status)}</span>
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
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
