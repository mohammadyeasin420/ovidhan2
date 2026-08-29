(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OvidhanWritingPractice = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MODES = ["academic-task1", "academic-task2", "gt-letter", "gt-essay"];
  const TASK1_CHECKS = ["OVERVIEW", "IMPORTANT_FEATURES", "COMPARISON", "DATA_CHECK"];
  const TASK1_ANSWERS = ["YES", "NO", "NOT_SURE"];
  const TASK1_REPAIR_CODES = Object.freeze({OVERVIEW:"OVERVIEW_MISSING", IMPORTANT_FEATURES:"IMPORTANT_FEATURE_MISSED", DATA_CHECK:"DATA_ERROR"});
  function countWords(text) {
    const value = String(text || "").trim();
    return value ? value.split(/\s+/u).length : 0;
  }
  function durationBucket(seconds) {
    return seconds < 30
      ? "UNDER_30_SECONDS"
      : seconds < 60
        ? "30_TO_59_SECONDS"
        : seconds < 120
          ? "60_TO_119_SECONDS"
          : "120_SECONDS_OR_MORE";
  }
  function createWritingSession(
    gtPack,
    academicPack,
    now,
    initialMode,
    repairPack,
  ) {
    if (typeof academicPack === "function") {
      repairPack =
        initialMode && typeof initialMode === "object" ? initialMode : null;
      initialMode = typeof initialMode === "string" ? initialMode : "gt-letter";
      now = academicPack;
      academicPack = null;
    }
    now = now || Date.now;
    let mode = MODES.includes(initialMode) ? initialMode : "gt-letter",
      index = 0,
      text = "",
      stage = "writing",
      startedAt = null,
      finishedDuration = 0,
      repairs = [],
      activeRepair = null,
      repairStageIndex = 0,
      repairResponse = "",
      repairChecked = false,
      repairReflection = "",
      minimumMode = false;
    let task1Checks = {}, task1CheckCompleted = false;
    const list = () =>
        mode === "gt-letter"
          ? gtPack.gt_task1_letters
          : mode === "gt-essay"
            ? gtPack.gt_task2_essays
            : mode === "academic-task1"
              ? academicPack.academic_task1
              : academicPack.academic_task2,
      current = () => list()[index % list().length],
      taskType = () =>
        mode === "academic-task1"
          ? "ACADEMIC_TASK_1"
          : mode === "academic-task2"
            ? "ACADEMIC_TASK_2"
            : mode === "gt-letter"
              ? "GT_TASK_1"
              : "GT_TASK_2",
      repairDefinition = () =>
        repairPack &&
        repairPack.repair_codes.find((x) => x.repair_code === activeRepair),
      activity = () => repairDefinition()?.activities[repairStageIndex] || null;
    return {
      getState: () => ({
        mode: mode,
        index: index,
        stage: stage,
        text: text,
        wordCount: countWords(text),
        startedAt: startedAt,
        finishedDuration: finishedDuration,
        repairs: [...repairs],
        applicableRepairs: repairPack
          ? repairPack.repair_codes.filter((x) =>
              x.applicability.includes(taskType()),
            )
          : [],
        activeRepair: activeRepair,
        repairStageIndex: repairStageIndex,
        repairResponse: repairResponse,
        repairChecked: repairChecked,
        repairReflection: repairReflection,
        minimumMode: minimumMode,
        repairActivity: activity(),
        task1Checks: {...task1Checks},
        task1CheckCompleted,
        item: current(),
      }),
      setText(value) {
        text = String(value || "");
        if (startedAt === null && text.trim()) startedAt = now();
        stage = "writing";
        return countWords(text);
      },
      setRepairResponse(value) {
        repairResponse = String(value || "");
        repairChecked = false;
        return repairResponse;
      },
      finish() {
        if (!text.trim() || startedAt === null) return null;
        finishedDuration = Math.max(1, Math.round((now() - startedAt) / 1e3));
        stage = "review";
        const item = current(),
          itemTaskType = item.task_type,
          academic = itemTaskType.startsWith("ACADEMIC_"),
          skillId =
            itemTaskType === "GT_TASK_1_LETTER"
              ? "writing_letter_task_response"
              : itemTaskType === "ACADEMIC_TASK_1_VISUAL"
                ? "writing_visual_information_description"
                : "writing_argument_development";
        return {
          evidenceId: `${academic ? "ielts-writing-performance" : "ielts-gt-writing-v1"}:${item.id}`,
          skillId: skillId,
          evidenceType: "WRITING_PERFORMANCE_ATTEMPT",
          taskType: itemTaskType,
          sourceId: item.id,
          durationBucket: durationBucket(finishedDuration),
        };
      },
      setTask1Check(checkType, answer) {
        if (mode === "academic-task1" && stage === "review" && TASK1_CHECKS.includes(checkType) && TASK1_ANSWERS.includes(answer)) task1Checks[checkType] = answer;
        return this.getState();
      },
      completeTask1Check() {
        if (mode !== "academic-task1" || stage !== "review" || TASK1_CHECKS.some((key) => !TASK1_ANSWERS.includes(task1Checks[key]))) return null;
        task1CheckCompleted = true;
        const item = current();
        return TASK1_CHECKS.map((checkType) => ({evidenceId:`ielts-task1-check:${item.id}:${checkType.toLowerCase()}`,taskId:item.id,skillId:"writing_visual_information_description",checkType,evidenceSource:"SELF_REPORTED_RESPONSE_CHECK",learnerAnswer:task1Checks[checkType],repairCode:TASK1_REPAIR_CODES[checkType] || null}));
      },
      toggleRepair(code, checked) {
        const valid =
          !repairPack ||
          repairPack.repair_codes.some(
            (x) =>
              x.repair_code === code && x.applicability.includes(taskType()),
          );
        if (!valid) return this.getState();
        repairs = checked
          ? [...new Set([...repairs, code])]
          : repairs.filter((x) => x !== code);
        return this.getState();
      },
      startRepair(code) {
        if (!repairs.includes(code)) return this.getState();
        minimumMode = false;
        activeRepair = code;
        repairStageIndex = 0;
        repairResponse = "";
        repairChecked = false;
        repairReflection = "";
        task1Checks = {}; task1CheckCompleted = false;
        stage = "repair";
        return this.getState();
      },
      startMinimumRepair(result) {
        const definition = result && result.provenance === "LEARNER_SELECTED" && result.task_type === current().task_type && repairPack && repairPack.repair_codes.find((x) => x.repair_code === result.repair_code && x.applicability.includes(taskType()));
        if (!definition) return this.getState();
        repairs = [result.repair_code]; activeRepair = result.repair_code; repairStageIndex = 0; repairResponse = ""; repairChecked = false; repairReflection = ""; minimumMode = true; stage = "repair";
        return this.getState();
      },
      checkRepair() {
        if (stage !== "repair" || !repairResponse.trim()) return false;
        repairChecked = true;
        return true;
      },
      continueRepair() {
        if (stage !== "repair" || !repairResponse.trim() || !repairChecked)
          return this.getState();
        repairResponse = "";
        repairChecked = false;
        if (minimumMode && repairStageIndex === 1) { stage = "writing"; activeRepair = null; repairStageIndex = 0; minimumMode = false; startedAt = null; finishedDuration = 0; }
        else if (repairStageIndex < 2) repairStageIndex++;
        else stage = "repair-complete";
        return this.getState();
      },
      setRepairReflection(value) {
        repairReflection = ["BETTER", "TRY_AGAIN", "SAME"].includes(value) ? value : "";
        return this.getState();
      },
      returnToWriting() {
        if (stage !== "repair-complete") return this.getState();
        stage = "writing";
        startedAt = null;
        finishedDuration = 0;
        activeRepair = null;
        repairStageIndex = 0;
        repairResponse = "";
        repairChecked = false;
        repairReflection = "";
        minimumMode = false;
        task1Checks = {}; task1CheckCompleted = false;
        return this.getState();
      },
      revise() {
        stage = "writing";
        startedAt = null;
        finishedDuration = 0;
        task1Checks = {}; task1CheckCompleted = false;
        return this.getState();
      },
      next() {
        index = (index + 1) % list().length;
        text = "";
        stage = "writing";
        startedAt = null;
        finishedDuration = 0;
        repairs = [];
        activeRepair = null;
        repairResponse = "";
        repairChecked = false;
        repairReflection = "";
        minimumMode = false;
        task1Checks = {}; task1CheckCompleted = false;
        return this.getState();
      },
      changeMode(next) {
        if (!MODES.includes(next)) return this.getState();
        mode = next;
        index = 0;
        text = "";
        stage = "writing";
        startedAt = null;
        finishedDuration = 0;
        repairs = [];
        activeRepair = null;
        repairResponse = "";
        repairChecked = false;
        repairReflection = "";
        minimumMode = false;
        task1Checks = {}; task1CheckCompleted = false;
        return this.getState();
      },
    };
  }
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function renderTask1EvidenceCheck(state) {
    if (state.mode !== "academic-task1" || state.stage !== "review") return "";
    const labels = {OVERVIEW:"I included a clear overview of the main trends or features.",IMPORTANT_FEATURES:"I selected the most important features instead of describing every point.",COMPARISON:"I made relevant comparisons where this visual supports them.",DATA_CHECK:"I checked figures, categories, units, direction and time labels."};
    const rows = TASK1_CHECKS.map((checkType) => `<fieldset><legend>${esc(checkType.replaceAll("_", " "))}</legend><p>${esc(labels[checkType])}</p>${TASK1_ANSWERS.map((answer) => `<label><input type="radio" name="task1-${checkType}" data-task1-check="${checkType}" value="${answer}"${state.task1Checks[checkType] === answer ? " checked" : ""}${state.task1CheckCompleted ? " disabled" : ""}> ${answer.replace("_", " ")}</label>`).join("")}</fieldset>`).join("");
    const ready = TASK1_CHECKS.every((key) => TASK1_ANSWERS.includes(state.task1Checks[key]));
    return `<section class="task1-evidence-check"><h2>Task 1 Evidence Check</h2><p lang="bn">আপনার Task 1 উত্তর যাচাই করুন</p><p><strong>This is learner self-review for practice, not examiner scoring.</strong> It does not assess Task Achievement, inspect your writing, or create a score, band or mastery result.</p>${rows}${state.task1CheckCompleted ? "<p>Self-check saved as bounded learner-selected evidence. Your writing was not saved.</p>" : `<button class="primary" data-action="complete-task1-check"${ready ? "" : " disabled"}>Complete self-check</button>`}</section>`;
  }
  function persistTask1CheckRecords(learning, records) {
    if (!learning || !Array.isArray(records)) return false;
    let persisted = false;
    records.forEach((record) => {
      if (typeof learning.recordTask1StructuredEvidence === "function") persisted = learning.recordTask1StructuredEvidence(record) || persisted;
      if (["NO", "NOT_SURE"].includes(record.learnerAnswer) && record.repairCode && typeof learning.recordProductiveRetryEvidence === "function") learning.recordProductiveRetryEvidence({evidenceId:`ielts-productive-retry:${record.taskId}:${record.repairCode.toLowerCase()}`,skillId:record.skillId,taskType:"ACADEMIC_TASK_1_VISUAL",sourceId:record.taskId,repairCode:record.repairCode,stage:"SELECTED"});
    });
    return persisted;
  }
  function coordinates(values, w = 640, h = 260, p = 42) {
    const max = Math.max(...values),
      min = Math.min(0, ...values),
      span = max - min || 1;
    return values.map((v, i) => [
      p + (i * (w - p * 2)) / Math.max(1, values.length - 1),
      h - p - ((v - min) * (h - p * 2)) / span,
    ]);
  }
  function dataTable(data) {
    const categories = data.categories || data.stages || [],
      unit = data.unit ? ` — Unit: ${esc(data.unit)}` : "";
    if (data.series?.length)
      return `<div class="visual-table-wrap"><table><caption>Accessible data table${unit}</caption><thead><tr><th>Category</th>${data.series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${categories.map((c, i) => `<tr><th>${esc(c)}</th>${data.series.map((s) => `<td>${esc(s.values[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    return `<ol>${(data.raw_lines || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
  }
  function legend(items) {
    return `<ul class="chart-legend" aria-label="Chart legend">${items.map((x, i) => `<li><span class="legend-key series-${i}" aria-hidden="true"></span>${esc(x)}</li>`).join("")}</ul>`;
  }
  function lineVisual(data) {
    const s = data.series[0],
      w = 640,
      h = 300,
      p = 52,
      coords = coordinates(s.values, w, h, p);
    return `<p class="chart-unit">Unit: ${esc(data.unit || s.name)}</p><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Line graph: ${esc(s.name)}; unit: ${esc(data.unit || s.name)}"><polyline class="chart-line" points="${coords.map((x) => x.join(",")).join(" ")}"/>${s.values.map((v, i) => `<g><circle cx="${coords[i][0]}" cy="${coords[i][1]}" r="5"><title>${esc((data.categories || [])[i])}: ${v} ${esc(data.unit || "")}</title></circle><text class="value-label" x="${coords[i][0]}" y="${coords[i][1] - 10}" text-anchor="middle">${v}</text></g>`).join("")}${(data.categories || []).map((x, i) => `<text class="axis-label" x="${coords[i][0]}" y="${h - 14}" text-anchor="middle">${esc(x)}</text>`).join("")}</svg>`;
  }
  function barVisual(data) {
    const w = 640,
      h = 320,
      p = 54,
      n = data.categories.length,
      series = data.series,
      max = Math.max(...series.flatMap((s) => s.values)),
      group = (w - p * 2) / n,
      bar = Math.min(30, group / (series.length + 1));
    let marks = "";
    series.forEach((s, si) =>
      s.values.forEach((v, i) => {
        const bh = (v / max) * (h - p * 2),
          x = p + i * group + (si + 0.4) * bar,
          y = h - p - bh;
        marks += `<g><rect data-series="${esc(s.name)}" x="${x}" y="${y}" width="${bar - 3}" height="${bh}" class="series-${si}"><title>${esc(data.categories[i])}, ${esc(s.name)}: ${v} ${esc(data.unit || "")}</title></rect><text class="value-label" x="${x + (bar - 3) / 2}" y="${y - 7}" text-anchor="middle">${v}</text></g>`;
      }),
    );
    return `${legend(series.map((s) => s.name))}<p class="chart-unit">Unit: ${esc(data.unit || "as shown")}</p><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grouped bar chart; unit: ${esc(data.unit || "as shown")}">${marks}${data.categories.map((x, i) => `<text class="axis-label" x="${p + i * group + group / 2}" y="${h - 14}" text-anchor="middle">${esc(x)}</text>`).join("")}</svg>`;
  }
  function mixedVisual(data) {
    const sales = data.series[0],
      margin = data.series[1],
      w = 640,
      h = 330,
      p = 58,
      group = (w - p * 2) / data.categories.length,
      bar = 42,
      salesMax = Math.max(...sales.values),
      marginMax = Math.max(...margin.values),
      linePoints = margin.values.map((v, i) => [
        p + i * group + group / 2,
        h - p - (v / marginMax) * (h - p * 2),
      ]);
    const bars = sales.values
      .map((v, i) => {
        const bh = (v / salesMax) * (h - p * 2),
          x = p + i * group + group / 2 - bar / 2,
          y = h - p - bh;
        return `<g><rect data-series="Sales" x="${x}" y="${y}" width="${bar}" height="${bh}" class="series-0"><title>${esc(data.categories[i])}, Sales: ${v} million USD</title></rect><text class="value-label" x="${x + bar / 2}" y="${y - 8}" text-anchor="middle">${v}</text></g>`;
      })
      .join("");
    const points = margin.values
      .map(
        (v, i) =>
          `<g><circle data-series="Profit Margin" cx="${linePoints[i][0]}" cy="${linePoints[i][1]}" r="5"><title>${esc(data.categories[i])}, Profit Margin: ${v}%</title></circle><text class="value-label" x="${linePoints[i][0]}" y="${linePoints[i][1] - 11}" text-anchor="middle">${v}%</text></g>`,
      )
      .join("");
    return `<ul class="chart-legend" aria-label="Chart legend"><li><span class="legend-key series-0" aria-hidden="true"></span>Sales — bars (million USD)</li><li><span class="legend-key line-key" aria-hidden="true"></span>Profit Margin — line (%)</li></ul><p class="chart-unit">Separate scales: sales bars use million USD; the profit-margin line uses percent (%).</p><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Mixed chart with Sales bars in million USD and Profit Margin line in percent; separate scales">${bars}<polyline data-series="Profit Margin" class="chart-line chart-line-alt" points="${linePoints.map((x) => x.join(",")).join(" ")}"/>${points}${data.categories.map((x, i) => `<text class="axis-label" x="${p + i * group + group / 2}" y="${h - 14}" text-anchor="middle">${esc(x)}</text>`).join("")}</svg>`;
  }
  function pieVisual(data) {
    const colors = ["#32c6b0", "#f4bd50", "#70a6ff", "#f27d83", "#a78bfa"];
    const categoryLegend = `<ul class="chart-legend category-legend" aria-label="Category colour legend">${data.categories.map((x, i) => `<li><span class="legend-key" style="background:${colors[i]}" aria-hidden="true"></span>${esc(x)}</li>`).join("")}</ul>`;
    return `${categoryLegend}<div class="pie-grid">${data.series
      .map((series) => {
        let offset = 0;
        const stops = series.values
          .map((v, i) => {
            const a = offset;
            offset += v;
            return `${colors[i % colors.length]} ${a}% ${offset}%`;
          })
          .join(",");
        return `<figure><div class="pie" role="img" aria-label="${esc(series.name)}: ${data.categories.map((x, i) => `${x} ${series.values[i]}%`).join(", ")}" style="background:conic-gradient(${stops})"></div><figcaption>Year: ${esc(series.name)}</figcaption></figure>`;
      })
      .join("")}</div>`;
  }
  function processVisual(data) {
    return `<ol class="process-flow" aria-label="Eight-stage paper recycling process">${data.stages.map((x, i) => `<li><span>${i + 1}</span>${esc(x)}</li>`).join("")}</ol>`;
  }
  function mapSvg(year) {
    const modern = year === "2020";
    return `<svg viewBox="0 0 420 270" role="img" aria-label="Village map in ${year}, north at top"><text x="205" y="18">N ↑ · north</text><rect x="6" y="6" width="408" height="258" class="map-land"/><path d="M35 8 C55 70 20 135 48 262" class="map-river"/><path d="M35 138 H410" class="map-road"/>${modern ? '<path d="M42 190 H410" class="map-rail"/><path d="M22 225 H67" class="map-bridge"/>' : ""}<text x="120" y="62">Church</text><text x="315" y="52">School</text>${modern ? '<text x="275" y="92">New supermarket</text><text x="275" y="235">New hospital</text><text x="105" y="105">Many more houses</text><text x="145" y="175">Expanded housing</text><text x="60" y="245">Reduced farmland</text><text x="235" y="205">New railway line</text><text x="12" y="220">New bridge</text>' : '<text x="145" y="110">A few scattered houses</text><text x="155" y="205">Farmland</text>'}<text x="300" y="132">${modern ? "Paved main road" : "Dirt main road"}</text></svg>`;
  }
  function mapVisual() {
    return `<div class="map-grid"><figure>${mapSvg("1920")}<figcaption>1920</figcaption></figure><figure>${mapSvg("2020")}<figcaption>2020</figcaption></figure></div>`;
  }
  function renderVisual(item) {
    const data = item.visual_data,
      type = item.visual_type.toLowerCase();
    let visual =
      type.includes("line graph") && !type.includes("mixed")
        ? lineVisual(data)
        : type.includes("bar chart") && !type.includes("mixed")
          ? barVisual(data)
          : type.includes("pie")
            ? pieVisual(data)
            : type.includes("mixed")
              ? mixedVisual(data)
              : type.includes("process")
                ? processVisual(data)
                : type.includes("map")
                  ? mapVisual()
                  : dataTable(data);
    return `<section class="academic-visual" data-task-id="${esc(item.id)}"><p class="visual-label">Ovidhan-created IELTS-style visual · ${esc(item.visual_type)}</p>${visual}<details><summary>Accessible data representation</summary>${dataTable(data)}</details></section>`;
  }
  function list(items) {
    return `<ul>${(items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }
  function mount(documentObject, windowObject) {
    const host = documentObject.getElementById("writingPractice");
    if (!host) return;
    const minimumRepair = windowObject.OvidhanIeltsMinimumRepairSet;
    let pendingMinimum = null;
    if (minimumRepair) pendingMinimum = minimumRepair.consumeWindowHandoff(windowObject);
    let gtPack,
      academicPack,
      repairPack,
      session,
      timer = null,
      elapsed = 0;
    const clearTimer = () => {
        if (timer !== null) {
          windowObject.clearInterval(timer);
          timer = null;
        }
      },
      modeFromUrl = () => {
        const mode = new URLSearchParams(windowObject.location.search).get(
          "mode",
        );
        return MODES.includes(mode) ? mode : "gt-letter";
      };
    function recordProductive(stage, repairCode, reflection) {
      const learning = windowObject.OvidhanLearning, state = session.getState(), item = state.item;
      if (!learning || typeof learning.recordProductiveRetryEvidence !== "function" || !repairCode) return false;
      const skillId = item.task_type === "GT_TASK_1_LETTER" ? "writing_letter_task_response" : item.task_type === "ACADEMIC_TASK_1_VISUAL" ? "writing_visual_information_description" : "writing_argument_development";
      return learning.recordProductiveRetryEvidence({evidenceId:`ielts-productive-retry:${item.id}:${repairCode.toLowerCase()}`,skillId,taskType:item.task_type,sourceId:item.id,repairCode,stage,reflection});
    }
    function render() {
      const state = session.getState();
      const repairUi = windowObject.OvidhanWritingRepairRetest;
      if (state.stage === "repair" || state.stage === "repair-complete") {
        host.innerHTML = repairUi.renderRepair(state);
        bind();
        host.querySelector(".writing-repair")?.focus();
        return;
      }
      const
        item = state.item,
        academic = state.mode.startsWith("academic"),
        task1 = state.mode === "academic-task1",
        review = academic
          ? item.self_review
          : gtPack.self_review_frameworks[item.task_type],
        guidance =
          !academic &&
          item.expected_register &&
          gtPack.register_guidance[item.expected_register],
        repairRows = state.applicableRepairs;
      host.innerHTML = `<div class="writing-modes" role="tablist" aria-label="IELTS Writing practice mode">${[
        ["academic-task1", "Academic Task 1"],
        ["academic-task2", "Academic Task 2"],
        ["gt-letter", "GT Task 1 Letter"],
        ["gt-essay", "GT Task 2 Essay"],
      ]
        .map(
          ([m, l]) =>
            `<button data-mode="${m}" aria-selected="${state.mode === m}">${l}</button>`,
        )
        .join(
          "",
        )}</div><article class="writing-prompt"><p class="eyebrow">${academic ? "Academic · Ovidhan-created · Not official IELTS" : esc((item.expected_register || item.reasoning_demand || item.question_type).replaceAll("_", " "))}</p>${item.title ? `<h2>${esc(item.title)}</h2>` : ""}${item.context ? `<p>${esc(item.context)}</p>` : ""}<p class="task-prompt">${esc(item.prompt_en)}</p><p lang="bn">${esc(item.prompt_bn)}</p>${task1 ? renderVisual(item) : ""}${academic ? `<details class="planning-help"><summary>Planning and useful language</summary>${task1 ? `<h3>Overview targets</h3>${list(item.overview_targets)}` : `<h3>Task requirements</h3>${list(item.task_requirements)}<h3>Planning questions</h3>${list(item.planning_questions)}`}<h3>বাংলা planning help</h3>${list(item.bangla_planning_help)}<h3>Useful language</h3>${list(item.useful_language)}<h3>Common mistakes</h3>${list(item.common_mistakes)}</details>` : guidance ? `<details><summary>Register guidance</summary>${list(guidance.guidance)}${guidance.note ? `<p>${esc(guidance.note)}</p>` : ""}</details>` : ""}</article><section class="writing-workspace"><p class="privacy-note">আপনার লেখা শুধু এই page session-এর memory-তে থাকে; এটি save, upload, analytics বা assessment-এর জন্য পাঠানো হয় না।</p><label for="writingResponse">আপনার উত্তর লিখুন</label><textarea id="writingResponse" rows="14" autocomplete="off"${state.stage === "review" ? " readonly" : ""}>${esc(state.text)}</textarea><div class="writing-meta"><span id="wordCount">শব্দ সংখ্যা: ${state.wordCount}</span><span id="writingTimer">সময়: ${elapsed}s</span></div><div class="writing-controls">${state.stage === "review" ? '<button data-action="revise">উত্তর সংশোধন করুন</button><button class="primary" data-action="next">পরবর্তী টাস্ক</button>' : '<button class="primary" data-action="finish">লেখা শেষ করুন</button>'}</div>${
        state.stage === "review"
          ? `${renderTask1EvidenceCheck(state)}<fieldset class="self-review"><legend>Self-review</legend>${review.map((x) => `<label><input type="checkbox"> ${esc(x)}</label>`).join("")}</fieldset>${
              repairRows.length
                ? `<fieldset class="repair-review"><legend>Choose weakness(es) for your retry · দুর্বলতা নিজে বেছে নিন</legend>${repairRows.map((x) => `<label><input type="checkbox" data-repair="${x.repair_code}"${state.repairs.includes(x.repair_code) ? " checked" : ""}> <strong>${esc(x.learner_label_en)}</strong> — ${esc(x.learner_label_bn)}</label>`).join("")}</fieldset><div class="repair-guidance">${
                    repairRows
                      .filter((x) => state.repairs.includes(x.repair_code))
                      .map(
                        (x) =>
                          `<article><h3>${esc(x.learner_label_en)} · ${esc(x.learner_label_bn)}</h3><p>${esc(x.explanation_bn)}</p><button data-start-repair="${x.repair_code}">Practice this weakness · এই দুর্বলতা অনুশীলন করুন</button></article>`,
                      )
                      .join("") ||
                    "<p>এক বা একাধিক weakness বেছে নিন; সিদ্ধান্তটি আপনার, automatic judgement নয়।</p>"
                  }</div>`
                : ""
            }<p>Only coarse attempt metadata may be recorded. No writing text, score, band or inferred quality is stored.</p>`
          : ""
      }</section>`;
      bind();
    }
    function bind() {
      host.querySelectorAll("[data-mode]").forEach(
        (button) =>
          (button.onclick = () => {
            clearTimer();
            elapsed = 0;
            session.changeMode(button.dataset.mode);
            windowObject.history.replaceState(
              {},
              "",
              `${windowObject.location.pathname}?mode=${button.dataset.mode}`,
            );
            render();
          }),
      );
      const area = host.querySelector("#writingResponse");
      if (area) area.oninput = () => {
        const wasEmpty = session.getState().startedAt === null,
          words = session.setText(area.value);
        host.querySelector("#wordCount").textContent = `শব্দ সংখ্যা: ${words}`;
        if (wasEmpty && session.getState().startedAt !== null) {
          windowObject.OvidhanLearning?.trackIeltsFunnel?.("ielts_practice_started", {skill_area:"WRITING", task_type:session.getState().item.task_type}, {dedupeKey:session.getState().item.id});
          timer = windowObject.setInterval(() => {
            elapsed++;
            const node = host.querySelector("#writingTimer");
            if (node) node.textContent = `সময়: ${elapsed}s`;
          }, 1e3);
        }
      };
      const finish = host.querySelector("[data-action=finish]");
      if (finish)
        finish.onclick = () => {
          const evidence = session.finish();
          if (!evidence) return;
          clearTimer();
          const learning = windowObject.OvidhanLearning;
          if (
            learning &&
            typeof learning.recordPerformanceEvidence === "function"
          )
            learning.recordPerformanceEvidence(
              evidence.evidenceId,
              evidence.skillId,
              evidence.evidenceType,
              evidence.taskType,
              evidence.sourceId,
              evidence.durationBucket,
            );
          render();
        };
      host.querySelectorAll("[data-repair]").forEach(
        (input) =>
          (input.onchange = () => {
            session.toggleRepair(input.dataset.repair, input.checked);
            render();
          }),
      );
      host.querySelectorAll("[data-task1-check]").forEach((input) => input.onchange = () => {
        session.setTask1Check(input.dataset.task1Check, input.value);
        render();
      });
      host.querySelector("[data-action=complete-task1-check]")?.addEventListener("click", () => {
        const records = session.completeTask1Check();
        if (!records) return;
        const learning = windowObject.OvidhanLearning;
        persistTask1CheckRecords(learning, records);
        render();
      });
      host.querySelectorAll("[data-start-repair]").forEach(
        (button) =>
          (button.onclick = () => {
            session.startRepair(button.dataset.startRepair);
            recordProductive("SELECTED", button.dataset.startRepair);
            recordProductive("REPAIR_STARTED", button.dataset.startRepair);
            render();
          }),
      );
      const updateRepairResponse = (value) => {
        session.setRepairResponse(value);
        const check = host.querySelector("[data-action=check-repair]");
        if (check) check.disabled = !String(value).trim();
      };
      host
        .querySelector("#repairResponse")
        ?.addEventListener("input", (event) =>
          updateRepairResponse(event.target.value),
        );
      host
        .querySelectorAll("input[name=repairObjective]")
        .forEach(
          (input) =>
            (input.onchange = () => updateRepairResponse(input.value)),
        );
      host
        .querySelector("[data-action=check-repair]")
        ?.addEventListener("click", () => {
          if (session.checkRepair()) render();
        });
      host
        .querySelector("[data-action=continue-repair]")
        ?.addEventListener("click", () => {
          const before = session.getState();
          session.continueRepair();
          const after = session.getState();
          if (before.minimumMode && before.repairStageIndex === 1 && after.stage === "writing") {
            recordProductive("REPAIR_COMPLETED", before.activeRepair);
          } else if (before.repairStageIndex === 1 && after.repairStageIndex === 2) {
            recordProductive("REPAIR_COMPLETED", before.activeRepair);
            recordProductive("RETEST_STARTED", before.activeRepair);
          } else if (before.repairStageIndex === 2 && after.stage === "repair-complete") recordProductive("RETEST_COMPLETED", before.activeRepair);
          render();
        });
      host
        .querySelector("[data-action=return-writing]")
        ?.addEventListener("click", () => {
          session.returnToWriting();
          elapsed = 0;
          render();
          host.querySelector("#writingResponse")?.focus();
        });
      host.querySelectorAll("input[name=writingReflection]").forEach((input) => input.addEventListener("change", () => {
        session.setRepairReflection(input.value);
        recordProductive("REFLECTED", session.getState().activeRepair, input.value);
        render();
      }));
      const revise = host.querySelector("[data-action=revise]");
      if (revise)
        revise.onclick = () => {
          clearTimer();
          elapsed = 0;
          session.revise();
          render();
        };
      const next = host.querySelector("[data-action=next]");
      if (next)
        next.onclick = () => {
          clearTimer();
          elapsed = 0;
          session.next();
          render();
        };
    }
    Promise.all([
      fetch("/data/ielts-gt-writing-performance-v1.json").then((r) => {
        if (!r.ok) throw new Error("gt pack");
        return r.json();
      }),
      fetch("/data/ielts-academic-writing-performance-v1.json").then((r) => {
        if (!r.ok) throw new Error("academic pack");
        return r.json();
      }),
      fetch("/data/ielts-writing-repair-retest-v1.json").then((r) => {
        if (!r.ok) throw new Error("repair pack");
        return r.json();
      }),
    ])
      .then(([gt, academic, repair]) => {
        gtPack = gt;
        academicPack = academic;
        repairPack = repair;
        session = createWritingSession(
          gtPack,
          academicPack,
          Date.now,
          modeFromUrl(),
          repairPack,
        );
        if (pendingMinimum && minimumRepair) {
          const validated = minimumRepair.validateHandoff(pendingMinimum, repairPack, session.getState().item.task_type);
          if (validated) session.startMinimumRepair(validated);
        }
        render();
      })
      .catch(() => {
        clearTimer();
        host.innerHTML =
          '<p role="alert">Writing practice could not be loaded. Please refresh and try again.</p>';
      });
    windowObject.addEventListener("beforeunload", clearTimer);
  }
  if (typeof document !== "undefined")
    document.addEventListener("DOMContentLoaded", () =>
      mount(document, window),
    );
  return {
    MODES: MODES,
    countWords: countWords,
    durationBucket: durationBucket,
    createWritingSession: createWritingSession,
    renderTask1EvidenceCheck: renderTask1EvidenceCheck,
    persistTask1CheckRecords: persistTask1CheckRecords,
    TASK1_CHECKS: TASK1_CHECKS,
    TASK1_REPAIR_CODES: TASK1_REPAIR_CODES,
    renderVisual: renderVisual,
    mount: mount,
  };
});
