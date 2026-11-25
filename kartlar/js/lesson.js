/* Alman Klubu — lesson.html səhifəsinin məntiqi: mərhələ = 6 hissə x 10 kart + tapşırıqlar
   Hər hissədə: kartlar -> tapşırıqlar. Səhv edilən sözlər avtomatik növbəti hissədə təkrarlanır. */

const PART_SIZE = 20;

let LESSON_STATE = {
  courseId: null,
  course: null,
  stage: null,
  totalParts: 1,
  partIndex: 0,
  carryWords: [],
  currentSet: [],
  queue: [],
  qIndex: 0,
  correctCount: 0,
  totalCount: 0,
  wrongKeysThisRound: null,
};

function initLessonPage(){
  injectPromoTop('#lesson-root');
  const params = new URLSearchParams(location.search);
  const levelId = params.get('level') || 'a1';
  const stageId = params.get('stage') || params.get('lesson') || '1';
  const course = getCourse(levelId);
  const stage = getStage(levelId, stageId);

  document.getElementById('crumb-course').textContent = course ? course.title : 'Kurs';
  if (course){
    document.getElementById('crumb-course').href = 'course.html?level=' + levelId;
    document.getElementById('crumb-back').href = 'course.html?level=' + levelId;
  }

  if (!course || !stage){
    document.getElementById('lesson-root').innerHTML = `
      <div class="notice">Bu mərhələ tapılmadı. <a href="course.html?level=${levelId}" style="color:var(--orange)">Mərhələ siyahısına qayıt</a></div>
    `;
    return;
  }

  const idx = course.stages.findIndex(s => s.id === stage.id);
  const sequenceOk = idx === 0 || !!getCourseProgress(levelId).completed[course.stages[idx - 1].id];

  if (!sequenceOk){
    document.getElementById('lesson-root').innerHTML = `
      <div class="notice">Bu mərhələyə keçmək üçün əvvəlki mərhələni tamamlamalısınız. <a href="course.html?level=${levelId}" style="color:var(--orange)">Mərhələ siyahısına qayıt</a></div>
    `;
    return;
  }

  if (!stage.free && !hasActiveSubscription(levelId)){
    document.getElementById('lesson-root').innerHTML = `
      <div style="margin-top:24px;"><a class="btn btn-outline btn-sm" href="course.html?level=${levelId}">← Mərhələlərə qayıt</a></div>
      ${unlockBoxHtml(levelId)}
    `;
    bindUnlockBox(document.getElementById('lesson-root'), () => location.reload());
    return;
  }

  if (!stage.words || stage.words.length === 0){
    document.getElementById('lesson-root').innerHTML = `
      <div class="notice">Bu mərhələnin məzmunu hazırlanır. <a href="course.html?level=${levelId}" style="color:var(--orange)">Mərhələ siyahısına qayıt</a></div>
    `;
    return;
  }

  LESSON_STATE.courseId = levelId;
  LESSON_STATE.course = course;
  LESSON_STATE.stage = stage;
  LESSON_STATE.totalParts = Math.ceil(stage.words.length / PART_SIZE);
  LESSON_STATE.partIndex = 0;
  LESSON_STATE.carryWords = [];
  LESSON_STATE.correctCount = 0;
  LESSON_STATE.totalCount = 0;

  document.title = 'Mərhələ ' + stage.id + ' — Alman Klubu';

  startPart();
}

function scrollToTop(){ window.scrollTo({ top: 0, behavior: 'smooth' }); }

function getPartBaseWords(stage, partIndex){
  return stage.words.slice(partIndex * PART_SIZE, partIndex * PART_SIZE + PART_SIZE);
}

function startPart(){
  const { course, stage, partIndex, totalParts, carryWords } = LESSON_STATE;
  const baseWords = getPartBaseWords(stage, partIndex);
  // təkrar sözlər əvvəldə, yeni sözlər sonra — dublikat olmasın deyə süzülür
  const baseKeys = new Set(baseWords.map(w => w.de));
  const uniqueCarry = carryWords.filter(w => !baseKeys.has(w.de));
  LESSON_STATE.currentSet = uniqueCarry.concat(baseWords);
  LESSON_STATE.exStarted = false;
  LESSON_STATE.carryShown = uniqueCarry;
  LESSON_STATE.baseShown = baseWords;

  document.getElementById('lesson-h1').textContent = course.code + ' · Mərhələ ' + stage.id;
  updatePartProgress();
  renderWordsPanel(uniqueCarry, baseWords);
  setPanel('words');
  scrollToTop();
}

function updatePartProgress(){
  const { partIndex, totalParts } = LESSON_STATE;
  const label = document.getElementById('part-label');
  const fill = document.getElementById('part-progress-fill');
  if (label) label.textContent = 'Hissə ' + (partIndex + 1) + ' / ' + totalParts;
  if (fill) fill.style.width = Math.round(((partIndex) / totalParts) * 100) + '%';
}

function setPanel(which){
  document.getElementById('panel-words').style.display = which === 'words' ? 'block' : 'none';
  document.getElementById('panel-exercises').style.display = which === 'exercises' ? 'block' : 'none';
  document.getElementById('panel-result').style.display = which === 'result' ? 'block' : 'none';
}

function renderWordsPanel(carryWords, baseWords){
  const panel = document.getElementById('panel-words');
  panel.innerHTML = `
    <div class="card-block">
      <h2>Kartlar</h2>
      <p style="font-size:0.85rem;color:rgba(240,230,210,0.55);margin-top:-6px;">Kartın üzərinə klikləyin ki, tərcüməni görəsiniz, 🔊 düyməsi ilə tələffüzü dinləyin.</p>
      ${carryWords.length ? '<div class="notice" style="margin-top:14px;">Bu sözlərdə əvvəlki hissədə səhv etmisiniz — təkrar baxın: işarələnib 🔁</div>' : ''}
      <div class="words-grid" id="words-grid"></div>
    </div>
    <button class="btn btn-primary" id="to-exercises-btn">${LESSON_STATE.exStarted ? 'Tapşırıqlara qayıt' : 'Tapşırıqlara keç'}</button>
  `;
  const grid = document.getElementById('words-grid');
  carryWords.forEach(w => grid.appendChild(makeWordCard(w, true)));
  baseWords.forEach(w => grid.appendChild(makeWordCard(w, false)));

  document.getElementById('to-exercises-btn').addEventListener('click', () => {
    if (LESSON_STATE.exStarted){ setPanel('exercises'); scrollToTop(); renderCurrentExercise(); }
    else beginExercises();
  });
}

function makeWordCard(w, isRepeat){
  const isSentence = w.type === 'sentence';
  const card = document.createElement('div');
  card.className = 'flip-card' + (isSentence ? ' sentence-card' : '');
  card.innerHTML = `
    <div class="flip-card-inner">
      <div class="flip-face flip-front">
        <button class="pron-btn" aria-label="Tələffüzü dinlə">🔊</button>
        <div class="flip-word">${w.de}</div>
        <div class="flip-sub">${isRepeat ? '<span class="repeat-badge">🔁 təkrar</span> · ' : ''}${isSentence ? 'cümlə' : (w.sub || '')}</div>
      </div>
      <div class="flip-face flip-back">
        <div class="flip-word">${w.az}</div>
        <div class="flip-sub">geri çevirmək üçün klikləyin</div>
      </div>
    </div>
  `;
  card.addEventListener('click', () => card.classList.toggle('flipped'));
  const btn = card.querySelector('.pron-btn');
  btn.addEventListener('click', (e) => { e.stopPropagation(); speakGerman(w.de, btn); });
  return card;
}

/* ---- tapşırıq mühərriki ---- */

/* Hər hissə üçün qısa plan (Aysel 25.11): 2 tapşırıq → krossvord → 2 tapşırıq → krossvord.
   1) tərcüməni seç (5 söz)  2) cütləri uyğunlaşdır (5 cüt)  → krossvord
   3) artikli seç (4 isim)    4) tərcüməni seç (qalan söz/cümlələrdən 5) → krossvord */
function buildPartPlan(items){
  const words = shuffle(items.filter(w => w.type !== 'sentence'));
  const sentences = shuffle(items.filter(w => w.type === 'sentence'));
  const allAz = items.map(w => w.az);
  const mcqFor = w => {
    const options = shuffle([w.az, ...shuffle(allAz.filter(a => a !== w.az)).slice(0, 3)]);
    return { type: 'mcq', prompt: '"' + w.de + '" nə deməkdir?', options: options, correct: w.az, wordKeys: [w.de] };
  };
  const plan = [];
  const groupA = words.slice(0, 5);
  const groupB = words.slice(5, 10);
  groupA.forEach(w => plan.push(mcqFor(w)));
  if (groupB.length >= 2) plan.push({ type: 'match', pairs: groupB.map(w => ({ de: w.de, az: w.az })), wordKeys: groupB.map(w => w.de) });
  plan.push({ type: 'crossword', words: groupA.concat(groupB) });

  const nouns = shuffle(words.filter(w => getNounArticle(w))).slice(0, 4);
  nouns.forEach(w => plan.push({ type: 'article', stem: w.de.split(' ').slice(1).join(' ') || w.de, hintAz: w.az, options: ['der', 'die', 'das'], correct: getNounArticle(w), wordKeys: [w.de] }));
  const restWords = words.slice(10);
  const restPick = sentences.slice(0, 2).concat(restWords).slice(0, 5);
  restPick.forEach(w => plan.push(mcqFor(w)));
  const cw2 = restWords.length >= 4 ? restWords : restWords.concat(words.slice(0, 10)).slice(0, 10);
  plan.push({ type: 'crossword', words: cw2 });
  return plan;
}

function beginExercises(){
  LESSON_STATE.queue = buildPartPlan(LESSON_STATE.currentSet);
  LESSON_STATE.qIndex = 0;
  LESSON_STATE.exStarted = true;
  LESSON_STATE.wrongKeysThisRound = new Set();
  setPanel('exercises');
  scrollToTop();
  renderCurrentExercise();
}

function renderCurrentExercise(){
  const panel = document.getElementById('panel-exercises');
  const { queue, qIndex } = LESSON_STATE;

  if (qIndex >= queue.length){
    finishPart();
    return;
  }

  const ex = queue[qIndex];
  panel.innerHTML = `
    <div class="card-block">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="btn btn-outline btn-sm" id="back-to-cards-btn" type="button">← Kartlara qayıt</button>
        <div class="ex-progress" style="margin:0;">Hissə ${LESSON_STATE.partIndex + 1} / ${LESSON_STATE.totalParts} · Tapşırıq ${qIndex + 1} / ${queue.length}</div>
      </div>
      <div id="ex-body"></div>
    </div>
  `;
  const body = document.getElementById('ex-body');
  document.getElementById('back-to-cards-btn').addEventListener('click', () => {
    renderWordsPanel(LESSON_STATE.carryShown || [], LESSON_STATE.baseShown || LESSON_STATE.currentSet);
    setPanel('words');
    scrollToTop();
  });

  if (ex.type === 'mcq') renderMcq(ex, body);
  else if (ex.type === 'translate') renderTranslate(ex, body);
  else if (ex.type === 'fillgap') renderFillgap(ex, body);
  else if (ex.type === 'match') renderMatch(ex, body);
  else if (ex.type === 'sentence') renderSentence(ex, body);
  else if (ex.type === 'missingletters') renderMissingLetters(ex, body);
  else if (ex.type === 'article') renderArticle(ex, body);
  else if (ex.type === 'crossword') renderPlanCrossword(ex, body);
}

function renderPlanCrossword(ex, body){
  body.innerHTML = `
    <h2 style="margin:0 0 6px;">Krossvord</h2>
    <p style="font-size:0.85rem;color:rgba(240,230,210,0.55);margin:0 0 16px;">İndicə məşq etdiyiniz sözlərdən kiçik krossvord — xanaları doldurun.</p>
    <div id="cw-container"></div>
    <div class="ex-actions" style="margin-top:10px;"><button class="btn btn-outline btn-sm" id="cw-skip-btn">Krossvordu keç</button></div>
  `;
  let cwWords = ex.words || [];
  if (pickCrosswordWords(cwWords, 7).length < 5 && LESSON_STATE.stage){
    // hissədə uyğun söz azdırsa — bu mərhələdə indiyədək keçilmiş sözlərdən əlavə et
    const upto = (LESSON_STATE.partIndex + 1) * PART_SIZE;
    const seenWords = LESSON_STATE.stage.words.slice(0, upto).filter(w => w.type !== 'sentence');
    const pool = seenWords.length >= 5 ? seenWords : LESSON_STATE.stage.words.filter(w => w.type !== 'sentence');
    cwWords = cwWords.concat(shuffle(pool.filter(w => !cwWords.includes(w))).slice(0, 12));
  }
  let cw = generateCrossword(cwWords, 7);
  if ((!cw || cw.placements.length < 4) && LESSON_STATE.course){
    // hələ də az olarsa — eyni səviyyənin digər sözlərindən əlavə et
    const levelWords = [].concat(...LESSON_STATE.course.stages.map(st => st.words || [])).filter(w => w.type !== 'sentence');
    cw = generateCrossword(cwWords.concat(shuffle(levelWords).slice(0, 40)), 7);
  }
  let done = false;
  const next = () => { if (done) return; done = true; LESSON_STATE.qIndex++; renderCurrentExercise(); };
  renderCrossword(document.getElementById('cw-container'), cw, () => {
    document.getElementById('cw-skip-btn').textContent = 'Davam et';
    document.getElementById('cw-skip-btn').className = 'btn btn-primary';
  });
  document.getElementById('cw-skip-btn').addEventListener('click', next);
}

function recordAnswer(ex, correct){
  LESSON_STATE.totalCount++;
  if (correct){
    LESSON_STATE.correctCount++;
    playCorrectSound();
  } else {
    if (ex.wordKeys) ex.wordKeys.forEach(k => LESSON_STATE.wrongKeysThisRound.add(k));
    playIncorrectSound();
  }
}

function nextExerciseButton(container){
  const wrap = document.createElement('div');
  wrap.className = 'ex-actions';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = (LESSON_STATE.qIndex + 1 >= LESSON_STATE.queue.length) ? 'Hissəni bitir' : 'Növbəti tapşırıq';
  btn.addEventListener('click', () => {
    LESSON_STATE.qIndex++;
    renderCurrentExercise();
  });
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

function renderMcq(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">${ex.prompt}</div>
    <div class="ex-options" id="opts"></div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const opts = document.getElementById('opts');
  ex.options.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'ex-option';
    b.textContent = opt;
    b.addEventListener('click', () => {
      const correct = opt === ex.correct;
      recordAnswer(ex, correct);
      opts.querySelectorAll('.ex-option').forEach(o => {
        o.disabled = true;
        if (o.textContent === ex.correct) o.classList.add('correct');
        else if (o.textContent === opt) o.classList.add('incorrect');
      });
      const fb = document.getElementById('fb');
      fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
      fb.textContent = correct ? 'Doğrudur!' : 'Səhv. Doğru cavab: ' + ex.correct;
      nextExerciseButton(body);
    });
    opts.appendChild(b);
  });
}

function normalize(s){
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function renderTranslate(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">${ex.prompt}</div>
    <div class="ex-input-row">
      <input type="text" class="ex-input" id="ans-input" placeholder="Cavabınızı yazın...">
      <button class="btn btn-primary btn-sm" id="check-btn">Yoxla</button>
    </div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const input = document.getElementById('ans-input');
  const checkBtn = document.getElementById('check-btn');
  const check = () => {
    const val = normalize(input.value);
    const correct = ex.answer.map(normalize).includes(val);
    recordAnswer(ex, correct);
    input.classList.add(correct ? 'correct' : 'incorrect');
    input.disabled = true;
    checkBtn.disabled = true;
    const fb = document.getElementById('fb');
    fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
    fb.textContent = correct ? 'Doğrudur!' : 'Səhv. Doğru cavab: ' + ex.answer[0];
    nextExerciseButton(body);
  };
  checkBtn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
}

function renderFillgap(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">Boşluğu doldurun:<br>${ex.sentence}</div>
    <div class="ex-input-row">
      <input type="text" class="ex-input" id="ans-input" placeholder="Sözü yazın...">
      <button class="btn btn-primary btn-sm" id="check-btn">Yoxla</button>
    </div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const input = document.getElementById('ans-input');
  const checkBtn = document.getElementById('check-btn');
  const check = () => {
    const val = normalize(input.value);
    const correct = ex.answer.map(normalize).includes(val);
    recordAnswer(ex, correct);
    input.classList.add(correct ? 'correct' : 'incorrect');
    input.disabled = true;
    checkBtn.disabled = true;
    const fb = document.getElementById('fb');
    fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
    fb.textContent = correct ? 'Doğrudur!' : 'Səhv. Doğru cavab: ' + ex.answer[0];
    nextExerciseButton(body);
  };
  checkBtn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
}

function renderMatch(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">Uyğun cütləri seçin (alman sözünü, sonra tərcüməsini klikləyin)</div>
    <div class="match-cols">
      <div class="match-col" id="col-de"></div>
      <div class="match-col" id="col-az"></div>
    </div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const colDe = document.getElementById('col-de');
  const colAz = document.getElementById('col-az');
  const deItems = ex.pairs.map(p => p.de);
  const azItems = shuffle(ex.pairs.map(p => p.az));
  let matchedCount = 0;
  let wrongCount = 0;
  let selectedDe = null;

  deItems.forEach(de => {
    const el = document.createElement('button');
    el.className = 'match-item';
    el.textContent = de;
    el.dataset.de = de;
    el.addEventListener('click', () => {
      if (el.classList.contains('matched')) return;
      colDe.querySelectorAll('.match-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      selectedDe = de;
    });
    colDe.appendChild(el);
  });

  azItems.forEach(az => {
    const el = document.createElement('button');
    el.className = 'match-item';
    el.textContent = az;
    el.dataset.az = az;
    el.addEventListener('click', () => {
      if (el.classList.contains('matched') || !selectedDe) return;
      const pair = ex.pairs.find(p => p.de === selectedDe);
      const deEl = colDe.querySelector('[data-de="' + CSS.escape(selectedDe) + '"]');
      if (pair && pair.az === az){
        el.classList.add('matched');
        deEl.classList.add('matched');
        matchedCount++;
      } else {
        wrongCount++;
        el.classList.add('mismatch');
        setTimeout(() => el.classList.remove('mismatch'), 500);
      }
      selectedDe = null;
      colDe.querySelectorAll('.match-item').forEach(x => x.classList.remove('selected'));

      if (matchedCount === ex.pairs.length){
        const correct = wrongCount === 0;
        recordAnswer(ex, correct);
        const fb = document.getElementById('fb');
        fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
        fb.textContent = correct ? 'Doğrudur! Bütün cütlər düz uyğunlaşdırıldı.' : 'Tamamlandı, amma bəzi cütlərdə səhv oldu.';
        nextExerciseButton(body);
      }
    });
    colAz.appendChild(el);
  });
}

function renderSentence(ex, body){
  const tokens = shuffle(ex.tokens);
  const built = [];
  body.innerHTML = `
    <div class="ex-prompt">Sözləri düzgün ardıcıllıqla düzün</div>
    <div class="sentence-tokens" id="built"></div>
    <div class="sentence-bank" id="bank"></div>
    <div class="ex-input-row">
      <button class="btn btn-outline btn-sm" id="reset-btn" type="button">Sıfırla</button>
      <button class="btn btn-primary btn-sm" id="check-btn" type="button">Yoxla</button>
    </div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const builtWrap = document.getElementById('built');
  const bankWrap = document.getElementById('bank');

  function renderBank(){
    bankWrap.innerHTML = '';
    tokens.forEach((t, i) => {
      const chip = document.createElement('button');
      chip.className = 'token-chip';
      chip.textContent = t;
      chip.disabled = built.includes(i);
      chip.addEventListener('click', () => {
        built.push(i);
        renderBuilt();
        renderBank();
      });
      bankWrap.appendChild(chip);
    });
  }
  function renderBuilt(){
    builtWrap.innerHTML = '';
    built.forEach((i) => {
      const chip = document.createElement('button');
      chip.className = 'token-chip';
      chip.textContent = tokens[i];
      chip.addEventListener('click', () => {
        const pos = built.indexOf(i);
        built.splice(pos, 1);
        renderBuilt();
        renderBank();
      });
      builtWrap.appendChild(chip);
    });
  }
  renderBank();
  renderBuilt();

  document.getElementById('reset-btn').addEventListener('click', () => {
    built.length = 0;
    renderBuilt();
    renderBank();
  });

  document.getElementById('check-btn').addEventListener('click', () => {
    const sentence = built.map(i => tokens[i]).join(' ').replace(/\s+([.?!])/g, '$1');
    const correct = normalize(sentence) === normalize(ex.answer);
    recordAnswer(ex, correct);
    const fb = document.getElementById('fb');
    fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
    fb.textContent = correct ? 'Doğrudur!' : 'Səhv. Doğru cümlə: ' + ex.answer;
    document.getElementById('check-btn').disabled = true;
    document.getElementById('reset-btn').disabled = true;
    bankWrap.querySelectorAll('.token-chip').forEach(c => c.disabled = true);
    nextExerciseButton(body);
  });
}

function renderMissingLetters(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">Sözdə buraxılmış hərfləri tapın${ex.hintAz ? ' ("' + ex.hintAz + '")' : ''}:</div>
    <div class="missing-letters-word" id="ml-word"></div>
    <div class="ex-input-row">
      <button class="btn btn-primary btn-sm" id="check-btn">Yoxla</button>
    </div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const wordWrap = document.getElementById('ml-word');
  if (ex.article){
    const artSpan = document.createElement('span');
    artSpan.className = 'ml-article';
    artSpan.textContent = ex.article;
    wordWrap.appendChild(artSpan);
  }
  const inputs = [];
  ex.displayStem.split('').forEach((ch, i) => {
    if (ch === '_'){
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.className = 'ex-input ml-letter-input';
      inp.dataset.correct = ex.fullStem[i];
      inputs.push(inp);
      wordWrap.appendChild(inp);
    } else if (ch === ' '){
      const sp = document.createElement('span');
      sp.className = 'ml-space';
      wordWrap.appendChild(sp);
    } else {
      const span = document.createElement('span');
      span.className = 'ml-letter';
      span.textContent = ch;
      wordWrap.appendChild(span);
    }
  });
  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.slice(-1);
      if (inp.value && inputs[idx + 1]) inputs[idx + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && inputs[idx - 1]) inputs[idx - 1].focus();
    });
  });

  document.getElementById('check-btn').addEventListener('click', () => {
    let allCorrect = true;
    inputs.forEach(inp => {
      const ok = inp.value.toLowerCase() === inp.dataset.correct.toLowerCase();
      if (!ok){ allCorrect = false; inp.value = inp.dataset.correct; }
      inp.disabled = true;
      inp.classList.add(ok ? 'correct' : 'incorrect');
    });
    recordAnswer(ex, allCorrect);
    const fb = document.getElementById('fb');
    fb.className = 'ex-feedback ' + (allCorrect ? 'ok' : 'no');
    fb.textContent = allCorrect ? 'Doğrudur!' : 'Düzgün söz: ' + (ex.article ? ex.article + ' ' : '') + ex.fullStem;
    document.getElementById('check-btn').disabled = true;
    nextExerciseButton(body);
  });
}

function renderArticle(ex, body){
  body.innerHTML = `
    <div class="ex-prompt">Düzgün artikli seçin: <b>${ex.stem}</b>${ex.hintAz ? ' ("' + ex.hintAz + '")' : ''}</div>
    <div class="ex-options" id="opts"></div>
    <div class="ex-feedback" id="fb"></div>
  `;
  const opts = document.getElementById('opts');
  ex.options.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'ex-option';
    b.textContent = opt;
    b.addEventListener('click', () => {
      const correct = opt === ex.correct;
      recordAnswer(ex, correct);
      opts.querySelectorAll('.ex-option').forEach(o => {
        o.disabled = true;
        if (o.textContent === ex.correct) o.classList.add('correct');
        else if (o.textContent === opt) o.classList.add('incorrect');
      });
      const fb = document.getElementById('fb');
      fb.className = 'ex-feedback ' + (correct ? 'ok' : 'no');
      fb.textContent = correct ? 'Doğrudur!' : 'Səhv. Doğru artikl: ' + ex.correct;
      nextExerciseButton(body);
    });
    opts.appendChild(b);
  });
}

/* ---- hissə bitəndə: səhv sözləri növbəti hissəyə köçür, ya nəticəni göstər ---- */

function finishPart(){
  const { currentSet, wrongKeysThisRound, partIndex, totalParts } = LESSON_STATE;
  const wrongWords = currentSet.filter(w => wrongKeysThisRound.has(w.de));
  LESSON_STATE.pendingWrongWords = wrongWords;

  const panel = document.getElementById('panel-exercises');
  const isLast = partIndex + 1 >= totalParts;

  panel.innerHTML = `
    <div class="card-block result-block">
      <div class="result-score">${wrongWords.length === 0 ? '🎉' : wrongWords.length}</div>
      <div class="result-label">${wrongWords.length === 0 ? 'Bu hissədə bütün sözlər doğru cavablandırıldı!' : wrongWords.length + ' sözdə səhv oldu — bunlar növbəti hissədə təkrarlanacaq'}</div>
      <div class="result-actions">
        <button class="btn btn-primary" id="part-continue-btn">${isLast ? 'Yekun nəticəyə keç' : 'Növbəti hissəyə keç'}</button>
      </div>
    </div>
  `;

  // Hər hissədən sonra bir neçə kiçik krossvord növbə ilə — söz ehtiyatı nə qədər çoxdursa,
  // bir o qədər çox krossvord göstərilir (hər biri ayrı söz qrupundan).
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < currentSet.length; i += chunkSize){
    const chunk = currentSet.slice(i, i + chunkSize);
    if (chunk.length >= 3) chunks.push(chunk);
  }
  LESSON_STATE.cwChunks = chunks.length ? chunks : [currentSet];
  LESSON_STATE.cwRoundIndex = 0;

  document.getElementById('part-continue-btn').addEventListener('click', proceedAfterCrossword);
}

function showPartCrossword(){
  const { partIndex, totalParts, cwChunks, cwRoundIndex } = LESSON_STATE;
  const isLast = partIndex + 1 >= totalParts;
  const isLastCrossword = cwRoundIndex + 1 >= cwChunks.length;
  const panel = document.getElementById('panel-exercises');
  const wordsForThisRound = cwChunks[cwRoundIndex];

  panel.innerHTML = `
    <div class="card-block">
      <h2>Krossvord ${cwChunks.length > 1 ? (cwRoundIndex + 1) + ' / ' + cwChunks.length : ''}</h2>
      <p style="font-size:0.85rem;color:rgba(240,230,210,0.55);margin-top:-6px;margin-bottom:16px;">Bu hissədə öyrəndiyiniz sözlərdən krossvord — bütün xanaları doldurun.</p>
      <div id="cw-container"></div>
      <div class="ex-actions" style="margin-top:10px;"><button class="btn btn-outline btn-sm" id="cw-skip-btn">Krossvordu keç</button></div>
    </div>
  `;
  const cwContainer = document.getElementById('cw-container');
  const crossword = generateCrossword(wordsForThisRound, 8);

  function goNext(){
    if (isLastCrossword){
      proceedAfterCrossword();
    } else {
      LESSON_STATE.cwRoundIndex++;
      showPartCrossword();
    }
  }

  renderCrossword(cwContainer, crossword, () => {
    const wrap = document.createElement('div');
    wrap.className = 'ex-actions';
    wrap.style.marginTop = '10px';
    wrap.innerHTML = '<button class="btn btn-primary" id="cw-continue-btn">' + (isLastCrossword ? (isLast ? 'Yekun nəticəyə keç' : 'Növbəti hissəyə keç') : 'Növbəti krossvord') + '</button>';
    cwContainer.parentElement.insertBefore(wrap, cwContainer.nextSibling);
    document.getElementById('cw-continue-btn').addEventListener('click', goNext);
  });

  document.getElementById('cw-skip-btn').addEventListener('click', goNext);
}

function proceedAfterCrossword(){
  const { partIndex, totalParts, pendingWrongWords } = LESSON_STATE;
  const isLast = partIndex + 1 >= totalParts;
  LESSON_STATE.carryWords = pendingWrongWords || [];
  if (isLast){
    showFinalResult();
  } else {
    LESSON_STATE.partIndex++;
    startPart();
  }
}

function showFinalResult(){
  const { correctCount, totalCount, courseId, course, stage } = LESSON_STATE;
  const pct = totalCount ? Math.round((correctCount / totalCount) * 100) : 100;
  markLessonComplete(courseId, stage.id, pct);
  if (typeof addNotification === 'function'){
    addNotification(course.code + ' — Mərhələ ' + stage.id + ' tamamlandı (' + pct + '%)', '🎓');
  }
  renderFinalResultPanel();
}

function renderFinalResultPanel(){
  setPanel('result');
  const { correctCount, totalCount, courseId, course, stage } = LESSON_STATE;
  const pct = totalCount ? Math.round((correctCount / totalCount) * 100) : 100;

  const idx = course.stages.findIndex(s => s.id === stage.id);
  const nextStage = course.stages[idx + 1];
  const nextIsPaid = nextStage && !nextStage.free && !hasActiveSubscription(courseId);

  const panel = document.getElementById('panel-result');
  panel.innerHTML = `
    <div class="card-block result-block">
      <div class="result-score">${correctCount} / ${totalCount}</div>
      <div class="result-label">doğru cavab · ${pct}% · bütün hissələr və krossvordlar tamamlandı</div>
      <div class="result-actions">
        <a class="btn btn-outline" href="course.html?level=${courseId}">Mərhələ siyahısına qayıt</a>
        ${nextStage
          ? (nextIsPaid
              ? `<a class="btn btn-primary" href="course.html?level=${courseId}">Növbəti mərhələləri açmaq</a>`
              : `<a class="btn btn-primary" href="lesson.html?level=${courseId}&stage=${nextStage.id}">Növbəti mərhələ</a>`)
          : `<a class="btn btn-primary" href="course.html?level=${courseId}">Kurs tamamlandı</a>`}
      </div>
    </div>
  `;
  scrollToTop();
}

document.addEventListener('DOMContentLoaded', initLessonPage);
