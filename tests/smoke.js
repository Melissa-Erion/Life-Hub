const {JSDOM}=require('jsdom');const TODAY=new Date().toLocaleDateString('en-CA');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../app/index.html','utf8').replace(/<link[^>]*>/g,'');
const lib=JSON.parse(fs.readFileSync(__dirname+'/../app/library.json','utf8'));
const paths=JSON.parse(fs.readFileSync(__dirname+'/../app/pathways.json','utf8'));
const data={goals:{g1:{title:"Test goal",area:"marketing",sub:"SEO",status:"active",milestones:[{t:"m",done:true}],steps:[{t:"s",done:false}],points:[{d:"2026-11-01",v:10},{d:"2026-11-10",v:14}]}},skills:{s1:{name:"brand-voice",status:"needed",does:"x",area:"marketing"}},improve:{},log:{l1:{date:TODAY,kind:"win",text:"hi",area:"marketing"}},resources:{},paths:{},habits:{h1:{name:"Walk",days:{}}},journal:{"2026-11-20":{date:"2026-11-20",text:"old"}}};
const tax={groups:[{id:"g",name:"Business",areas:[{id:"marketing",name:"Marketing",subs:Object.keys(lib.marketing)},{id:"custom",name:"Custom",subs:["X"]}]}]};
const writes=[];let saved=null;const resnaps=[];
const db={doc:p=>({onSnapshot:(n)=>{setTimeout(()=>n(p==='meta/taxonomy'?{exists:true,data:()=>tax}:{exists:false}),5)},set:async d=>writes.push([p,d])}),collection:c=>({onSnapshot:(n)=>{const emit=()=>n({docs:Object.keys(data[c]||{}).map(id=>({id,data:()=>data[c][id]}))});setTimeout(emit,5);resnaps.push(emit)},doc:id=>({set:async d=>writes.push([c+'/'+id,d]),delete:async()=>writes.push(['del',c+'/'+id])})})};
let asked='';
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://x.test/",beforeParse(w){w.claude={use:async n=>n==='db'?db:n==='sample'?(async(p)=>{asked=p;return {text:p.includes('experienced, direct mentor')?'{"assessment":"Assessment ok","working":"w","notWorking":"n","change":"c","tasks":[{"text":"Do X","why":"goal"}],"claudeNeeds":"k"}':p.includes('highest level in this area')?'{"skills":[{"name":"seo-audit","does":"d"}],"apps":[{"name":"Analytics","why":"w"}],"resources":[{"title":"A Book","why":"w"}],"needs":["n"],"order":["o"]}':p.includes('Write a skill file')?'# my-skill\nUse when...':p.includes('library')?'{"use":"Use it as rules.","skill":{"name":"brand-design","does":"d"},"needs":"files"}':'Assessment ok'}}):n==='user'?{can:async()=>true}:n==='downloads'?{save:async o=>{saved=o}}:n==='assets'?{upload:async f=>({id:'A1',contentType:'application/pdf',sizeBytes:5})}:null};w.scrollTo=()=>{};w.fetch=async(u)=>({ok:true,json:async()=>u.includes('library')?lib:paths})}});
const w=dom.window;const errs=[];w.addEventListener('error',e=>errs.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));const $=q=>w.document.querySelector(q);
(async()=>{
 await wait(80);
 for(const v of ['money','find','data','fit','biz','plan','today','goals','areas','claude','log','learn']){w.location.hash='#'+v;await wait(20);const t=$('#view').textContent;console.log(v,t.length,t.includes('Loading')?'LOADING':'ok')}
 w.location.hash='#today';await wait(20);
 console.log('cal',w.document.querySelectorAll('.cal button').length);$('#tk-text').value='Call';$('form[data-form="task"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));w.document.querySelectorAll('.cal button')[10].click();await wait(10);$('[data-act="cal-mv"]').click();await wait(10);
 console.log('dots',w.document.querySelectorAll('.dot').length);
 $('[data-act="h-today"]').click();$('.dot').click();
 $('#hb-name').value='Read';$('form[data-form="habit"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 $('[data-act="review"]').click();await wait(20);console.log('review',$('.ai')&&$('.ai').textContent, asked.includes('"habits"'));
 w.location.hash='#areas';await wait(20);
 console.log('subrows',w.document.querySelectorAll('.subrow').length);
 $('.subrow').click();await wait(10);console.log('ideas',w.document.querySelectorAll('.idea').length);
 $('[data-act="l-add"]').click();
 w.location.hash='#goals';await wait(20);$('button[data-act="g-open"]').click();await wait(10);
 console.log('spark',!!$('.spark'));
 $('#gp-g1').value='20';$('form[data-form="point"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 w.location.hash='#log';await wait(20);const ta=$('#jr-text');ta.value='today entry';ta.dispatchEvent(new w.Event('change',{bubbles:true}));
 w.location.hash='#today';await wait(20);$('button[data-act="g-open"]').click();await wait(30);console.log('back',$('.back')&&$('.back').textContent);$('.back').click();await wait(30);console.log('afterback',w.location.hash,!!$('.back'));
 data.resources={r1:{title:'Style guide',kind:'my document',area:'marketing',note:'n'}};
 w.location.hash='#learn';await wait(20);$('#rs-title').value='Book';$('form[data-form="res"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(20);
 console.log('fileinput',!!$('#rs-file'));
 w.location.hash='#social';await wait(20);console.log('social',!!$('#sc-qname'));$('#sc-qname').value='Instagram';$('form[data-form="soc-plat"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(10);{const sw=writes.filter(x=>x[0].startsWith('socials/')).pop();data.socials={};data.socials[sw[0].split('/')[1]]=sw[1];resnaps.forEach(f=>f());await wait(10);console.log('soc-plat',sw[1].name==='Instagram'&&sw[1].profile==='personal',!!$('#sc-file'));{const fi=$('#sd-file');Object.defineProperty(fi,'files',{value:[new w.File(['x'],'Brand plan.pdf',{type:'application/pdf'})]});fi.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(20);const dw=writes.filter(x=>x[0]==='plans/sd-personal').pop();console.log('soc-doc',!!dw&&dw[1].docs[0].name==='Brand plan.pdf'&&dw[1].docs[0].kind==='strategy');console.log('soc-tabs',[...w.document.querySelectorAll('[data-key="socv"]')].map(x=>x.dataset.id).join(','));}w.document.querySelector('[data-key="socv"][data-id="stats"]').click();await wait(10);$('#ss-followers').value='1,200';$('form[data-form="soc-stat"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(10);{const aw=writes.filter(x=>x[0].startsWith('socials/')).pop();console.log('soc-stat',aw[1].stats.length===1&&aw[1].stats[0].followers===1200&&aw[1].stats[0].reach==='');}w.document.querySelector('[data-act="soc-add"][data-id="profile"]').click();await wait(10);$('#sc-pname').value='Business';$('form[data-form="soc-profile"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(10);const fw=writes.filter(x=>x[0]==='plans/social').pop();console.log('soc-profile',fw[1].profiles.length===2);}
 w.location.hash='#plan';await wait(20);console.log('daycols',w.document.querySelectorAll('.daycol').length);
 const sub=(q)=>$(q).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const pt=$('form[data-form="pl-top"] input');pt.value='Ship it';sub('form[data-form="pl-top"]');
 for(const m of ['year','month','day','week']){w.document.querySelector('[data-act="pl-mode"][data-mode="'+m+'"]').click();await wait(10);console.log(m,$('#view').textContent.length,w.document.querySelectorAll('.mtile').length,w.document.querySelectorAll('.cal button').length)}
 w.document.querySelector('[data-act="pl-mode"][data-mode="month"]').click();await wait(10);const fo=$('[data-pf="focus"]');fo.value='Launch';fo.dispatchEvent(new w.Event('change',{bubbles:true}));$('.wkrow').click();await wait(10);$('[data-act="pl-mv"]').click();await wait(10);
 w.document.querySelector('.daycol h3 button').click();await wait(10);console.log('day',!!$('[data-pf="win"]'),!!$('[data-act="h-date"]'));
 w.location.hash='#today';await wait(20);w.document.querySelector('[data-act="pl-go"]').click();await wait(30);console.log('fromhome',w.location.hash,!!$('.back'));
 w.location.hash='#fit';await wait(20);
 for(const t of ['training','body','nutrition','goals']){w.document.querySelector('[data-act="tog"][data-id="'+t+'"]').click();await wait(10);console.log('fit',t,$('#view').textContent.length)}
 const tg=(t)=>{w.document.querySelector('[data-act="tog"][data-id="'+t+'"]').click()};
 data.routines={r1:{name:'Lower A',ex:[{n:'Squat',sets:'4',reps:'8',w:''}]}};data.workouts={w1:{date:TODAY,name:'Lower A',ex:[{n:'Squat',sets:'4',reps:'8',w:''}],done:false}};data.checkins={k1:{date:TODAY,done:false,weight:'',photos:[]}};
 data.meals={[TODAY]:{date:TODAY,m:[{items:[{n:'Rice',g:'100',kcal:130,p:2.7,c:28,f:0.3}]}]}};
 // force re-snapshot by reloading collections
 resnaps.forEach(f=>f());await wait(10);tg('training');await wait(10);console.log('training-with-data',$('#view').textContent.includes('Lower A'));
 w.document.querySelector('[data-act="f-day"][data-d="'+TODAY+'"]').click();await wait(10);console.log('wo-open',!!$('#wo-w1'),!!$('form[data-form="sched-day"]'));const xi=$('#wo-w1 [data-ex]');xi.value='5';xi.dispatchEvent(new w.Event('change',{bubbles:true}));sub('form[data-form="sched-day"]');$('[data-act="w-close"]').click();await wait(10);console.log('rt-collapsed',!$('form[data-form="sched"]'));$('[data-act="rt-tog"]').click();await wait(10);console.log('rt-open',!!$('form[data-form="sched"]'));sub('form[data-form="sched"]');
 tg('body');await wait(10);w.document.querySelector('[data-act="c-open"]').click();await wait(10);console.log('ci-open',!!$('#ci-open'),!!$('#ci-photo'));
 tg('nutrition');await wait(10);console.log('nutri',$('#view').textContent.includes('Rice'),$('#view').textContent.includes('Training day'));
 w.location.hash='#today';await wait(20);console.log('home-agenda',$('#view').textContent.includes('Lower A'),$('#view').textContent.includes('Body check-in'));w.location.hash='#fit';await wait(20);
 tg('training');await wait(10);$('#rt-name').value='Upper';sub('form[data-form="routine"]');
 tg('body');await wait(10);if($('[data-act="c-close"]')){$('[data-act="c-close"]').click();await wait(10)}sub('form[data-form="cisched"]');$('#cf-name').value='Waist';sub('form[data-form="cifield"]');
 tg('nutrition');await wait(10);const k=$('[data-pf="tr_kcal"]');k.value='2000';k.dispatchEvent(new w.Event('change',{bubbles:true}));
 $('#fd-n-0').value='Chicken';$('#fd-g-0').value='150';$('#fd-k-0').value='250';$('#fd-p-0').value='46';sub('form[data-form="food"]');
 resnaps.forEach(f=>f());await wait(10);console.log('savedmeal-ui',!!$('[data-act="sm-save"]'),!!$('[data-act="n-copy"]'));$('#sn-0').value='Lunch';$('[data-act="sm-save"]').click();await wait(10);
 console.log('macros',w.document.querySelectorAll('.macro').length,w.document.querySelectorAll('form[data-form="food"]').length);
 data.clients={c1:{name:'Acme',status:'lead',next:'call',nextDate:'2026-01-01'}};data.projects={p1:{name:'Site',status:'planned',client:'c1'}};data.trackers={t1:{name:'Revenue',tab:'biz',points:[{d:'2026-11-01',v:1},{d:'2026-11-08',v:3}]}};data.acts={a1:{date:TODAY,type:'call',note:'x'}};
 w.location.hash='#biz';await wait(20);
 for(const t of ['clients','projects','activity','numbers','goals']){w.document.querySelector('[data-act="tog"][data-id="'+t+'"]').click();await wait(10);console.log('biz',t,$('#view').textContent.length)}
 w.document.querySelector('[data-act="tog"][data-id="clients"]').click();await wait(10);$('#cl-name').value='Beta';sub('form[data-form="client"]');
 resnaps.forEach(f=>f());await wait(10);$('[data-act="cl-open"]').click();await wait(10);console.log('client-page',!!$('#cx-email'),!!$('#cl-file'),$('#view').textContent.includes('Site'));const em=$('#cx-email');em.value='a@b.co';em.dispatchEvent(new w.Event('change',{bubbles:true}));$('[data-act="cl-close"]').click();await wait(10);$('[data-act="cl-open"]').click();await wait(10);$('[data-act="pj-open"]').click();await wait(10);console.log('project-page',!!$('#px-goal'));w.document.querySelector('[data-key="pt"][data-id="tasks"]').click();await wait(10);$('#pk-text').value='Draft';sub('form[data-form="ptask"]');w.document.querySelector('[data-key="pt"][data-id="docs"]').click();await wait(10);console.log('project-docs',!!$('#pj-file'));$('#lk-t').value='Brand folder';$('#lk-u').value='drive.google.com/x';sub('form[data-form="link"]');await wait(10);{const lw=writes.filter(x=>x[1]&&x[1].links).pop();console.log('link-added',!!lw&&lw[1].links[0].u==='https://drive.google.com/x',!!$('#im-file'));data.projects[lw[0].split('/')[1]]=lw[1];resnaps.forEach(f=>f());await wait(10);console.log('link-shown',!!$('a[href="https://drive.google.com/x"]'));$('[data-act="att-rm"]').click();await wait(10);console.log('btn',$('[data-act="att-rm"]').outerHTML);$('[data-act="att-rm"]').click();await wait(10);const rw=writes.filter(x=>x[1]&&x[1].links).pop();console.log('link-removed',rw[1].links.length===0);}$('[data-act="pj-close"]').click();await wait(10);console.log('back-to-client',!!$('#cx-email'));$('[data-act="cl-close"]').click();await wait(10);tg('projects');await wait(10);console.log('proj-toggle',w.document.querySelectorAll('[data-key="pv"]').length);w.document.querySelector('[data-key="pv"][data-id="mine"]').click();await wait(10);
 w.document.querySelector('[data-act="tog"][data-id="activity"]').click();await wait(10);sub('form[data-form="act"]');
 tg('invoices');await wait(10);$('#iv-amt').value='500';$('#iv-num').value='INV-1';sub('form[data-form="invoice"]');console.log('invoices',!!$('form[data-form="invoice"]'));
 tg('numbers');await wait(10);$('#mn-amt').value='1,250.50';$('#mn-what').value='Invoice';sub('form[data-form="money"]');$('#sb-name').value='Tool';$('#sb-amt').value='20';sub('form[data-form="subn"]');console.log('money',$('#view').textContent.includes('income this month'),!!$('form[data-form="subn"]'));
 w.location.hash='#today';await wait(20);$('[data-act="review"]').click();await wait(20);console.log('review2',asked.includes('"business"'),asked.includes('"fitness"'));
 w.location.hash='#today';await wait(20);$('[data-act="review"]').click();await wait(20);console.log('rv',!!$('[data-act="rv-add"]'));$('[data-act="rv-add"]').click();await wait(10);
 w.location.hash='#find';await wait(20);const qi=$('#q');qi.value='acme';qi.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(10);console.log('search',$('#view').textContent.includes('Acme'));
 w.location.hash='#data';await wait(20);$('[data-act="export"]').click();await wait(10);console.log('export',!!saved&&saved.filename.startsWith('life-hub-backup'),JSON.parse(saved.data).goals!==undefined);
 w.location.hash='#money';await wait(20);
 for(const t of ['budget','savings','worth','goals']){w.document.querySelector('[data-key="mon"][data-id="'+t+'"]').click();await wait(10);console.log('money',t,$('#view').textContent.length)}
 w.document.querySelector('[data-key="mon"][data-id="budget"]').click();await wait(10);$('#bc-name').value='Food';$('#bc-amt').value='400';sub('form[data-form="bcat"]');$('#pm-amt').value='20';sub('form[data-form="pmoney"]');
 w.document.querySelector('[data-key="mon"][data-id="savings"]').click();await wait(10);$('#sg-name').value='Trip';sub('form[data-form="saving"]');
 w.document.querySelector('[data-key="mon"][data-id="worth"]').click();await wait(10);$('#ac-name').value='Savings';$('#ac-bal').value='100';sub('form[data-form="account"]');$('[data-act="nw-snap"]').click();
 w.location.hash='#areas';await wait(20);$('[data-act="brief"]').click();await wait(30);console.log('brief-write',writes.some(x=>x[0].startsWith('briefs/')));
 w.location.hash='#learn';await wait(20);console.log('skilldraft-ui',!!$('[data-act="sk-draft"]'));$('[data-act="sk-draft"]').click();await wait(30);
 await wait(30);
 console.log('writes',writes.map(x=>x[0]).join(' | '));console.log('errs',errs);
})();
