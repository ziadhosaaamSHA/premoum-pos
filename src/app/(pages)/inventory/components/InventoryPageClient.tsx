"use client";

import { PageLoading } from "@/components/ui";
import MaterialModal from "./modals/MaterialModal";
import PurchaseModal from "./modals/PurchaseModal";
import WasteModal from "./modals/WasteModal";
import InventoryTabs from "./tables/InventoryTabs";
import MaterialsPanel from "./tables/MaterialsPanel";
import PurchasesPanel from "./tables/PurchasesPanel";
import StockAlertsPanel from "./tables/StockAlertsPanel";
import WastePanel from "./tables/WastePanel";
import { useInventoryPage } from "../hooks/useInventoryPage";

export default function InventoryPageClient() {
  const inventory = useInventoryPage();

  return (
    <section className="page active">
      <InventoryTabs activeTab={inventory.activeTab} setActiveTab={inventory.setActiveTab} />

      {inventory.loading ? (
        <PageLoading message="جارٍ تحميل بيانات المخزون..." />
      ) : null}

      {!inventory.loading && inventory.activeTab === "materials" ? <MaterialsPanel {...inventory} /> : null}
      {!inventory.loading && inventory.activeTab === "purchases" ? <PurchasesPanel {...inventory} /> : null}
      {!inventory.loading && inventory.activeTab === "waste" ? <WastePanel {...inventory} /> : null}
      {!inventory.loading && inventory.activeTab === "stock" ? <StockAlertsPanel {...inventory} /> : null}

      <MaterialModal {...inventory} />
      <PurchaseModal {...inventory} />
      <WasteModal {...inventory} />
    </section>
  );
}
