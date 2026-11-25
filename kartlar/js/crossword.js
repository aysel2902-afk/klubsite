/* Alman Klubu — keçilmiş sözlərdən avtomatik krossvord yaratmaq */

function stripDe(s){
  return s.toUpperCase().replace(/[^A-ZÄÖÜß]/g, '');
}

function pickCrosswordWords(allWords, count){
  const candidates = allWords
    .filter(w => w.type !== 'sentence')
    .map(w => ({ raw: w.de, clean: stripDe(String(w.de).replace(/^(der|die|das|sich)\s+/i, '')), az: w.az }))
    .filter(w => w.clean.length >= 3 && w.clean.length <= 12);
  const unique = [];
  const seen = new Set();
  shuffle(candidates).forEach(c => {
    if (!seen.has(c.clean)){ seen.add(c.clean); unique.push(c); }
  });
  unique.sort((a, b) => b.clean.length - a.clean.length);
  return unique.slice(0, count);
}

function generateCrossword(allWords, count){
  const words = pickCrosswordWords(allWords, count || 8);
  if (words.length === 0) return null;

  const grid = new Map(); // "r,c" -> letter
  const placements = [];

  function canPlace(word, row, col, dir){
    for (let i = 0; i < word.length; i++){
      const r = dir === 'v' ? row + i : row;
      const c = dir === 'h' ? col + i : col;
      const key = r + ',' + c;
      if (grid.has(key) && grid.get(key) !== word[i]) return false;
    }
    return true;
  }
  function place(word, row, col, dir){
    for (let i = 0; i < word.length; i++){
      const r = dir === 'v' ? row + i : row;
      const c = dir === 'h' ? col + i : col;
      grid.set(r + ',' + c, word[i]);
    }
  }

  // ilk söz — üfüqi, mərkəzdə
  const first = words[0];
  const startRow = 0, startCol = 0;
  place(first.clean, startRow, startCol, 'h');
  placements.push({ word: first.clean, clue: first.az, raw: first.raw, row: startRow, col: startCol, dir: 'h' });

  words.slice(1).forEach(w => {
    let placed = false;
    for (let p = 0; p < placements.length && !placed; p++){
      const existing = placements[p];
      for (let i = 0; i < existing.word.length && !placed; i++){
        const letter = existing.word[i];
        for (let j = 0; j < w.clean.length && !placed; j++){
          if (w.clean[j] !== letter) continue;
          const dir = existing.dir === 'h' ? 'v' : 'h';
          let row, col;
          if (existing.dir === 'h'){
            row = existing.row - j;
            col = existing.col + i;
          } else {
            row = existing.row + i;
            col = existing.col - j;
          }
          if (canPlace(w.clean, row, col, dir)){
            place(w.clean, row, col, dir);
            placements.push({ word: w.clean, clue: w.az, raw: w.raw, row, col, dir });
            placed = true;
          }
        }
      }
    }
    // heç bir kəsişmə tapılmadısa, ayrıca sətirdə əlavə et (boş qalmasın)
    if (!placed){
      const lastRow = Math.max(...placements.map(p => p.dir === 'v' ? p.row + p.word.length - 1 : p.row)) + 2;
      if (canPlace(w.clean, lastRow, 0, 'h')){
        place(w.clean, lastRow, 0, 'h');
        placements.push({ word: w.clean, clue: w.az, raw: w.raw, row: lastRow, col: 0, dir: 'h' });
      }
    }
  });

  // koordinatları normallaşdır (mənfi olmasın)
  let minRow = 0, minCol = 0;
  placements.forEach(p => {
    minRow = Math.min(minRow, p.row);
    minCol = Math.min(minCol, p.col);
  });
  placements.forEach(p => { p.row -= minRow; p.col -= minCol; });

  let maxRow = 0, maxCol = 0;
  placements.forEach(p => {
    const endRow = p.dir === 'v' ? p.row + p.word.length - 1 : p.row;
    const endCol = p.dir === 'h' ? p.col + p.word.length - 1 : p.col;
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  });

  // nömrələmə
  placements.sort((a, b) => (a.row - b.row) || (a.col - b.col));
  placements.forEach((p, i) => { p.number = i + 1; });

  return { placements, rows: maxRow + 1, cols: maxCol + 1 };
}

function renderCrossword(container, crossword, onComplete){
  if (!crossword){
    container.innerHTML = '<div class="notice">Krossvord üçün uyğun söz tapılmadı.</div>';
    if (onComplete) onComplete();
    return;
  }
  const { placements, rows, cols } = crossword;
  const cellMap = {}; // "r,c" -> {letter, inputEl}

  placements.forEach(p => {
    for (let i = 0; i < p.word.length; i++){
      const r = p.dir === 'v' ? p.row + i : p.row;
      const c = p.dir === 'h' ? p.col + i : p.col;
      const key = r + ',' + c;
      if (!cellMap[key]) cellMap[key] = { letter: p.word[i], number: (i === 0) ? p.number : null };
      else if (i === 0 && !cellMap[key].number) cellMap[key].number = p.number;
    }
  });

  let gridHtml = '<div class="crossword-grid" style="grid-template-columns: repeat(' + cols + ', 32px);">';
  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      const key = r + ',' + c;
      if (cellMap[key]){
        gridHtml += '<div class="cw-cell">' +
          (cellMap[key].number ? '<span class="cw-num">' + cellMap[key].number + '</span>' : '') +
          '<input maxlength="1" data-key="' + key + '" data-letter="' + cellMap[key].letter + '">' +
          '</div>';
      } else {
        gridHtml += '<div class="cw-cell cw-empty"></div>';
      }
    }
  }
  gridHtml += '</div>';

  const clueList = placements.map(p =>
    '<div class="cw-clue"><b>' + p.number + '.</b> ' + p.clue + ' <span style="opacity:0.45;">(' + p.word.length + ' hərf)</span></div>'
  ).join('');

  container.innerHTML = `
    <div class="cw-wrap">${gridHtml}</div>
    <div class="cw-clues">${clueList}</div>
    <div class="ex-feedback" id="cw-fb"></div>
    <div class="ex-actions"><button class="btn btn-primary" id="cw-check-btn">Yoxla</button></div>
  `;

  const inputs = container.querySelectorAll('.crossword-grid input');
  inputs.forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().slice(-1);
    });
  });

  container.querySelector('#cw-check-btn').addEventListener('click', () => {
    let allCorrect = true;
    inputs.forEach(inp => {
      const correct = inp.value === inp.dataset.letter;
      inp.classList.toggle('cw-correct', correct);
      inp.classList.toggle('cw-incorrect', !correct && inp.value !== '');
      if (!correct) allCorrect = false;
    });
    const fb = document.getElementById('cw-fb');
    fb.className = 'ex-feedback ' + (allCorrect ? 'ok' : 'no');
    fb.textContent = allCorrect ? 'Əla! Krossvord doğru həll edildi.' : 'Bəzi xanalar səhvdir — düzəldib yenidən yoxlayın.';
    if (allCorrect && onComplete) onComplete();
  });
}
