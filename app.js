(function () {
  "use strict";

  const LIGHT_TYPES = [
    { key: "low_beam", label: "الواطي (Low Beam)" },
    { key: "high_beam", label: "العالي (High Beam)" },
    { key: "fog", label: "الشبورة (Fog)" },
    { key: "signal", label: "الإشارة والملاحظات (Signal & Notes)" },
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
  const quickSearchInput = document.getElementById("quickSearchInput");

  let DATA = [];
  let state = { brand: "", modelIdx: null, year: "", light: "" };

  // تحميل البيانات من ملف data.json الخارجي بأمان تام
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      DATA = data;
      initApp();
    })
    .catch(err => {
      console.error("Error loading car data:", err);
      selBrand.innerHTML = '<option value="">خطأ في تحميل البيانات</option>';
    });

  function initApp() {
    fillSelect(
      selBrand,
      uniqueBrands().map(([ar, en]) => ({
        value: ar,
        text: en ? `${ar} (${en})` : ar,
      })),
      "اختار الماركة"
    );
  }

  function uniqueBrands() {
    const seen = new Map();
    DATA.forEach((r) => {
      if (r && r.brand_ar && !seen.has(r.brand_ar)) {
        seen.set(r.brand_ar, r.brand_en || "");
      }
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
    if(quickSearchInput) quickSearchInput.value = "";
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
            <div class="car-name">${escapeHtml(row.brand_ar)} ${escapeHtml(row.model_ar)}</div>
            <div style="font-size:0.72rem; color:var(--slate);">${escapeHtml(row.model_en)} · موديل ${escapeHtml(state.year)}</div>
          </div>
          <div class="year-chip">${escapeHtml(row.years)}</div>
        </div>
        <div class="bulb-grid">${bulbItemsHtml}</div>
        <div class="result-actions">
          <a href="https://wa.me/201040919691?text=${encodeURIComponent('أبحث عن لمبة: ' + row.brand_ar + ' ' + row.model_ar)}" target="_blank" class="btn-wa">💬 اطلب اللمبة</a>
          <a href="https://wa.me/201061806336?text=${encodeURIComponent('بلاغ خطأ في سيارة: ' + row.brand_ar + ' ' + row.model_ar)}" target="_blank" class="btn-report">⚠️ إبلاغ</a>
        </div>
      </div>
    `;
  });

  function resetFrom(level) {
    if (level === "brand") {
      state.modelIdx = null; fillSelect(selModel, [], "اختار الموديل"); setFieldEnabled(fieldModel, selModel, false);
      state.year = ""; fillSelect(selYear, [], "اختار السنة"); setFieldEnabled(fieldYear, selYear, false);
      state.light = ""; fillSelect(selLight, [], "اختار نوع الإضاءة"); setFieldEnabled(fieldLight, selLight, false);
    } else if (level === "model") {
      state.year = ""; fillSelect(selYear, [], "اختار السنة"); setFieldEnabled(fieldYear, selYear, false);
      state.light = ""; fillSelect(selLight, [], "اختار نوع الإضاءة"); setFieldEnabled(fieldLight, selLight, false);
    } else if (level === "year") {
      state.light = ""; fillSelect(selLight, [], "اختار نوع الإضاءة"); setFieldEnabled(fieldLight, selLight, false);
    }
    btnSearch.disabled = true;
    resultWrap.innerHTML = '<div class="result-empty">النتيجة هتظهر هنا بعد ما تختار عربيتك وتدوس بحث 🔍</div>';
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
