import { apiRequest } from "@/lib/api";
import { money, num2, translateStatus } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection, Tabs } from "@/components/ui";
import { DeliveryPageState } from "../../hooks/useDeliveryPage";
import { DeliveryOrderRow, DeliveryTab, DriverRow, ZoneRow } from "../../types";

const tabs = [
  { value: "zones", label: "نطاق التوصيل", icon: "bx bx-map-alt" },
  { value: "drivers", label: "الطيارين", icon: "bx bx-cycling" },
  { value: "tracking", label: "متابعة الطلبات", icon: "bx bx-navigation" },
] satisfies Array<{ value: DeliveryTab; label: string; icon: string }>;

type DeliveryTabsProps = {
  state: DeliveryPageState;
};

export default function DeliveryTabs({ state }: DeliveryTabsProps) {
  const zoneColumns: DataTableColumn<ZoneRow>[] = [
    { header: "النطاق", cell: (zone) => zone.name, exportValue: (zone) => zone.name },
    { header: "الحد الأقصى", cell: (zone) => `${num2(zone.limit)} كم`, exportValue: (zone) => zone.limit },
    { header: "رسوم التوصيل", cell: (zone) => money(zone.fee), exportValue: (zone) => zone.fee },
    { header: "الحد الأدنى", cell: (zone) => money(zone.minOrder), exportValue: (zone) => zone.minOrder },
    {
      header: "الحالة",
      cell: (zone) => <span className={`badge ${zone.status === "active" ? "ok" : "neutral"}`}>{translateStatus(zone.status)}</span>,
      exportValue: (zone) => translateStatus(zone.status),
    },
  ];

  const driverColumns: DataTableColumn<DriverRow>[] = [
    { header: "الاسم", cell: (driver) => driver.name, exportValue: (driver) => driver.name },
    { header: "الهاتف", cell: (driver) => driver.phone || "—", exportValue: (driver) => driver.phone },
    { header: "الحالة", cell: (driver) => <span className="badge neutral">{driver.status}</span>, exportValue: (driver) => driver.status },
    { header: "الطلبات النشطة", cell: (driver) => driver.activeOrders, exportValue: (driver) => driver.activeOrders },
  ];

  const trackingColumns: DataTableColumn<DeliveryOrderRow>[] = [
    { header: "الطلب", cell: (order) => order.code, exportValue: (order) => order.code },
    { header: "العميل", cell: (order) => order.customer, exportValue: (order) => order.customer },
    { header: "النطاق", cell: (order) => order.zoneName || "—", exportValue: (order) => order.zoneName || "—" },
    { header: "الطيار", cell: (order) => order.driverName || "—", exportValue: (order) => order.driverName || "—" },
    {
      header: "الحالة",
      cell: (order) => <span className="badge warn">{translateStatus(order.status)}</span>,
      exportValue: (order) => translateStatus(order.status),
    },
  ];

  return (
    <>
      <Tabs value={state.activeTab} items={tabs} onChange={state.setActiveTab} />
      {state.loading ? <div className="card wide"><p className="hint">جارٍ تحميل بيانات التوصيل...</p></div> : null}
      {!state.loading && state.activeTab === "zones" ? (
        <TableSection
          title="نطاقات التوصيل"
          search={{ value: state.searchZones, onChange: state.setSearchZones, placeholder: "بحث في النطاقات..." }}
          filters={[{ value: state.zoneStatusFilter, onChange: state.setZoneStatusFilter, options: [{ value: "", label: "كل الحالات" }, { value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }] }]}
          primaryAction={{ label: "إضافة نطاق", icon: "bx bx-plus", onClick: () => state.openZoneModal("create") }}
          exportActions={{ rows: state.filteredZones, columns: getExportColumns(zoneColumns), fileName: "delivery-zones", printTitle: "نطاقات ورسوم التوصيل", tableId: "delivery-zones-table" }}
        >
          <DataTable
            id="delivery-zones-table"
            rows={state.filteredZones}
            columns={zoneColumns}
            getRowKey={(zone) => zone.id}
            getRowProps={(zone) => ({ "data-status": zone.status })}
            actions={(zone) => ({
              onView: () => state.openZoneModal("view", zone.id),
              onEdit: () => state.openZoneModal("edit", zone.id),
              onDelete: async () => {
                await apiRequest<{ deleted: boolean }>(`/api/delivery/zones/${zone.id}`, { method: "DELETE" });
                await state.loadDelivery();
              },
              confirmDeleteText: "هل تريد حذف نطاق التوصيل؟",
              deleteMessage: "تم حذف نطاق التوصيل",
            })}
          />
        </TableSection>
      ) : null}
      {!state.loading && state.activeTab === "drivers" ? (
        <TableSection
          title="الطيارون"
          search={{ value: state.searchDrivers, onChange: state.setSearchDrivers, placeholder: "بحث في الطيارين..." }}
          filters={[{ value: state.driverStatusFilter, onChange: state.setDriverStatusFilter, options: [{ value: "", label: "كل الحالات" }, ...state.driverStatuses.map((status) => ({ value: status, label: status }))] }]}
          primaryAction={{ label: "إضافة طيار", icon: "bx bx-plus", onClick: () => state.openDriverModal("create") }}
          exportActions={{ rows: state.filteredDrivers, columns: getExportColumns(driverColumns), fileName: "delivery-drivers", printTitle: "الطيارون", tableId: "delivery-drivers-table" }}
        >
          <DataTable
            id="delivery-drivers-table"
            rows={state.filteredDrivers}
            columns={driverColumns}
            getRowKey={(driver) => driver.id}
            actions={(driver) => ({
              onView: () => state.openDriverModal("view", driver.id),
              onEdit: () => state.openDriverModal("edit", driver.id),
              onDelete: async () => {
                await apiRequest<{ deleted: boolean }>(`/api/delivery/drivers/${driver.id}`, { method: "DELETE" });
                await state.loadDelivery();
              },
              confirmDeleteText: "لا يمكن حذف طيار لديه طلبات نشطة. هل تريد المتابعة؟",
              deleteMessage: "تم حذف الطيار",
            })}
          />
        </TableSection>
      ) : null}
      {!state.loading && state.activeTab === "tracking" ? (
        <TableSection
          title="متابعة طلبات التوصيل"
          search={{ value: state.searchTracking, onChange: state.setSearchTracking, placeholder: "بحث في التوصيل..." }}
          filters={[{ value: state.trackingStatusFilter, onChange: state.setTrackingStatusFilter, options: [{ value: "", label: "كل الحالات" }, { value: "preparing", label: "قيد التحضير" }, { value: "ready", label: "جاهز" }, { value: "out", label: "خارج للتوصيل" }, { value: "delivered", label: "تم التسليم" }, { value: "cancelled", label: "ملغي" }] }]}
          exportActions={{ rows: state.filteredTracking, columns: getExportColumns(trackingColumns), fileName: "delivery-tracking", printTitle: "متابعة طلبات التوصيل", tableId: "delivery-tracking-table" }}
        >
          <DataTable
            id="delivery-tracking-table"
            rows={state.filteredTracking}
            columns={trackingColumns}
            getRowKey={(order) => order.id}
            getRowProps={(order) => ({ "data-status": order.status })}
            actions={(order) => ({ onView: () => state.setSelectedOrderId(order.id) })}
          />
        </TableSection>
      ) : null}
    </>
  );
}
