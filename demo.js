// The browser demo uses declared dependencies and synthetic costs. No model runs.
export const definitions = [
  { id: 'research', name: 'Audience research', agent: 'Researcher', icon: '⌕', sources: ['audience'], parents: [], cost: 12000, role: 'Describe the selected audience and reference the current brief.' },
  { id: 'scope', name: 'MVP scope', agent: 'Planner', icon: '◇', sources: ['platform'], parents: ['research'], cost: 18000, role: 'Turn the audience findings and delivery target into a scoped MVP.' },
  { id: 'copy', name: 'Launch copy', agent: 'Writer', icon: '≡', sources: [], parents: ['scope'], cost: 16000, role: 'Write a launch draft consistent with the approved MVP scope.' },
  { id: 'build', name: 'API prototype', agent: 'Builder', icon: '⌘', sources: ['platform', 'api'], parents: [], cost: 62000, role: 'Prepare the API artifact for the selected platform and contract version.' },
  { id: 'test', name: 'Contract checks', agent: 'Tester', icon: '⌁', sources: ['api'], parents: ['build'], cost: 28000, role: 'Check the API artifact against the selected contract version.' },
  { id: 'review', name: 'Release review', agent: 'Reviewer', icon: '✓', sources: [], parents: ['scope', 'copy', 'test'], cost: 14000, role: 'Reconcile scope, launch copy, and test artifacts for human review.' },
];
export const sourceDefinitions = [
  { id: 'audience', name: 'Target audience', options: ['Small software teams', 'Solo developers'], icon: '◎' },
  { id: 'platform', name: 'Delivery target', options: ['Hosted cloud', 'Self-hosted'], icon: '▱' },
  { id: 'api', name: 'API contract', options: ['Contract v1', 'Contract v2'], icon: '{ }' },
];
const overhead = 8000;
export const dollars = units => units / 1e6;
export function createProject() {
  const state = { version: 1, budget: 200000, spend: 0, unknown: false, notice: '', blocked: false, events: [], sources: {}, agents: {}, artifacts: {} };
  for (const source of sourceDefinitions) state.sources[source.id] = { value: source.options[0], version: 1 };
  for (const task of definitions) state.agents[task.id] = { role: task.role, budget: 90000, version: 1 };
  for (const task of definitions) writeArtifact(state, task);
  return state;
}
function snapshot(state, task) {
  return {
    sources: Object.fromEntries(task.sources.map(id => [id, state.sources[id].version])),
    parents: Object.fromEntries(task.parents.map(id => [id, state.artifacts[id].revision])),
    agentVersion: state.agents[task.id].version,
  };
}
function writeArtifact(state, task) {
  const revision = (state.artifacts[task.id]?.revision || 0) + 1;
  const context = task.sources.map(id => `${sourceDefinitions.find(s => s.id === id).name}: ${state.sources[id].value}`).concat(task.parents.map(id => `${definitions.find(t => t.id === id).name} r${state.artifacts[id].revision}`));
  state.artifacts[task.id] = { revision, snapshot: snapshot(state, task), content: `${task.name} · revision ${revision}\n\nInputs\n${context.map(item => `• ${item}`).join('\n')}\n\nContract\n${state.agents[task.id].role}\n\nThis is a generated dependency record. No AI output or semantic quality assessment has been produced.` };
}
export function plan(state) {
  const stale = new Map();
  for (const task of definitions) {
    const saved = state.artifacts[task.id].snapshot;
    const reasons = [];
    if (state.unknown) reasons.push('Dependency coverage is unknown; a full replay is required.');
    for (const id of task.sources) if (saved.sources[id] !== state.sources[id].version) reasons.push(`${sourceDefinitions.find(s => s.id === id).name} changed to revision ${state.sources[id].version}.`);
    if (saved.agentVersion !== state.agents[task.id].version) reasons.push('Agent instructions changed.');
    for (const id of task.parents) if (stale.has(id) || saved.parents[id] !== state.artifacts[id].revision) reasons.push(`${definitions.find(t => t.id === id).name} needs a new artifact.`);
    if (reasons.length) stale.set(task.id, reasons);
  }
  const tasks = definitions.filter(task => stale.has(task.id));
  const fullCost = definitions.reduce((sum, task) => sum + task.cost, 0);
  const replayCost = tasks.reduce((sum, task) => sum + task.cost, 0) + (tasks.length ? overhead : 0);
  return { stale, tasks, kept: definitions.filter(task => !stale.has(task.id)), fullCost, replayCost, overhead: tasks.length ? overhead : 0, difference: fullCost - replayCost };
}
export function changeSource(state, id, value) {
  const definition = sourceDefinitions.find(source => source.id === id);
  if (!definition?.options.includes(value)) throw new Error('Unknown source or value.');
  if (state.sources[id].value === value) return false;
  state.sources[id] = { value, version: state.sources[id].version + 1 };
  state.version += 1;
  state.blocked = false;
  state.notice = `${definition.name} updated. Affected work is marked for replay.`;
  state.events.push({ type: 'change', title: `${definition.name} → ${value}`, cost: 0, version: state.version });
  return true;
}
export function setBudget(state, amount) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 10) return false;
  state.budget = Math.round(amount * 1e6); state.blocked = false; return true;
}
export function updateAgent(state, id, role, budget) {
  if (!state.agents[id] || !role.trim() || !Number.isFinite(budget) || budget < 0 || budget > 10) return false;
  if (state.agents[id].role !== role.trim()) { state.agents[id].role = role.trim(); state.agents[id].version += 1; state.version += 1; }
  state.agents[id].budget = Math.round(budget * 1e6);
  state.blocked = false; state.notice = 'Agent contract saved. Changed instructions invalidate dependent work.'; return true;
}
export function replay(state) {
  const pending = plan(state);
  if (!pending.tasks.length) { state.notice = 'All sample artifacts are current. Change a brief input to explore a replay.'; return false; }
  const overAgent = pending.tasks.find(task => task.cost > state.agents[task.id].budget);
  if (pending.replayCost > state.budget || overAgent) {
    state.blocked = true;
    state.notice = overAgent ? `${overAgent.agent} exceeds its sample agent limit. Adjust its contract in Team before replaying.` : 'The replay exceeds your sample run budget. Increase the limit to continue. No sample steps were run.';
    return false;
  }
  state.events.push({ type: 'planning', title: 'Change analysis · illustrative overhead', cost: pending.overhead, version: state.version });
  for (const task of pending.tasks) {
    writeArtifact(state, task);
    state.events.push({ type: 'replay', agent: task.agent, id: task.id, title: `${task.name} → revision ${state.artifacts[task.id].revision}`, cost: task.cost, version: state.version });
  }
  state.spend += pending.replayCost;
  state.unknown = false; state.blocked = false;
  state.notice = `${pending.tasks.length} dependency records rebuilt; ${pending.kept.length} preserved. These records do not certify output quality.`;
  return true;
}
export function exportProject(state) {
  const pending = plan(state);
  return { schemaVersion: 1, product: 'OneChorus', mode: 'local-dependency-demo', syntheticData: true, modelUsed: null, actualApiSpend: 0, units: 'micro-USD, illustrative', limitations: ['Dependencies are declared in the fixture, not inferred by AI.', 'Artifacts contain generated dependency records, not model outputs.', 'Costs are assumptions, not Claude prices or measured savings.', 'Unknown dependency coverage triggers full invalidation.'], project: structuredClone(state), pending: { rerun: pending.tasks.map(t => t.id), preserved: pending.kept.map(t => t.id), replayCost: pending.replayCost, fullCost: pending.fullCost } };
}
