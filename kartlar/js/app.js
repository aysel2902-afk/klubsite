/* Pulsuz mərhələlərin sayı: A1 — ilk 2, digər səviyyələr — ilk 1; qalanları ödənişlə (giriş kodu ilə) açılır */
const FREE_STAGE_COUNT = { a1: 2, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 };
const LEVEL_PRICE = { a1: 10, a2: 15, b1: 20, b2: 25, c1: 30, c2: 35 };      // indiki (endirimli) qiymət, AZN
const LEVEL_OLD_PRICE = { a1: 18, a2: 23, b1: 28, b2: 33, c1: 38, c2: 43 };  // köhnə qiymət (üstündən xətt çəkilir); endirim yoxdursa — null
/* Aksiya zolağı: on:false — gizlədir; until — bu tarixdən sonra avtomatik gizlənir */
const PROMO = { on: true, label: 'BLACK FRIDAY', text: 'Bütün səviyyələrin söz kartlarına 45%-ə qədər endirim', until: '2026-12-03' };
function discountPct(levelId){
  const o = LEVEL_OLD_PRICE[levelId], n = LEVEL_PRICE[levelId];
  return (o && o > n) ? Math.round((1 - n / o) * 100) : 0;
}
function priceHtml(levelId){
  const o = LEVEL_OLD_PRICE[levelId], n = LEVEL_PRICE[levelId], d = discountPct(levelId);
  return (d ? `<span class="price-old">${o} AZN</span> ` : '') + `<span class="price-new">${n} AZN</span>` + (d ? ` <span class="price-badge">−${d}%</span>` : '');
}
function promoActive(){
  if (!PROMO.on) return false;
  if (PROMO.until && new Date() > new Date(PROMO.until + 'T23:59:59')) return false;
  return true;
}
function promoBannerHtml(){
  if (!promoActive()) return '';
  const d = new Date(PROMO.until);
  const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avqust','sentyabr','oktyabr','noyabr','dekabr'];
  return `
    <div class="bf-bar">
      <div class="bf-left">
        <span class="bf-label">${PROMO.label}</span>
        <span class="bf-text">${PROMO.text}</span>
        <span class="bf-until">${d.getDate()} ${months[d.getMonth()]} tarixinədək</span>
      </div>
      <div class="bf-timer" data-until="${PROMO.until}T23:59:59">
        <div><b data-u="d">0</b><small>gün</small></div>
        <div><b data-u="h">00</b><small>saat</small></div>
        <div><b data-u="m">00</b><small>dəq</small></div>
        <div><b data-u="s">00</b><small>san</small></div>
      </div>
    </div>`;
}
/* Digər səhifələrin yuxarısına aksiya zolağını əlavə edir (səhifənin əsas blokundan əvvəl) */
function injectPromoTop(target){
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || !promoActive()) return;
  const prev = el.previousElementSibling;
  if (prev && prev.classList.contains('bf-wrap')) return;
  const w = document.createElement('div');
  w.className = 'wrap bf-wrap';
  const html = promoBannerHtml().trim();
  w.innerHTML = html.replace('<div class="bf-bar">', '<a class="bf-bar bf-link" href="index.html" title="Söz kartlarının qiymətləri">').replace(/<\/div>$/, '</a>');
  el.parentNode.insertBefore(w, el);
  startPromoTimers();
}
function startPromoTimers(){
  const tick = () => document.querySelectorAll('.bf-timer').forEach(t => {
    let ms = new Date(t.dataset.until) - new Date();
    if (ms < 0){ const bar = t.closest('.bf-bar'); if (bar) bar.remove(); return; }
    const d = Math.floor(ms / 864e5); ms -= d * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4); ms -= m * 6e4;
    const sec = Math.floor(ms / 1e3);
    const set = (k, v) => { const el = t.querySelector('[data-u="' + k + '"]'); if (el) el.textContent = v; };
    set('d', d); set('h', String(h).padStart(2, '0')); set('m', String(m).padStart(2, '0')); set('s', String(sec).padStart(2, '0'));
  });
  tick();
  if (!window.__bfTimer) window.__bfTimer = setInterval(tick, 1000);
}
const ACCESS_HASH = {"a1": "3caec86386c8a897", "a2": "b479165640121d70", "b1": "856bfb38386ae790", "b2": "7e3828ba2bf5fd5e", "c1": "4793ec05e503d6e9", "c2": "be9a8561dcf9b9a5"};
const UNLOCK_KEY = 'ak_unlock_v1';
function accessHash(code){
  const s = 'alman-klubu|' + String(code || '').trim().toUpperCase();
  const bytes = new TextEncoder().encode(s);
  let x = 5381, y = 2166136261;
  for (const b of bytes){ x = (Math.imul(x, 33) ^ b) >>> 0; }
  for (const b of bytes){ y = Math.imul((y ^ b) >>> 0, 16777619) >>> 0; }
  return x.toString(16).padStart(8, '0') + y.toString(16).padStart(8, '0');
}
function getUnlocked(){ try { return JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}'); } catch(e){ return {}; } }
function isLevelUnlocked(levelId){ return !!getUnlocked()[levelId]; }
/* Kodu yoxlayır; düzgündürsə səviyyəni bu cihazda açır və səviyyə id-sini qaytarır */
function tryUnlockCode(code){
  const h = accessHash(code);
  const lv = Object.keys(ACCESS_HASH).find(k => ACCESS_HASH[k] === h);
  if (!lv) return null;
  const u = getUnlocked(); u[lv] = new Date().toISOString();
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(u)); } catch(e){}
  return lv;
}
function buyLevelLink(levelId){
  const c = (typeof getCourse === 'function') ? getCourse(levelId) : null;
  const txt = 'Hallo! Söz kartlarının ' + (c ? c.code : levelId.toUpperCase()) + ' səviyyəsini almaq istəyirəm (' + LEVEL_PRICE[levelId] + ' AZN). Giriş kodunu necə ala bilərəm?';
  return 'https://api.whatsapp.com/send?phone=994709700666&text=' + encodeURIComponent(txt);
}
function unlockBoxHtml(levelId){
  const c = (typeof getCourse === 'function') ? getCourse(levelId) : null;
  const code = c ? c.code : levelId.toUpperCase();
  return `
    <div class="unlock-box">
      <div class="unlock-title">🔒 ${code} səviyyəsinin qalan mərhələləri ödənişlə açılır — ${priceHtml(levelId)}</div>
      <div class="unlock-text">Ödənişdən sonra Sizə giriş kodu göndərəcəyik. Kodu aşağıya yazın — bütün ${code} mərhələləri bu cihazda açılacaq.</div>
      <div class="unlock-row">
        <a class="btn btn-primary btn-sm" href="${buyLevelLink(levelId)}" target="_blank" rel="noopener">WhatsApp-da almaq</a>
        <input class="unlock-input" type="text" placeholder="Giriş kodu (məs. AK-${code}-XXXXXX)" autocomplete="off">
        <button class="btn btn-outline btn-sm unlock-btn">Kodu təsdiqlə</button>
      </div>
      <div class="unlock-msg"></div>
    </div>`;
}
function bindUnlockBox(root, onOk){
  const btn = root.querySelector('.unlock-btn'); const inp = root.querySelector('.unlock-input'); const msg = root.querySelector('.unlock-msg');
  if (!btn) return;
  const go = () => {
    const lv = tryUnlockCode(inp.value);
    if (lv){ msg.textContent = '✅ Kod qəbul olundu — ' + lv.toUpperCase() + ' səviyyəsi açıldı.'; msg.style.color = '#7fd48a'; setTimeout(() => onOk && onOk(lv), 700); }
    else { msg.textContent = 'Kod yanlışdır. Zəhmət olmasa yoxlayın və ya bizə yazın.'; msg.style.color = '#ff9b7a'; }
  };
  btn.addEventListener('click', go);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

/* Yalnız məzmunu olan mərhələlər göstərilir (boş mərhələlər siyahıda görünmür) */
if (typeof COURSES !== 'undefined') COURSES.forEach(c => {
  c.stages = c.stages.filter(st => st.words && st.words.length > 0);
  const freeCount = FREE_STAGE_COUNT[c.id] || 1;
  c.stages.forEach((st, i) => { st.free = i < freeCount; });
  const n = c.stages.reduce((a, st) => a + st.words.length, 0);
  c.wordRange = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' söz/ifadə · ' + c.stages.length + ' mərhələ';
});

/* Alman Klubu — söz kartları: ümumi köməkçi funksiyalar (almanklubu.de/kartlar) */

const PROGRESS_KEY = 'ak_progress_v1';

function loadProgress(){
  try{
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}

function saveProgress(data){
  try{
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  }catch(e){ /* localStorage yoxdursa səssizcə keçirik */ }
}

function getCourseProgress(courseId){
  const all = loadProgress();
  return all[courseId] || { completed: {}, scores: {}, timestamps: {} };
}

function markLessonComplete(courseId, lessonId, percent){
  const all = loadProgress();
  if (!all[courseId]) all[courseId] = { completed: {}, scores: {}, timestamps: {} };
  all[courseId].completed[lessonId] = true;
  all[courseId].scores[lessonId] = percent;
  all[courseId].timestamps[lessonId] = Date.now();
  saveProgress(all);
}

function isLessonUnlocked(courseId, lesson, index, lessons){
  if (index === 0) return true;
  const prog = getCourseProgress(courseId);
  const prevLesson = lessons[index - 1];
  return !!prog.completed[prevLesson.id];
}

/* Bu versiyada abunə yoxdur: pulsuz mərhələlər açıqdır, qalanları hazırlanır */
function hasActiveSubscription(levelId){ return isLevelUnlocked(levelId); }

/* ---- Alman tələffüzü (Web Speech API) ---- */
function speakGerman(text, btn){
  if (!('speechSynthesis' in window)){
    if (btn){ btn.textContent = '✕'; setTimeout(() => btn.textContent = '🔊', 1200); }
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'de-DE';
  utter.rate = 0.88;
  utter.pitch = 0.88;
  utter.volume = 1;

  const maleNameHints = ['stefan','markus','yannick','conrad','daniel','viktor','christoph','male','herr','mann','ralf','klaus','hans'];
  const voices = window.speechSynthesis.getVoices();
  const deVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
  const preferred = deVoices.find(v => maleNameHints.some(h => v.name.toLowerCase().includes(h)));
  const chosen = preferred || deVoices[0];
  if (chosen) utter.voice = chosen;

  if (btn){
    btn.classList.add('speaking');
    utter.onend = () => btn.classList.remove('speaking');
    utter.onerror = () => btn.classList.remove('speaking');
  }
  window.speechSynthesis.speak(utter);
}

/* ---- naviqasiyada aktiv linki işarələmək ---- */
function highlightActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  const current = (path === 'course.html' || path === 'lesson.html') ? 'index.html' : path;
  document.querySelectorAll('.topnav a').forEach(a => {
    const href = a.getAttribute('href').split('?')[0];
    if (href === current) a.classList.add('active');
  });
}

/* ---- tapşırıq səsləri (Web Audio API, xarici fayl tələb olunmur) ---- */
let AUDIO_CTX = null;
function getAudioCtx(){
  if (!AUDIO_CTX){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    AUDIO_CTX = new AC();
  }
  if (AUDIO_CTX.state === 'suspended') AUDIO_CTX.resume();
  return AUDIO_CTX;
}
function playTone(freqs, durations, type){
  const ctx = getAudioCtx();
  if (!ctx) return;
  let t = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durations[i]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durations[i] + 0.02);
    t += durations[i];
  });
}
function playClickSound(){ playTone([440], [0.06], 'sine'); }
function playCorrectSound(){ playTone([523.25, 659.25, 783.99], [0.09, 0.09, 0.14], 'sine'); }
function playIncorrectSound(){ playTone([220, 174.6], [0.12, 0.18], 'sawtooth'); }

/* ---- WhatsApp və Instagram düymələri ---- */
function injectFloatingWidgets(){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <a class="wa-float" href="${WHATSAPP_LINK}" target="_blank" rel="noopener" title="WhatsApp ilə əlaqə">💬</a>
    <a class="ig-float" href="${INSTAGRAM_LINK}" target="_blank" rel="noopener" title="Instagram">📷</a>
  `;
  document.body.appendChild(wrap);
}

function enrichFooter(){
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const contact = document.createElement('div');
  contact.style.marginTop = '6px';
  contact.innerHTML = '<a href="../index.html#sinaq" style="color:var(--orange)">Ödənişsiz sınaq dərsinə yazıl</a> · Əlaqə: <a href="' + WHATSAPP_LINK + '" target="_blank" rel="noopener" style="color:var(--orange)">WhatsApp +994 70 970 06 66</a>';
  footer.appendChild(contact);
}

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  injectFloatingWidgets();
  enrichFooter();
});
