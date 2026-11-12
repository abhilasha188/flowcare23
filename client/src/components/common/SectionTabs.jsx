import { useId } from 'react';

function SectionTabs({ label, tabs, activeTab, onChange }) {
  const id = useId();

  function handleKeyDown(event) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    document.getElementById(`${id}-${nextTab.id}`)?.focus();
  }

  return (
    <div className="section-tabs" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
      {tabs.map(({ id: tab, label: tabLabel, icon: Icon, count }) => (
        <button
          key={tab}
          id={`${id}-${tab}`}
          className={`section-tab${activeTab === tab ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          tabIndex={activeTab === tab ? 0 : -1}
          onClick={() => onChange(tab)}
        >
          {Icon && <Icon size={16} aria-hidden="true" />}
          <span>{tabLabel}</span>
          {count !== undefined && <span className="section-tab-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export default SectionTabs;
