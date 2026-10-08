import { definitions, sourceDefinitions, createProject, plan, dollars, changeSource, setBudget, updateAgent, replay, exportProject } from './demo.js';
let project = createProject();
let selected = 'scope';
let editingAgent = null;
const $ = id => document.getElementById(id);
const money = value => `$${dollars(value).toFixed(3)}`;
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function announce(message) { $('workspace-status').textContent = message; }
function selectTab(id, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach(tab => { const active = tab.dataset.tab === id; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
  document.querySelectorAll('[role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== `panel-${id}`; });
}
function renderInspector() {
  const task = definitions.find(item => item.id === selected);
  const pending = plan(project);
  const artifact = project.artifacts[selected];
  const label = el('div', 'inspector-label'); label.append(el('span', 'mini', 'SELECTED ARTIFACT'), el('strong', '', `${task.name} · r${artifact.revision}`));
  const content = el('div', 'inspector-content');
  const reasons = pending.stale.get(selected);
  content.append(el('span', `status-tag ${reasons ? 'amber' : 'green'}`, reasons ? 'NEEDS REPLAY' : 'CURRENT'));
  content.append(el('p', '', reasons ? reasons.join(' ') : 'Recorded inputs and upstream artifacts match the current declared graph.'));
  const dependencies = [...task.sources.map(id => sourceDefinitions.find(s => s.id === id).name), ...task.parents.map(id => definitions.find(t => t.id === id).name)];
  content.append(el('small', '', `Receives: ${dependencies.join(' · ')}`));
  const details = el('details', 'artifact-details'); details.append(el('summary', '', 'Inspect dependency record'), el('pre', '', artifact.content)); content.append(details);
  $('task-inspector').replaceChildren(label, content);
}
function renderGraph() {
  const pending = plan(project);
  $('task-grid').replaceChildren(...definitions.map(task => {
    const stale = pending.stale.has(task.id);
    const button = el('button', `task-node ${stale ? 'stale' : 'kept'} ${selected === task.id ? 'selected' : ''}`);
    button.setAttribute('aria-pressed', String(selected === task.id)); button.setAttribute('aria-label', `${task.name}, ${stale ? 'needs replay' : 'current'}, inspect artifact`);
    const top = el('div', 'task-node-top'); top.append(el('span', 'task-symbol', task.icon), el('small', '', task.agent), el('span', 'node-status', stale ? '↻' : '✓'));
    const bottom = el('div', 'task-node-bottom'); bottom.append(el('strong', '', task.name), el('span', '', `r${project.artifacts[task.id].revision}`)); button.append(top, bottom);
    button.addEventListener('click', () => { selected = task.id; renderGraph(); renderInspector(); $('task-grid').querySelector(`[aria-label^="${task.name},"]`).focus(); });
    return button;
  }));
  $('replay-summary').textContent = pending.tasks.length ? `${pending.tasks.length} tasks to revisit. ${pending.kept.length} artifacts to keep.` : 'All 6 sample artifacts are current.';
  $('replay-detail').textContent = pending.tasks.length ? `Replay follows dependency order. ${pending.difference > 0 ? `${money(pending.difference)} lower illustrative cost than a full task replay.` : 'No illustrative cost advantage after analysis overhead.'}` : 'Choose a change to see which work is affected.';
  $('replay-button').disabled = !pending.tasks.length;
  document.querySelectorAll('[data-change]').forEach(button => { const id = button.dataset.change; button.classList.toggle('changed', project.sources[id].value !== sourceDefinitions.find(source => source.id === id).options[0]); });
}
function renderTeam() {
  $('team-grid').replaceChildren(...definitions.map(task => {
    const card = el('article', 'team-card'); const head = el('div', 'team-head'); head.append(el('span', 'task-symbol', task.icon), el('h5', '', task.agent), el('span', 'mini', `v${project.agents[task.id].version}`));
    const button = el('button', 'text-button', 'Edit contract →'); button.setAttribute('aria-label', `Edit ${task.agent} contract`); button.addEventListener('click', () => openAgent(task.id));
    card.append(head, el('p', '', project.agents[task.id].role), el('small', '', `${task.name} · ${money(project.agents[task.id].budget)} sample limit`), button); return card;
  }));
}
function renderSources() {
  $('source-list').replaceChildren(...sourceDefinitions.map(source => {
    const card = el('article', 'source-card'); const title = el('div', 'source-title'); title.append(el('span', 'source-icon', source.icon), el('strong', '', source.name), el('span', 'version-badge', `r${project.sources[source.id].version}`));
    const label = el('label', 'source-select-label', 'Current value'); const select = el('select'); select.setAttribute('aria-label', source.name);
    for (const option of source.options) { const node = el('option', '', option); node.value = option; node.selected = project.sources[source.id].value === option; select.append(node); }
    select.addEventListener('change', () => { changeSource(project, source.id, select.value); renderAll(); document.querySelector(`[aria-label="${source.name}"]`).focus(); announce(project.notice); }); label.append(select);
    const consumers = definitions.filter(task => task.sources.includes(source.id)).map(task => task.agent).join(', ');
    card.append(title, label, el('small', '', `Direct consumers: ${consumers}`)); return card;
  }));
  $('unknown-dependencies').checked = project.unknown;
}
function renderBudget() {
  const pending = plan(project);
  $('full-cost').textContent = money(pending.fullCost);
  $('task-cost').textContent = pending.tasks.length ? money(pending.replayCost - pending.overhead) : '—';
  $('analysis-cost').textContent = pending.tasks.length ? money(pending.overhead) : '—';
  $('replay-cost').textContent = pending.tasks.length ? money(pending.replayCost) : '—';
  $('budget-fill').style.width = `${project.budget ? Math.min(100, pending.replayCost / project.budget * 100) : pending.replayCost ? 100 : 0}%`;
  const exceedsAgent = pending.tasks.some(task => task.cost > project.agents[task.id].budget);
  const exceeds = pending.replayCost > project.budget || exceedsAgent;
  $('budget-fill').classList.toggle('over', exceeds);
  $('budget-check').textContent = !pending.tasks.length ? 'No replay pending' : exceedsAgent ? 'An agent limit needs attention' : exceeds ? 'Above the run budget' : 'Within the sample budget';
  $('budget-check').classList.toggle('over', exceeds);
  $('kept-count').textContent = pending.kept.length;
  $('kept-detail').textContent = pending.tasks.length ? 'Inputs still match their records' : 'All sample work is current';
}
function renderLedger() {
  $('event-list').replaceChildren(...(project.events.length ? project.events.map(event => {
    const card = el('article', 'ledger-event'); card.append(el('span', 'event-symbol', event.type === 'change' ? '↳' : event.type === 'planning' ? '◇' : '✓'));
    const body = el('div'); body.append(el('strong', '', event.title), el('small', '', `${event.agent || (event.type === 'planning' ? 'Planner allowance' : 'Brief update')} · project v${event.version}`)); card.append(body, el('span', 'event-cost', money(event.cost))); return card;
  }) : [el('p', 'empty-state', 'Change a brief input and replay affected work. Your sample activity will appear here.')]));
  $('total-spend').textContent = money(project.spend);
}
function renderAll(includeSources = true) {
  $('project-version').textContent = `v${project.version}`;
  $('brief-audience').textContent = project.sources.audience.value.toLowerCase();
  $('brief-platform').textContent = `${project.sources.platform.value} · ${project.sources.api.value}`;
  renderGraph(); renderInspector(); renderTeam(); if (includeSources) renderSources(); renderBudget(); renderLedger();
}
function openAgent(id) {
  editingAgent = id;
  $('agent-title').textContent = `${definitions.find(task => task.id === id).agent} contract`;
  $('agent-role').value = project.agents[id].role;
  $('agent-budget').value = dollars(project.agents[id].budget);
  $('agent-dialog').showModal();
}
const tabs = [...document.querySelectorAll('[role="tab"]')];
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    const positions = { ArrowDown: (index + 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, ArrowUp: (index - 1 + tabs.length) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (event.key in positions) { event.preventDefault(); selectTab(tabs[positions[event.key]].dataset.tab, true); }
  });
}
for (const button of document.querySelectorAll('[data-change]')) button.addEventListener('click', () => {
  const source = sourceDefinitions.find(item => item.id === button.dataset.change);
  changeSource(project, source.id, source.options.find(value => value !== project.sources[source.id].value));
  renderAll(); announce(project.notice);
});
function syncBudget() {
  const input = $('run-budget');
  const valid = input.value !== '' && setBudget(project, Number(input.value));
  input.setCustomValidity(valid ? '' : 'Enter a sample budget from $0 to $10.');
  return valid;
}
$('run-budget').addEventListener('input', () => {
  if (syncBudget()) renderBudget();
});
$('run-budget').addEventListener('change', () => {
  if (!syncBudget()) { announce('Enter a sample budget from $0 to $10.'); return; }
  renderBudget(); announce('Sample budget updated. No real money is spent.');
});
$('replay-button').addEventListener('click', () => {
  if (!syncBudget()) { $('run-budget').reportValidity(); announce('Enter a sample budget from $0 to $10 before replaying.'); return; }
  replay(project); renderAll(); announce(project.notice);
});
$('reset-demo').addEventListener('click', () => { project = createProject(); selected = 'scope'; $('run-budget').value = '0.20'; $('run-budget').setCustomValidity(''); renderAll(); announce('Sample reset, including brief changes, budgets, contracts, and ledger.'); });
$('unknown-dependencies').addEventListener('change', event => {
  project.unknown = event.target.checked; project.blocked = false;
  renderGraph(); renderInspector(); renderBudget();
  announce(project.unknown ? 'Unknown dependency coverage: every task requires replay.' : 'Returned to the declared sample dependency graph.');
});
$('close-dialog').addEventListener('click', () => $('agent-dialog').close());
$('agent-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!updateAgent(project, editingAgent, $('agent-role').value, Number($('agent-budget').value))) { $('agent-role').setCustomValidity('Provide instructions and a valid budget.'); $('agent-role').reportValidity(); return; }
  $('agent-dialog').close(); renderAll();
  const agentName = definitions.find(task => task.id === editingAgent).agent;
  document.querySelector(`[aria-label="Edit ${agentName} contract"]`).focus();
  announce(project.notice);
});
$('agent-role').addEventListener('input', () => $('agent-role').setCustomValidity(''));
$('export-review').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(exportProject(project), null, 2)], { type: 'application/json' }));
  const link = el('a'); link.href = url; link.download = 'onechorus-project.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Downloaded the sample project, dependency records, costs, and limitations.');
});
renderAll();
