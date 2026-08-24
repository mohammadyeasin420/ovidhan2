(function(){
  'use strict';
  const host=document.getElementById('listeningPractice');
  if(!host)return;
  const state={pack:null,reviewPack:null,index:0,attempted:false,exposure:0,ended:false,answers:new Map()};
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
  const announce=(message,isError)=>{const box=document.getElementById('audioStatus');box.textContent=message;box.classList.toggle('error',Boolean(isError));};
  const recording=()=>state.pack.recordings[state.index];
  const questions=()=>state.pack.items.filter(item=>item.recording_id===recording().recording_id);
  function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail}));}
  function render(){
    const rec=recording(),items=questions();host.replaceChildren();state.answers.clear();state.attempted=false;state.exposure=0;state.ended=false;
    const heading=el('h3','practice-recording-title',`Recording ${state.index+1} of ${state.pack.recordings.length}: ${rec.title}`);heading.tabIndex=-1;host.appendChild(heading);
    const audio=el('audio','listening-audio');audio.controls=true;audio.preload='metadata';audio.setAttribute('controlsList','nodownload');audio.setAttribute('aria-label',`${rec.title} synthetic listening recording`);
    const source=el('source');source.src=rec.audio_path;source.type=rec.audio_mime;audio.appendChild(source);host.appendChild(audio);
    const status=el('p','audio-status','Audio metadata loading…');status.id='audioStatus';status.setAttribute('role','status');host.appendChild(status);
    audio.addEventListener('canplay',()=>announce('Audio প্রস্তুত। Play করে শুনুন, তারপর প্রশ্নের উত্তর দিন।'));
    audio.addEventListener('play',()=>{announce('Audio চলছে। অন্তত 80% শুনে তারপর উত্তর জমা দিন।');emit('ovidhan:listening-audio-play',{recording_id:rec.recording_id});});
    audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)state.exposure=Math.max(state.exposure,audio.currentTime/audio.duration);});
    audio.addEventListener('ended',()=>{state.ended=true;state.exposure=1;announce('Audio সম্পূর্ণ শোনা হয়েছে। এখন উত্তর জমা দিতে পারেন।');});
    audio.addEventListener('error',()=>announce('Audio load করা যায়নি। Connection যাচাই করে Reload audio চাপুন।',true));
    const reload=el('button','btn btn-secondary','Reload audio');reload.type='button';reload.addEventListener('click',()=>{announce('Audio আবার load হচ্ছে…');audio.load();});host.appendChild(reload);
    const form=el('form','listening-form');form.addEventListener('submit',submit);
    items.forEach((item,offset)=>{
      const field=el('fieldset','listening-question');const legend=el('legend','',`${offset+1}. ${item.question_bn}`);field.appendChild(legend);
      const en=el('p','question-en',item.question_en);en.lang='en';field.appendChild(en);
      item.options.forEach(option=>{const label=el('label','listening-option');const input=el('input');input.type='radio';input.name=item.id;input.value=option.id;input.addEventListener('change',()=>state.answers.set(item.id,option.id));label.appendChild(input);label.appendChild(document.createTextNode(' '+option.text));field.appendChild(label);});
      form.appendChild(field);
    });
    const submitButton=el('button','btn btn-primary','উত্তর জমা দিন');submitButton.type='submit';form.appendChild(submitButton);host.appendChild(form);
  }
  async function submit(event){
    event.preventDefault();const items=questions();
    if(!state.ended&&state.exposure<0.8){announce('Evidence submit করতে audio-র অন্তত 80% শুনুন।',true);host.querySelector('audio').focus();return;}
    if(state.answers.size!==items.length){announce(`সব ${items.length}টি প্রশ্নের উত্তর দিন।`,true);return;}
    announce('Review data load হচ্ছে…');
    try{if(!state.reviewPack){const response=await fetch('/data/ielts-listening-review-v1.json',{credentials:'same-origin'});if(!response.ok)throw new Error(`HTTP ${response.status}`);state.reviewPack=await response.json();}}catch(error){announce('Review data load করা যায়নি। আপনার answer রাখা হয়েছে; আবার Submit করুন।',true);return;}
    const reviewItems=items.map(item=>Object.assign({},item,state.reviewPack.items.find(review=>review.id===item.id))),reviewRecording=state.reviewPack.recordings.find(item=>item.recording_id===recording().recording_id);
    state.attempted=true;let correct=0;const review=el('section','listening-review');review.setAttribute('aria-labelledby','reviewTitle');
    const title=el('h4','', 'Attempt review');title.id='reviewTitle';title.tabIndex=-1;review.appendChild(title);
    reviewItems.forEach(item=>{const result=state.answers.get(item.id)===item.correct_option?'correct':'incorrect';if(result==='correct')correct++;const row=el('div',`review-item ${result==='correct'?'correct':'needs-repair'}`);row.appendChild(el('strong','',`${item.id}: ${result==='correct'?'সঠিক':'Repair প্রয়োজন'}`));row.appendChild(el('p','',item.explanation_bn));row.appendChild(el('p','',`Correct answer: ${item.correct_answer}`));review.appendChild(row);const evidence={evidence_id:`ielts-listening-v1:${item.id}`,item_id:item.id,skill_id:item.skill_id,result,evidence_type:item.evidence_type,source_id:item.id};if(window.OvidhanLearning)window.OvidhanLearning.recordSkillEvidence(evidence.evidence_id,evidence.skill_id,evidence.evidence_type,evidence.result,evidence.source_id);emit('ovidhan:listening-evidence',evidence);});
    const transcript=el('details','transcript-review');const summary=el('summary','', 'Attempt-এর পরে transcript review করুন');transcript.appendChild(summary);const body=el('p','',reviewRecording.transcript_en);body.lang='en';transcript.appendChild(body);review.appendChild(transcript);
    review.insertBefore(el('p','review-summary',`${correct}/${items.length} objective item সঠিক। এটি band, readiness বা mastery score নয়।`),title.nextSibling);
    const repair=el('button','btn btn-secondary','Recording আবার শুনে repair করুন');repair.type='button';repair.addEventListener('click',()=>{emit('ovidhan:listening-repair-start',{recording_id:recording().recording_id});render();host.querySelector('h3').focus();});review.appendChild(repair);
    const next=el('button','btn btn-primary',state.index+1<state.pack.recordings.length?'পরের recording →':'প্রথম recording আবার করুন');next.type='button';next.addEventListener('click',()=>{state.index=state.index+1<state.pack.recordings.length?state.index+1:0;render();host.querySelector('h3').focus();});review.appendChild(next);
    host.querySelectorAll('input,button[type="submit"]').forEach(node=>node.disabled=true);host.appendChild(review);title.focus();
  }
  fetch('/data/ielts-listening-practice-v1.json',{credentials:'same-origin'}).then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}).then(pack=>{state.pack=pack;render();}).catch(()=>{host.replaceChildren(el('p','load-error','Practice data load করা যায়নি। Page reload করে আবার চেষ্টা করুন।'));});
})();
