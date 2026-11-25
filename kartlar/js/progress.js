/* Alman Klubu — progress.html (Proqres) səhifəsinin məntiqi */

function initProgressPage(){
  injectPromoTop('.wrap:not(.bf-wrap)');
  const allProgress = loadProgress();

  let totalCompleted = 0;
  let totalStages = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let recent = [];
  let currentLevel = null;
  let currentLevelPct = -1;

  COURSES.forEach(course => {
    const prog = allProgress[course.id] || { completed: {}, scores: {}, timestamps: {} };
    const completedInCourse = course.stages.filter(s => prog.completed[s.id]).length;
    totalCompleted += completedInCourse;
    totalStages += course.stages.length;

    course.stages.forEach(s => {
      if (prog.completed[s.id]){
        const score = prog.scores[s.id];
        if (score != null){ scoreSum += score; scoreCount++; }
        recent.push({
          courseCode: course.code, courseId: course.id,
          stageId: s.id, score: score, ts: prog.timestamps[s.id] || 0,
        });
      }
    });

    const pct = course.stages.length ? completedInCourse / course.stages.length : 0;
    if (completedInCourse > 0 && pct > currentLevelPct){
      currentLevelPct = pct;
      currentLevel = course;
    }
  });

  recent.sort((a, b) => b.ts - a.ts);
  recent = recent.slice(0, 8);

  const avgScore = scoreCount ? Math.round(scoreSum / scoreCount) : 0;
  const overallPct = totalStages ? Math.round((totalCompleted / totalStages) * 100) : 0;

  document.getElementById('current-level-txt').textContent = currentLevel ? (currentLevel.code + ' — ' + currentLevel.title) : 'Hələ başlanmayıb';
  document.getElementById('stat-lessons').textContent = totalCompleted;
  document.getElementById('stat-pct').textContent = overallPct + '%';
  document.getElementById('stat-avg').textContent = scoreCount ? avgScore + '%' : '—';

  const levelWrap = document.getElementById('level-summary');
  levelWrap.innerHTML = COURSES.map(course => {
    const prog = allProgress[course.id] || { completed: {} };
    const done = course.stages.filter(s => prog.completed[s.id]).length;
    const total = course.stages.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
      <div class="level-card">
        <div class="level-code">${course.code}</div>
        <div class="level-name">${course.title}</div>
        <div class="level-progress-row">
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
        <div class="level-meta">${done} / ${total} mərhələ tamamlanıb</div>
        <a class="btn btn-outline btn-sm" href="course.html?level=${course.id}">Kursa keç</a>
      </div>
    `;
  }).join('');

  const recentWrap = document.getElementById('recent-list');
  if (recent.length === 0){
    recentWrap.innerHTML = `<div class="empty-note">Hələ heç bir mərhələ tamamlanmayıb. <a href="courses.html" style="color:var(--orange)">Kurslara bax</a> və ilk mərhələyə başlayın.</div>`;
  } else {
    recentWrap.innerHTML = recent.map(r => `
      <a class="recent-item" href="lesson.html?level=${r.courseId}&stage=${r.stageId}">
        <span>${r.courseCode} · Mərhələ ${r.stageId}</span>
        <span class="r-score">${r.score != null ? r.score + '%' : ''}</span>
      </a>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', initProgressPage);
