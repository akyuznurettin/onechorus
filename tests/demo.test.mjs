import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, plan, changeSource, replay, updateAgent, setBudget, exportProject } from '../demo.js';

test('initial artifacts match the declared graph', () => {
  const p = createProject(); assert.equal(plan(p).tasks.length, 0); assert.equal(plan(p).kept.length, 6);
  assert.equal(p.spend, 0); assert.equal(replay(p), false); assert.equal(p.spend, 0);
});
test('audience change propagates only to its descendants and preserves API work', () => {
  const p = createProject(); changeSource(p, 'audience', 'Solo developers');
  assert.deepEqual(plan(p).tasks.map(t => t.id), ['research', 'scope', 'copy', 'review']);
  assert.deepEqual(plan(p).kept.map(t => t.id), ['build', 'test']);
  const build = structuredClone(p.artifacts.build), checks = structuredClone(p.artifacts.test);
  assert.equal(replay(p), true); assert.deepEqual(p.artifacts.build, build); assert.deepEqual(p.artifacts.test, checks);
  assert.equal(p.artifacts.research.revision, 2); assert.equal(p.artifacts.scope.snapshot.parents.research, 2);
  assert.equal(plan(p).tasks.length, 0); assert.equal(p.spend, 68000);
});
test('platform and API changes follow different dependency paths', () => {
  const p = createProject(); changeSource(p, 'platform', 'Self-hosted');
  assert.deepEqual(plan(p).tasks.map(t => t.id), ['scope','copy','build','test','review']);
  replay(p); changeSource(p, 'api', 'Contract v2');
  assert.deepEqual(plan(p).tasks.map(t => t.id), ['build','test','review']);
});
test('changing instructions invalidates downstream artifacts, changing a budget does not', () => {
  const p = createProject(); updateAgent(p, 'build', p.agents.build.role, 0.08); assert.equal(plan(p).tasks.length, 0);
  updateAgent(p, 'build', 'Build with strict input validation.', 0.08);
  assert.deepEqual(plan(p).tasks.map(t => t.id), ['build','test','review']);
});
test('run and agent budgets block all execution without partial spend', () => {
  const p = createProject(); changeSource(p, 'audience', 'Solo developers'); const before = structuredClone(p.artifacts);
  setBudget(p, 0.06); assert.equal(replay(p), false); assert.equal(p.spend, 0); assert.deepEqual(p.artifacts, before);
  setBudget(p, 0.068); updateAgent(p, 'research', p.agents.research.role, 0.001);
  assert.equal(replay(p), false); assert.equal(p.spend, 0); assert.deepEqual(p.artifacts, before);
  updateAgent(p, 'research', p.agents.research.role, 0.012); assert.equal(replay(p), true); assert.equal(p.spend, 68000);
});
test('unknown coverage forces all tasks and includes overhead even without a cost advantage', () => {
  const p = createProject(); p.unknown = true; const pending = plan(p);
  assert.equal(pending.tasks.length, 6); assert.equal(pending.kept.length, 0); assert.equal(pending.difference, -8000);
  assert.equal(replay(p), true); assert.equal(p.spend, 158000); assert.equal(p.unknown, false); assert.equal(plan(p).tasks.length, 0);
});
test('exports are independent, identify the demo, and reconcile all cost records', () => {
  const p = createProject(); changeSource(p, 'api', 'Contract v2'); replay(p); changeSource(p, 'audience', 'Solo developers'); replay(p);
  const report = exportProject(p); assert.equal(report.actualApiSpend, 0); assert.equal(report.modelUsed, null);
  assert.equal(report.project.events.reduce((sum, e) => sum + e.cost, 0), p.spend);
  report.project.sources.api.value = 'tampered'; assert.equal(p.sources.api.value, 'Contract v2');
});
test('invalid inputs are rejected and setting an unchanged source does not bump revisions', () => {
  const p = createProject(); assert.equal(changeSource(p, 'api', 'Contract v1'), false); assert.equal(p.version, 1);
  assert.throws(() => changeSource(p, 'not-a-source', 'x')); assert.throws(() => changeSource(p, 'api', 'bad'));
  for (const value of [-1, NaN, Infinity, 11]) assert.equal(setBudget(p, value), false);
  assert.equal(updateAgent(p, 'build', '  ', 0.1), false);
});
