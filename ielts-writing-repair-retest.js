(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OvidhanWritingRepairRetest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const list = (items) => `<ul>${(items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;

  function renderTable(lines) {
    const rows = lines.map((line) => line.split("|").map((cell) => cell.trim()));
    return `<div class="repair-table-wrap"><table><thead><tr>${rows[0].map((cell) => `<th scope="col">${esc(cell)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderMarkdown(value) {
    const lines = String(value || "").split("\n"), output = [];
    for (let index = 0; index < lines.length; ) {
      if (lines[index].includes("|") && index + 1 < lines.length && lines[index + 1].includes("|")) {
        let end = index + 1;
        while (end + 1 < lines.length && lines[end + 1].includes("|")) end++;
        output.push(renderTable(lines.slice(index, end + 1)));
        index = end + 1;
        continue;
      }
      if (!lines[index].trim()) { index++; continue; }
      let end = index;
      while (end + 1 < lines.length && lines[end + 1].trim() && !lines[end + 1].includes("|")) end++;
      const block = lines.slice(index, end + 1);
      output.push(block.every((line) => /^[-*] /.test(line))
        ? `<ul>${block.map((line) => `<li>${esc(line.replace(/^[-*]\s*/, ""))}</li>`).join("")}</ul>`
        : `<p>${block.map((line) => esc(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")).join("<br>")}</p>`);
      index = end + 1;
    }
    return output.join("");
  }

  function renderRepair(state) {
    const definition = state.applicableRepairs.find((item) => item.repair_code === state.activeRepair);
    if (state.stage === "repair-complete") return `<section class="writing-repair" tabindex="-1"><p class="repair-path">Selected weakness → Notice → Repair → Retest</p><h2>Retest complete · পুনঃপরীক্ষা সম্পন্ন</h2><p>No automatic assessment is made. How did the retest feel for this selected weakness?</p><fieldset><legend>Your self-review · নিজের মূল্যায়ন</legend><label><input type="radio" name="writingReflection" value="BETTER"${state.repairReflection === "BETTER" ? " checked" : ""}> Better · আগের চেয়ে ভালো</label><label><input type="radio" name="writingReflection" value="TRY_AGAIN"${state.repairReflection === "TRY_AGAIN" ? " checked" : ""}> Try again · আবার চেষ্টা করতে চাই</label></fieldset><p>${esc(definition.next_retry_action_en)}</p><p lang="bn">${esc(definition.next_retry_action_bn)}</p><button class="primary" data-action="return-writing">Return to your writing · আপনার লেখায় ফিরুন</button></section>`;
    const activity = state.repairActivity, choices = activity.objective_choices || [], productive = activity.activity_type === "PRODUCTIVE", response = state.repairResponse;
    const control = choices.length
      ? `<fieldset class="objective-choices"><legend>${esc(activity.learner_action)}</legend>${choices.map((choice) => `<label><input type="radio" name="repairObjective" value="${esc(choice.value)}"${response === choice.value ? " checked" : ""}> ${esc(choice.label)}</label>`).join("")}</fieldset>`
      : productive
        ? `<label for="repairResponse">${esc(activity.learner_action)}</label><textarea id="repairResponse" rows="4" autocomplete="off">${esc(response)}</textarea>`
        : `<label for="repairResponse">${esc(activity.learner_action)}</label><input id="repairResponse" type="text" autocomplete="off" value="${esc(response)}">`;
    return `<section class="writing-repair" tabindex="-1"><p class="repair-path">Selected weakness → Notice → Repair → Retest</p><p class="eyebrow">${esc(activity.stage)} · ${activity.stage === "NOTICE" ? "সমস্যা দেখুন" : activity.stage === "REPAIR" ? "সমস্যা ঠিক করুন" : "সমাধান প্রয়োগ করুন"}</p><h2>${esc(definition.learner_label_en)} · ${esc(definition.learner_label_bn)}</h2><p>${esc(definition.explanation_en)}</p><p lang="bn">${esc(definition.explanation_bn)}</p><p lang="bn">${esc(definition.why_it_matters_bn)}</p><details class="quick-self-check"><summary>Quick self-check · দ্রুত নিজে যাচাই করুন</summary>${list(definition.learner_self_check)}</details><p>${esc(activity.instruction_en)}</p><p lang="bn">${esc(activity.instruction_bn)}</p><div class="repair-content">${renderMarkdown(activity.content_markdown)}</div>${control}<div class="repair-actions"><button data-action="check-repair"${response.trim() ? "" : " disabled"}>Check answer · উত্তর যাচাই করুন</button>${state.repairChecked ? `<button class="primary" data-action="continue-repair">${activity.stage === "RETEST" ? "Complete retest · পুনঃপরীক্ষা শেষ করুন" : "Continue · পরবর্তী ধাপ"}</button>` : ""}</div>${state.repairChecked ? `<div class="repair-feedback" role="status"><h3>Explanation · ব্যাখ্যা</h3>${renderMarkdown(activity.answer_or_check_markdown)}</div>` : ""}</section>`;
  }

  return { renderMarkdown, renderRepair };
});
