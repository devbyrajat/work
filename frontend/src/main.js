import { schemes } from '../ui/catalog.mjs';
import { schemeHref } from '../ui/routes.mjs';

const key = 'yojnaagent:demo-bookmarks:v1';
const ids = new Set(schemes.map(({ id }) => id));
const pageUrl = new URL(window.location.href);
const page = document.body.dataset.page;
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const one = (selector, root = document) => root.querySelector(selector);

function readBookmarks() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return new Set(Array.isArray(value) ? value.filter((id) => ids.has(id)) : []);
  } catch {
    return new Set();
  }
}

let bookmarks = readBookmarks();
const saveButtons = all('[data-save]');

function showBookmarks() {
  for (const button of saveButtons) {
    const saved = bookmarks.has(button.dataset.save);
    button.hidden = false;
    button.setAttribute('aria-pressed', String(saved));
    one('[data-save-label]', button).textContent = saved ? 'Saved' : 'Save Scheme';
  }
  for (const count of all('[data-saved-count]')) count.textContent = bookmarks.size;
}

const listResults = page === 'results' ? setupResults() : () => {};
for (const button of saveButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.save;
    if (!ids.has(id)) return;
    if (bookmarks.has(id)) bookmarks.delete(id);
    else bookmarks.add(id);
    try {
      localStorage.setItem(key, JSON.stringify([...bookmarks]));
    } catch {
      // The current page can still show a bookmark if browser storage is blocked.
    }
    showBookmarks();
    listResults();
    if (button.closest('[data-result]')?.hidden) one('[data-results-count]')?.focus();
  });
}
showBookmarks();

window.addEventListener('storage', (event) => {
  if (event.key !== key && event.key !== null) return;
  bookmarks = readBookmarks();
  showBookmarks();
  listResults();
});

// Results and details are selectors over the static sample catalogue, not an
// eligibility computation. No questionnaire inputs are read or sent here.
function setupResults() {
  const savedView = pageUrl.searchParams.get('view') === 'saved';
  const buttons = all('[data-filter]');
  const cards = all('[data-result]');
  const count = one('[data-results-count]');
  const empty = one('[data-results-empty]');
  const requested = pageUrl.searchParams.get('category');
  let category = buttons.some((button) => button.dataset.filter === requested) ? requested : 'all';

  if (savedView) {
    one('[data-results-title]').textContent = 'Saved Schemes';
    document.title = 'Saved Schemes — YojnaAgent';
    one('[data-show-all]').hidden = false;
    one('[data-nav="results"]').removeAttribute('aria-current');
    one('[data-nav="saved"]').setAttribute('aria-current', 'page');
  }

  function render() {
    let visible = 0;
    for (const card of cards) {
      card.hidden = (savedView && !bookmarks.has(card.dataset.result)) ||
        (category !== 'all' && category !== card.dataset.category);
      if (!card.hidden) visible += 1;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    count.textContent = `${visible} ${savedView ? 'saved ' : ''}${visible === 1 ? 'example' : 'examples'}`;
    empty.hidden = visible !== 0;
  }

  one('[data-filters]').hidden = false;
  count.tabIndex = -1;
  for (const button of buttons) {
    button.addEventListener('click', () => {
      category = button.dataset.filter;
      setQuery('category', category === 'all' ? null : category);
      render();
    });
  }
  render();
  return render;
}

function setQuery(name, value) {
  if (value === null) pageUrl.searchParams.delete(name);
  else pageUrl.searchParams.set(name, value);
  history.replaceState(null, '', pageUrl);
}

if (page === 'details') {
  const selected = pageUrl.searchParams.get('scheme') ?? schemes[0].id;
  const detail = all('[data-detail]').find((section) => section.dataset.detail === selected);
  for (const section of all('[data-detail]')) section.hidden = section !== detail;
  one('[data-detail-missing]').hidden = Boolean(detail);
  if (detail) document.title = `${one('h1', detail).textContent} — YojnaAgent`;

  for (const button of all('[data-share]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const status = one('[data-share-status]', button.closest('[data-detail]'));
      const url = new URL(schemeHref('details', button.dataset.share), window.location.origin).href;
      status.hidden = false;
      try {
        if (navigator.share) await navigator.share({ title: document.title, url });
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          status.textContent = 'Example scheme link copied.';
          return;
        } else throw new Error('Share not supported');
        status.textContent = '';
      } catch (error) {
        status.textContent = error.name === 'AbortError' ? '' : 'Copy the address from your browser to share this page.';
      }
    });
  }
}

if (page === 'documents') {
  const select = one('#checklist-scheme');
  const panels = all('[data-checklist]');
  const requested = pageUrl.searchParams.get('scheme');
  if (ids.has(requested)) select.value = requested;
  select.disabled = false;

  const showPanel = () => {
    for (const panel of panels) panel.hidden = panel.dataset.checklist !== select.value;
  };
  select.addEventListener('change', () => {
    setQuery('scheme', select.value);
    showPanel();
  });

  for (const panel of panels) {
    const items = all('[data-doc-toggle]', panel);
    const meter = one('[data-progress]', panel);
    for (const item of items) item.disabled = false;

    panel.addEventListener('change', (event) => {
      const item = event.target;
      if (!items.includes(item)) return;
      const checked = items.filter((input) => input.checked).length;
      one('[data-doc-status]', item.closest('label')).textContent = item.checked ? 'Marked' : 'Not marked';
      meter.value = checked;
      meter.textContent = `${checked} of ${items.length}`;
      one('[data-percent]', panel).textContent = `${Math.round(100 * checked / items.length)}%`;
      one('[data-document-count]', panel).textContent = `${checked} of ${items.length} example items marked`;
    });
  }
  showPanel();
}

if (page === 'assistant') {
  const reset = one('[data-reset-demo]');
  reset.hidden = false;
  reset.addEventListener('click', () => {
    const questionnaire = one('[data-demo-questionnaire]');
    for (const item of all('input[type="radio"]', questionnaire)) item.checked = item.defaultChecked;
    for (const select of all('select', questionnaire)) {
      select.selectedIndex = [...select.options].findIndex((option) => option.defaultSelected);
    }
    one('[data-reset-status]').textContent = 'Example choices reset.';
  });
}
