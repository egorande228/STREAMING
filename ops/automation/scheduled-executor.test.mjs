import test from 'node:test';
import assert from 'node:assert/strict';
import {executeScheduledJob as run} from './scheduled-executor.mjs';
const job={id:'123',accountId:'account1',channel:'bein-ar-4',sourceRef:'src_'+'a'.repeat(24),start:1000,end:5000,checkedAt:1000,scheduleFresh:true,channelConfirmed:true};
function setup(options={}){
 const state={manualHold:false,reservation:null,running:false,recoveryRequired:false,...options},calls=[];
 let queue=Promise.resolve();
 const lock={snapshot:async()=>({...state}),assertOwnership:async id=>{if(JSON.stringify(state.reservation)!==JSON.stringify(id))throw Error('fence');},
  reserve:async id=>{assert.equal(state.reservation,null);state.reservation=id;calls.push('reserve');},
  start:async()=>{state.running=true;calls.push('start');},isRunning:async()=>state.running,
  probeOutput:async()=>{calls.push('probe');return options.badProbe?{frames:0}:{video:true,audio:true,frames:50,channel:'bein-ar-4'};},
  publish:async()=>{calls.push('publish');if(options.publishFails)throw Error('publish');},unpublish:async()=>{calls.push('unpublish');if(options.cleanupFails)throw Error('unpublish');},
  stop:async()=>{calls.push('stop');state.running=false;},isStopped:async()=>!state.running,
  release:async()=>{calls.push('release');state.reservation=null;},markRecovery:async()=>{state.recoveryRequired=true;calls.push('recovery');}};
 const control={withAccountLock:async(_id,fn)=>{const prior=queue;let release;queue=new Promise(r=>release=r);await prior;try{return await fn(lock)}finally{release()}}};
 return {state,calls,control};
}
test('reserves before start and publishes only after verified output',async()=>{const s=setup();assert.equal((await run(job,s.control,()=>2000)).action,'running');assert.deepEqual(s.calls,['reserve','start','probe','publish']);});
test('manual hold causes no side effects',async()=>{const s=setup({manualHold:true});assert.equal((await run(job,s.control,()=>2000)).reason,'manual_stream');assert.deepEqual(s.calls,[]);});
test('two jobs cannot use the same account concurrently',async()=>{const s=setup();const out=await Promise.all([run(job,s.control,()=>2000),run({...job,id:'456'},s.control,()=>2000)]);assert.deepEqual(out.map(x=>x.action),['running','hold']);assert.equal(s.calls.filter(x=>x==='start').length,1);});
test('repeated tick does not open another upstream',async()=>{const s=setup();await run(job,s.control,()=>2000);await run(job,s.control,()=>2500);assert.equal(s.calls.filter(x=>x==='start').length,1);});
test('failed playback is never published and cleans up before release',async()=>{const s=setup({badProbe:true});assert.equal((await run(job,s.control,()=>2000)).action,'failed');assert.deepEqual(s.calls,['reserve','start','probe','unpublish','stop','release']);});
test('failed publication is cleaned up',async()=>{const s=setup({publishFails:true});assert.equal((await run(job,s.control,()=>2000)).cleanedUp,true);assert.equal(s.state.reservation,null);});
test('uncertain cleanup retains reservation and blocks future jobs',async()=>{const s=setup({badProbe:true,cleanupFails:true});assert.equal((await run(job,s.control,()=>2000)).reason,'cleanup_unconfirmed');assert.ok(s.state.reservation);assert.equal((await run(job,s.control,()=>2500)).reason,'recovery_required');});
test('end of window unpublishes, stops, confirms and then frees account',async()=>{const s=setup();await run(job,s.control,()=>2000);s.calls.length=0;assert.equal((await run(job,s.control,()=>5000)).action,'stopped');assert.deepEqual(s.calls,['unpublish','stop','release']);});
test('expired job cannot stop another reservation',async()=>{const s=setup({reservation:{id:'other'}});assert.equal((await run(job,s.control,()=>6000)).reason,'account_reserved');assert.deepEqual(s.calls,[]);});
test('unconfirmed or stale schedule cannot start',async()=>{for(const change of [{channelConfirmed:false},{checkedAt:-4000000},{checkedAt:3000}]){const s=setup();assert.equal((await run({...job,...change},s.control,()=>2000)).reason,'schedule_unconfirmed');assert.deepEqual(s.calls,[]);}});
test('expired or not yet due job does not connect',async()=>{for(const now of [0,6000]){const s=setup();await run(job,s.control,()=>now);assert.deepEqual(s.calls,[]);}});
