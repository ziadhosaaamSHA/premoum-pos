export type SettingsTabItem<T extends string> = {
  id: T;
  label: string;
  icon: string;
  hidden?: boolean;
};

type SettingsTabsProps<T extends string> = {
  tabs: SettingsTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
};

export default function SettingsTabs<T extends string>({ tabs, activeTab, onChange }: SettingsTabsProps<T>) {
  const visibleTabs = tabs.filter((tab) => !tab.hidden);
  if (visibleTabs.length <= 1) return null;

  return (
    <div className="subtabs settings-tabs">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          className={`subtab ${activeTab === tab.id ? "active" : ""}`}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          <i className={tab.icon}></i>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
