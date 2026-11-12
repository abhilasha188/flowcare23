import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

function useSectionTab(key, defaultTab, tabs) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(key);
  const activeTab = tabs.some((tab) => tab.id === requested) ? requested : defaultTab;

  const selectTab = useCallback((tab) => {
    if (activeTab === tab) return;
    const next = new URLSearchParams(searchParams);
    if (tab === defaultTab) next.delete(key);
    else next.set(key, tab);
    setSearchParams(next);
  }, [activeTab, defaultTab, key, searchParams, setSearchParams]);

  return [activeTab, selectTab];
}

export default useSectionTab;
