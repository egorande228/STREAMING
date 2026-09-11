// Pure planning only. Execution requires atomic durable reservations and a fresh
// destination-IP playback check; this module never starts a stream or a server.
export function allocateSubscriptions(accounts, requests, reservations = []) {
  if (!Array.isArray(accounts)||!Array.isArray(requests)||!Array.isArray(reservations)||accounts.length>32||requests.length>100||reservations.length>1000) throw Error('invalid_pool');
  const seen=new Set();
  for(const a of accounts){
    if(!a||typeof a.id!=='string'||!a.id||seen.has(a.id)||!Number.isSafeInteger(a.maxConcurrent)||a.maxConcurrent<1||!Array.isArray(a.channels))throw Error('invalid_account');
    seen.add(a.id);
  }
  const windows=[...reservations];
  for(const r of windows)if(!seen.has(r.accountId)||!Number.isFinite(r.start)||!(Number.isFinite(r.end)||r.end===Infinity)||r.end<=r.start)throw Error('invalid_reservation');
  const jobs=new Set();
  for(const r of requests)if(!r||!r.id||jobs.has(r.id)){throw Error('duplicate_or_invalid_request');}else jobs.add(r.id);
  const result=[];
  for(const r of [...requests].sort((a,b)=>a.start-b.start||String(a.id).localeCompare(String(b.id)))){
    if(!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.end<=r.start||!r.channel){result.push({id:r.id,status:'blocked',reason:'invalid_window_or_channel'});continue;}
    if(r.scheduleFresh!==true||r.channelConfirmed!==true){result.push({id:r.id,status:'blocked',reason:'schedule_or_channel_unconfirmed'});continue;}
    if(windows.some(w=>w.jobId===r.id)){result.push({id:r.id,status:'blocked',reason:'already_reserved'});continue;}
    const eligible=accounts.filter(a=>a.enabled===true&&a.channels.includes(r.channel)).sort((a,b)=>a.id.localeCompare(b.id));
    const account=eligible.find(a=>{
      const occupied=windows.filter(w=>w.accountId===a.id&&w.start<r.end&&r.start<w.end);
      const points=[r.start,...occupied.map(w=>Math.max(r.start,w.start))];
      return points.every(t=>occupied.filter(w=>w.start<=t&&t<w.end).length<a.maxConcurrent);
    });
    if(!account){result.push({id:r.id,status:'blocked',reason:eligible.length?'subscription_capacity':'no_confirmed_source'});continue;}
    windows.push({jobId:r.id,accountId:account.id,start:r.start,end:r.end});
    result.push({id:r.id,status:'planned',accountId:account.id,channel:r.channel,start:r.start,end:r.end});
  }
  return {mode:'plan_only',jobs:result};
}
