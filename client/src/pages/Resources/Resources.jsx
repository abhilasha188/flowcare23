import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getResources } from '../../services/resourceService';
import SectionTabs from '../../components/common/SectionTabs';
import useSectionTab from '../../hooks/useSectionTab';

function Resources() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const resourceTabs = [
    { id: 'all', label: 'All resources' },
    ...(result.data?.categories || []).map((item) => ({ id: item, label: item })),
  ];
  const [activeTab, setActiveTab] = useSectionTab('topic', 'all', resourceTabs);
  const category = activeTab === 'all' ? '' : activeTab;
  const requestKey = JSON.stringify([search, category]);
  const loading = result.key !== requestKey;
  const data = result.data || { resources: [], categories: [] };
  const error = result.key === requestKey ? result.error : '';

  useEffect(() => {
    let active = true;
    getResources({ search, category })
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            key: requestKey,
            data: null,
            error: getApiErrorMessage(requestError, 'Could not load educational resources.'),
          });
        }
      });
    return () => { active = false; };
  }, [search, category, requestKey]);

  return (
    <div className="feature-page">
      <header className="feature-heading">
        <div><span className="section-eyebrow">LEARN FROM TRUSTED SOURCES</span><h2>Resources</h2><p>Educational reading from established health organizations. FlowCare is not a source of medical diagnosis.</p></div>
        <span className="feature-heading-icon"><BookOpen size={20} /></span>
      </header>
      <div className="resource-filters">
        <label className="search-input-wrap"><Search size={17} /><input className="plain-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" aria-label="Search resources" /></label>
      </div>
      <SectionTabs label="Resource topics" tabs={resourceTabs} activeTab={activeTab} onChange={setActiveTab} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {loading && <div className="feature-loading" role="status">Loading resources…</div>}
      {!loading && !error && data.resources.length === 0 && <div className="feature-empty"><BookOpen size={23} /><h3>No resources match</h3><p>Try a different search or category.</p></div>}
      {!loading && !error && data.resources.length > 0 && (
        <div className="resource-grid">
          {data.resources.map((resource) => (
            <article className="resource-card" key={resource.slug}>
              <span className="resource-category">{resource.category}</span>
              <h3><Link to={`/resources/${resource.slug}`}>{resource.title}</Link></h3>
              <p>{resource.description}</p>
              <div className="resource-card-footer">
                <span>{resource.sourceOrganization} · reviewed {resource.lastReviewed}</span>
                <a href={resource.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${resource.sourceOrganization} source for ${resource.title}`}><ExternalLink size={16} /></a>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="resource-disclaimer">Resources are educational and do not replace advice from a qualified healthcare professional.</p>
    </div>
  );
}

export default Resources;
