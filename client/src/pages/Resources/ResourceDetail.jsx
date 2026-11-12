import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getResource } from '../../services/resourceService';

function ResourceDetail() {
  const { slug } = useParams();
  const [result, setResult] = useState({ key: null, resource: null, error: '' });
  const loading = result.key !== slug;
  const resource = result.key === slug ? result.resource : null;
  const error = result.key === slug ? result.error : '';

  useEffect(() => {
    let active = true;
    getResource(slug)
      .then((resource) => {
        if (active) setResult({ key: slug, resource, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            key: slug,
            resource: null,
            error: getApiErrorMessage(requestError, 'Could not load this resource.'),
          });
        }
      });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="feature-page"><div className="feature-loading" role="status">Loading resource…</div></div>;
  if (error || !resource) {
    return <div className="feature-page"><div className="form-alert" role="alert">{error || 'Resource not found.'}</div><Link className="button button-outline" to="/resources"><ArrowLeft size={16} /> Back to resources</Link></div>;
  }

  return (
    <article className="feature-page resource-article">
      <Link className="back-link" to="/resources"><ArrowLeft size={16} /> All resources</Link>
      <span className="resource-category">{resource.category}</span>
      <h2>{resource.title}</h2>
      <p className="resource-article-summary">{resource.description}</p>
      <div className="resource-article-content">
        {resource.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <aside className="resource-source">
        <div><strong>Source: {resource.sourceOrganization}</strong><span>Reviewed {resource.lastReviewed}</span></div>
        <a className="button button-outline" href={resource.sourceUrl} target="_blank" rel="noreferrer">Read the original source <ExternalLink size={15} /></a>
      </aside>
      <p className="resource-disclaimer">This educational content is not medical advice and does not provide diagnosis or treatment.</p>
    </article>
  );
}

export default ResourceDetail;
