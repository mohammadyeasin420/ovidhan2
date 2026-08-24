'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),runtime=require('../ielts-speaking-practice.js');
class ControlledRecorder{
 constructor(stream){this.stream=stream;this.mimeType='audio/webm';this.listeners={};this.state='inactive';ControlledRecorder.instances.push(this);}
 addEventListener(name,handler){this.listeners[name]=handler;}
 start(){this.state='recording';this.started=true;}
 stop(){this.state='inactive';this.stopRequested=true;if(ControlledRecorder.autoComplete)this.complete();}
 complete(){this.listeners.dataavailable&&this.listeners.dataavailable({data:new Blob(['voice'])});this.listeners.stop&&this.listeners.stop();}
}
ControlledRecorder.instances=[];ControlledRecorder.autoComplete=true;ControlledRecorder.isTypeSupported=()=>true;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const stream=counter=>({getTracks:()=>[{stop:()=>counter.count++}]});
async function run(){
 let tracks={count:0},created=0,revoked=[],now=0,requests=0;ControlledRecorder.instances=[];ControlledRecorder.autoComplete=false;
 const deps={navigator:{mediaDevices:{getUserMedia:async()=>{requests++;return stream(tracks);}}},MediaRecorder:ControlledRecorder,URL:{createObjectURL:()=>`blob:test-${++created}`,revokeObjectURL:url=>revoked.push(url)},now:()=>now};
 const controller=runtime.createRecorderController(deps);assert.equal(requests,0,'no permission request before explicit start');await controller.start();assert.equal(controller.getState().state,'recording');now=65000;const completion=controller.stop();assert.equal(controller.getState().state,'stopping');assert.equal(controller.getState().audioUrl,null);ControlledRecorder.instances[0].complete();assert.equal(await completion,true);assert.equal(controller.getState().state,'recorded');assert.equal(controller.getState().durationSeconds,65);assert.equal(controller.getState().audioUrl,'blob:test-1');assert.equal(tracks.count,1);
 controller.retry();assert.equal(controller.getState().state,'idle');assert.equal(controller.getState().audioUrl,null);assert.deepEqual(revoked,['blob:test-1']);
 tracks={count:0};ControlledRecorder.instances=[];const stale=runtime.createRecorderController({...deps,navigator:{mediaDevices:{getUserMedia:async()=>stream(tracks)}}});await stale.start();const staleCompletion=stale.stop();stale.retry();ControlledRecorder.instances[0].complete();assert.equal(await staleCompletion,false);assert.equal(stale.getState().state,'idle');assert.equal(stale.getState().audioUrl,null);assert.equal(created,1,'stale stop must not create another Blob URL');assert.ok(tracks.count>=1);
 tracks={count:0};ControlledRecorder.instances=[];const permission=deferred(),pending=runtime.createRecorderController({...deps,navigator:{mediaDevices:{getUserMedia:()=>permission.promise}}});const pendingStart=pending.start();assert.equal(pending.getState().state,'requesting');pending.retry();permission.resolve(stream(tracks));await pendingStart;assert.equal(tracks.count,1);assert.equal(ControlledRecorder.instances.length,0);assert.equal(pending.getState().state,'idle');
 tracks={count:0};ControlledRecorder.instances=[];const permissionDispose=deferred(),disposing=runtime.createRecorderController({...deps,navigator:{mediaDevices:{getUserMedia:()=>permissionDispose.promise}}});const disposeStart=disposing.start();disposing.dispose();permissionDispose.resolve(stream(tracks));await disposeStart;assert.equal(tracks.count,1);assert.equal(disposing.getState().state,'idle');
 const denied=runtime.createRecorderController({navigator:{mediaDevices:{getUserMedia:async()=>{const error=new Error();error.name='NotAllowedError';throw error;}}},MediaRecorder:ControlledRecorder});assert.equal((await denied.start()).errorCode,'PERMISSION_DENIED');const unsupported=runtime.createRecorderController({navigator:{}});assert.equal((await unsupported.start()).state,'unsupported');assert.deepEqual([0,29,30,59,60,119,120].map(runtime.durationBucket),['UNDER_30_SECONDS','UNDER_30_SECONDS','30_TO_59_SECONDS','30_TO_59_SECONDS','60_TO_119_SECONDS','60_TO_119_SECONDS','120_SECONDS_OR_MORE']);
 const page=fs.readFileSync(path.join(__dirname,'..','ielts-speaking-practice-bangla.html'),'utf8');assert.doesNotMatch(page,/OvidhanLearningFoundation/);assert.ok(page.indexOf('/learning-foundation.js')<page.indexOf('/ielts-speaking-practice.js'));assert.match(page,/https:\/\/ovidhan\.net\/ielts-speaking-practice-bangla\.html/);assert.doesNotMatch(page,/https:\/\/ovidhan\.org\/ielts-speaking-practice-bangla\.html/);assert.match(page,/href="\/ielts-guide\.html"/);
 console.log('PASS IELTS speaking lifecycle and integration tests');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
