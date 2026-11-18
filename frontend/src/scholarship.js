const api = '/api/scholarship';
const get = (name) => document.querySelector(`[data-pilot-${name}]`);
const form = get('form');
const fields = get('fields');
const status = get('status');
const resultPanel = get('result');
const retry = get('retry');
const pdfButton = get('pdf');
const pdfStatus = get('pdf-status');
const stateLabels = { met: 'Met', not_met: 'Not met', unknown: 'Not sure' };
let metadata;
let checkedAnswers = null;

function element(tag, classes, text) {
  const node = document.createElement(tag);
  if (classes) node.className = classes;
  if (text !== undefined) node.textContent = text;
  return node;
}

function officialUrl(value) {
  const url = new URL(value);
  if (url.origin !== 'https://scholarships.gov.in' || url.username || url.password) {
    throw new Error('Unexpected scholarship source');
  }
  return url.href;
}

function sourceLink(label, url) {
  const link = element('a', 'text-secondary-blue underline break-words', label);
  link.href = officialUrl(url);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

async function request(path, options, type = 'application/json') {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, { ...options, cache: 'no-store', signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.includes(type)) {
      throw new Error('Scholarship API did not return a usable result');
    }
    return type === 'application/pdf' ? await response.blob() : await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

const postAnswers = (answers) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(answers),
});

function renderQuestion({ field, question, hint }) {
  const group = element('div', 'min-w-0 space-y-1.5 rounded border border-light-outline bg-light-surface-variant p-3.5');
  const fieldId = `scholarship-${field}`;
  const label = element('label', 'block font-label text-label-md text-primary-navy', question);
  label.htmlFor = fieldId;
  const input = element('select', 'field');
  input.id = fieldId;
  input.name = field;
  input.setAttribute('aria-describedby', `${fieldId}-hint`);
  for (const [value, title] of [['unknown', 'Not sure'], ['yes', 'Yes'], ['no', 'No']]) {
    const option = element('option', '', title);
    option.value = value;
    input.append(option);
  }
  const description = element('p', 'text-body-sm text-text-secondary', hint);
  description.id = `${fieldId}-hint`;
  group.append(label, input, description);
  return group;
}

function renderGuide(scheme) {
  get('scope').textContent = `AY ${scheme.academic_year} · ${scheme.scope}`;
  get('scheme').textContent = scheme.name;
  get('benefit').textContent = scheme.benefit;
  get('window').textContent = scheme.application_window;
  get('portal').href = officialUrl(scheme.application_url);
  get('reviewed').textContent = `Reviewed ${scheme.sources_reviewed_on}. Sources are not queried live.`;
  get('steps').replaceChildren(...scheme.steps.map((step) => element('li', '', step)));
  get('sources').replaceChildren(...Object.values(scheme.sources).map(({ label, url }) => {
    const item = element('li');
    item.append(sourceLink(label, url));
    return item;
  }));
}

async function loadQuestions() {
  retry.hidden = true;
  status.textContent = 'Loading the questionnaire…';
  try {
    const data = await request(api, { method: 'GET' });
    get('questions').replaceChildren(...data.questions.map(renderQuestion));
    renderGuide(data.scheme);
    metadata = data;
    fields.disabled = false;
    status.textContent = '';
  } catch {
    status.textContent = 'The scholarship checker is not available right now. Try again or use the official guidelines below.';
    retry.hidden = false;
  }
}

function renderCheck({ label, state, reason, quote, source, section }) {
  const item = element('li', 'space-y-1.5 p-3');
  const title = element('p', 'flex flex-wrap items-center gap-2');
  title.append(element('strong', 'text-body-md text-primary-navy', label),
    element('span', `badge ${state === 'met' ? 'text-success' : 'text-accent-gold'}`, stateLabels[state]));
  const evidence = element('p', 'text-body-sm text-text-secondary', `“${quote}” `);
  evidence.append(sourceLink(section, metadata.scheme.sources[source].url));
  item.append(title, element('p', 'text-body-sm text-text-primary', reason), evidence);
  return item;
}

function renderDocument({ name, detail }) {
  const item = element('li');
  const label = element('label', 'flex cursor-pointer items-start gap-2 text-body-sm');
  const checkbox = element('input', 'mt-0.5 rounded border-light-outline text-secondary-blue');
  checkbox.type = 'checkbox';
  const text = element('span');
  text.append(element('strong', 'block text-text-primary', name), element('span', 'text-text-secondary', detail));
  label.append(checkbox, text);
  item.append(label);
  return item;
}

function clearResult() {
  checkedAnswers = null;
  resultPanel.hidden = true;
  status.textContent = '';
  pdfStatus.textContent = '';
}

form.addEventListener('change', clearResult);
form.addEventListener('reset', clearResult);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!metadata || fields.disabled) return;
  const choices = new FormData(form);
  const answers = Object.fromEntries(metadata.questions.map(({ field }) => {
    const value = choices.get(field);
    return [field, value === 'yes' ? true : value === 'no' ? false : null];
  }));
  clearResult();
  fields.disabled = true;
  status.textContent = 'Checking the published rules…';
  try {
    const result = await request(api, postAnswers(answers));
    get('outcome').textContent = result.status;
    get('summary').textContent = result.summary;
    get('notice').textContent = result.notice;
    get('checks').replaceChildren(...result.checks.map(renderCheck));
    get('documents').replaceChildren(...metadata.scheme.documents.map(renderDocument));
    checkedAnswers = answers;
    pdfButton.disabled = false;
    resultPanel.hidden = false;
    status.textContent = 'Your result is ready below.';
    resultPanel.focus();
  } catch {
    status.textContent = 'We couldn’t check your answers. Please try again; no eligibility result was recorded.';
  } finally {
    fields.disabled = false;
  }
});

pdfButton.addEventListener('click', async () => {
  const answers = checkedAnswers;
  if (!answers || pdfButton.disabled) return;
  pdfButton.disabled = true;
  pdfStatus.textContent = 'Preparing your PDF…';
  try {
    const pdf = await request(`${api}?format=pdf`, postAnswers(answers), 'application/pdf');
    if (answers !== checkedAnswers) return;
    const url = URL.createObjectURL(pdf);
    const link = element('a');
    link.href = url;
    link.download = 'yojnaagent-scholarship-report.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    pdfStatus.textContent = 'PDF download started.';
  } catch {
    if (answers === checkedAnswers) pdfStatus.textContent = 'The PDF could not be downloaded. Try again.';
  } finally {
    if (answers === checkedAnswers) pdfButton.disabled = false;
  }
});

retry.addEventListener('click', loadQuestions);
loadQuestions();
