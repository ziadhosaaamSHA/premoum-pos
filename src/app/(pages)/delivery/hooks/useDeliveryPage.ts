"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { DeliveryOrderRow, DeliveryTab, DriverModalState, DriverRow, ZoneModalState, ZoneRow } from "../types";

export function useDeliveryPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrderRow[]>([]);
  const [activeTab, setActiveTab] = useState<DeliveryTab>("zones");
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

  const driverStatuses = useMemo(() => Array.from(new Set(drivers.map((driver) => driver.status))).filter(Boolean), [drivers]);
  const selectedOrder = selectedOrderId ? deliveryOrders.find((order) => order.id === selectedOrderId) || null : null;
  const selectedZone = zoneModal?.id ? zones.find((zone) => zone.id === zoneModal.id) || null : null;
  const selectedDriver = driverModal?.id ? drivers.find((driver) => driver.id === driverModal.id) || null : null;

  const openZoneModal = useCallback(
    (mode: "view" | "edit" | "create", id?: string) => {
      if (mode === "create") {
        setZoneForm({ name: "", limit: 0, fee: 0, minOrder: 0, status: "active" });
        setZoneModal({ mode: "create" });
        return;
      }

      const zone = zones.find((item) => item.id === id);
      if (!zone) return;
      setZoneForm({ name: zone.name, limit: zone.limit, fee: zone.fee, minOrder: zone.minOrder, status: zone.status });
      setZoneModal({ mode, id: zone.id });
    },
    [zones]
  );

  const openDriverModal = useCallback(
    (mode: "view" | "edit" | "create", id?: string) => {
      if (mode === "create") {
        setDriverForm({ name: "", phone: "", status: "متاح" });
        setDriverModal({ mode: "create" });
        return;
      }

      const driver = drivers.find((item) => item.id === id);
      if (!driver) return;
      setDriverForm({ name: driver.name, phone: driver.phone, status: driver.status });
      setDriverModal({ mode, id: driver.id });
    },
    [drivers]
  );

  const submitZone = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [handleError, loadDelivery, pushToast, zoneForm, zoneModal]
  );

  const submitDriver = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [driverForm, driverModal, handleError, loadDelivery, pushToast]
  );

  return {
    activeTab,
    driverForm,
    driverModal,
    driverStatusFilter,
    driverStatuses,
    filteredDrivers,
    filteredTracking,
    filteredZones,
    loadDelivery,
    loading,
    openDriverModal,
    openZoneModal,
    searchDrivers,
    searchTracking,
    searchZones,
    selectedDriver,
    selectedOrder,
    selectedZone,
    setActiveTab,
    setDriverForm,
    setDriverModal,
    setDriverStatusFilter,
    setSearchDrivers,
    setSearchTracking,
    setSearchZones,
    setSelectedOrderId,
    setTrackingStatusFilter,
    setZoneForm,
    setZoneModal,
    setZoneStatusFilter,
    submitDriver,
    submitZone,
    submitting,
    trackingStatusFilter,
    zoneForm,
    zoneModal,
    zoneStatusFilter,
  };
}

export type DeliveryPageState = ReturnType<typeof useDeliveryPage>;
