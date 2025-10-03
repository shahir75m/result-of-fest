// Utility functions
function safeParse(str){ try{ return JSON.parse(str); }catch(e){ return []; } }
function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); }
function highlight(text, term){ if(!term) return escapeHtml(text); try{ const re=new RegExp(term.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'),'gi'); return escapeHtml(text).replace(re, m=>`<span class="highlight">${m}</span>`); }catch(e){ return escapeHtml(text);} }

// Elements
const podium = document.getElementById('podium');
let cardEls = [...podium.querySelectorAll('.place')];
const modal = document.getElementById('modal');
const teamNameEl = document.getElementById('team-name');
const resultSections = document.getElementById('result-sections');
const searchInput = document.getElementById('search');
const topPerformerBox = document.getElementById('top-performer');
const topName = document.getElementById('top-name');
const topMeta = document.getElementById('top-meta');
const topScore = document.getElementById('top-score');
const topInitial = document.getElementById('top-initial');

// Compute team totals & reorder
cardEls.forEach(card=>{
  const data = safeParse(card.dataset.results || "[]");
  const total = data.reduce((s,row)=> s + (parseInt(row[5],10)||0), 0);
  card.dataset.total = total;
});
cardEls.sort((a,b)=>parseInt(b.dataset.total,10)-parseInt(a.dataset.total,10));
cardEls.forEach((card, idx)=>{
  const rank = idx+1;
  const h2 = card.querySelector('h2');
  const badge = card.querySelector('.score-badge');
  h2.textContent = rank;
  badge.textContent = `Total: ${card.dataset.total}`;
  card.classList.remove('gold','silver','red','gray');
  if(rank===1) card.classList.add('gold');
  else if(rank===2) card.classList.add('silver');
  else if(rank===3) card.classList.add('red');
  else card.classList.add('gray');
  podium.appendChild(card);
});

// Modal logic
cardEls.forEach(card=>{
  card.addEventListener('click', ()=>{
    const team = card.dataset.team || 'Team';
    teamNameEl.textContent = `${team} — Total: ${card.dataset.total}`;
    const rows = safeParse(card.dataset.results || "[]");
    renderModal(rows);
    modal.classList.add('show');
    searchInput.value = '';
    searchInput.focus();
    searchInput.oninput = ()=> renderModal(rows, searchInput.value.trim().toLowerCase());
    document.addEventListener('keydown', escClose);
  });
});
function escClose(e){ if(e.key === 'Escape') closeModal(); }
document.getElementById('close').onclick = closeModal;
modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
function closeModal(){ modal.classList.remove('show'); topPerformerBox.classList.add('hidden'); document.removeEventListener('keydown', escClose); }

// Render modal
function renderModal(data, term=''){
  const studentTotals = {};
  data.forEach(row=>{
    if(!Array.isArray(row)) return;
    const [chessNo, student, prog, cat, grade, scoreRaw] = row.map(v => v==null? '' : String(v));
    const score = parseInt(scoreRaw,10) || 0;
    const key = student.trim().toLowerCase();
    if(!studentTotals[key]) studentTotals[key] = { name: student.trim(), total: 0, chess: [], progs: [] };
    studentTotals[key].total += score;
    if(chessNo) studentTotals[key].chess.push(chessNo);
    if(prog) studentTotals[key].progs.push(prog);
  });

  let top = null;
  const studentsArray = Object.values(studentTotals);
  if(studentsArray.length){
    top = studentsArray.reduce((a,b)=> (b.total > a.total ? b : a), studentsArray[0]);
  }

  if(top){
    topPerformerBox.classList.remove('hidden');
    topName.textContent = top.name;
    topMeta.textContent = `Programs: ${[...new Set(top.progs)].join(', ')} • IDs: ${[...new Set(top.chess)].join(', ')}`;
    topScore.textContent = top.total;
    topInitial.textContent = (top.name||'?').slice(0,1).toUpperCase();
  } else {
    topPerformerBox.classList.add('hidden');
  }

  const senior = [], junior = [];
  let totalFiltered = 0;
  data.forEach(row=>{
    if(!Array.isArray(row)) return;
    const [chessNo, student, prog, cat, grade, scoreRaw] = row.map(v => v==null? '' : String(v));
    const score = parseInt(scoreRaw,10) || 0;
    const valuesForFilter = [chessNo, student, prog, cat, grade, String(score)].map(s=>s.toLowerCase());
    const meets = !term || valuesForFilter.some(v => v.includes(term));
    if(!meets) return;
    totalFiltered += score;
    const rowHtml = `<tr>
      <td class="px-4 py-2 text-sm">${highlight(chessNo,term)}</td>
      <td class="px-4 py-2 text-sm">${highlight(student,term)}</td>
      <td class="px-4 py-2 text-sm">${highlight(prog,term)}</td>
      <td class="px-4 py-2 text-sm">${highlight(cat,term)}</td>
      <td class="px-4 py-2 text-sm">${highlight(grade,term)}</td>
      <td class="px-4 py-2 text-sm font-semibold">${highlight(String(score),term)}</td>
    </tr>`;
    if((cat||'').toLowerCase().includes('junior')) junior.push({html:rowHtml, score});
    else senior.push({html:rowHtml, score});
  });

  senior.sort((a,b)=>b.score - a.score);
  junior.sort((a,b)=>b.score - a.score);

  function tableMarkup(title, rowsArr){
    if(!rowsArr.length) return '';
    const subtotal = rowsArr.reduce((s,r)=>s + r.score, 0);
    return `
      <div class="mt-6">
        <div class="text-lg font-bold text-slate-700 mb-2">${escapeHtml(title)}</div>
        <div class="overflow-x-auto rounded-lg border border-slate-100 shadow-sm">
          <table class="min-w-full">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Chess No</th>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Student</th>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Program</th>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Category</th>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Grade</th>
                <th class="px-4 py-3 text-left text-xs text-slate-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y">${rowsArr.map(r=>r.html).join('')}</tbody>
            <tfoot class="bg-slate-50">
              <tr>
                <td colspan="5" class="px-4 py-3 text-left font-semibold text-slate-700">Subtotal</td>
                <td class="px-4 py-3 text-left font-extrabold text-sky-600">${subtotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  resultSections.innerHTML = `
    ${tableMarkup('Senior Events', senior)}
    ${tableMarkup('Junior Events', junior)}
    <div class="mt-6 p-4 rounded-xl bg-sky-50 text-center border border-sky-100">
      <div class="text-sm text-slate-600">Total Points Filtered</div>
      <div class="text-2xl font-extrabold text-sky-700">${totalFiltered}</div>
    </div>
  `;
}
