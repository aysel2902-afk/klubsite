/* Alman Klubu — dictionary.html (Lüğət) səhifəsinin məntiqi */

let DICT_STATE = { search: '', level: 'all', kind: 'words', shown: 100 };
let DICT_WORDS = [];
const DICT_PAGE = 100;

function sortKey(de){
  return normalizeDict(String(de).replace(/^(der|die|das|sich)\s+/i, ''));
}

function buildWordBank(){
  const words = [];
  COURSES.forEach(course => {
    course.stages.forEach(stage => {
      (stage.words || []).forEach(w => {
        words.push({
          de: w.de, az: w.az,
          sub: w.sub || (w.type === 'sentence' ? 'cümlə' : ''),
          isSentence: w.type === 'sentence',
          level: course.code, levelId: course.id, stageId: stage.id,
          key: sortKey(w.de),
        });
      });
    });
  });
  words.sort((a, b) => a.key.localeCompare(b.key, 'de'));
  return words;
}

function normalizeDict(s){
  return (s || '').toLowerCase().trim()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g');
}

function escapeHtml(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getFiltered(){
  const q = normalizeDict(DICT_STATE.search);
  return DICT_WORDS.filter(w => {
    if (DICT_STATE.level !== 'all' && w.levelId !== DICT_STATE.level) return false;
    if (DICT_STATE.kind === 'words' && w.isSentence) return false;
    if (DICT_STATE.kind === 'sentences' && !w.isSentence) return false;
    if (!q) return true;
    return normalizeDict(w.de).includes(q) || normalizeDict(w.az).includes(q);
  });
}

function renderDict(){
  const list = document.getElementById('dict-list');
  const filtered = getFiltered();
  document.getElementById('dict-count').textContent = filtered.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (DICT_STATE.kind === 'sentences' ? ' cümlə' : ' söz/ifadə');

  if (filtered.length === 0){
    list.innerHTML = `<div class="dict-empty">Heç nə tapılmadı. Axtarışı dəyişin.</div>`;
    document.getElementById('dict-more').style.display = 'none';
    return;
  }

  const slice = filtered.slice(0, DICT_STATE.shown);
  list.innerHTML = slice.map((w, i) => `
    <div class="dict-row">
      <div class="dict-de"><button class="dict-say" data-i="${i}" title="Tələffüz">🔊</button> ${escapeHtml(w.de)}</div>
      <div class="dict-az">${escapeHtml(w.az)}</div>
      <div class="dict-ex">${escapeHtml(w.sub || '')}</div>
      <a class="dict-level-tag" href="lesson.html?level=${w.levelId}&stage=${w.stageId}" title="Bu sözün olduğu mərhələ">${w.level} · M${w.stageId}</a>
    </div>
  `).join('');
  list.querySelectorAll('.dict-say').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = slice[+btn.dataset.i];
      if (typeof speakGerman === 'function') speakGerman(w.de, btn);
    });
  });

  const more = document.getElementById('dict-more');
  const rest = filtered.length - slice.length;
  if (rest > 0){
    more.style.display = '';
    more.textContent = `Daha çox göstər (${rest.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} qalıb)`;
  } else {
    more.style.display = 'none';
  }
}

function makeChips(wrapId, items, current, onPick){
  const wrap = document.getElementById(wrapId);
  wrap.innerHTML = items.map(([v, label]) =>
    `<button class="filter-chip ${v === current ? 'active' : ''}" data-v="${v}">${label}</button>`).join('');
  wrap.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onPick(chip.dataset.v);
    });
  });
}

function initDictionaryPage(){
  injectPromoTop('.wrap:not(.bf-wrap)');
  DICT_WORDS = buildWordBank();

  const params = new URLSearchParams(location.search);
  if (params.get('level')) DICT_STATE.level = params.get('level');

  makeChips('level-chips', [['all', 'Hamısı'], ...COURSES.map(c => [c.id, c.code])], DICT_STATE.level, v => {
    DICT_STATE.level = v; DICT_STATE.shown = DICT_PAGE; renderDict();
  });
  makeChips('kind-chips', [['words', 'Sözlər və ifadələr'], ['sentences', 'Cümlələr'], ['all', 'Hamısı']], DICT_STATE.kind, v => {
    DICT_STATE.kind = v; DICT_STATE.shown = DICT_PAGE; renderDict();
  });

  const search = document.getElementById('dict-search');
  let t = null;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { DICT_STATE.search = search.value; DICT_STATE.shown = DICT_PAGE; renderDict(); }, 150);
  });

  document.getElementById('dict-more').addEventListener('click', () => {
    DICT_STATE.shown += DICT_PAGE * 2; renderDict();
  });

  renderDict();
}

document.addEventListener('DOMContentLoaded', initDictionaryPage);
