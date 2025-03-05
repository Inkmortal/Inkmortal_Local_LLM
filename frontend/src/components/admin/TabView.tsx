import React, { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabViewProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  accentColor: string;
  textColor: string;
  inactiveTextColor: string;
  borderColor: string;
  children: ReactNode;
}

const TabView: React.FC<TabViewProps> = ({
  tabs,
  activeTab,
  onTabChange,
  accentColor,
  textColor,
  inactiveTextColor,
  borderColor,
  children
}) => {
  return (
    <div>
      <div className="border-b" style={{ borderColor }}>
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center transition-colors duration-150 ${
                activeTab === tab.id ? 'border-opacity-100' : 'border-transparent hover:border-opacity-50'
              }`}
              style={{
                borderColor: activeTab === tab.id ? accentColor : 'transparent',
                color: activeTab === tab.id ? textColor : inactiveTextColor,
              }}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span 
                  className="ml-2 px-2 py-0.5 text-xs rounded-full" 
                  style={{ 
                    backgroundColor: activeTab === tab.id ? `${accentColor}20` : `${borderColor}40`,
                    color: activeTab === tab.id ? accentColor : inactiveTextColor
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
};

export default TabView;