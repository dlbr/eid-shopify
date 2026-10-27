export function getAgeFilterStatus(result) {
  const nodes = result?.metafieldDefinitions?.nodes;
  if (!Array.isArray(nodes) || nodes.length !== 1 || nodes[0]?.key !== 'requires_age_verification' || !/^app--\d+(?:--[a-zA-Z0-9_-]+)?$/.test(nodes[0]?.namespace ?? '')) return 'UNKNOWN';
  const capability = nodes[0]?.capabilities?.adminFilterable;
  if (!capability || capability.eligible !== true || capability.enabled !== true) return 'NOT_READY';
  if (capability.status === 'FILTERABLE') return 'READY';
  if (capability.status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (capability.status === 'FAILED' || capability.status === 'NOT_FILTERABLE') return 'NOT_READY';
  return 'UNKNOWN';
}
