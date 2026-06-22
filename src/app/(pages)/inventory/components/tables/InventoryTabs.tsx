import { TabItem, Tabs } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";

type InventoryTabsProps = Pick<InventoryPageState, "activeTab" | "setActiveTab">;

const tabs: TabItem<string>[] = [
  { value: "materials", icon: "bx bx-layer", label: "المواد الخام" },
  { value: "purchases", icon: "bx bx-purchase-tag", label: "المشتريات" },
  { value: "waste", icon: "bx bx-trash", label: "الهدر" },
  { value: "stock", icon: "bx bx-error-circle", label: "تنبيهات المخزون" },
];

export default function InventoryTabs({ activeTab, setActiveTab }: InventoryTabsProps) {
  return <Tabs value={activeTab} items={tabs} onChange={setActiveTab} />;
}
