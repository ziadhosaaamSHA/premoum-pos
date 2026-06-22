"use client";

import { Page } from "@/components/ui";
import { useDeliveryPage } from "../hooks/useDeliveryPage";
import DeliveryOrderModal from "./modals/DeliveryOrderModal";
import DriverModal from "./modals/DriverModal";
import ZoneModal from "./modals/ZoneModal";
import DeliveryTabs from "./tables/DeliveryTabs";

export default function DeliveryPageClient() {
  const state = useDeliveryPage();

  return (
    <Page>
      <DeliveryTabs state={state} />
      <ZoneModal {...state} />
      <DriverModal {...state} />
      <DeliveryOrderModal {...state} />
    </Page>
  );
}
