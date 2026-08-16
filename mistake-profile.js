/* Ovidhan Mistake Profile V1 — interpretable learner evidence and deterministic next actions. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.OvidhanMistakeProfile = api;
        const start = () => api.mount(root);
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const STATUSES = Object.freeze(['NEW', 'NEEDS_PRACTICE', 'IMPROVING', 'STABLE', 'STRONG']);
    const CONFIDENCE = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);
    const MAX_SCORE = 10;

    function count(value) { return Math.max(0, Math.min(99, Math.floor(Number(value) || 0))); }
    function signalCounts(signal) {
        signal = signal || {};
        return {
            initialCorrect: count(signal.initialCorrect), initialIncorrect: count(signal.initialIncorrect),
            repairCorrect: count(signal.repairCorrect), repairIncorrect: count(signal.repairIncorrect),
            retestCorrect: count(signal.retestCorrect), retestIncorrect: count(signal.retestIncorrect)
        };
    }
    function evidenceFor(entries) {
        const totals = { initialCorrect: 0, initialIncorrect: 0, repairCorrect: 0, repairIncorrect: 0, retestCorrect: 0, retestIncorrect: 0, unresolvedItems: 0 };
        let distinctItems = 0;
        entries.forEach(entry => {
            const counts = signalCounts(entry.signal);
            const interactions = Object.values(counts).reduce((sum, value) => sum + value, 0);
            if (interactions) distinctItems += 1;
            if (entry.signal && entry.signal.retestResult === 'incorrect') totals.unresolvedItems += 1;
            Object.keys(counts).forEach(key => { totals[key] += counts[key]; });
        });
        const interactions = Object.values(totals).reduce((sum, value) => sum + value, 0);
        const failureEvidence = totals.initialIncorrect * 2 + totals.repairIncorrect * 2 + totals.retestIncorrect * 3;
        const successEvidence = totals.initialCorrect + totals.repairCorrect + totals.retestCorrect * 2;
        const weaknessScore = Math.max(-MAX_SCORE, Math.min(MAX_SCORE, failureEvidence - successEvidence));
        return Object.assign(totals, { distinctItems, interactions, failureEvidence, successEvidence, weaknessScore });
    }
    function confidenceFor(evidence) {
        if (evidence.distinctItems >= 3 && evidence.interactions >= 9) return 'HIGH';
        if (evidence.distinctItems >= 2 && evidence.interactions >= 4) return 'MEDIUM';
        return 'LOW';
    }
    function statusFor(evidence) {
        if (!evidence.interactions) return 'NEW';
        if (evidence.unresolvedItems > 0 || evidence.weaknessScore >= 3) return 'NEEDS_PRACTICE';
        if (evidence.distinctItems >= 3 && evidence.retestCorrect >= 3 && evidence.initialCorrect >= 2 && evidence.weaknessScore <= -4) return 'STRONG';
        if (evidence.distinctItems >= 2 && evidence.retestCorrect >= 2 && evidence.weaknessScore <= 0) return 'STABLE';
        return 'IMPROVING';
    }
    function aggregate(items, state) {
        const signals = state && state.mistakeSignals || {};
        function group(field) {
            const grouped = new Map();
            items.forEach(item => {
                const key = item[field];
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key).push({ item, signal: signals[item.id] });
            });
            return Array.from(grouped, ([id, entries]) => {
                const evidence = evidenceFor(entries);
                return { id, status: statusFor(evidence), confidence: confidenceFor(evidence), evidence, itemIds: entries.map(entry => entry.item.id) };
            }).sort((a, b) => a.id.localeCompare(b.id));
        }
        const microSkills = group('micro_skill');
        const families = group('mistake_family');
        return {
            version: 1, statuses: STATUSES, confidenceBands: CONFIDENCE,
            microSkills, families,
            observedItemCount: Object.keys(signals).filter(id => items.some(item => item.id === id) && evidenceFor([{ signal: signals[id] }]).interactions).length
        };
    }
    function recommendNext(items, state, currentId, nowMs) {
        const profile = aggregate(items, state || {});
        const familyMap = new Map(profile.families.map(family => [family.id, family]));
        const signals = state && state.mistakeSignals || {};
        const recent = new Set(((state && state.recentActions) || []).slice(-2).map(action => String(action.id).replace(/^mistake-mirror:/, '')));
        const candidates = items.filter(item => item.id !== currentId && !recent.has(item.id)).map(item => {
            const signal = signals[item.id] || {};
            const counts = signalCounts(signal);
            const family = familyMap.get(item.mistake_family);
            const seen = Object.values(counts).some(Boolean);
            let score = 0;
            let reasonCode = 'NEW_SKILL';
            if (signal.retestResult === 'incorrect') { score = 100; reasonCode = 'FAILED_RETEST'; }
            else if ((signal.initialResult === 'incorrect' || signal.repairResult === 'incorrect') && signal.retestResult !== 'correct') { score = 90; reasonCode = 'UNRESOLVED_MISTAKE'; }
            else if (family && family.status === 'NEEDS_PRACTICE') { score = 70; reasonCode = 'WEAK_FAMILY'; }
            else if (family && family.status === 'IMPROVING') { score = 50; reasonCode = 'REINFORCEMENT'; }
            else if (seen && signal.lastSeenAt && Number.isFinite(Date.parse(signal.lastSeenAt)) && (nowMs || Date.now()) - Date.parse(signal.lastSeenAt) >= 86400000) { score = 40; reasonCode = 'SPACED_REVIEW'; }
            else if (!seen) { score = 30; reasonCode = 'NEW_SKILL'; }
            else { score = 20; reasonCode = 'REINFORCEMENT'; }
            return { item, score, reason_code: reasonCode, priority_band: score >= 90 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW' };
        }).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
        return candidates[0] || null;
    }
    function mount(win) {
        const host = win.document.getElementById('mistakeProfile');
        const mirror = win.OvidhanMistakeMirror;
        const learning = win.OvidhanLearning;
        if (!host || !mirror || !learning) return;
        const labels = {
            NEEDS_PRACTICE: ['Needs practice', 'আরও অনুশীলন দরকার'],
            IMPROVING: ['Improving', 'উন্নতি হচ্ছে'], STABLE: ['Stable', 'স্থিতিশীল'], STRONG: ['Strong', 'শক্তিশালী']
        };
        function render() {
            const state = learning.getState();
            const profile = aggregate(mirror.items, state);
            const observed = profile.families.filter(family => family.status !== 'NEW');
            host.innerHTML = '';
            const summary = win.document.createElement('div'); summary.className = 'mp-summary';
            if (!observed.length) {
                const empty = win.document.createElement('p'); empty.className = 'mp-empty';
                empty.textContent = 'এখনও পর্যাপ্ত evidence নেই। কয়েকটি Mistake Mirror অনুশীলন করলে আপনার profile তৈরি হবে—একটি উত্তরকে mastery ধরা হবে না।'; summary.appendChild(empty);
            } else {
                ['NEEDS_PRACTICE','IMPROVING','STABLE','STRONG'].forEach(status => {
                    const matches = observed.filter(family => family.status === status).slice(0, 3);
                    if (!matches.length) return;
                    const group = win.document.createElement('section'); group.className = 'mp-group';
                    const heading = win.document.createElement('h3'); heading.textContent = labels[status][0] + ' · ' + labels[status][1]; group.appendChild(heading);
                    const list = win.document.createElement('ul'); matches.forEach(family => { const row=win.document.createElement('li'); row.textContent=family.id.replace(/-/g,' ')+' — Evidence: '+family.confidence; list.appendChild(row); }); group.appendChild(list); summary.appendChild(group);
                });
            }
            host.appendChild(summary);
            const next = recommendNext(mirror.items, state, null, Date.now());
            if (next) {
                const nextBox=win.document.createElement('div'); nextBox.className='mp-next';
                const copy=win.document.createElement('p'); copy.textContent='Next · পরের অনুশীলন: '+next.item.correct+' ('+next.reason_code.replace(/_/g,' ').toLowerCase()+')'; nextBox.appendChild(copy);
                const button=win.document.createElement('button'); button.type='button'; button.className='btn btn-secondary'; button.textContent='এই skill অনুশীলন করুন →';
                button.addEventListener('click',()=>{
                    const props={destination_id:next.item.id,reason_code:next.reason_code,priority_band:next.priority_band};
                    learning.track('next_action_selected',props,{dedupeKey:next.item.id});
                    win.dispatchEvent(new win.CustomEvent('ovidhan:start-mistake',{detail:props}));
                    learning.track('next_action_started',props,{dedupeKey:next.item.id});
                }); nextBox.appendChild(button); host.appendChild(nextBox);
            }
            const confidence = observed.some(item => item.confidence === 'HIGH') ? 'HIGH' : observed.some(item => item.confidence === 'MEDIUM') ? 'MEDIUM' : 'LOW';
            learning.track('mistake_profile_view',{profile_state:observed.length?'EVIDENCE':'NEW',evidence_band:confidence},{dedupeKey:'profile'});
        }
        win.addEventListener('ovidhan:mistake-profile-update', render);
        render();
    }
    return Object.freeze({ STATUSES, CONFIDENCE, signalCounts, evidenceFor, statusFor, confidenceFor, aggregate, recommendNext, mount });
});
