"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2, translateStatus } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";
import { useToast } from "@/context/ToastContext";

type ZoneRow = {
  id: string;
  name: string;
  limit: number;
  fee: number;
  minOrder: number;
  status: "active" | "inactive";
};

type DriverRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  activeOrders: number;
};

type DeliveryOrderRow = {
  id: string;
  code: string;
  customer: string;
  status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  type: "delivery" | "other";
  zoneId: string | null;
  zoneName: string | null;
  driverId: string | null;
  driverName: string | null;
  createdAt: string;
};

type ZoneModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type DriverModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

export default function DeliveryPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrderRow[]>([]);

  const [activeTab, setActiveTab] = useState("zones");
  const [searchZones, setSearchZones] = useState("");
  const [zoneStatusFilter, setZoneStatusFilter] = useState("");
  const [searchDrivers, setSearchDrivers] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("");
  const [searchTracking, setSearchTracking] = useState("");
  const [trackingStatusFilter, setTrackingStatusFilter] = useState("");

  const [zoneModal, setZoneModal] = useState<ZoneModalState>(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    limit: 0,
    fee: 0,
    minOrder: 0,
    status: "active" as "active" | "inactive",
  });

  const [driverModal, setDriverModal] = useState<DriverModalState>(null);
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    status: "متاح",
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        pushToast(error.message || fallback, "error");
        return;
      }
      pushToast(fallback, "error");
    },
    [pushToast]
  );

  const loadDelivery = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await apiRequest<{
          zones: ZoneRow[];
          drivers: DriverRow[];
          orders: DeliveryOrderRow[];
        }>("/api/delivery/bootstrap");

        setZones(data.zones);
        setDrivers(data.drivers);
        setDeliveryOrders(data.orders);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات التوصيل");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void loadDelivery(true);
  }, [loadDelivery]);

  const filteredTracking = useMemo(() => {
    const q = searchTracking.trim().toLowerCase();
    return deliveryOrders.filter((order) => {
      const matchesSearch =
        !q ||
        order.code.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        (order.zoneName || "").toLowerCase().includes(q) ||
        (order.driverName || "").toLowerCase().includes(q);
      const matchesStatus = !trackingStatusFilter || order.status === trackingStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveryOrders, searchTracking, trackingStatusFilter]);

  const filteredZones = useMemo(() => {
    const q = searchZones.trim().toLowerCase();
    return zones.filter((zone) => {
      const matchesSearch =
        !q ||
        zone.name.toLowerCase().includes(q) ||
        String(zone.limit).includes(q) ||
        String(zone.fee).includes(q);
      const matchesStatus = !zoneStatusFilter || zone.status === zoneStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchZones, zoneStatusFilter, zones]);

  const filteredDrivers = useMemo(() => {
    const q = searchDrivers.trim().toLowerCase();
    return drivers.filter((driver) => {
      const matchesSearch =
        !q || driver.name.toLowerCase().includes(q) || driver.phone.includes(q) || driver.status.toLowerCase().includes(q);
      const matchesStatus = !driverStatusFilter || driver.status === driverStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [driverStatusFilter, drivers, searchDrivers]);

  const driverStatuses = useMemo(() => {
    return Array.from(new Set(drivers.map((driver) => driver.status))).filter(Boolean);
  }, [drivers]);

  const selectedOrder = selectedOrderId
    ? deliveryOrders.find((order) => order.id === selectedOrderId) || null
    : null;

  const selectedZone = zoneModal?.id ? zones.find((zone) => zone.id === zoneModal.id) || null : null;
  const selectedDriver = driverModal?.id ? drivers.find((driver) => driver.id === driverModal.id) || null : null;

  const openZoneModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setZoneForm({ name: "", limit: 0, fee: 0, minOrder: 0, status: "active" });
      setZoneModal({ mode: "create" });
      return;
    }

    const zone = zones.find((item) => item.id === id);
    if (!zone) return;

    setZoneForm({
      name: zone.name,
      limit: zone.limit,
      fee: zone.fee,
      minOrder: zone.minOrder,
      status: zone.status,
    });
    setZoneModal({ mode, id: zone.id });
  };

  const openDriverModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setDriverForm({ name: "", phone: "", status: "متاح" });
      setDriverModal({ mode: "create" });
      return;
    }

    const driver = drivers.find((item) => item.id === id);
    if (!driver) return;

    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
    });
    setDriverModal({ mode, id: driver.id });
  };

  const submitZone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!zoneModal) return;

    setSubmitting(true);
    try {
      if (zoneModal.mode === "create") {
        await apiRequest<{ zone: ZoneRow }>("/api/delivery/zones", {
          method: "POST",
          body: JSON.stringify(zoneForm),
        });
        pushToast("تمت إضافة النطاق", "success");
      } else if (zoneModal.id) {
        await apiRequest<{ zone: ZoneRow }>(`/api/delivery/zones/${zoneModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(zoneForm),
        });
        pushToast("تم تحديث النطاق", "success");
      }
      setZoneModal(null);
      await loadDelivery();
    } catch (error) {
      handleError(error, "تعذر حفظ النطاق");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!driverModal) return;

    setSubmitting(true);
    try {
      if (driverModal.mode === "create") {
        await apiRequest<{ driver: DriverRow }>("/api/delivery/drivers", {
          method: "POST",
          body: JSON.stringify(driverForm),
        });
        pushToast("تمت إضافة الطيار", "success");
      } else if (driverModal.id) {
        await apiRequest<{ driver: DriverRow }>(`/api/delivery/drivers/${driverModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(driverForm),
        });
        pushToast("تم تحديث الطيار", "success");
      }
      setDriverModal(null);
      await loadDelivery();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات الطيار");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page active">
      <div className="subtabs">
        <button className={`subtab ${activeTab === "zones" ? "active" : ""}`} onClick={() => setActiveTab("zones")} type="button">
          <i className="bx bx-map-alt"></i>
          نطاق التوصيل
        </button>
        <button className={`subtab ${activeTab === "drivers" ? "active" : ""}`} onClick={() => setActiveTab("drivers")} type="button">
          <i className="bx bx-cycling"></i>
          الطيارين
        </button>
        <button className={`subtab ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")} type="button">
          <i className="bx bx-navigation"></i>
          متابعة الطلبات
        </button>
      </div>

      {loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات التوصيل...</p>
        </div>
      ) : null}

      {!loading && activeTab === "zones" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>نطاقات التوصيل</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في النطاقات..."
                    value={searchZones}
                    onChange={(event) => setSearchZones(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={zoneStatusFilter}
                  onChange={(event) => setZoneStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
                <button className="primary" type="button" onClick={() => openZoneModal("create")}>
                  <i className="bx bx-plus"></i>
                  إضافة نطاق
                </button>
                <TableDataActions
                  rows={filteredZones}
                  columns={[
                    { label: "النطاق", value: (row) => row.name },
                    { label: "الحد الأقصى (كم)", value: (row) => row.limit },
                    { label: "الرسوم", value: (row) => row.fee },
                    { label: "الحد الأدنى للطلب", value: (row) => row.minOrder },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                  ]}
                  fileName="delivery-zones"
                  printTitle="نطاقات ورسوم التوصيل"
                  tableId="delivery-zones-table"
                />
              </div>
            </div>
            <table id="delivery-zones-table">
              <thead>
                <tr>
                  <th>النطاق</th>
                  <th>الحد الأقصى</th>
                  <th>رسوم التوصيل</th>
                  <th>الحد الأدنى</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredZones.map((zone) => (
                    <tr key={zone.id} data-status={zone.status}>
                      <td>{zone.name}</td>
                      <td>{num2(zone.limit)} كم</td>
                      <td>{money(zone.fee)}</td>
                      <td>{money(zone.minOrder)}</td>
                      <td>
                        <span className={`badge ${zone.status === "active" ? "ok" : "neutral"}`}>
                          {translateStatus(zone.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openZoneModal("view", zone.id)}
                          onEdit={() => openZoneModal("edit", zone.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/delivery/zones/${zone.id}`, {
                              method: "DELETE",
                            });
                            await loadDelivery();
                          }}
                          confirmDeleteText="هل تريد حذف نطاق التوصيل؟"
                          deleteMessage="تم حذف نطاق التوصيل"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "drivers" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الطيارون</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الطيارين..."
                    value={searchDrivers}
                    onChange={(event) => setSearchDrivers(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={driverStatusFilter}
                  onChange={(event) => setDriverStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  {driverStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="primary" type="button" onClick={() => openDriverModal("create")}>
                  <i className="bx bx-plus"></i>
                  إضافة طيار
                </button>
                <TableDataActions
                  rows={filteredDrivers}
                  columns={[
                    { label: "الاسم", value: (row) => row.name },
                    { label: "الهاتف", value: (row) => row.phone },
                    { label: "الحالة", value: (row) => row.status },
                    { label: "طلبات نشطة", value: (row) => row.activeOrders },
                  ]}
                  fileName="delivery-drivers"
                  printTitle="الطيارون"
                  tableId="delivery-drivers-table"
                />
              </div>
            </div>
            <table id="delivery-drivers-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>الطلبات النشطة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id}>
                      <td>{driver.name}</td>
                      <td>{driver.phone || "—"}</td>
                      <td>
                        <span className="badge neutral">{driver.status}</span>
                      </td>
                      <td>{driver.activeOrders}</td>
                      <td>
                        <RowActions
                          onView={() => openDriverModal("view", driver.id)}
                          onEdit={() => openDriverModal("edit", driver.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/delivery/drivers/${driver.id}`, {
                              method: "DELETE",
                            });
                            await loadDelivery();
                          }}
                          confirmDeleteText="لا يمكن حذف طيار لديه طلبات نشطة. هل تريد المتابعة؟"
                          deleteMessage="تم حذف الطيار"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "tracking" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>متابعة طلبات التوصيل</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في التوصيل..."
                    value={searchTracking}
                    onChange={(event) => setSearchTracking(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={trackingStatusFilter}
                  onChange={(event) => setTrackingStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="preparing">قيد التحضير</option>
                  <option value="ready">جاهز</option>
                  <option value="out">خارج للتوصيل</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>
                <TableDataActions
                  rows={filteredTracking}
                  columns={[
                    { label: "الطلب", value: (row) => row.code },
                    { label: "العميل", value: (row) => row.customer },
                    { label: "النطاق", value: (row) => row.zoneName || "—" },
                    { label: "الطيار", value: (row) => row.driverName || "—" },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                  ]}
                  fileName="delivery-tracking"
                  printTitle="متابعة طلبات التوصيل"
                  tableId="delivery-tracking-table"
                />
              </div>
            </div>
            <table id="delivery-tracking-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>النطاق</th>
                  <th>الطيار</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracking.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredTracking.map((order) => (
                    <tr key={order.id} data-status={order.status}>
                      <td>{order.code}</td>
                      <td>{order.customer}</td>
                      <td>{order.zoneName || "—"}</td>
                      <td>{order.driverName || "—"}</td>
                      <td>
                        <span className="badge warn">{translateStatus(order.status)}</span>
                      </td>
                      <td>
                        <RowActions onView={() => setSelectedOrderId(order.id)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InlineModal
        open={Boolean(zoneModal)}
        title={
          zoneModal?.mode === "create"
            ? "إضافة نطاق"
            : zoneModal?.mode === "edit"
              ? "تعديل نطاق"
              : "تفاصيل النطاق"
        }
        onClose={() => setZoneModal(null)}
      >
        {zoneModal?.mode === "view" && selectedZone ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedZone.name}</strong>
              </div>
              <div className="row-line">
                <span>الحد الأقصى</span>
                <strong>{selectedZone.limit} كم</strong>
              </div>
              <div className="row-line">
                <span>الرسوم</span>
                <strong>{money(selectedZone.fee)}</strong>
              </div>
              <div className="row-line">
                <span>الحد الأدنى</span>
                <strong>{money(selectedZone.minOrder)}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{translateStatus(selectedZone.status)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitZone}>
            <label>اسم النطاق</label>
            <input
              type="text"
              value={zoneForm.name}
              onChange={(event) => setZoneForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الحد الأقصى (كم)</label>
            <input
              type="number"
              value={zoneForm.limit}
              onChange={(event) => setZoneForm((prev) => ({ ...prev, limit: Number(event.target.value || 0) }))}
              required
            />
            <label>رسوم التوصيل</label>
            <input
              type="number"
              value={zoneForm.fee}
              onChange={(event) => setZoneForm((prev) => ({ ...prev, fee: Number(event.target.value || 0) }))}
              required
            />
            <label>الحد الأدنى للطلب</label>
            <input
              type="number"
              value={zoneForm.minOrder}
              onChange={(event) => setZoneForm((prev) => ({ ...prev, minOrder: Number(event.target.value || 0) }))}
              required
            />
            <label>الحالة</label>
            <select
              value={zoneForm.status}
              onChange={(event) =>
                setZoneForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))
              }
            >
              <option value="active">سارية</option>
              <option value="inactive">موقوفة</option>
            </select>
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(driverModal)}
        title={
          driverModal?.mode === "create"
            ? "إضافة طيار"
            : driverModal?.mode === "edit"
              ? "تعديل طيار"
              : "تفاصيل الطيار"
        }
        onClose={() => setDriverModal(null)}
      >
        {driverModal?.mode === "view" && selectedDriver ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedDriver.name}</strong>
              </div>
              <div className="row-line">
                <span>الهاتف</span>
                <strong>{selectedDriver.phone || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{selectedDriver.status}</strong>
              </div>
              <div className="row-line">
                <span>الطلبات النشطة</span>
                <strong>{selectedDriver.activeOrders}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitDriver}>
            <label>الاسم</label>
            <input
              type="text"
              value={driverForm.name}
              onChange={(event) => setDriverForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الهاتف</label>
            <input
              type="text"
              value={driverForm.phone}
              onChange={(event) => setDriverForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <label>الحالة</label>
            <input
              type="text"
              value={driverForm.status}
              onChange={(event) => setDriverForm((prev) => ({ ...prev, status: event.target.value }))}
              required
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal open={Boolean(selectedOrder)} title="تفاصيل طلب التوصيل" onClose={() => setSelectedOrderId(null)}>
        {selectedOrder ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>رقم الطلب</span>
                <strong>{selectedOrder.code}</strong>
              </div>
              <div className="row-line">
                <span>العميل</span>
                <strong>{selectedOrder.customer}</strong>
              </div>
              <div className="row-line">
                <span>النطاق</span>
                <strong>{selectedOrder.zoneName || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الطيار</span>
                <strong>{selectedOrder.driverName || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{translateStatus(selectedOrder.status)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>
    </section>
  );
}
