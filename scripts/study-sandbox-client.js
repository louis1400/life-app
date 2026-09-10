// Test-only adapter, embedded by study-sandbox.mjs. Never shipped by the app build.
(() => {
  const key = 'life-study-sandbox-v1';
  let records;
  const seed = scenario => scenario === 'blank' ? [] : ['enlightenment', 'moral'].map(course => ({
    owner_id: 'study-sandbox', entry_id: 'plan:' + course,
    data: JSON.stringify({week: 2, chatUrl: ''}), version: 1, updated_at: new Date().toISOString()
  }));
  let persistence = true;
  try { records = JSON.parse(localStorage.getItem(key) || 'null') || seed('catch-up'); }
  catch { records = seed('catch-up'); persistence = false; }
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(records)); }
    catch { persistence = false; }
    document.getElementById('sandbox-storage').textContent = persistence
      ? 'Test progress stays in this browser only.' : 'Browser storage unavailable. Test progress lasts until this page closes.';
  };
  // Minimal D1 test double. Validation, origin checks and conflict responses use
  // the real production courseworkApi, embedded immediately before this script.
  const env = {DB: {prepare(sql) {return {bind(...args) {return {
    async all() {
      if (!sql.startsWith('SELECT entry_id')) throw Error('Unsupported sandbox query');
      return {results: records.filter(r => r.owner_id === args[0]).sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,1001)};
    },
    async run() {
      let changes = 0;
      if (sql.startsWith('INSERT INTO coursework_entries')) {
        const [owner_id, entry_id, data, updated_at] = args;
        if (!records.some(r => r.owner_id === owner_id && r.entry_id === entry_id)) {
          records.push({owner_id, entry_id, data, updated_at, version: 1}); changes = 1;
        }
      } else if (sql.startsWith('UPDATE coursework_entries SET')) {
        const [data, updated_at, owner, id, version] = args;
        const record = records.find(r => r.owner_id === owner && r.entry_id === id && r.version === version);
        if (record) {Object.assign(record, {data, updated_at, version: version + 1}); changes = 1;}
      } else throw Error('Unsupported sandbox query');
      persist(); return {meta: {changes}};
    }
  };}};}}};
  const ids = new Set(window.STUDY_CURRICULUM.courses.flatMap(c => c.weeks.flatMap(w => w.readings.map(r => r.id))));
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, 'https://study-sandbox.invalid');
    if (url.origin !== 'https://study-sandbox.invalid') return Response.json({error: 'External services are disabled in the test sandbox.'}, {status: 501});
    if (url.pathname === '/api/readings') return Response.json({readings: []});
    if (!url.pathname.startsWith('/api/coursework')) return Response.json({error: 'PDF uploads and external services are not part of this sandbox.'}, {status: 501});
    const headers = new Headers(init.headers);
    headers.set('oai-authenticated-user-id', 'study-sandbox');
    headers.set('origin', url.origin);
    return courseworkApi(new Request(url, {...init, headers}), env, ids);
  };
  const dialog = document.getElementById('sandbox-external');
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || (!link.href.startsWith('https:') && !link.getAttribute('href').startsWith('#sandbox-resource'))) return;
    event.preventDefault();
    document.getElementById('sandbox-external-name').textContent = link.textContent;
    dialog.showModal();
  });
  for (const button of document.querySelectorAll('[data-sandbox-reset]')) button.addEventListener('click', async () => {
    if (!confirm('Reset only this sandbox’s test notes and progress?')) return;
    records = seed(button.dataset.sandboxReset); persist();
    try {
      const scope = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('study-sandbox'))), b => b.toString(16).padStart(2, '0')).join('');
      for (const k of Object.keys(localStorage)) if (k.startsWith('life:study-drafts:' + scope + ':')) localStorage.removeItem(k);
    } catch {}
    // A reload resets in-memory drafts as well as the persisted test records.
    location.hash = 'coursework'; location.reload();
  });
  persist();
})();
