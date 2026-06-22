import { Tabs } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";
import { OrdersTab } from "../../types";
import OrdersTable from "./OrdersTable";
import TablesPanel from "./TablesPanel";
import TrackingPanel from "./TrackingPanel";

const tabs = [
  { value: "tables", label: "الطاولات", icon: "bx bx-table" },
  { value: "current", label: "الطلبات الحالية", icon: "bx bx-time-five" },
  { value: "history", label: "سجل الطلبات", icon: "bx bx-archive" },
  { value: "tracking", label: "متابعة الطلبات", icon: "bx bx-map" },
] satisfies Array<{ value: OrdersTab; label: string; icon: string }>;

type OrdersTabsProps = {
  state: OrdersPageState;
};

export default function OrdersTabs({ state }: OrdersTabsProps) {
  return (
    <>
      <Tabs value={state.activeTab} items={tabs} onChange={state.setActiveTab} />
      {state.activeTab === "tables" ? <TablesPanel {...state} /> : null}
      {state.activeTab === "current" ? (
        <OrdersTable
          {...state}
          rows={state.currentOrders}
          tableId="orders-current-table"
          title="الطلبات الحالية"
          fileName="orders-current"
          includeStatusUpdate
        />
      ) : null}
      {state.activeTab === "history" ? (
        <OrdersTable
          {...state}
          rows={state.historyOrders}
          tableId="orders-history-table"
          title="سجل الطلبات"
          fileName="orders-history"
          includeDate
        />
      ) : null}
      {state.activeTab === "tracking" ? <TrackingPanel {...state} /> : null}
    </>
  );
}
