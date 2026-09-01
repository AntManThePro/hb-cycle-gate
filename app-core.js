const DOMAINS = [
  {id:"photo", label:"PHOTO DISCIPLINE", truck:"Before/after, fan, filters, roof, cleanup. No dark blurry stack."},
  {id:"clean", label:"CLEANING RESULT", truck:"White-glove surfaces. No customer-visible grease. Blades actually clean."},
  {id:"safety", label:"SAFETY / LADDER / ROOF", truck:"Three points, edge awareness, containment, chemicals, electrical."},
  {id:"nfpa", label:"NFPA / ACCESS / FAN", truck:"Access panels, hinge, base, clearances, filters seated."},
  {id:"defic", label:"DEFICIENCY CAPTURE", truck:"Broken hinge, missing panel, vibration, leak — photo + note + $ path."},
  {id:"notes", label:"NOTES / HANDOFF", truck:"What happened, what was weird, who was told. Not 'job complete'."},
  {id:"ops", label:"TIME / OPS DISCIPLINE", truck:"Duration matches scope. No 11-minute 'full clean'. Gear staged."},
  {id:"cust", label:"CUSTOMER PRESENCE", truck:"Manager walk. Floor left better. No wet footprints into dining."}
];
const GATES = [
  {id:"W1", name:"WEEK 1 GATE", day:7, bar:70, thesis:"Can they follow the process without creating a liability?"},
  {id:"W2", name:"WEEK 2 GATE", day:14, bar:75, thesis:"Can they document a complete job and spot the obvious miss?"},
  {id:"W4", name:"WEEK 4 GATE", day:28, bar:80, thesis:"Can they run a standard commercial hood solo?"},
  {id:"M", name:"MONTHLY GATE", day:58, bar:82, thesis:"Are they consistent, or was week 4 a lucky day?"}
];
const WEIGHTS = {
  W1:{photo:20,clean:10,safety:25,nfpa:8,defic:5,notes:10,ops:12,cust:10},
  W2:{photo:20,clean:15,safety:15,nfpa:10,defic:12,notes:12,ops:8,cust:8},
  W4:{photo:15,clean:18,safety:18,nfpa:12,defic:15,notes:10,ops:7,cust:5},
  M:{photo:14,clean:16,safety:16,nfpa:12,defic:14,notes:10,ops:10,cust:8}
};
const FLAGS = [
  "No fan photos","No before/after","Dark / unusable photos","Rushed timestamp cluster",
  "Grease left visible","Missing containment","Ladder / roof concern","Missed deficiency",
  "Copy-paste notes","Customer complaint seed","Chemical mishandle","Attitude / coachability"
];
const STORE = "hb-nexus-cycle-gate-v1";
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);
const daysBetween = (a,b=new Date()) => Math.floor((new Date(b)-new Date(a))/86400000);
function addDays(iso, n){const d=new Date(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function dueDate(hire, gateId, monthIndex=0){
  const g = GATES.find(x=>x.id===gateId);
  const extra = gateId==="M" ? monthIndex*30 : 0;
  return addDays(hire, g.day + extra);
}
function completedGates(tech){return new Set((tech.reviews||[]).map(r=>r.gateKey || r.gate))}
function nextNeed(tech){
  const done = completedGates(tech);
  if(!done.has("W1")) return {gate:"W1", due:dueDate(tech.hireDate,"W1"), day:7};
  if(!done.has("W2")) return {gate:"W2", due:dueDate(tech.hireDate,"W2"), day:14};
  if(!done.has("W4")) return {gate:"W4", due:dueDate(tech.hireDate,"W4"), day:28};
  const months = (tech.reviews||[]).filter(r=>r.gate==="M").length;
  return {gate:"M", due:dueDate(tech.hireDate,"M", months), day:58+months*30, monthIndex:months};
}
function statusOf(tech){
  const n = nextNeed(tech);
  const daysUntil = Math.ceil((new Date(n.due)-new Date(today()))/86400000);
  if(daysUntil < 0) return {kind:"over", label:"OVERDUE "+n.gate, daysUntil, next:n};
  if(daysUntil <= 7) return {kind:"due", label:"DUE "+n.gate, daysUntil, next:n};
  return {kind:"ok", label:n.gate+" "+daysUntil+"D", daysUntil, next:n};
}
function weightedScore(scores, gate){
  const w = WEIGHTS[gate] || WEIGHTS.M;
  let s=0,t=0;
  for(const k of Object.keys(w)){s += (Number(scores[k])||0)*w[k]; t += 100*w[k];}
  return Math.round((s/t)*100);
}
function callbackRisk(scores, flags=[]){
  const weak = (100-(scores.clean||0))*0.28 + (100-(scores.photo||0))*0.18 + (100-(scores.defic||0))*0.16 + (100-(scores.safety||0))*0.22 + (100-(scores.notes||0))*0.08 + (100-(scores.ops||0))*0.08;
  let r = weak * 0.42;
  if(flags.includes("Grease left visible")) r += 18;
  if(flags.includes("No fan photos")) r += 10;
  if(flags.includes("Missing containment")) r += 12;
  if(flags.includes("Ladder / roof concern")) r += 14;
  if(flags.includes("Customer complaint seed")) r += 16;
  return Math.max(3, Math.min(92, Math.round(r)));
}
function soloReady(scores, flags, gate){
  const min = Math.min(...DOMAINS.map(d=>Number(scores[d.id])||0));
  const crit = flags.some(f=>["Ladder / roof concern","Grease left visible","Missing containment","Chemical mishandle"].includes(f));
  if(crit) return false;
  if((gate==="W1"||gate==="W2") && min < 60) return false;
  if((gate==="W4"||gate==="M") && (min < 70 || (scores.safety||0) < 78 || (scores.photo||0) < 75)) return false;
  return weightedScore(scores, gate) >= (GATES.find(g=>g.id===gate)||{bar:80}).bar;
}
function verdictOf(score, gate, flags, scores){
  const bar = (GATES.find(g=>g.id===gate)||{bar:80}).bar;
  const crit = flags.some(f=>["Ladder / roof concern","Chemical mishandle"].includes(f));
  if(crit || score < bar-15) return {code:"HOLD", tone:"fail", text:"HOLD AT GATE — do not advance unsupervised scope."};
  if(score < bar || flags.includes("Grease left visible") || flags.includes("No fan photos")) return {code:"COACH", tone:"hold", text:"ADVANCE WITH COACHING — next jobs stay paired or photo-checked."};
  if(soloReady(scores, flags, gate) && score >= bar+5) return {code:"ADVANCE", tone:"ok", text:"ADVANCE — standard commercial scope unlocked for this gate."};
  return {code:"COACH", tone:"hold", text:"ADVANCE WITH COACHING — keep a lead eyes-on for the weak domain."};
}
function coaching(scores, flags, gate){
  const ranked = DOMAINS.map(d=>({...d, v:Number(scores[d.id])||0})).sort((a,b)=>a.v-b.v);
  const weak = ranked.slice(0,3);
  const strong = ranked.filter(x=>x.v>=85).slice(-2);
  const lines = [];
  lines.push("WHAT WAS GOOD");
  if(strong.length) strong.forEach(s=>lines.push("• "+s.label+" @ "+s.v+" — keep that standard, film it for the next new hire."));
  else lines.push("• Find one thing they did by the book and name it out loud. Don't only hunt misses.");
  lines.push("WHAT WAS WRONG VS STANDARD");
  weak.forEach(s=>lines.push("• "+s.label+" @ "+s.v+" — "+s.truck));
  flags.forEach(f=>lines.push("• FLAG: "+f));
  lines.push("5-MIN TRUCK LESSON");
  const w = weak[0];
  const lessons = {
    photo:"Open last job. Count required angles. Missing fan / before / cleanup = incomplete. Next job: shot list taped in the van.",
    clean:"Glove test on the lip and the blade root. If it tans the glove, it is not done. Show them once, then they show you.",
    safety:"Ladder talk before wheels chock. Three points, tie-off if roof, no hero moves for a $0 save.",
    nfpa:"Walk access panels and hinge with them. If it doesn't open, it doesn't count as cleaned.",
    defic:"One broken thing must become a photo + sentence + recommend. That's revenue and liability armor.",
    notes:"Ban the phrase job complete. Require: what we cleaned, what we found, who saw it.",
    ops:"Scope vs clock. If they beat the estimate by half, they skipped a cavity.",
    cust:"Manager walk at the end. Floor, plastic, wet path. The clean hood dies if the dining room is a crime scene."
  };
  lines.push("• "+(lessons[w.id]||w.truck));
  lines.push("RECOMMENDED MODULE: HB Academy → "+w.label+" + photo discipline drill.");
  return lines.join("\n");
}
function simulateJobs(scores, flags, n=12){
  const phases = [
    {id:"setup", key:"ops", fail:"sloppy setup / no containment"},
    {id:"photoB", key:"photo", fail:"missing before set"},
    {id:"hood", key:"clean", fail:"grease left in hood"},
    {id:"filt", key:"nfpa", fail:"filters / access miss"},
    {id:"fan", key:"clean", fail:"dirty blades / hinge ignore"},
    {id:"roof", key:"safety", fail:"roof / edge issue"},
    {id:"def", key:"defic", fail:"silent deficiency"},
    {id:"photoA", key:"photo", fail:"no after / no fan shot"},
    {id:"note", key:"notes", fail:"empty notes"},
    {id:"cust", key:"cust", fail:"manager unhappy"}
  ];
  const jobs = [];
  for(let i=0;i<n;i++){
    const fails=[];
    phases.forEach(p=>{
      const skill = (Number(scores[p.key])||50)/100;
      const jitter = 0.06*(Math.sin(i*1.7+p.id.length)+1);
      let pOk = Math.min(0.97, Math.max(0.08, skill*0.92 + 0.05 - jitter*0.15));
      if(flags.includes("Rushed timestamp cluster")) pOk *= 0.9;
      if(p.id==="fan" && flags.includes("No fan photos")) pOk *= 0.55;
      if(p.id==="hood" && flags.includes("Grease left visible")) pOk *= 0.5;
      if(Math.random() > pOk) fails.push(p.fail);
    });
    const callback = fails.length>=2 || fails.some(f=>/grease|roof|containment|blades/.test(f));
    jobs.push({i, fails, callback, severity:fails.length});
  }
  return jobs;
}
function seed(){
  const mk = (name,call,hire,reviews)=>({id:uid(),name,callsign:call,region:"DFW / Lewisville",mentor:"A. Albert",hireDate:hire,notes:"",reviews});
  const sc = (o)=>({photo:78,clean:76,safety:80,nfpa:74,defic:70,notes:72,ops:75,cust:80,...o});
  const R = (gate, date, scores, flags, reviewer="A. Albert")=>({
    id:uid(), gate, gateKey:gate, date, reviewer, scores, flags, evidence:"Field ride + photo pull from last 2 jobs.",
    score:weightedScore(scores,gate), risk:callbackRisk(scores,flags)
  });
  const h1 = addDays(today(),-32);
  const h2 = addDays(today(),-12);
  const h3 = addDays(today(),-5);
  const h4 = addDays(today(),-70);
  return [
    mk("Marcus Velez","ANT-07",h1,[
      R("W1", addDays(h1,7), sc({photo:82,safety:88,clean:80,notes:70}), []),
      R("W2", addDays(h1,15), sc({photo:86,defic:78,clean:84,notes:80}), []),
      R("W4", addDays(h1,29), sc({photo:88,clean:86,safety:90,defic:82,nfpa:84,notes:83}), [])
    ]),
    mk("Devon Hale","ANT-19",h2,[
      R("W1", addDays(h2,7), sc({photo:62,clean:74,safety:81,notes:58,ops:60,defic:55}), ["No fan photos","Copy-paste notes"])
    ]),
    mk("Riley Cho","ANT-22",h3,[
      R("W1", addDays(h3,6), sc({photo:71,clean:68,safety:54,ops:70,cust:77,notes:66}), ["Ladder / roof concern","Missing containment"])
    ]),
    mk("Jamal Ortiz","ANT-04",h4,[
      R("W1", addDays(h4,7), sc({photo:80,safety:84}), []),
      R("W2", addDays(h4,14), sc({photo:77,clean:79,defic:74}), []),
      R("W4", addDays(h4,28), sc({photo:75,clean:73,defic:68,notes:70}), ["Missed deficiency"]),
      R("M", addDays(h4,60), sc({photo:74,clean:72,defic:66,notes:68,ops:80,safety:82}), ["Missed deficiency","Customer complaint seed"])
    ])
  ];
}
function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORE)||"null");
    if(raw && raw.techs && raw.techs.length) return raw;
  }catch(e){}
  return {techs:seed(), selected:null};
}
function save(){localStorage.setItem(STORE, JSON.stringify({techs:state.techs, selected:state.selected}));}
const state = Object.assign({view:"dossier", draft:null}, load());
if(!state.selected) state.selected = state.techs[0] && state.techs[0].id;
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault();deferredPrompt=e;document.getElementById("installBar").classList.add("show");});
