// EliteRecipes — weekly plan + shopping list + recipe modal
(function () {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  // Year in footer
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const menuBtn = $("#menuBtn");
  const nav = document.querySelector(".nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
  }

  // Core elements
  const prefsForm = $("#prefsForm");
  const limitMsg = $("#limitMsg");
  const planEl = $("#plan");
  const planGrid = $("#planGrid");
  const generateBtn = $("#generateBtn");
  const clearBtn = $("#clearBtn");
  const shoppingBtn = $("#shoppingBtn");
  const contactForm = document.getElementById("contactForm");


  // Limit to 3 choices
  function enforceLimit() {
    const checks = $$('input[name="prefs"]:checked', prefsForm);
    if (checks.length > 3) {
      this.checked = false;
    }
    const count = $$('input[name="prefs"]:checked', prefsForm).length;
    if (limitMsg) {
      limitMsg.textContent =
        count === 3
          ? "Max selected."
          : "You can select up to 3 preferences.";
    }
  }
  if (prefsForm) {
    $$('input[name="prefs"]', prefsForm).forEach((cb) =>
      cb.addEventListener("change", enforceLimit)
    );
  }

  // Data
  const DATA_URL = "assets/recipes.json";
  let CATALOG = [];
  let RECIPES_BY_ID = new Map();
  const MEALS = ["Breakfast", "Lunch", "Dinner"];

  async function ensureData() {
    if (CATALOG.length) return;
    const res = await fetch(DATA_URL, { cache: "no-store" });
    CATALOG = await res.json();
    RECIPES_BY_ID = new Map();
    CATALOG.forEach((r) => RECIPES_BY_ID.set(r.id, r));
  }

  function pickN(arr, n) {
    const out = [];
    const pool = arr.slice();
    while (out.length < n && (pool.length || arr.length)) {
      if (pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
      } else {
        out.push(arr[Math.floor(Math.random() * arr.length)]);
      }
    }
    return out;
  }

  function buildPlan(selected) {
    const byMeal = (m) =>
      CATALOG.filter(
        (r) =>
          r.mealTypes.includes(m) &&
          r.categories.some((c) => selected.includes(c))
      );
    const breakfasts = pickN(byMeal("Breakfast"), 7);
    const lunches = pickN(byMeal("Lunch"), 7);
    const dinners = pickN(byMeal("Dinner"), 7);

    const plan = [];
    for (let d = 0; d < 7; d++) {
      plan.push(breakfasts[d], lunches[d], dinners[d]);
    }
    return plan;
  }

  function renderPlan(recipes) {
    if (!planGrid || !planEl) return;
    planGrid.innerHTML = "";
    for (let d = 0; d < 7; d++) {
      for (let m = 0; m < 3; m++) {
        const idx = d * 3 + m;
        const r = recipes[idx];
        if (!r) continue;
        const card = document.createElement("div");
        card.className = "plan-card";
        card.dataset.id = r.id; // for modal lookup
        card.innerHTML = `
          <img src="${r.image}" alt="Dish: ${r.name}">
          <div class="meta">
            <h4>Day ${d + 1} — ${MEALS[m]}</h4>
            <p>${r.name} • ${r.calories} cal</p>
          </div>`;
        planGrid.appendChild(card);
      }
    }
    planEl.classList.remove("hidden");
  }

  function aggregateShopping(recipes) {
    const tally = new Map();
    for (const r of recipes) {
      if (!r || !r.ingredients) continue;
      for (const ing of r.ingredients) {
        const key = ing.name.trim().toLowerCase();
        const prev =
          tally.get(key) || {
            name: ing.name,
            qty: 0,
            unit: ing.unit
          };
        prev.qty += Number(ing.qty || 0);
        tally.set(key, prev);
      }
    }
    return Array.from(tally.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  function openPrintableShopping(list) {
    const w = window.open("", "shopping", "width=800,height=900");
    const items = list
      .map(
        (it) =>
          `<li>${it.name} <span class="badge">${
            it.qty
          }${it.unit ? " " + it.unit : ""}</span></li>`
      )
      .join("");
    w.document.write(`
      <html><head><title>Shopping List — EliteRecipes</title>
      <style>
        body{font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial; padding: 20px; line-height:1.5}
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

  function downloadCSV(list) {
    const rows = [
      ["Ingredient", "Quantity", "Unit"],
      ...list.map((i) => [i.name, i.qty, i.unit || ""])
    ];
    const csv = rows
      .map((r) =>
        r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shopping-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function savePlan(selected, plan) {
    localStorage.setItem(
      "eliteRecipes.plan",
      JSON.stringify({ selected, plan })
    );
  }
  function loadPlan() {
    try {
      return JSON.parse(localStorage.getItem("eliteRecipes.plan") || "null");
    } catch {
      return null;
    }
  }

  let currentPlan = [];

  // Modal elements
  const modal = document.getElementById("recipeModal");
  const modalImg = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalMeta = document.getElementById("modalMeta");
  const modalSteps = document.getElementById("modalSteps");
  const modalCloseBtn = document.querySelector(".modal-close");
  const modalBackdrop = document.querySelector(".modal-backdrop");

  function openRecipeModal(recipe) {
    if (!modal || !recipe) return;
    modalImg.src = recipe.image;
    modalImg.alt = recipe.name;
    modalTitle.textContent = recipe.name;
    modalDesc.textContent = recipe.description || "";
    const servings = recipe.servings
      ? `${recipe.servings} serving${recipe.servings > 1 ? "s" : ""}`
      : "Serves 1–2";
    modalMeta.textContent = `${recipe.calories} cal • ${servings}`;
    modalSteps.innerHTML = "";
    (recipe.steps || []).forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      modalSteps.appendChild(li);
    });
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeRecipeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeRecipeModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closeRecipeModal);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRecipeModal();
  });

  // Click handler on the plan grid
  if (planGrid) {
    planGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");
      if (!card) return;
      const id = Number(card.dataset.id);
      const recipe = RECIPES_BY_ID.get(id);
      openRecipeModal(recipe);
    });
  }

  // Buttons
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const selected = $$('input[name="prefs"]:checked', prefsForm).map(
        (cb) => cb.value
      );
      if (selected.length === 0) {
        alert("Please select at least one preference.");
        return;
      }
      await ensureData();
      currentPlan = buildPlan(selected);
      renderPlan(currentPlan);
      savePlan(selected, currentPlan);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (prefsForm) {
        $$('input[name="prefs"]:checked', prefsForm).forEach(
          (cb) => (cb.checked = false)
        );
      }
      if (planEl && planGrid) {
        planEl.classList.add("hidden");
        planGrid.innerHTML = "";
      }
      currentPlan = [];
      localStorage.removeItem("eliteRecipes.plan");
      if (limitMsg) {
        limitMsg.textContent = "You can select up to 3 preferences.";
      }
    });
  }

  if (shoppingBtn) {
    shoppingBtn.addEventListener("click", () => {
      if (!currentPlan.length) {
        alert("Generate a plan first.");
        return;
      }
      const list = aggregateShopping(currentPlan);
      openPrintableShopping(list);
      setTimeout(() => downloadCSV(list), 250);
    });
  }
    // Contact form validation
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("name");
      const emailInput = document.getElementById("email");
      const subjectInput = document.getElementById("subject");
      const messageInput = document.getElementById("message");

      const nameError = document.getElementById("nameError");
      const emailError = document.getElementById("emailError");
      const messageError = document.getElementById("messageError");

      // Clear old errors
      [nameError, emailError, messageError].forEach((el) => {
        if (el) el.textContent = "";
      });

      let valid = true;

      // Name: required, at least 2 characters
      if (!nameInput.value.trim()) {
        nameError.textContent = "Please enter your name.";
        valid = false;
      } else if (nameInput.value.trim().length < 2) {
        nameError.textContent = "Name must be at least 2 characters.";
        valid = false;
      }

      // Email: basic format check
      const emailVal = emailInput.value.trim();
      const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailVal) {
        emailError.textContent = "Please enter your email address.";
        valid = false;
      } else if (!emailPattern.test(emailVal)) {
        emailError.textContent = "Please enter a valid email address.";
        valid = false;
      }

      // Message: required, at least 10 characters
      const msg = messageInput.value.trim();
      if (!msg) {
        messageError.textContent = "Please enter a message.";
        valid = false;
      } else if (msg.length < 10) {
        messageError.textContent =
          "Message should be at least 10 characters long.";
        valid = false;
      }

      if (!valid) {
        return;
      }

      // Demo behavior: pretend to send
      alert(
        "Thank you for your message! This demo contact form does not actually send email, but it shows that validation works."
      );
      contactForm.reset();
    });
  }


  // Load saved plan if exists
  (async function () {
    const saved = loadPlan();
    if (saved && saved.plan && saved.plan.length) {
      await ensureData();
      currentPlan = saved.plan.map(r => RECIPES_BY_ID.get(r.id) || r);
      renderPlan(currentPlan);
      if (prefsForm) {
        $$('input[name="prefs"]', prefsForm).forEach(
          (cb) => (cb.checked = saved.selected.includes(cb.value))
        );
      }
      if (limitMsg) {
        limitMsg.textContent = "Loaded your previous plan.";
      }
    }
  })();
})();
