/* Ovidhan SmartPath V1 — deterministic routing with static same-origin configuration. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.OvidhanSmartPath = api;
        const start = () => api.mount(root);
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const GOAL_IDS = Object.freeze(['BCS','IELTS','BANK','UNIVERSITY_ADMISSION','GENERAL_ENGLISH','SPOKEN_CAREER']);
    const REASONS = Object.freeze(['FAILED_RETEST','UNRESOLVED_MISTAKE','WEAK_SKILL','REVIEW_DUE','GOAL_CORE_SKILL','PREREQUISITE_NEEDED','TRANSFER_RISK','GATEWAY_SKILL','NEW_SKILL','REINFORCEMENT']);
    const IMPORTANCE_SCORE = Object.freeze({ CORE: 16, SUPPORTING: 9, OPTIONAL: 4 });
    const REASON_ORDER = Object.freeze(['FAILED_RETEST','UNRESOLVED_MISTAKE','WEAK_SKILL','PREREQUISITE_NEEDED','REVIEW_DUE','GOAL_CORE_SKILL','GATEWAY_SKILL','TRANSFER_RISK','NEW_SKILL','REINFORCEMENT']);

    function safeArray(value) { return Array.isArray(value) ? value : []; }
    function safeGoal(value) { return GOAL_IDS.includes(value) ? value : 'GENERAL_ENGLISH'; }
    function normalizedDifficulty(value) { return typeof value === 'string' ? value.toUpperCase() : 'UNKNOWN'; }
    function signalCounts(signal) {
        signal = signal || {};
        const count = value => Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));
        return {
            initialCorrect: count(signal.initialCorrect), initialIncorrect: count(signal.initialIncorrect),
            repairCorrect: count(signal.repairCorrect), repairIncorrect: count(signal.repairIncorrect),
            retestCorrect: count(signal.retestCorrect), retestIncorrect: count(signal.retestIncorrect)
        };
    }
    function evidenceIsSufficient(entry) {
        if (!entry) return false;
        if (entry.status === 'STABLE' || entry.status === 'STRONG') return true;
        const evidence = entry.evidence || {};
        return Number(evidence.distinctItems) >= 2 && Number(evidence.retestCorrect) >= 2 && Number(evidence.weaknessScore) <= 0;
    }
    function validTransferEdges(transferGraph, skillIds) {
        if (!transferGraph || transferGraph.schema_version !== 1) return [];
        return safeArray(transferGraph.edges).filter(edge => edge &&
            edge.evidence_class === 'CURATED_TRANSFER_HYPOTHESIS' &&
            edge.source_language === 'bn' &&
            edge.relationship_type === 'TRANSFER_RISK_FOR' &&
            skillIds.has(edge.target_skill_id) &&
            safeArray(edge.provenance).length > 0 &&
            typeof edge.review_status === 'string' && typeof edge.reviewed_at === 'string');
    }
    function validGoalMappings(goalGraph, skillIds) {
        if (!goalGraph || goalGraph.schema_version !== 1) return [];
        return safeArray(goalGraph.mappings).filter(mapping => mapping && GOAL_IDS.includes(mapping.goal_id) &&
            skillIds.has(mapping.skill_id) && Object.prototype.hasOwnProperty.call(IMPORTANCE_SCORE, mapping.importance) &&
            typeof mapping.source_or_rationale === 'string');
    }
    function difficultyScore(level, difficulty) {
        level = normalizedDifficulty(level);
        difficulty = normalizedDifficulty(difficulty);
        if (level === 'UNKNOWN' || difficulty === 'UNKNOWN') return 0;
        if (level === difficulty) return 6;
        if (level === 'BEGINNER' && difficulty === 'ADVANCED') return -20;
        if (level === 'BEGINNER' && difficulty === 'INTERMEDIATE') return -4;
        if (level === 'INTERMEDIATE' && difficulty === 'BEGINNER') return 2;
        if (level === 'ADVANCED' && difficulty === 'BEGINNER') return -3;
        return 0;
    }
    function itemIdFor(destination) {
        if (destination.item_id) return destination.item_id;
        return String(destination.destination_id || '').startsWith('mistake:') ? String(destination.destination_id).slice(8) : null;
    }
    function actionMatches(actionId, destination, itemId) {
        const id = String(actionId || '').replace(/^mistake-mirror:/, '');
        return id === destination.destination_id || (itemId && id === itemId);
    }
    function normalizeDestinations(destinations, skillIds) {
        return safeArray(destinations).filter(destination => destination && destination.review_status === 'REVIEWED' &&
            typeof destination.destination_id === 'string' && skillIds.has(destination.skill_id) &&
            typeof destination.url === 'string' && destination.url.startsWith('/'));
    }

    function recommend(input) {
        input = input || {};
        const graph = input.graph;
        if (!graph || !Array.isArray(graph.skills) || !Array.isArray(graph.families)) return null;
        const nowMs = Number(input.nowMs);
        if (!Number.isFinite(nowMs)) return null;
        const state = input.state || {};
        const profile = input.profile || {};
        const skills = new Map(graph.skills.map(skill => [skill.id, skill]));
        const families = new Map(graph.families.map(family => [family.family_id, family]));
        const skillIds = new Set(skills.keys());
        const destinations = normalizeDestinations(input.destinations, skillIds);
        if (!destinations.length) return null;
        const skillEvidence = new Map(safeArray(profile.microSkills).map(entry => [entry.id, entry]));
        const goal = safeGoal(state.goal);
        const mappings = validGoalMappings(input.goalGraph, skillIds).filter(mapping => mapping.goal_id === goal);
        const goalBySkill = new Map(mappings.map(mapping => [mapping.skill_id, mapping]));
        const transferSkills = new Set(validTransferEdges(input.transferGraph, skillIds).map(edge => edge.target_skill_id));
        const recentActions = safeArray(state.recentActions).slice(-10);
        const signals = state.mistakeSignals && typeof state.mistakeSignals === 'object' ? state.mistakeSignals : {};
        const dependencyCounts = new Map(graph.skills.map(skill => [skill.id, 0]));
        graph.skills.forEach(skill => safeArray(skill.prerequisites).forEach(parent => dependencyCounts.set(parent, (dependencyCounts.get(parent) || 0) + 1)));

        const unmetForDependent = new Map();
        const demandedPrerequisites = new Set();
        destinations.forEach(destination => {
            const skill = skills.get(destination.skill_id);
            const unmet = safeArray(skill.prerequisites).filter(id => !evidenceIsSufficient(skillEvidence.get(id)));
            unmetForDependent.set(destination.destination_id, unmet);
            unmet.forEach(id => demandedPrerequisites.add(id));
        });

        const ranked = destinations.map(destination => {
            const skill = skills.get(destination.skill_id);
            const family = families.get(skill.family_id);
            const evidence = skillEvidence.get(skill.id);
            const itemId = itemIdFor(destination);
            const signal = itemId ? signals[itemId] || {} : {};
            const counts = signalCounts(signal);
            const breakdown = {
                learner_weakness: 0, review_urgency: 0, goal_relevance: 0, difficulty_fit: 0,
                prerequisite_readiness: 0, recent_mistake_relevance: 0, curated_transfer_risk: 0,
                gateway_value: 0, repetition_penalty: 0, recently_practiced_penalty: 0, new_skill: 0
            };
            const reasons = [];

            if (signal.retestResult === 'incorrect') { breakdown.review_urgency = 140; reasons.push('FAILED_RETEST'); }
            else if ((signal.initialResult === 'incorrect' || signal.repairResult === 'incorrect') && signal.retestResult !== 'correct') {
                breakdown.review_urgency = 110; reasons.push('UNRESOLVED_MISTAKE');
            } else if (signal.lastSeenAt && Number.isFinite(Date.parse(signal.lastSeenAt)) && nowMs - Date.parse(signal.lastSeenAt) >= 86400000) {
                breakdown.review_urgency = 20; reasons.push('REVIEW_DUE');
            }

            if (evidence && evidence.status === 'NEEDS_PRACTICE') { breakdown.learner_weakness = 35; reasons.push('WEAK_SKILL'); }
            else if (evidence && evidence.status === 'IMPROVING') { breakdown.learner_weakness = 16; reasons.push('REINFORCEMENT'); }

            if (signal.initialResult === 'incorrect' || signal.repairResult === 'incorrect' || counts.retestIncorrect) {
                breakdown.recent_mistake_relevance = 18;
                if (!reasons.includes('WEAK_SKILL')) reasons.push('WEAK_SKILL');
            }

            const goalMapping = goalBySkill.get(skill.id);
            if (goalMapping) {
                breakdown.goal_relevance = IMPORTANCE_SCORE[goalMapping.importance];
                if (goalMapping.importance === 'CORE') reasons.push('GOAL_CORE_SKILL');
            }

            breakdown.difficulty_fit = difficultyScore(state.level, destination.difficulty || skill.difficulty_band);
            const unmet = unmetForDependent.get(destination.destination_id) || [];
            if (unmet.length) breakdown.prerequisite_readiness = -25;
            if (demandedPrerequisites.has(skill.id) && !evidenceIsSufficient(evidence)) {
                breakdown.prerequisite_readiness += 28; reasons.push('PREREQUISITE_NEEDED');
            }

            if (transferSkills.has(skill.id)) { breakdown.curated_transfer_risk = 4; reasons.push('TRANSFER_RISK'); }
            const dependents = dependencyCounts.get(skill.id) || 0;
            if (dependents) { breakdown.gateway_value = Math.min(12, dependents * 3); reasons.push('GATEWAY_SKILL'); }

            const repetitionCount = recentActions.filter(action => actionMatches(action.id, destination, itemId)).length;
            breakdown.repetition_penalty = -Math.min(20, repetitionCount * 4);
            if (recentActions.slice(-2).some(action => actionMatches(action.id, destination, itemId))) breakdown.recently_practiced_penalty = -35;

            const seen = itemId ? Object.values(counts).some(Boolean) : Boolean(evidence && evidence.evidence && evidence.evidence.interactions);
            if (!seen) { breakdown.new_skill = 5; reasons.push('NEW_SKILL'); }
            if (!reasons.length) reasons.push('REINFORCEMENT');

            const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
            const orderedReasons = Array.from(new Set(reasons)).sort((a, b) => REASON_ORDER.indexOf(a) - REASON_ORDER.indexOf(b));
            return {
                destination_id: destination.destination_id,
                item_id: itemId,
                skill_id: skill.id,
                skill_name_en: skill.name_en,
                skill_name_bn: skill.name_bn,
                family_id: skill.family_id,
                family_name_bn: family && family.name_bn || '',
                url: destination.url,
                activity_type: destination.activity_type,
                estimated_minutes: Number(destination.estimated_minutes) || null,
                score,
                priority_band: score >= 100 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
                primary_reason: orderedReasons[0],
                supporting_reasons: orderedReasons.slice(1),
                score_breakdown: breakdown,
                confidence_band: evidence && ['LOW','MEDIUM','HIGH'].includes(evidence.confidence) ? evidence.confidence : 'LOW',
                goal_id: goal
            };
        }).sort((a, b) => b.score - a.score || a.destination_id.localeCompare(b.destination_id));

        return Object.assign({}, ranked[0], { ranked_diagnostics: ranked });
    }

    function mistakeDestinations(items, graph) {
        const mappings = new Map(safeArray(graph && graph.item_mappings).map(mapping => [mapping.item_id, mapping]));
        return safeArray(items).map(item => {
            const mapping = mappings.get(item.id);
            return mapping ? {
                destination_id: 'mistake:' + item.id, item_id: item.id, skill_id: mapping.primary_skill_id,
                url: '/common-mistakes-bangladeshi-learners.html#mistakeMirror', activity_type: 'MISTAKE_REPAIR', difficulty: normalizedDifficulty(item.difficulty),
                estimated_minutes: 4, review_status: 'REVIEWED'
            } : null;
        }).filter(Boolean);
    }
    function reasonBangla(reason) {
        return {
            FAILED_RETEST: 'আগের retest-এ ভুল হওয়ায় এই skill-টি এখন আবার দেখা সবচেয়ে জরুরি।',
            UNRESOLVED_MISTAKE: 'এই skill-এ একটি ভুল এখনও পুরোপুরি resolve হয়নি।',
            WEAK_SKILL: 'আপনার সাম্প্রতিক evidence এই skill-এ আরও অনুশীলনের প্রয়োজন দেখায়।',
            REVIEW_DUE: 'আগের evidence-এর পর সময় কেটেছে, তাই এখন সংক্ষিপ্ত review উপযোগী।',
            GOAL_CORE_SKILL: 'এটি আপনার নির্বাচিত goal-এর একটি reviewed core skill।',
            PREREQUISITE_NEEDED: 'পরের skill-এ যাওয়ার আগে এই ভিত্তিটি শক্ত করা দরকার।',
            TRANSFER_RISK: 'Bangla-to-English শেখার একটি reviewed pattern হিসেবে এটি অল্প করে review করা উপযোগী।',
            GATEWAY_SKILL: 'এই skill আরও কয়েকটি canonical skill শেখার ভিত্তি।',
            NEW_SKILL: 'এটি একটি নতুন reviewed skill; বর্তমান evidence-এ জরুরি unresolved ভুল নেই।',
            REINFORCEMENT: 'বর্তমান evidence অনুযায়ী এটি একটি উপযোগী reinforcement activity।'
        }[reason] || 'বর্তমান evidence অনুযায়ী এটি আপনার পরবর্তী reviewed learning action।';
    }
    function fallbackRecommendation(win) {
        const mirror = win.OvidhanMistakeMirror;
        const profileApi = win.OvidhanMistakeProfile;
        const learning = win.OvidhanLearning;
        if (!mirror || !profileApi || !learning) return null;
        const next = profileApi.recommendNext(mirror.items, learning.getState(), null, Date.now());
        if (!next) return null;
        return {
            destination_id: 'mistake:' + next.item.id, item_id: next.item.id, skill_id: next.skill_id,
            skill_name_en: next.item.correct, skill_name_bn: '', family_id: next.family_id, url: '#mistakeMirror',
            estimated_minutes: 4, priority_band: next.priority_band, primary_reason: REASONS.includes(next.reason_code) ? next.reason_code : 'REINFORCEMENT',
            supporting_reasons: [], score_breakdown: {}, confidence_band: 'LOW', goal_id: safeGoal(learning.getState().goal), fallback: true
        };
    }
    function renderPanel(win, recommendation) {
        const host = win.document.getElementById('smartPath');
        const learning = win.OvidhanLearning;
        if (!host || !recommendation) return;
        host.innerHTML = '';
        const card = win.document.createElement('div'); card.className = 'smartpath-card';
        const eyebrow = win.document.createElement('p'); eyebrow.className = 'smartpath-eyebrow'; eyebrow.textContent = 'Recommended skill · প্রস্তাবিত skill'; card.appendChild(eyebrow);
        const title = win.document.createElement('h3'); title.textContent = recommendation.skill_name_bn || recommendation.skill_name_en; card.appendChild(title);
        const explanation = win.document.createElement('p'); explanation.className = 'smartpath-reason'; explanation.textContent = reasonBangla(recommendation.primary_reason); card.appendChild(explanation);
        if (recommendation.estimated_minutes) {
            const time = win.document.createElement('p'); time.className = 'smartpath-time'; time.textContent = 'প্রায় ' + recommendation.estimated_minutes + ' মিনিট'; card.appendChild(time);
        }
        const action = win.document.createElement(recommendation.item_id ? 'button' : 'a');
        action.className = 'btn btn-primary smartpath-action'; action.textContent = recommendation.item_id ? 'এখন অনুশীলন করুন' : 'এখন শিখুন';
        if (recommendation.item_id) action.type = 'button'; else action.href = recommendation.url;
        action.addEventListener('click', () => {
            const props = {destination_id:recommendation.destination_id,skill_id:recommendation.skill_id,family_id:recommendation.family_id,reason_code:recommendation.primary_reason,priority_band:recommendation.priority_band};
            if (learning) learning.track('next_action_selected', props, { dedupeKey:'smartpath:' + recommendation.destination_id });
            if (recommendation.item_id) {
                win.dispatchEvent(new win.CustomEvent('ovidhan:start-mistake',{detail:{destination_id:recommendation.item_id,skill_id:recommendation.skill_id,family_id:recommendation.family_id}}));
                const mirrorHost = win.document.getElementById('mistakeMirror'); if (mirrorHost) mirrorHost.scrollIntoView({behavior:'smooth',block:'start'});
            }
            if (learning) learning.track('next_action_started', props, { dedupeKey:'smartpath:' + recommendation.destination_id });
        });
        card.appendChild(action); host.appendChild(card);
    }
    function bindGoalSelector(win, onChange) {
        const select = win.document.getElementById('smartPathGoal');
        const learning = win.OvidhanLearning;
        if (!select || !learning || typeof learning.getRoutingGoal !== 'function' || typeof learning.setGoal !== 'function') return false;
        select.value = learning.getRoutingGoal();
        select.addEventListener('change', () => {
            const goal = learning.setGoal(select.value);
            select.value = learning.getRoutingGoal();
            if (typeof onChange === 'function') onChange(goal);
        });
        return true;
    }
    function mount(win) {
        const host = win.document.getElementById('smartPath');
        if (!host) return;
        const renderFallback = () => renderPanel(win, fallbackRecommendation(win));
        let rebuild = renderFallback;
        bindGoalSelector(win, () => rebuild());
        if (!win.fetch || !win.OvidhanLearning || !win.OvidhanMistakeMirror || !win.OvidhanMistakeProfile) return renderFallback();
        Promise.all([
            win.fetch('/skill-mistake-graph.json',{credentials:'same-origin'}).then(r => r.ok ? r.json() : Promise.reject()),
            win.fetch('/bangla-english-transfer-graph.json',{credentials:'same-origin'}).then(r => r.ok ? r.json() : null).catch(() => null),
            win.fetch('/goal-skill-requirements.json',{credentials:'same-origin'}).then(r => r.ok ? r.json() : null).catch(() => null),
            win.fetch('/smartpath-destinations.json',{credentials:'same-origin'}).then(r => r.ok ? r.json() : Promise.reject())
        ]).then(([graph, transferGraph, goalGraph, destinationGraph]) => {
            rebuild = () => {
                const state = win.OvidhanLearning.getState();
                const profile = win.OvidhanMistakeProfile.aggregate(win.OvidhanMistakeMirror.items, state, graph);
                const destinations = mistakeDestinations(win.OvidhanMistakeMirror.items, graph).concat(safeArray(destinationGraph.destinations));
                const result = recommend({state,profile,graph,transferGraph,goalGraph,destinations,nowMs:Date.now()});
                if (result) renderPanel(win,result); else renderFallback();
            };
            win.addEventListener('ovidhan:mistake-profile-update', rebuild); rebuild();
        }).catch(renderFallback);
    }

    return Object.freeze({ GOAL_IDS, REASONS, safeGoal, evidenceIsSufficient, validTransferEdges, validGoalMappings, mistakeDestinations, recommend, fallbackRecommendation, bindGoalSelector, mount });
});
