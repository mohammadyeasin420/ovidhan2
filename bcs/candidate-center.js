(function () {
  'use strict';

  const STORAGE_KEY = 'ovidhan_bcs_candidate_stage_v1';
  const select = document.getElementById('stage-select');
  const answer = document.getElementById('stage-answer');
  const error = document.getElementById('stage-error');
  let stages = [];

  function track(eventName, properties, dedupeKey) {
    if (!window.OvidhanLearning || typeof window.OvidhanLearning.track !== 'function') return;
    window.OvidhanLearning.track(eventName, properties || {}, dedupeKey ? { dedupeKey: dedupeKey } : undefined);
  }

  function safeStageId(value) {
    return typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value) ? value : '';
  }

  function storedStage() {
    try { return safeStageId(localStorage.getItem(STORAGE_KEY)); } catch (_) { return ''; }
  }

  function stageFromLocation() {
    const match = location.hash.match(/^#stage=([A-Z][A-Z0-9_]*)$/);
    return match ? match[1] : '';
  }

  function saveStage(stageId) {
    try { localStorage.setItem(STORAGE_KEY, stageId); } catch (_) { /* State remains usable in memory. */ }
  }

  function stageLabel(stageId) {
    const stage = stages.find(item => item.stage_id === stageId);
    return stage ? stage.label_bn : stageId;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function ctaLabel(actionId) {
    return ({
      OPEN_ENGLISH_DIAGNOSTIC: 'English Diagnostic খুলুন',
      OPEN_WRITING_PRACTICE: 'Writing practice খুলুন',
      OPEN_INTERVIEW_ENGLISH: 'Interview English খুলুন',
      OPEN_MISTAKE_MIRROR: 'Mistake Mirror খুলুন'
    })[actionId] || 'প্রস্তুতি শুরু করুন';
  }

  function render(stageId) {
    const stage = stages.find(item => item.stage_id === stageId);
    if (!stage) {
      select.value = '';
      answer.className = 'empty-state';
      answer.innerHTML = '<p>আপনার stage বেছে নিলে এখানে deterministic next action দেখানো হবে।</p>';
      return;
    }
    select.value = stage.stage_id;
    const actions = stage.actions.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
    const next = stage.next_stage_ids.length ? stage.next_stage_ids.map(stageLabel).join(' · ') : 'Official instruction অনুসরণ করুন';
    const cta = stage.learning_cta
      ? '<a class="button stage-cta" data-action-id="' + escapeHtml(stage.learning_cta.action_id) + '" href="' + escapeHtml(stage.learning_cta.href) + '">' + ctaLabel(stage.learning_cta.action_id) + '</a><p><small>' + escapeHtml(stage.learning_cta.reason) + '</small></p>'
      : '';
    answer.className = 'action-detail';
    answer.innerHTML = '<div><h3>' + escapeHtml(stage.label_bn) + '</h3><p>' + escapeHtml(stage.description) + '</p></div><ul class="action-list">' + actions + '</ul><p class="next-stage"><strong>সম্ভাব্য পরবর্তী stage:</strong> ' + escapeHtml(next) + '</p>' + cta;
    const link = answer.querySelector('.stage-cta');
    if (link) link.addEventListener('click', function () {
      track('bcs_learning_cta_click', { stage_id: stage.stage_id, action_id: link.dataset.actionId, surface: 'next-action' });
    });
  }

  function selectStage(stageId, updateHistory) {
    if (!stages.some(stage => stage.stage_id === stageId)) return;
    saveStage(stageId);
    if (updateHistory && location.hash !== '#stage=' + stageId) history.pushState({ stageId: stageId }, '', '#stage=' + stageId);
    render(stageId);
  }

  fetch('/data/bcs-candidate-intelligence-v1.json', { credentials: 'same-origin' })
    .then(response => { if (!response.ok) throw new Error('foundation unavailable'); return response.json(); })
    .then(model => {
      stages = Array.isArray(model.journey_stages) ? model.journey_stages : [];
      if (model.schema_version !== 1 || stages.length !== 11) throw new Error('invalid foundation');
      select.innerHTML = '<option value="">আপনার stage বেছে নিন</option>' + stages.map(stage => '<option value="' + escapeHtml(stage.stage_id) + '">' + escapeHtml(stage.label_bn) + ' — ' + escapeHtml(stage.label_en) + '</option>').join('');
      select.disabled = false;
      const initial = stageFromLocation() || storedStage();
      if (initial) render(initial);
      track('bcs_center_view', { surface: 'candidate-center' }, 'page');
    })
    .catch(() => { error.hidden = false; select.innerHTML = '<option>Stage selector unavailable</option>'; });

  select.addEventListener('change', function () {
    const stageId = safeStageId(select.value);
    if (!stageId) return render('');
    selectStage(stageId, true);
    track('bcs_stage_selected', { stage_id: stageId, surface: 'stage-selector' });
  });

  window.addEventListener('popstate', function () {
    const stageId = stageFromLocation() || storedStage();
    if (stageId) render(stageId);
  });

  document.querySelectorAll('.resource-link').forEach(link => link.addEventListener('click', function () {
    track('bcs_learning_cta_click', { action_id: link.dataset.actionId, surface: 'preparation-resource' });
  }));
  document.getElementById('official-source').addEventListener('click', function () {
    track('bcs_official_source_open', { source_type: 'OFFICIAL_BPSC', surface: 'official-information' });
  });
})();
