(function () {
  "use strict";

  const DATA = JSON.parse(document.getElementById("bulb-data").textContent);

  const LIGHT_TYPES = [
    { key: "low_beam", label: "الواطي (Low Beam)" },
    { key: "high_beam", label: "العالي (High Beam)" },
    { key: "fog", label: "الشبورة (Fog)" },
    { key: "signal", label: "الإشارة / الإضاءة (Signal)" },
  ];

  const selBrand = document.getElementById("selBrand");
  const selModel = document.getElementById("selModel");
  const selYear = document.getElementById("selYear");
  const selLight = document.getElementById("selLight");
  const fieldModel = document.getElementById("field-model");
  const fieldYear = document.getElementById("field-year");
  const fieldLight = document.getElementById("field-light");
  const btnSearch = document.getElementById("btnSearch");
  const btnReset = document.getElementById("btnReset");
  const resultWrap = document.getElementById("resultWrap");

  let state = { brand: "", modelIdx: null, year: "", light: "" };

  // ---- helpers ----
  function uniqueBrands() {
    const seen = new Map();
    DATA.forEach((r) => {
      if (!seen.has(r.brand_ar)) seen.set(r.brand_ar, r.brand_en);
    });
    return Array.from(seen.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "ar")
    );
  }

  function modelsForBrand(brand) {
    return DATA.map((r, i) => ({ ...r, _idx: i })).filter(
      (r) => r.brand_ar === brand
    );
  }

  function parseYearRange(yearsStr) {
    // formats like "2007 - 2013" or "1990 - 2026"
    const m = String(yearsStr).match(/(\d{4})\s*-\s*(\d{4})/);
    if (!m) return [String(yearsStr)];
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    const years = [];
    for (let y = end; y >= start; y--) years.push(String(y));
    return years;
  }

  function fillSelect(select, options, placeholder) {
    select.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.text;
      select.appendChild(opt);
    });
  }

  function setFieldEnabled(fieldEl, selectEl, enabled) {
    selectEl.disabled = !enabled;
    fieldEl.classList.toggle("disabled", !enabled);
  }

  function clearModelField() {
    state.modelIdx = null;
    fillSelect(selModel, [], "اختار الموديل");
    setFieldEnabled(fieldModel, selModel, false);
  }
  function clearYearField() {
    state.year = "";
    fillSelect(selYear, [], "اختار السنة");
    setFieldEnabled(fieldYear, selYear, false);
  }
  function clearLightField() {
    state.light = "";
    fillSelect(selLight, [], "اختار نوع الإضاءة");
    setFieldEnabled(fieldLight, selLight, false);
  }

  // Clears everything BELOW the given level (does not touch the level itself)
  function resetFrom(level) {
    if (level === "brand") {
      clearModelField();
      clearYearField();
      clearLightField();
    } else if (level === "model") {
      clearYearField();
      clearLightField();
    } else if (level === "year") {
      clearLightField();
    }
    btnSearch.disabled = true;
    showEmptyResult();
  }

  function showEmptyResult() {
    resultWrap.innerHTML =
      '<div class="result-empty" id="resultEmpty">النتيجة هتظهر هنا بعد ما تختار عربيتك وتدوس بحث 🔍</div>';
  }

  // ---- init brand select ----
  fillSelect(
    selBrand,
    uniqueBrands().map(([ar, en]) => ({
      value: ar,
      text: en ? `${ar} (${en})` : ar,
    })),
    "اختار الماركة"
  );

  // ---- events ----
  selBrand.addEventListener("change", () => {
    state.brand = selBrand.value;
    resetFrom("brand");
    if (!state.brand) return;

    const models = modelsForBrand(state.brand);
    fillSelect(
      selModel,
      models.map((m) => ({
        value: String(m._idx),
        text: m.model_en ? `${m.model_ar} (${m.model_en})` : m.model_ar,
      })),
      "اختار الموديل"
    );
    setFieldEnabled(fieldModel, selModel, true);
  });

  selModel.addEventListener("change", () => {
    resetFrom("model");
    if (!selModel.value) return;
    state.modelIdx = parseInt(selModel.value, 10);
    const row = DATA[state.modelIdx];
    const years = parseYearRange(row.years);
    fillSelect(
      selYear,
      years.map((y) => ({ value: y, text: y })),
      "اختار السنة"
    );
    setFieldEnabled(fieldYear, selYear, true);
  });

  selYear.addEventListener("change", () => {
    resetFrom("year");
    if (!selYear.value) return;
    state.year = selYear.value;
    fillSelect(
      selLight,
      LIGHT_TYPES.map((lt) => ({ value: lt.key, text: lt.label })),
      "اختار نوع الإضاءة"
    );
    setFieldEnabled(fieldLight, selLight, true);
  });

  selLight.addEventListener("change", () => {
    state.light = selLight.value;
    btnSearch.disabled = !state.light;
  });

  btnReset.addEventListener("click", () => {
    state = { brand: "", modelIdx: null, year: "", light: "" };
    selBrand.value = "";
    resetFrom("brand");
  });

  btnSearch.addEventListener("click", () => {
    if (state.modelIdx === null || !state.light) return;
    const row = DATA[state.modelIdx];

    const bulbItemsHtml = LIGHT_TYPES.map((lt) => {
      const isHighlight = lt.key === state.light;
      return `
        <div class="bulb-item ${isHighlight ? "highlight" : ""}">
          <div class="lbl">${lt.label}</div>
          <div class="code">${escapeHtml(row[lt.key])}</div>
        </div>`;
    }).join("");

    resultWrap.innerHTML = `
      <div class="result-card">
        <div class="result-head">
          <div>
            <div class="car-name">${escapeHtml(row.brand_ar)} ${escapeHtml(
      row.model_ar
    )}</div>
            <div class="car-sub">${escapeHtml(
              row.brand_en
            )} ${escapeHtml(row.model_en)} · موديل ${escapeHtml(
      state.year
    )}</div>
          </div>
          <div class="year-chip">${escapeHtml(row.years)}</div>
        </div>
        <div class="bulb-grid">${bulbItemsHtml}</div>
      </div>
    `;
    resultWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  // ---- reference bulb-shape strip ("check your old bulb") ----
  const REF_BULBS = [
    { code: "H4", name: "لمبة موحدة" },
    { code: "H7", name: "قابس واحد" },
    { code: "H1", name: "لمبة عالي شائعة" },
    { code: "H11", name: "شبورة/واطي" },
    { code: "9005 / HB3", name: "عالي أمريكي" },
    { code: "9006 / HB4", name: "واطي أمريكي" },
    { code: "PY21W", name: "إشارة كهرمانية" },
    { code: "LED", name: "وحدة مدمجة" },
  ];

  const bulbSvg = () => `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 3.03 1.68 5.4 4 6.65V19a1 1 0 001 1h6a1 1 0 001-1v-2.35c2.32-1.25 4-3.62 4-6.65 0-4.42-3.58-8-8-8z" fill="#5b8dff" opacity="0.85"/>
      <rect x="10" y="21" width="4" height="2" rx="1" fill="#8ea0c2"/>
      <path d="M9 10l2 2 4-4" stroke="#0b1428" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const refScroll = document.getElementById("refScroll");
  refScroll.innerHTML = REF_BULBS.map(
    (b) => `
    <div class="ref-card">
      ${bulbSvg()}
      <div class="code">${escapeHtml(b.code)}</div>
      <div class="name">${escapeHtml(b.name)}</div>
    </div>`
  ).join("");
})();
