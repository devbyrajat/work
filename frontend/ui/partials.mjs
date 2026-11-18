import { categories, getScheme, schemes } from './catalog.mjs';
import { pageHref, schemeHref } from './routes.mjs';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const icon = (name, classes = 'text-title-sm') =>
  `<span class="material-symbols-outlined ${classes}" aria-hidden="true">${name}</span>`;

const logo = `<svg class="h-[56%] w-[56%]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3l9 5H3l9-5z"/>
</svg>`;

const navItems = [
  ['dashboard', 'dashboard', 'Overview'], ['assistant', 'smart_toy', 'AI Scheme Assistant'],
  ['results', 'explore', 'Explore Schemes'], ['recommendations', 'recommend', 'My Recommendations', `${pageHref('dashboard')}#recommendations`],
  ['saved', 'bookmark', 'Saved Schemes', `${pageHref('results')}?view=saved`], ['tracker', 'assignment_turned_in', 'Application Tracker'],
  ['documents', 'checklist', 'Document Checker'], ['profile', 'person', 'My Profile'],
  ['settings', 'settings', 'Settings', `${pageHref('profile')}#preferences`],
];
const mobileItems = [
  ['dashboard', 'dashboard', 'Home'], ['assistant', 'smart_toy', 'Assistant'],
  ['results', 'explore', 'Schemes'], ['tracker', 'track_changes', 'Tracker'], ['profile', 'person', 'Profile'],
];
const mobileTitles = {
  assistant: 'AI Scheme Assistant', dashboard: 'YojnaAgent', results: 'Scheme Results',
  details: 'Scheme Details', documents: 'Document Readiness', tracker: 'Application Tracker', profile: 'User Profile',
};
const currentPage = (key, page) => key === page || (key === 'results' && page === 'details');

function sidebar(page) {
  return `<aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between gap-5 overflow-y-auto border-r border-light-outline bg-light-surface p-4 md:flex">
    <div class="space-y-6">
      <a href="/" class="flex items-center gap-3 px-2 py-1">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-navy text-amber-300 shadow-sm">${logo}</span>
        <span><span class="block font-headline text-title-md text-primary-navy">YojnaAgent</span><span class="block font-label text-label-sm text-text-secondary">Citizen Welfare Portal</span></span>
      </a>
      <nav class="space-y-1" aria-label="Workspace">${navItems.map(([key, symbol, label, href = pageHref(key)]) => {
        const active = currentPage(key, page);
        return `<a href="${href}" data-nav="${key}" ${active ? 'aria-current="page"' : ''} class="workspace-link flex items-center gap-3 rounded px-3 py-2 font-label text-label-md transition-colors">
          ${icon(symbol)}<span>${label}</span>
        </a>`;
      }).join('')}</nav>
    </div>
    <div class="border-t border-light-outline pt-4">
      <a href="${pageHref('profile')}" class="flex items-center gap-3 rounded border border-light-outline bg-light-surface-variant p-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-blue/10 font-headline text-label-md font-semibold text-secondary-blue">DC</span>
        <span class="min-w-0"><span class="block truncate font-label text-label-md text-text-primary">Demo citizen</span><span class="block truncate text-body-sm text-text-secondary">UP Rural · Sample profile</span></span>
      </a>
    </div>
  </aside>`;
}

function mobileHeader(page) {
  const backHref = page === 'details' ? pageHref('results') : pageHref('dashboard');
  return `<header class="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-light-outline bg-light-surface px-4 py-3 md:hidden">
    <div class="flex min-w-0 items-center gap-2">
      ${page === 'dashboard'
        ? `<a href="/" aria-label="YojnaAgent home" class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary-navy text-amber-300">${logo}</a>`
        : `<a href="${backHref}" aria-label="${page === 'details' ? 'Back to schemes' : 'Back to dashboard'}" class="flex h-7 w-7 shrink-0 items-center justify-center text-text-secondary">${icon('arrow_back', 'text-title-lg')}</a>`}
      <span class="font-headline text-title-md text-primary-navy">${mobileTitles[page]}</span>
    </div>
    <span class="badge shrink-0">Demo</span>
  </header>`;
}

function mobileNav(page) {
  return `<nav class="mobile-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-light-outline bg-light-surface px-2 pt-1.5 md:hidden" aria-label="Mobile workspace">
    ${mobileItems.map(([key, symbol, label]) => `<a href="${pageHref(key)}" ${currentPage(key, page) ? 'aria-current="page"' : ''} class="workspace-link flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-sm font-label text-label-sm">
      ${icon(symbol, 'text-title-lg')}<span>${label}</span></a>`).join('')}
  </nav>`;
}

const previewNotice = `<p class="flex items-start gap-2 rounded border border-secondary-blue/20 bg-secondary-blue/5 px-3.5 py-2.5 text-body-sm text-text-secondary">
  ${icon('info', 'mt-0.5 text-secondary-blue text-title-sm')}
  <span><strong class="font-semibold text-primary-navy">Design preview.</strong> Sample content only. YojnaAgent is not a government portal and does not determine eligibility or submit applications.</span>
</p>`;

function linkToSource(url, label, classes = 'text-secondary-blue hover:underline') {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="${classes}">${label}</a>`;
}

function saveButton(id) {
  return `<button type="button" data-save="${id}" aria-pressed="false" class="secondary-action self-start whitespace-nowrap px-3 py-1.5 text-label-sm" hidden>
    <span class="save-on">${icon('bookmark_added', 'text-accent-gold text-title-sm')}</span>
    <span class="save-off">${icon('bookmark')}</span>
    <span data-save-label>Save Scheme</span>
  </button>`;
}

const factsGrid = (scheme) => `<dl class="grid gap-3 rounded border border-light-outline bg-light-surface-variant p-3.5 sm:grid-cols-3">
  ${scheme.facts.map(([title, value]) => `<div><dt class="font-label text-label-sm text-text-secondary">${escapeHtml(title)}</dt><dd class="text-body-md font-medium text-primary-navy">${escapeHtml(value)}</dd></div>`).join('')}
</dl>`;

function featuredCards() {
  return ['pm-kisan', 'pm-jay', 'mudra'].map((id) => {
    const s = getScheme(id);
    return `<article class="panel flex flex-col justify-between p-5 transition-colors hover:border-secondary-blue/40">
      <div class="space-y-2">
        <div class="flex flex-wrap justify-between gap-1 font-label text-label-sm text-text-secondary"><span>${escapeHtml(categories[s.category])}</span><span class="text-success">${escapeHtml(s.benefit)}</span></div>
        <h3 class="font-headline text-title-md text-primary-navy">${escapeHtml(s.short)}</h3>
        <p class="text-body-sm text-text-secondary">${escapeHtml(s.description)}</p>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-light-outline pt-4">
        <span class="font-mono text-label-sm text-text-secondary">${new URL(s.portal).hostname}</span>
        <a href="${schemeHref('details', id)}" class="font-label text-label-md text-secondary-blue hover:underline">Details →</a>
      </div>
    </article>`;
  }).join('');
}

function dashboardCards() {
  return schemes.slice(0, 2).map((s) => `<article class="panel p-5 transition-colors hover:border-secondary-blue/40">
    <div class="mb-2 flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2"><span class="badge text-success">${icon('info')} Example result</span><span class="text-label-sm text-text-secondary">${escapeHtml(s.department)}</span></div>
        <h3 class="font-headline text-title-lg text-primary-navy">${escapeHtml(s.short)}</h3>
      </div>${saveButton(s.id)}
    </div>
    <p class="mb-3 text-body-md text-text-primary">${escapeHtml(s.description)}</p>
    <div class="mb-4 flex items-start gap-2 rounded border border-light-outline bg-light-surface-variant p-3 text-body-sm text-text-secondary">${icon('psychology', 'mt-0.5 text-secondary-blue text-title-sm')}<span><strong class="text-text-primary">What to check:</strong> ${escapeHtml(s.questions[0])}</span></div>
    <div class="flex flex-col justify-between gap-3 border-t border-light-outline pt-3 sm:flex-row sm:items-center">
      <div class="text-body-sm text-text-secondary">Official source: ${linkToSource(s.source, new URL(s.source).hostname, 'font-mono text-secondary-blue hover:underline')}</div>
      <div class="flex flex-wrap gap-2"><a href="${schemeHref('documents', s.id)}" class="secondary-action px-3 py-1.5">Check Documents</a><a href="${schemeHref('details', s.id)}" class="primary-action px-3 py-1.5">View Details</a></div>
    </div>
  </article>`).join('');
}

function filterButtons() {
  return `<button type="button" class="filter-pill" data-filter="all" aria-pressed="true">All examples (${schemes.length})</button>` +
    Object.entries(categories).map(([key, label]) => `<button type="button" class="filter-pill" data-filter="${key}" aria-pressed="false">${escapeHtml(label)} (${schemes.filter((s) => s.category === key).length})</button>`).join('');
}

function resultCards() {
  return schemes.map((s) => `<article class="panel space-y-4 p-4 transition-colors hover:border-secondary-blue/40 sm:p-6" data-result="${s.id}" data-category="${s.category}">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2 font-label text-label-sm text-text-secondary">
          <span class="badge text-success">${icon('info')} Example · Not assessed</span><span>${escapeHtml(s.department)}</span><span class="badge">${escapeHtml(s.type)}</span>
        </div>
        <h2 class="font-headline text-headline-sm text-primary-navy">${escapeHtml(s.name)}</h2>
      </div>${saveButton(s.id)}
    </div>
    ${factsGrid(s)}
    <p class="text-body-md text-text-primary">${escapeHtml(s.description)}</p>
    <p class="flex items-start gap-2 rounded border border-secondary-blue/20 bg-secondary-blue/5 p-3 text-body-sm text-text-secondary">${icon('psychology', 'mt-0.5 text-secondary-blue text-title-sm')}<span><strong class="text-text-primary">What to check:</strong> ${escapeHtml(s.questions[0])}</span></p>
    <div class="flex flex-col justify-between gap-3 border-t border-light-outline pt-4 lg:flex-row lg:flex-wrap lg:items-center">
      <div class="flex items-center gap-2 text-body-sm text-text-secondary">${icon('description', 'text-secondary-blue text-title-sm')}<span>Official source: ${linkToSource(s.source, new URL(s.source).hostname, 'break-all font-mono text-secondary-blue hover:underline')}</span></div>
      <div class="flex flex-wrap gap-2"><a class="secondary-action" href="${schemeHref('documents', s.id)}">Document Checklist</a><a class="primary-action" href="${schemeHref('details', s.id)}">View Details</a></div>
    </div>
  </article>`).join('');
}

function schemeDetails() {
  return schemes.map((s, index) => `<section class="space-y-6" data-detail="${s.id}" ${index ? 'hidden' : ''}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <a href="${pageHref('results')}" class="inline-flex items-center gap-1 font-label text-label-md text-secondary-blue hover:underline">${icon('arrow_back')} Back to Recommended Schemes</a>
      <div class="flex gap-2"><button type="button" data-share="${s.id}" class="secondary-action px-3 py-1.5 text-label-sm" hidden>${icon('share')} Share</button>${saveButton(s.id)}</div>
    </div>
    <p data-share-status class="text-body-sm text-text-secondary" role="status" hidden></p>
    <div class="panel space-y-4 p-4 sm:p-6">
      <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2 text-label-sm text-text-secondary"><span class="badge text-success">${icon('info')} Example · Not assessed</span><span>${escapeHtml(s.department)}</span><span class="badge">${escapeHtml(s.type)}</span></div>
          <h1 class="font-headline text-headline-md text-primary-navy sm:text-headline-lg">${escapeHtml(s.name)}</h1>
          <p class="max-w-3xl text-body-md text-text-secondary">${escapeHtml(s.description)}</p>
        </div>
        <div class="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col">
          ${linkToSource(s.portal, `Open Official Portal ${icon('open_in_new')}`, 'primary-action')}
          <a href="${schemeHref('documents', s.id)}" class="secondary-action">Prepare Document Checklist</a>
        </div>
      </div>
      <dl class="grid grid-cols-2 gap-4 border-t border-light-outline pt-4 text-body-sm text-text-secondary">
        <div><dt class="font-label text-label-sm">Published source</dt><dd>${linkToSource(s.source, new URL(s.source).hostname, 'break-all font-mono text-secondary-blue hover:underline')}</dd></div>
        <div><dt class="font-label text-label-sm">Application status</dt><dd class="text-text-primary">Check on official portal</dd></div>
      </dl>
    </div>
    <div class="flex items-start gap-3 rounded-lg border border-secondary-blue/20 bg-secondary-blue/5 p-5">
      ${icon('psychology', 'mt-1 text-secondary-blue text-title-lg')}
      <div><h2 class="font-headline text-title-md text-primary-navy">Why eligibility is not shown</h2><p class="text-body-md text-text-secondary">This preview has not checked your profile or current scheme rules. The administering authority determines eligibility.</p></div>
    </div>
    <section class="panel space-y-4 p-4 sm:p-6"><h2 class="font-headline text-title-lg text-primary-navy">Key Benefits &amp; Scheme Overview</h2>${factsGrid(s)}</section>
    <section class="panel space-y-4 p-4 sm:p-6">
      <h2 class="font-headline text-title-lg text-primary-navy">Eligibility Criteria: What to Confirm</h2>
      <ul class="space-y-3">${s.questions.map((question) => `<li class="flex items-start gap-3 rounded border border-light-outline bg-light-surface-variant p-3 text-body-md text-text-primary">${icon('help', 'mt-0.5 text-secondary-blue text-title-md')}<span>${escapeHtml(question)}</span></li>`).join('')}</ul>
    </section>
    <section class="panel space-y-4 p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-headline text-title-lg text-primary-navy">Document Preparation</h2><a href="${schemeHref('documents', s.id)}" class="font-label text-label-md text-secondary-blue hover:underline">Open Document Checker →</a></div>
      <div class="grid gap-3 sm:grid-cols-2">${s.checklist.slice(0, 4).map(([label, hint]) => `<div class="rounded border border-light-outline bg-light-surface-variant p-3.5"><div class="font-label text-label-md text-text-primary">${escapeHtml(label)}</div><p class="text-body-sm text-text-secondary">${escapeHtml(hint)}</p></div>`).join('')}</div>
      <p class="text-body-sm text-text-secondary">These are preparation prompts, not a verified list of mandatory documents.</p>
    </section>
    <section class="panel space-y-4 p-4 sm:p-6">
      <h2 class="font-headline text-title-lg text-primary-navy">Application Guidance</h2>
      <ol class="ml-3 space-y-4 border-l border-light-outline pl-6">
        ${[['Visit the official portal', 'Check the current instructions and see whether applications are open.'], ['Confirm the requirements', 'Review exceptions, accepted documents, dates and any fees with the administering authority.'], ['Apply yourself if eligible', 'Use the official process or lender. YojnaAgent does not submit applications or collect documents.']].map(([title, description], index) => `<li class="relative"><span aria-hidden="true" class="absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-navy font-label text-label-sm text-light-on-primary">${index + 1}</span><h3 class="font-label text-label-md font-semibold text-primary-navy">${title}</h3><p class="text-body-md text-text-secondary">${description}</p></li>`).join('')}
      </ol>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-light-outline pt-4"><a href="${pageHref('tracker')}" class="font-label text-label-md text-secondary-blue hover:underline">See example application timeline →</a>${linkToSource(s.portal, `Visit the official portal ${icon('open_in_new')}`, 'primary-action')}</div>
    </section>
  </section>`).join('');
}

function checklistViews() {
  return schemes.map((s, index) => {
    const total = s.checklist.length;
    const initial = index === 0 ? 4 : 0;
    return `<section class="space-y-6" data-checklist="${s.id}" ${index ? 'hidden' : ''}>
      <div class="panel space-y-4 p-4 sm:p-6">
        <div class="flex flex-wrap items-baseline justify-between gap-3"><div><h2 class="font-label text-label-md text-text-secondary">Overall Document Readiness</h2><p class="mt-0.5 flex flex-wrap items-baseline gap-2"><span data-percent class="font-headline text-headline-lg tabular-nums text-primary-navy">${initial / total * 100}%</span><span data-document-count class="text-body-md text-success">${initial} of ${total} example items marked</span></p></div><span class="badge">Self-check only</span></div>
        <progress data-progress class="progress-track" aria-label="Example checklist progress" max="${total}" value="${initial}">${initial} of ${total}</progress>
        <p class="text-body-sm text-text-secondary">This checklist shows practice items, not official verification or a guarantee of readiness.</p>
      </div>
      <div class="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-accent-gold/25 bg-accent-gold/10 p-4 sm:p-5">
        <div class="flex items-start gap-3"><span class="text-accent-gold">${icon('warning', 'text-title-lg')}</span><div><h2 class="font-headline text-title-md text-primary-navy">Confirm the actual document list</h2><p class="text-body-sm text-text-secondary">Requirements can change. Check the official scheme guidance before preparing an application.</p></div></div>
        ${linkToSource(s.source, `Read the official source ${icon('open_in_new')}`, 'secondary-action')}
      </div>
      <div class="panel space-y-4 p-4 sm:p-6">
        <h2 class="font-headline text-title-lg text-primary-navy">Example Checklist Items</h2>
        <ul class="divide-y divide-light-outline">
          ${s.checklist.map(([label, hint], position) => `<li class="flex flex-wrap items-start justify-between gap-3 py-4">
            <div class="min-w-0"><span class="block font-headline text-title-md text-primary-navy">${escapeHtml(label)}</span><p class="text-body-sm text-text-secondary">${escapeHtml(hint)}</p></div>
            <label class="inline-flex cursor-pointer items-center gap-2 rounded border border-light-outline bg-light-surface-variant px-2.5 py-1 font-label text-label-sm text-text-primary"><input data-doc-toggle type="checkbox" disabled ${position < initial ? 'checked' : ''} class="h-4 w-4 rounded-sm border-light-outline text-success focus:ring-secondary-blue" aria-label="Mark ${escapeHtml(label)} ready"><span data-doc-status>${position < initial ? 'Marked' : 'Not marked'}</span></label>
          </li>`).join('')}
        </ul>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-light-outline pt-4"><a href="${schemeHref('details', s.id)}" class="font-label text-label-md text-secondary-blue hover:underline">← Back to scheme details</a>${linkToSource(s.portal, `Open Official Portal ${icon('open_in_new')}`, 'primary-action')}</div>
      </div>
    </section>`;
  }).join('');
}

export function renderPartials(html) {
  const page = html.match(/<body\b[^>]*\bdata-page="([a-z]+)"/)?.[1];
  if (!page) return html;

  const slots = {
    'brand-icon': () => logo,
    'preview-notice': () => previewNotice,
    sidebar: () => sidebar(page),
    'mobile-header': () => mobileHeader(page),
    'mobile-nav': () => mobileNav(page),
    featured: featuredCards,
    'dashboard-cards': dashboardCards,
    'scheme-count': () => schemes.length,
    filters: filterButtons,
    results: resultCards,
    details: schemeDetails,
    'scheme-options': () => schemes.map((s) => `<option value="${s.id}">${escapeHtml(s.short)}</option>`).join(''),
    checklists: checklistViews,
  };
  return html.replace(/<!-- ui:([a-z-]+) -->/g, (marker, name) => {
    if (!Object.hasOwn(slots, name)) throw new Error(`Unknown UI partial ${name} on ${page}`);
    return slots[name]();
  });
}
