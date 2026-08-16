/* Mistake Mirror V1 — reviewed, deterministic, privacy-safe learning loop. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) api.mount(root);
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const REVIEW_DATE = '2026-08-16';
    const raw = [
        ['agree-verb','I am agree with you.','I agree with you.','agree-verb','Agree একটি verb; তাই এর আগে am বসে না।','“Agree” is a verb, so it does not take “am”.'],
        ['third-person-s','She go to school every day.','She goes to school every day.','subject-verb-agreement','Present Simple-এ she-এর সঙ্গে verb-এ -s যোগ হয়।','In the present simple, add -s with “she”.'],
        ['did-base-verb','I did not went there.','I did not go there.','past-after-did','Did-এর পরে verb-এর base form হয়।','Use the base form of the verb after “did”.'],
        ['discuss-object','We discussed about the problem.','We discussed the problem.','unnecessary-preposition','Discuss সরাসরি object নেয়; about লাগে না।','“Discuss” takes a direct object; do not add “about”.'],
        ['article-apple','She ate a apple.','She ate an apple.','articles','Vowel sound-এর আগে an ব্যবহার হয়।','Use “an” before a vowel sound.'],
        ['modal-base','He can speaks English.','He can speak English.','modal-base-verb','Modal verb can-এর পরে base form হয়।','Use the base verb after the modal “can”.'],
        ['double-negative','I do not know nothing.','I do not know anything.','double-negative','Standard English-এ একই clause-এ দুটি negative ব্যবহার করা হয় না।','Standard English avoids two negatives in the same clause.'],
        ['good-at','She is good in mathematics.','She is good at mathematics.','fixed-preposition','দক্ষতা বোঝাতে good at ব্যবহার হয়।','Use “good at” for skill or ability.'],
        ['senior-to','He is senior than me.','He is senior to me.','fixed-preposition','Senior-এর পরে than নয়, to বসে।','Use “to”, not “than”, after “senior”.'],
        ['depend-on','Success depends of hard work.','Success depends on hard work.','fixed-preposition','Depend-এর সঙ্গে on ব্যবহার হয়।','Use “on” after “depend”.'],
        ['interested-in','I am interested on music.','I am interested in music.','fixed-preposition','Interested-এর সঙ্গে in ব্যবহার হয়।','Use “in” after “interested”.'],
        ['yesterday-past','I have seen him yesterday.','I saw him yesterday.','past-time-marker','Yesterday-এর মতো শেষ হওয়া অতীত সময়ের সঙ্গে Past Simple হয়।','Use the past simple with a finished past time such as “yesterday”.'],
        ['one-of-plural','One of my friend lives in Dhaka.','One of my friends lives in Dhaka.','one-of-plural','One of-এর পরে plural noun বসে।','Use a plural noun after “one of”.'],
        ['much-many','There are much students here.','There are many students here.','countability','Countable plural noun students-এর সঙ্গে many হয়।','Use “many” with a plural countable noun.'],
        ['fewer-less','There are less cars today.','There are fewer cars today.','countability','গণনা করা যায় এমন plural noun-এর সঙ্গে fewer হয়।','Use “fewer” with plural countable nouns.'],
        ['since-for','I have lived here since five years.','I have lived here for five years.','since-for','সময়ের দৈর্ঘ্যের আগে for; শুরুর সময়ের আগে since হয়।','Use “for” with a duration and “since” with a starting point.'],
        ['married-to','She is married with a doctor.','She is married to a doctor.','fixed-preposition','Married-এর সঙ্গে to ব্যবহার হয়।','Use “to” after “married”.'],
        ['listen-to','Please listen me.','Please listen to me.','fixed-preposition','Listen-এর পরে ব্যক্তি বা বিষয়ের আগে to লাগে।','Use “to” between “listen” and its object.'],
        ['explain-to','Please explain me the rule.','Please explain the rule to me.','verb-pattern','Explain-এর pattern হলো explain something to someone।','Use “explain something to someone”.'],
        ['arrive-at','We arrived to the station early.','We arrived at the station early.','fixed-preposition','ছোট নির্দিষ্ট জায়গার আগে arrive at হয়।','Use “arrive at” for a specific place such as a station.'],
        ['home-no-to','I am going to home.','I am going home.','unnecessary-preposition','Go home-এর আগে to বসে না।','Do not use “to” before “home” after “go”.'],
        ['news-singular','The news are surprising.','The news is surprising.','subject-verb-agreement','News দেখতে plural হলেও grammatical singular।','“News” is grammatically singular.'],
        ['people-plural','People is waiting outside.','People are waiting outside.','subject-verb-agreement','People plural noun, তাই are হয়।','“People” is plural, so use “are”.'],
        ['information-uncountable','I need an information.','I need some information.','countability','Information uncountable; এর আগে an বসে না।','“Information” is uncountable, so do not use “an”.'],
        ['advice-uncountable','She gave me an advice.','She gave me some advice.','countability','Advice uncountable; an advice বলা হয় না।','“Advice” is uncountable; do not say “an advice”.'],
        ['look-forward-gerund','I look forward to meet you.','I look forward to meeting you.','verb-pattern','Look forward to-তে to একটি preposition; পরে -ing form হয়।','In “look forward to”, “to” is a preposition, so use an -ing form.'],
        ['used-to-base','I used to played football.','I used to play football.','verb-pattern','Used to-এর পরে base form হয়।','Use the base verb after “used to”.'],
        ['prefer-to','I prefer tea than coffee.','I prefer tea to coffee.','fixed-preposition','Prefer A to B pattern ব্যবহার হয়।','Use the pattern “prefer A to B”.'],
        ['although-no-but','Although it was raining, but we went out.','Although it was raining, we went out.','conjunction-pairing','একই sentence link করতে although-এর সঙ্গে but প্রয়োজন নেই।','Do not pair “although” with “but” to link the same clauses.'],
        ['because-no-so','Because I was tired, so I went home.','Because I was tired, I went home.','conjunction-pairing','একই কারণ-ফল clause-এ because-এর সঙ্গে so লাগে না।','Do not pair “because” with “so” in the same sentence.']
    ];

    const items = raw.map((row, index) => Object.freeze({
        id: 'mm-' + row[0], version: 1, incorrect: row[1], correct: row[2],
        category: ['fixed-preposition','verb-pattern','agree-verb'].includes(row[3]) ? 'usage' : 'grammar', micro_skill: row[3], mistake_family: row[3],
        explanation_bn: row[4], explanation_en: row[5], difficulty: index < 12 ? 'beginner' : 'intermediate',
        source_status: 'manually-reviewed', reviewed_at: REVIEW_DATE
    }));

    function optionsFor(item, stage) {
        return stage === 'repair'
            ? [{ id: 'correct', text: item.correct }, { id: 'incorrect', text: item.incorrect }]
            : [{ id: 'incorrect', text: item.incorrect }, { id: 'correct', text: item.correct }];
    }

    function chooseNext(current, state) {
        const signals = state && state.mistakeSignals || {};
        const candidates = items.filter(item => item.id !== current.id).map(item => {
            let score = item.mistake_family === current.mistake_family ? 40 : 0;
            if (!signals[item.id]) score += 10;
            if (item.difficulty === current.difficulty) score += 10;
            return { item, score };
        }).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
        const winner = candidates[0];
        return { item: winner.item, reason_code: winner.item.mistake_family === current.mistake_family ? 'same-family-repair' : 'next-reviewed-item', score_band: winner.score >= 50 ? 'high' : 'medium' };
    }

    function mount(win) {
        const doc = win.document;
        const host = doc.getElementById('mistakeMirror');
        if (!host) return;
        let item = items[0];
        let stage = 'initial';
        let initialResult = null;
        let completed = false;
        const learning = () => win.OvidhanLearning;

        function emit(name, properties, key) {
            const api = learning();
            if (api) api.track(name, properties, { dedupeKey: key });
        }
        function render() {
            const label = stage === 'initial' ? 'ভুলটি শনাক্ত করুন' : stage === 'repair' ? 'সঠিক বাক্যটি বেছে নিয়ে repair করুন' : 'এবার নতুন করে যাচাই করুন';
            host.innerHTML = '';
            const card = doc.createElement('div'); card.className = 'mm-card';
            const heading = doc.createElement('h3'); heading.textContent = label; card.appendChild(heading);
            const progress = doc.createElement('p'); progress.className = 'mm-progress'; progress.textContent = stage === 'initial' ? 'ধাপ ১/৩ · Diagnose' : stage === 'repair' ? 'ধাপ ২/৩ · Repair' : 'ধাপ ৩/৩ · Retest'; card.appendChild(progress);
            const prompt = doc.createElement('p'); prompt.className = 'mm-prompt'; prompt.textContent = stage === 'initial' ? item.incorrect : 'Choose the correct sentence:'; card.appendChild(prompt);
            const group = doc.createElement('div'); group.className = 'mm-options'; group.setAttribute('role','group'); group.setAttribute('aria-label', label);
            const opts = stage === 'initial' ? [{id:'correct',text:'✅ Correct'}, {id:'incorrect',text:'❌ Incorrect'}] : optionsFor(item, stage);
            opts.forEach(option => { const button = doc.createElement('button'); button.type='button'; button.className='mm-option'; button.textContent=option.text; button.addEventListener('click', () => answer(option.id)); group.appendChild(button); });
            card.appendChild(group); host.appendChild(card);
        }
        function feedback(result) {
            const box = doc.createElement('div'); box.className = 'mm-feedback ' + result;
            const title = doc.createElement('strong'); title.textContent = result === 'correct' ? 'ঠিক ধরেছেন।' : 'এটি আবার দেখুন।'; box.appendChild(title);
            const wrong = doc.createElement('p'); wrong.textContent = '❌ ' + item.incorrect; box.appendChild(wrong);
            const correct = doc.createElement('p'); correct.textContent = '✅ ' + item.correct; box.appendChild(correct);
            const bn = doc.createElement('p'); bn.lang='bn'; bn.textContent = item.explanation_bn; box.appendChild(bn);
            const en = doc.createElement('p'); en.textContent = item.explanation_en; box.appendChild(en);
            host.querySelector('.mm-card').appendChild(box);
        }
        function nextButton(nextStage) {
            const button = doc.createElement('button'); button.type='button'; button.className='btn btn-primary mm-next';
            button.textContent = nextStage === 'repair' ? 'Repair করুন →' : 'Retest করুন →';
            button.addEventListener('click', () => { stage=nextStage; if (stage==='repair') emit('mistake_repair_start',{mistake_id:item.id,mistake_family:item.mistake_family},item.id); render(); });
            host.querySelector('.mm-card').appendChild(button);
        }
        function answer(optionId) {
            if (host.querySelector('.mm-feedback')) return;
            const result = optionId === (stage === 'initial' ? 'incorrect' : 'correct') ? 'correct' : 'incorrect';
            const api = learning();
            if (api) api.recordMistakeSignal(item.id, stage, result);
            if (stage === 'initial') { initialResult=result; emit('mistake_answer',{mistake_id:item.id,mistake_family:item.mistake_family,result,option_id:optionId,attempt_number:1},item.id); }
            if (stage === 'repair') emit('mistake_repair_result',{mistake_id:item.id,mistake_family:item.mistake_family,result,option_id:optionId,attempt_number:1},item.id);
            if (stage === 'retest') emit('mistake_retest_result',{mistake_id:item.id,mistake_family:item.mistake_family,result,option_id:optionId,attempt_number:1},item.id);
            feedback(result);
            if (stage === 'initial') nextButton('repair'); else if (stage === 'repair') nextButton('retest'); else complete(result);
        }
        function complete(result) {
            if (completed) return; completed=true;
            const api=learning(); const mastery=result==='correct'?'secure':'needs-repair';
            if (api) api.recordLearningAction('mistake-mirror:'+item.id,'mistake-mirror',result);
            emit('mistake_session_complete',{mistake_id:item.id,mistake_family:item.mistake_family,result,mastery_status:mastery},item.id);
            const next=chooseNext(item,api?api.getState():{});
            emit('mistake_next_action',{mistake_id:item.id,destination_id:next.item.id,reason_code:next.reason_code,score_band:next.score_band},item.id);
            const panel=doc.createElement('div'); panel.className='mm-complete';
            const summary=doc.createElement('p'); summary.textContent=(initialResult==='incorrect'&&result==='correct'?'আপনি ভুলটি repair করেছেন। ':'অনুশীলন সম্পন্ন। ')+ 'পরের ধাপ: '+next.item.correct; panel.appendChild(summary);
            const button=doc.createElement('button'); button.type='button'; button.className='btn btn-secondary'; button.textContent='পরের reviewed mistake →'; button.addEventListener('click',()=>{item=next.item;stage='initial';initialResult=null;completed=false;emit('mistake_mirror_start',{mistake_id:item.id,mistake_family:item.mistake_family},item.id);render();}); panel.appendChild(button);
            host.querySelector('.mm-card').appendChild(panel);
        }
        emit('mistake_mirror_start',{mistake_id:item.id,mistake_family:item.mistake_family},item.id);
        render();
    }
    return Object.freeze({ items, optionsFor, chooseNext, mount });
});
