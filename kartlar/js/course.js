/* Alman Klubu — course.html səhifəsinin məntiqi (mərhələ siyahısı) */

function initCoursePage(){
  const params = new URLSearchParams(location.search);
  const levelId = params.get('level') || 'a1';
  const course = getCourse(levelId);

  if (!course){
    document.getElementById('course-root').innerHTML = `
      <div class="notice">Kurs tapılmadı. <a href="index.html" style="color:var(--orange)">Ana səhifəyə qayıt</a></div>
    `;
    return;
  }

  const prog = getCourseProgress(levelId);
  const totalStages = course.stages.length;
  const completedCount = course.stages.filter(s => prog.completed[s.id]).length;
  const pct = totalStages ? Math.round((completedCount / totalStages) * 100) : 0;

  document.getElementById('course-eyebrow').textContent = 'Alman Klubu · ' + course.code;
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-stat-pct').textContent = pct + '%';
  document.getElementById('course-stat-count').textContent = completedCount + ' / ' + totalStages + ' mərhələ tamamlanıb';
  document.title = course.title + ' — Alman Klubu';

  let nextStage = null;
  course.stages.forEach((s, i) => {
    if (!nextStage && !prog.completed[s.id] && isStageUnlocked(levelId, s, i, course.stages)){
      nextStage = s;
    }
  });
  const continueBtn = document.getElementById('continue-btn');
  if (nextStage){
    continueBtn.textContent = completedCount === 0 ? 'Kursa başla' : 'Davam et';
    continueBtn.href = 'lesson.html?level=' + levelId + '&stage=' + nextStage.id;
  } else {
    continueBtn.textContent = 'Bütün açıq mərhələlər tamamlandı';
    continueBtn.classList.add('btn-outline');
    continueBtn.classList.remove('btn-primary');
    continueBtn.removeAttribute('href');
  }

  const list = document.getElementById('lesson-list');
  list.innerHTML = '';

  // qiymət bloku (səviyyə hələ açılmayıbsa)
  document.querySelectorAll('.price-block, .promo-bar').forEach(el => el.remove());
  if (course.stages.some(s => !s.free) && !hasActiveSubscription(levelId)){
    const freeN = course.stages.filter(s => s.free).length;
    const pb = document.createElement('div');
    pb.className = 'price-block';
    pb.innerHTML = `
      <div>
        <div class="price-block-title">Bütün ${course.stages.length} mərhələ</div>
        <div class="price-block-price">${priceHtml(levelId)}</div>
        <div class="price-block-note">İlk ${freeN === 1 ? 'mərhələ' : freeN + ' mərhələ'} pulsuzdur · bir dəfə ödəniş, müddətsiz giriş</div>
      </div>
      <a class="btn btn-primary" href="${buyLevelLink(levelId)}" target="_blank" rel="noopener">Satın al</a>`;
    list.parentElement.insertBefore(pb, list);
    const promo = promoBannerHtml();
    if (promo){ const w = document.createElement('div'); w.innerHTML = promo; list.parentElement.insertBefore(w.firstElementChild, pb); }
  }

  course.stages.forEach((s, i) => {
    const done = !!prog.completed[s.id];
    const sequenceOk = isStageUnlocked(levelId, s, i, course.stages);
    const needsSub = !s.free && !hasActiveSubscription(levelId);
    const hasContent = s.words && s.words.length > 0;
    const clickable = sequenceOk && !needsSub && hasContent;

    const row = document.createElement(clickable ? 'a' : 'div');
    if (clickable) row.href = 'lesson.html?level=' + levelId + '&stage=' + s.id;
    row.className = 'lesson-row' + (clickable ? '' : ' locked');

    const dotClass = done ? 'done' : (clickable ? 'current' : 'locked');
    const dotContent = done ? '✓' : (i + 1);

    let statusTxt = '';
    if (done) statusTxt = 'keçilib';
    else if (needsSub) statusTxt = '🔒 ödənişlə';
    else if (!sequenceOk) statusTxt = 'əvvəlki mərhələni bitirin';
    else statusTxt = 'açıqdır';

    const scoreTxt = (done && prog.scores[s.id] != null) ? '<span class="lesson-score">' + prog.scores[s.id] + '%</span>' : '';
    const lockIcon = needsSub ? '🔒 ' : '';

    row.innerHTML = `
      <div class="lesson-dot ${dotClass}">${dotContent}</div>
      <div class="lesson-info">
        <div class="lesson-title-txt">${lockIcon}Mərhələ ${s.id}</div>
        <div class="lesson-sub">${s.wordCount} söz/ifadə</div>
      </div>
      ${scoreTxt}
      <span style="font-size:0.78rem;color:rgba(240,230,210,0.4);">${statusTxt}</span>
      ${needsSub ? `<a class="buy-btn" href="${buyLevelLink(levelId)}" target="_blank" rel="noopener">Satın al · ${LEVEL_PRICE[levelId]} AZN</a>` : ''}
    `;
    const buy = row.querySelector('.buy-btn');
    if (buy) buy.addEventListener('click', e => e.stopPropagation());
    if (needsSub){ row.style.cursor = 'pointer'; row.addEventListener('click', () => { const b = document.querySelector('.unlock-box'); if (b){ b.scrollIntoView({behavior:'smooth', block:'center'}); b.querySelector('.unlock-input').focus(); } }); }
    list.appendChild(row);
  });

  if (course.stages.some(s => !s.free) && !hasActiveSubscription(levelId)){
    const box = document.createElement('div');
    box.innerHTML = unlockBoxHtml(levelId);
    list.parentElement.appendChild(box);
    bindUnlockBox(box, () => location.reload());
  }

}

function isStageUnlocked(courseId, stage, index, stages){
  if (index === 0) return true;
  const prog = getCourseProgress(courseId);
  const prevStage = stages[index - 1];
  return !!prog.completed[prevStage.id];
}

document.addEventListener('DOMContentLoaded', initCoursePage);
