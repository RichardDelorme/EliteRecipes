// EliteRecipes — interactivity (planner + contact validation)
(function(){
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

  // Mobile nav
  const menuBtn = $('#menuBtn');
  const nav = document.querySelector('.nav');
  if(menuBtn){
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // Year
  const yearEl = $('#year');
  if(yearEl) { yearEl.textContent = new Date().getFullYear(); }

  // Preference selection limit (max 3)
  const prefsForm = $('#prefsForm');
  const limitMsg = $('#limitMsg');
  function enforceLimit(){
    const checks = $$('input[name="prefs"]:checked', prefsForm);
    if(checks.length > 3){
      // Uncheck the last toggled one
      this.checked = false;
      limitMsg.textContent = 'You can select up to 3 preferences.';
    } else {
      limitMsg.textContent = checks.length === 3 ? 'Max selected.' : 'You can select up to 3 preferences.';
    }
  }
  if(prefsForm){
    $$('input[name="prefs"]', prefsForm).forEach(cb => cb.addEventListener('change', enforceLimit));
  }

  // Mock recipe catalog (replace with API/DB later)
  const CATALOG = [
    { id: 1, name: 'Avocado Chicken Salad', cals: 520, prefs: ['Keto','High Protein','Family Friendly'], img:'https://picsum.photos/seed/meal1/600/360', ingredients: ['Chicken breast','Avocado','Lime','Cilantro','Olive oil'] },
    { id: 2, name: 'Mediterranean Quinoa Bowl', cals: 430, prefs: ['Vegetarian','Mediterranean','Gluten-Free'], img:'https://picsum.photos/seed/meal2/600/360', ingredients: ['Quinoa','Tomatoes','Cucumber','Feta','Olives'] },
    { id: 3, name: 'Vegan Lentil Stew', cals: 390, prefs: ['Vegan','Low Calorie','Family Friendly'], img:'https://picsum.photos/seed/meal3/600/360', ingredients: ['Lentils','Carrots','Celery','Onion','Vegetable stock'] },
    { id: 4, name: 'Grilled Salmon & Greens', cals: 480, prefs: ['Mediterranean','High Protein','Paleo','Lactose-Free','Gluten-Free'], img:'https://picsum.photos/seed/meal4/600/360', ingredients: ['Salmon','Spinach','Lemon','Garlic','Olive oil'] },
    { id: 5, name: 'Zoodle Bolognese', cals: 450, prefs: ['Keto','Gluten-Free','Family Friendly'], img:'https://picsum.photos/seed/meal5/600/360', ingredients: ['Zucchini','Ground beef','Tomato sauce','Onion','Parmesan'] },
    { id: 6, name: 'Tofu Stir-Fry', cals: 410, prefs: ['Vegan','Low Calorie','Lactose-Free'], img:'https://picsum.photos/seed/meal6/600/360', ingredients: ['Tofu','Broccoli','Bell peppers','Soy sauce','Garlic'] },
    { id: 7, name: 'Greek Yogurt Power Bowl', cals: 320, prefs: ['High Protein','Vegetarian'], img:'https://picsum.photos/seed/meal7/600/360', ingredients: ['Greek yogurt','Berries','Honey','Granola'] },
    { id: 8, name: 'Paleo Egg Scramble', cals: 380, prefs: ['Paleo','High Protein','Lactose-Free'], img:'https://picsum.photos/seed/meal8/600/360', ingredients: ['Eggs','Mushrooms','Spinach','Tomatoes'] },
    { id: 9, name: 'Chickpea Buddha Bowl', cals: 420, prefs: ['Vegetarian','Vegan','Gluten-Free'], img:'https://picsum.photos/seed/meal9/600/360', ingredients: ['Chickpeas','Sweet potato','Tahini','Kale'] },
    { id: 10, name: 'Turkey Lettuce Wraps', cals: 360, prefs: ['Low Calorie','Keto','Lactose-Free'], img:'https://picsum.photos/seed/meal10/600/360', ingredients: ['Ground turkey','Lettuce','Ginger','Soy sauce'] }
  ];

  // Generate plan
  const generateBtn = $('#generateBtn');
  const clearBtn = $('#clearBtn');
  const planEl = $('#plan');
  const planGrid = $('#planGrid');
  const shoppingBtn = $('#shoppingBtn');

  function pickMeals(selected){
    // Simple strategy: filter by any overlap with selected prefs, then sample 21 unique (B/L/D × 7)
    const pool = CATALOG.filter(r => r.prefs.some(p => selected.includes(p)));
    const fallback = CATALOG.slice(); // ensure we always have enough
    const out = [];
    let tries = 0;
    while(out.length < 21 && tries < 200){
      const src = (pool.length >= 21) ? pool : fallback;
      const choice = src[Math.floor(Math.random()*src.length)];
      if(!out.includes(choice)) out.push(choice);
      tries++;
    }
    return out.slice(0,21);
  }

  function renderPlan(recipes){
    planGrid.innerHTML = '';
    const meals = ['Breakfast','Lunch','Dinner'];
    for(let d=0; d<7; d++){
      for(let m=0; m<3; m++){
        const idx = d*3+m;
        const r = recipes[idx];
        const card = document.createElement('div');
        card.className = 'plan-card';
        card.innerHTML = \`
          <img src="\${r.img}" alt="Dish: \${r.name}">
          <div class="meta">
            <h4>Day \${d+1} — \${meals[m]}</h4>
            <p>\${r.name} • \${r.cals} kcal</p>
          </div>\`;
        planGrid.appendChild(card);
      }
    }
    planEl.classList.remove('hidden');
  }

  let currentPlan = [];
  if(generateBtn){
    generateBtn.addEventListener('click', () => {
      const selected = $$('input[name="prefs"]:checked', prefsForm).map(cb => cb.value);
      if(selected.length === 0){
        alert('Please select at least one preference.');
        return;
      }
      currentPlan = pickMeals(selected);
      renderPlan(currentPlan);
    });
  }
  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      $$('input[name="prefs"]:checked', prefsForm).forEach(cb => cb.checked = false);
      planEl.classList.add('hidden');
      planGrid.innerHTML = '';
      currentPlan = [];
      limitMsg.textContent = 'You can select up to 3 preferences.';
    });
  }

  // Build Shopping List (client-side PDF via print() with a printable view)
  if(shoppingBtn){
    shoppingBtn.addEventListener('click', () => {
      if(currentPlan.length === 0){
        alert('Generate a plan first.');
        return;
      }
      const tally = new Map();
      currentPlan.forEach(r => {
        r.ingredients.forEach(i => {
          const key = i.toLowerCase();
          tally.set(key, (tally.get(key) || 0) + 1);
        });
      });
      const items = Array.from(tally.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
      // Open a printable window
      const w = window.open('', 'shopping', 'width=800,height=900');
      w.document.write(\`
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
          <p class="muted">Consolidated from your 7‑day plan. Numbers reflect repeated usage across recipes.</p>
          <ul>\${
            items.map(([name,count]) => '<li>'+name+' <span class="badge">×'+count+'</span></li>').join('')
          }</ul>
          <hr/>
          <p class="muted">Built by EliteRecipes.com</p>
          <script>window.onload = () => window.print();</script>
        </body></html>\`);
      w.document.close();
    });
  }

  // Contact form validation
  const contactForm = $('#contactForm');
  const feedback = $('#formFeedback');
  function validateEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  if(contactForm){
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const subject = $('#subject').value.trim();
      const message = $('#message').value.trim();
      const errs = [];
      if(name.length < 2) errs.push('Name must be at least 2 characters.');
      if(!validateEmail(email)) errs.push('Please enter a valid email address.');
      if(subject.length < 3) errs.push('Subject must be at least 3 characters.');
      if(message.length < 10) errs.push('Message should be at least 10 characters.');
      if(errs.length){
        feedback.textContent = errs.join(' ');
        feedback.style.color = '#ffb4b4';
        return;
      }
      feedback.textContent = 'Thanks! Your message was validated locally (demo).';
      feedback.style.color = '#9cff8b';
      contactForm.reset();
    });
  }
})();