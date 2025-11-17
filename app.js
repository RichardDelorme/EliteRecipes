// EliteRecipes — functional upgrade: real data + plan + shopping list + persistence
(function(){
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

  const yearEl = $('#year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav
  const menuBtn = $('#menuBtn');
  const nav = document.querySelector('.nav');
  if(menuBtn){ menuBtn.addEventListener('click', () => nav.classList.toggle('open')); }

  const prefsForm = $('#prefsForm');
  const limitMsg = $('#limitMsg');
  const planEl = $('#plan');
  const planGrid = $('#planGrid');
  const generateBtn = $('#generateBtn');
  const clearBtn = $('#clearBtn');
  const shoppingBtn = $('#shoppingBtn');

  // Limit to 3 choices
  function enforceLimit(){
    const checks = $$('input[name="prefs"]:checked', prefsForm);
    if(checks.length > 3){ this.checked = false; }
    const count = $$('input[name="prefs"]:checked', prefsForm).length;
    if(limitMsg) limitMsg.textContent = count === 3 ? 'Max selected.' : 'You can select up to 3 preferences.';
  }
  if(prefsForm){ $$('input[name="prefs"]', prefsForm).forEach(cb => cb.addEventListener('change', enforceLimit)); }

  // Data
  const DATA_URL = 'assets/recipes.json';
  let CATALOG = [];
  const MEALS = ['Breakfast','Lunch','Dinner'];

  function pickN(arr, n){
    const out = [];
    const pool = arr.slice();
    while(out.length < n && (pool.length || arr.length)){
      if(pool.length){
        const idx = Math.floor(Math.random()*pool.length);
        out.push(pool.splice(idx,1)[0]);
      }else{
        out.push(arr[Math.floor(Math.random()*arr.length)]);
      }
    }
    return out;
  }

  function buildPlan(selected){
    const byMeal = m => CATALOG.filter(r => r.mealTypes.includes(m) && r.categories.some(c => selected.includes(c)));
    const breakfasts = pickN(byMeal('Breakfast'), 7);
    const lunches    = pickN(byMeal('Lunch'), 7);
    const dinners    = pickN(byMeal('Dinner'), 7);
    const plan = [];
    for(let i=0;i<7;i++){ plan.push(breakfasts[i], lunches[i], dinners[i]); }
    return plan;
  }

  function renderPlan(recipes){
    planGrid.innerHTML = '';
    for(let d=0; d<7; d++){
      for(let m=0; m<3; m++){
        const idx = d*3+m;
        const r = recipes[idx];
        const card = document.createElement('div');
        card.className = 'plan-card';
        card.innerHTML = `
          <img src="${r.image}" alt="Dish: ${r.name}">
          <div class="meta">
            <h4>Day ${d+1} — ${MEALS[m]}</h4>
            <p>${r.name} • ${r.calories} kcal</p>
          </div>`;
        planGrid.appendChild(card);
      }
    }
    planEl.classList.remove('hidden');
  }

  function aggregateShopping(recipes){
    const tally = new Map();
    for(const r of recipes){
      for(const ing of r.ingredients){
        const key = ing.name.trim().toLowerCase();
        const prev = tally.get(key) || {name: ing.name, qty: 0, unit: ing.unit};
        prev.qty += Number(ing.qty || 0);
        tally.set(key, prev);
      }
    }
    return Array.from(tally.values()).sort((a,b)=>a.name.localeCompare(b.name));
  }

  function openPrintableShopping(list){
    const w = window.open('', 'shopping', 'width=800,height=900');
    const items = list.map(it => `<li>${it.name} <span class="badge">${it.qty}${it.unit ? ' '+it.unit : ''}</span></li>`).join('');
    w.document.write(`
      <html><head><title>Shopping List — EliteRecipes</title>
      <style>
        body{font-family: Inter, system-ui, Arial; padding: 20px; line-height:1.5}
        h1{margin:0 0 10px}
        .muted{color:#666}
        ul{columns:2; -webkit-columns:2; -moz-columns:2}
        li{break-inside:avoid}
        .badge{display:inline-block; font-size:.8rem; padding:2px 8px; border:1px solid #ddd; border-radius:999px; margin-left:6px; color:#333}
        @media print { ul{columns:3} }
      </style></head>
      <body>
        <h1>Shopping List</h1>
        <p class="muted">Consolidated from your 7-day plan.</p>
        <ul>${items}</ul>
        <hr/>
        <p class="muted">Built by EliteRecipes.com</p>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
    w.document.close();
  }

  function downloadCSV(list){
    const rows = [['Ingredient','Quantity','Unit'], ...list.map(i => [i.name, i.qty, i.unit||''])];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\\r\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shopping-list.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function savePlan(selected, plan){
    localStorage.setItem('eliteRecipes.plan', JSON.stringify({selected, plan}));
  }
  function loadPlan(){
    try{ return JSON.parse(localStorage.getItem('eliteRecipes.plan')||'null'); }catch{ return null; }
  }

  let currentPlan = [];

  async function ensureData(){
    if(CATALOG.length) return;
    const res = await fetch(DATA_URL, {cache: 'no-store'});
    CATALOG = await res.json();
  }

  if(generateBtn){
    generateBtn.addEventListener('click', async () => {
      const selected = $$('input[name="prefs"]:checked', prefsForm).map(cb => cb.value);
      if(selected.length === 0){ alert('Please select at least one preference.'); return; }
      await ensureData();
      currentPlan = buildPlan(selected);
      renderPlan(currentPlan);
      savePlan(selected, currentPlan);
    });
  }
  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      $$('input[name="prefs"]:checked', prefsForm).forEach(cb => cb.checked=false);
      planEl.classList.add('hidden');
      planGrid.innerHTML = '';
      currentPlan = [];
      localStorage.removeItem('eliteRecipes.plan');
      if(limitMsg) limitMsg.textContent = 'You can select up to 3 preferences.';
    });
  }
  if(shoppingBtn){
    shoppingBtn.addEventListener('click', () => {
      if(!currentPlan.length){ alert('Generate a plan first.'); return; }
      const list = aggregateShopping(currentPlan);
      openPrintableShopping(list);
      setTimeout(()=>downloadCSV(list), 250);
    });
  }

  (async function(){
    const saved = loadPlan();
    if(saved && saved.plan && saved.plan.length){
      await ensureData();
      currentPlan = saved.plan;
      renderPlan(currentPlan);
      if(prefsForm){
        $$('input[name="prefs"]', prefsForm).forEach(cb => cb.checked = saved.selected.includes(cb.value));
      }
      if(limitMsg) limitMsg.textContent = 'Loaded your previous plan.';
    }
  })();
})();