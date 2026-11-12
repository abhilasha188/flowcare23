const resources = require('../data/resources');

const categories = [...new Set(resources.map((resource) => resource.category))].sort();

function list(req, res) {
  const search = String(req.query.search || '').trim().toLocaleLowerCase();
  const category = String(req.query.category || '').trim();
  if (search.length > 100) {
    return res.status(400).json({ success: false, message: 'Search text is too long.', errors: [] });
  }
  if (category && !categories.includes(category)) {
    return res.status(400).json({ success: false, message: 'Choose a valid resource category.', errors: [] });
  }

  const filtered = resources.filter((resource) => (
    (!category || resource.category === category)
    && (!search || `${resource.title} ${resource.category} ${resource.description}`.toLocaleLowerCase().includes(search))
  ));
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const start = (page - 1) * limit;
  return res.status(200).json({
    success: true,
    categories,
    resources: filtered.slice(start, start + limit),
    pagination: { page, limit, total: filtered.length },
  });
}

function get(req, res) {
  const resource = resources.find((item) => item.slug === req.params.slug);
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found.', errors: [] });
  }
  return res.status(200).json({ success: true, resource });
}

module.exports = { get, list };
