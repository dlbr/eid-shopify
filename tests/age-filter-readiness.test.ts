import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getAgeFilterStatus} from '../scripts/age-filter-readiness.mjs';

const data = (status: string, enabled = true, eligible = true) => ({metafieldDefinitions: {nodes: [{namespace:'app--123', key:'requires_age_verification', capabilities:{adminFilterable:{status, enabled, eligible}}}]}});
test('filter is ready only when Shopify reports an enabled and eligible FILTERABLE definition', () => {
  assert.equal(getAgeFilterStatus(data('FILTERABLE')), 'READY');
  assert.equal(getAgeFilterStatus(data('IN_PROGRESS')), 'IN_PROGRESS');
  assert.equal(getAgeFilterStatus(data('FAILED')), 'NOT_READY');
  assert.equal(getAgeFilterStatus(data('FILTERABLE', false)), 'NOT_READY');
  assert.equal(getAgeFilterStatus(data('FILTERABLE', true, false)), 'NOT_READY');
  assert.equal(getAgeFilterStatus(data('NEW_STATUS')), 'UNKNOWN');
  assert.equal(getAgeFilterStatus({metafieldDefinitions:{nodes:[]}}), 'UNKNOWN');
  assert.equal(getAgeFilterStatus({}), 'UNKNOWN');
});
