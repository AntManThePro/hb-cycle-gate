function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
function selected(){return state.techs.find(t=>t.id===state.selected)}
function fleetStats(){let over=0,due=0,solo=0;state.techs.forEach(t=>{const s=statusOf(t);if(s.kind==="over")over++;if(s.kind==="due")due++;const last=t.reviews[t.reviews.length-1];if(last&&soloReady(last.scores,last.flags||[],last.gate))solo++});return{n:state.techs.length,over,due,solo}}
function latestVector(tech){const last=tech.reviews[tech.reviews.length-1];return last?last.scores:{photo:50,clean:50,safety:50,nfpa:50,defic:50,notes:50,ops:50,cust:50}}
function renderRoster(){
  const st=fleetStats();
  document.getElementById("statFleet").textContent=st.n;
  document.getElementById("statOver").textContent=st.over;
  document.getElementById("statDue").textContent=st.due;
  document.getElementById("statSolo").textContent=st.solo;
  const box=document.getElementById("roster");
  box.innerHTML=state.techs.map(t=>{const s=statusOf(t);const last=t.reviews[t.reviews.length-1];return `<div class="tech ${t.id===state.selected?"active":""}" data-id="${t.id}"><div class="nm"><strong>${t.name}</strong><span class="badge ${s.kind}">${s.label}</span></div><div class="meta">${t.callsign} · hired ${t.hireDate} · ${daysBetween(t.hireDate)}d in · last ${last?last.score:"—"}</div></div>`}).join("")||`<div class="meta">No techs. Add one.</div>`;
  box.querySelectorAll(".tech").forEach(el=>el.onclick=()=>{state.selected=el.dataset.id;state.view="dossier";save();render();document.getElementById("rail").classList.remove("open")});
}
function renderDossier(){
  const t=selected();if(!t){document.getElementById("main").innerHTML="<div class='card'>Add a technician.</div>";return}
  const s=statusOf(t),last=t.reviews[t.reviews.length-1],scores=latestVector(t);
  const risk=last?last.risk:callbackRisk(scores,[]),ready=last?soloReady(scores,last.flags||[],last.gate):false;
  document.getElementById("main").innerHTML=`<div class="kpis"><div class="kpi"><div class="l">DAYS IN</div><div class="v">${daysBetween(t.hireDate)}</div></div><div class="kpi"><div class="l">NEXT GATE</div><div class="v" style="color:${s.kind==="over"?"var(--p)":"var(--y)"}">${s.next.gate}</div></div><div class="kpi"><div class="l">CALLBACK RISK</div><div class="v">${risk}%</div></div><div class="kpi"><div class="l">SOLO</div><div class="v" style="color:${ready?"var(--g)":"var(--p)"}">${ready?"YES":"NO"}</div></div></div><div class="card" style="margin-bottom:12px"><h3>${t.name} · ${t.callsign}</h3><div class="list">${t.region} · mentor ${t.mentor} · hire ${t.hireDate} · ${s.label} · due ${s.next.due}</div><div class="timeline" style="margin-top:12px">${GATES.map(g=>{const has=t.reviews.find(r=>r.gate===g.id);const cls=has?"done":(s.next.gate===g.id?(s.kind==="over"?"miss":"on"):"");return `<div class="gate ${cls}"><div class="g">${g.id}</div><div class="s">${has?("SCORE "+has.score):g.name}<br>${g.thesis}</div></div>`}).join("")}</div><div class="row-btns" style="margin-top:12px"><button class="solid" id="openReview">RUN ${s.next.gate} REVIEW</button><button class="cyan" id="openSim">SOLO SIMULATOR</button><button id="printPack">COACHING PACKET</button><button class="pink" id="editTech">EDIT / DELETE</button></div></div><div class="grid2"><div class="card"><h3>CAPABILITY MESH</h3><canvas id="radar" width="720" height="420"></canvas></div><div class="card"><h3>TRAJECTORY + LAST VERDICT</h3><canvas id="trend" width="640" height="200"></canvas><div id="lastBox" style="margin-top:10px"></div></div></div><div class="card" style="margin-top:12px"><h3>REVIEW LOG</h3><div id="log"></div></div>`;
  document.getElementById("openReview").onclick=()=>{state.view="review";render()};
  document.getElementById("openSim").onclick=()=>{state.view="sim";render()};
  document.getElementById("printPack").onclick=()=>{state.view="packet";render()};
  document.getElementById("editTech").onclick=()=>editModal(t);
  drawRadar(document.getElementById("radar"),t);drawTrend(document.getElementById("trend"),t);
  const box=document.getElementById("lastBox");
  if(last){const v=verdictOf(last.score,last.gate,last.flags||[],last.scores);box.innerHTML=`<div class="verdict ${v.tone==="ok"?"":v.tone}"><b>${v.code}</b> · ${v.text}<div class="list" style="margin-top:6px">Score ${last.score} · risk ${last.risk}% · flags ${(last.flags||[]).join(", ")||"none"}</div></div>`}
  else box.innerHTML=`<div class="list">No gate fired yet. Run Week 1 before they touch a roof alone.</div>`;
  document.getElementById("log").innerHTML=t.reviews.slice().reverse().map(r=>`<div style="border-top:1px solid var(--line);padding:8px 0"><b>${r.gate}</b> ${r.date} · ${r.reviewer} · <span style="color:var(--c)">${r.score}</span> · risk ${r.risk}%<div class="meta">${(r.flags||[]).join(" · ")||"clean flags"}</div></div>`).join("")||"<div class='meta'>Empty log.</div>";
}
function defaultDraft(t){const n=nextNeed(t);return{gate:n.gate,date:today(),reviewer:"A. Albert",scores:{...latestVector(t)},flags:[],evidence:"",notes:""}}
function renderReview(){
  const t=selected();const d=state.draft||(state.draft=defaultDraft(t));const g=GATES.find(x=>x.id===d.gate);
  document.getElementById("main").innerHTML=`<div class="row-btns"><button id="back">← DOSSIER</button></div><div class="card"><h3>${g.name} · ${t.name}</h3><div class="list">${g.thesis} · pass bar ${g.bar}</div><form class="review" id="rev"><label>GATE</label><select name="gate">${GATES.map(x=>`<option ${x.id===d.gate?"selected":""} value="${x.id}">${x.name}</option>`).join("")}</select><div class="grid2" style="margin-top:8px"><div><label>DATE</label><input name="date" type="date" value="${d.date}"></div><div><label>REVIEWER</label><input name="reviewer" value="${d.reviewer}"></div></div>${DOMAINS.map(dom=>`<label>${dom.label}</label><div class="slider-row"><input type="range" min="0" max="100" name="${dom.id}" value="${d.scores[dom.id]}"><strong id="v_${dom.id}">${d.scores[dom.id]}</strong></div>`).join("")}<label>SPECIAL FLAGS</label><div class="flags" id="flags">${FLAGS.map(f=>`<span class="flag ${d.flags.includes(f)?"on":""}" data-f="${f}">${f}</span>`).join("")}</div><label>EVIDENCE</label><textarea name="evidence">${d.evidence||""}</textarea><label>FIELD NOTES</label><textarea name="notes">${d.notes||""}</textarea></form><div class="verdict" id="liveV"></div><div class="row-btns" style="margin-top:12px"><button class="solid" id="commit">LOCK GATE INTO RECORD</button><button class="cyan" id="previewSim">PREVIEW NEXT 12 JOBS</button></div></div>`;
  document.getElementById("back").onclick=()=>{state.view="dossier";state.draft=null;render()};
  const form=document.getElementById("rev");
  const sync=()=>{d.gate=form.gate.value;d.date=form.date.value;d.reviewer=form.reviewer.value;d.evidence=form.evidence.value;d.notes=form.notes.value;DOMAINS.forEach(dom=>{d.scores[dom.id]=Number(form[dom.id].value);document.getElementById("v_"+dom.id).textContent=d.scores[dom.id]});const sc=weightedScore(d.scores,d.gate),rk=callbackRisk(d.scores,d.flags),vv=verdictOf(sc,d.gate,d.flags,d.scores);document.getElementById("liveV").className="verdict "+(vv.tone==="ok"?"":vv.tone);document.getElementById("liveV").innerHTML=`<b>${vv.code}</b> · ${vv.text} · score ${sc} · risk ${rk}%`};
  form.oninput=sync;sync();
  document.getElementById("flags").onclick=(e)=>{const f=e.target.dataset.f;if(!f)return;if(d.flags.includes(f))d.flags=d.flags.filter(x=>x!==f);else d.flags.push(f);e.target.classList.toggle("on");sync()};
  document.getElementById("commit").onclick=()=>{sync();t.reviews.push({id:uid(),gate:d.gate,gateKey:d.gate,date:d.date,reviewer:d.reviewer,scores:{...d.scores},flags:[...d.flags],evidence:d.evidence,notes:d.notes,score:weightedScore(d.scores,d.gate),risk:callbackRisk(d.scores,d.flags)});state.draft=null;state.view="packet";save();toast("Gate locked.");render()};
  document.getElementById("previewSim").onclick=()=>{sync();state.view="sim";render()};
}
function renderSim(){
  const t=selected();const src=state.draft?state.draft.scores:latestVector(t);const flags=state.draft?state.draft.flags:(t.reviews.at(-1)&&t.reviews.at(-1).flags)||[];
  document.getElementById("main").innerHTML=`<div class="row-btns"><button id="back">← BACK</button><button class="cyan" id="reroll">RE-ROLL 12 JOBS</button></div><div class="card"><h3>SOLO-READY SIMULATOR · NEXT 12 JOBS</h3><div class="list">What happens if I send them tomorrow?</div><canvas id="pipe" width="900" height="320"></canvas><div class="kpis" style="margin-top:10px"><div class="kpi"><div class="l">CALLBACKS</div><div class="v" id="simCb">—</div></div><div class="kpi"><div class="l">CLEAN JOBS</div><div class="v" id="simOk">—</div></div><div class="kpi"><div class="l">PRED. 30D RISK</div><div class="v" id="simR">—</div></div><div class="kpi"><div class="l">VERDICT</div><div class="v" id="simV" style="font-size:14px">—</div></div></div><div id="simList" class="list"></div></div>`;
  document.getElementById("back").onclick=()=>{state.view=state.draft?"review":"dossier";render()};
  const run=()=>{const jobs=simulateJobs(src,flags,12);const cb=jobs.filter(j=>j.callback).length;document.getElementById("simCb").textContent=cb+"/12";document.getElementById("simOk").textContent=(12-cb)+"/12";document.getElementById("simR").textContent=Math.round(cb/12*100)+"%";document.getElementById("simV").textContent=cb<=2?"SEND":cb<=4?"PAIR":"HOLD";document.getElementById("simV").style.color=cb<=2?"var(--g)":cb<=4?"var(--y)":"var(--p)";document.getElementById("simList").innerHTML=jobs.map(j=>`<div>JOB ${j.i+1} — ${j.callback?"CALLBACK":"HOLDING"} — ${j.fails.join("; ")||"clean pipeline"}</div>`).join("");drawPipe(document.getElementById("pipe"),jobs)};
  document.getElementById("reroll").onclick=run;run();
}
function renderPacket(){
  const t=selected();const last=t.reviews.at(-1);if(!last){state.view="review";render();return}
  const v=verdictOf(last.score,last.gate,last.flags||[],last.scores);const coach=coaching(last.scores,last.flags||[],last.gate);
  document.getElementById("main").innerHTML=`<div class="row-btns"><button id="back">← DOSSIER</button><button class="solid" id="print">PRINT / PDF</button><button class="cyan" id="copy">COPY PACKET</button></div><div class="card" id="packet"><h3>HOOD BOSS QA · CYCLE GATE PACKET</h3><div class="list">TECH ${t.name} (${t.callsign}) · HIRE ${t.hireDate} · GATE ${last.gate} · ${last.date}<br>REVIEWER ${last.reviewer} · SCORE ${last.score} · RISK ${last.risk}% · ${v.code}</div><div class="verdict ${v.tone==="ok"?"":v.tone}" style="margin:12px 0">${v.text}</div><pre class="list" style="white-space:pre-wrap;font-family:inherit">${coach}</pre><div class="list" style="margin-top:10px"><b>EVIDENCE</b><br>${last.evidence||"—"}<br><b>NOTES</b><br>${last.notes||"—"}</div></div>`;
  document.getElementById("back").onclick=()=>{state.view="dossier";render()};
  document.getElementById("print").onclick=()=>window.print();
  document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText(document.getElementById("packet").innerText);toast("Packet copied.")};
}
function drawRadar(cv,tech){
  const ctx=cv.getContext("2d"),W=cv.width,H=cv.height,cx=W*0.42,cy=H*0.52,R=Math.min(W,H)*0.34;ctx.clearRect(0,0,W,H);
  const last=latestVector(tech),hist=tech.reviews.slice(-3);
  function poly(scores,color,fill){ctx.beginPath();DOMAINS.forEach((d,i)=>{const a=-Math.PI/2+i/DOMAINS.length*Math.PI*2,r=R*((Number(scores[d.id])||0)/100),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}ctx.strokeStyle=color;ctx.lineWidth=2;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0}
  for(let ring=1;ring<=4;ring++){ctx.beginPath();DOMAINS.forEach((d,i)=>{const a=-Math.PI/2+i/DOMAINS.length*Math.PI*2,r=R*ring/4,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.strokeStyle="rgba(0,255,135,0.12)";ctx.stroke()}
  DOMAINS.forEach((d,i)=>{const a=-Math.PI/2+i/DOMAINS.length*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.strokeStyle="rgba(96,239,255,0.18)";ctx.stroke();ctx.fillStyle="#60efff";ctx.font="11px Share Tech Mono";const lx=cx+Math.cos(a)*(R+28),ly=cy+Math.sin(a)*(R+28);ctx.textAlign=Math.cos(a)>0.2?"left":Math.cos(a)<-0.2?"right":"center";ctx.fillText(d.id.toUpperCase()+" "+(last[d.id]|0),lx,ly)});
  hist.forEach((r,i)=>poly(r.scores,i===hist.length-1?"#00ff87":"rgba(96,239,255,0.35)",i===hist.length-1?"rgba(0,255,135,0.12)":null));
  if(!hist.length)poly(last,"#ffcc00","rgba(255,204,0,0.08)");
}
function drawTrend(cv,tech){
  const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);ctx.strokeStyle="rgba(0,255,135,0.15)";
  for(let y=20;y<H;y+=40){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(W-10,y);ctx.stroke()}
  const pts=tech.reviews;if(!pts.length){ctx.fillStyle="#7d8b86";ctx.fillText("No gates yet.",24,H/2);return}
  ctx.beginPath();pts.forEach((r,i)=>{const x=30+i*((W-50)/Math.max(1,pts.length-1)),y=H-20-(r.score/100)*(H-40);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle="#00ff87";ctx.lineWidth=2;ctx.stroke();
  pts.forEach((r,i)=>{const x=30+i*((W-50)/Math.max(1,pts.length-1)),y=H-20-(r.score/100)*(H-40);ctx.fillStyle="#ff0080";ctx.beginPath();ctx.arc(x,y,4,0,6.28);ctx.fill();ctx.fillStyle="#60efff";ctx.font="10px Share Tech Mono";ctx.fillText(r.gate+" "+r.score,x-10,y-10)});
}
function drawPipe(cv,jobs){
  const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  const stages=["SETUP","BEFORE","HOOD","FILTER","FAN","ROOF","DEFIC","AFTER","NOTES","WALK"];
  stages.forEach((s,i)=>{const x=40+i*((W-80)/(stages.length-1));ctx.fillStyle="#60efff";ctx.font="10px Share Tech Mono";ctx.textAlign="center";ctx.fillText(s,x,24);ctx.strokeStyle="rgba(0,255,135,0.25)";ctx.beginPath();ctx.moveTo(x,36);ctx.lineTo(x,H-16);ctx.stroke()});
  jobs.forEach((j,ji)=>{const y=56+ji*20;ctx.fillStyle="#7d8b86";ctx.textAlign="left";ctx.fillText(String(ji+1).padStart(2,"0"),8,y+3);stages.forEach((s,i)=>{const x=40+i*((W-80)/(stages.length-1));const failed=j.fails.length&&i>=(10-j.fails.length);ctx.beginPath();ctx.arc(x,y,5,0,6.28);ctx.fillStyle=j.callback&&failed?"#ff0080":j.callback?"#ffcc00":"#00ff87";ctx.fill()})});
}
function editModal(t){
  const wrap=document.createElement("div");wrap.className="modal";
  wrap.innerHTML=`<div class="sheet"><h3 style="font-family:Orbitron;color:var(--g);margin-bottom:10px">TECH RECORD</h3><label>NAME</label><input id="eName" value="${t.name}"><label>CALLSIGN</label><input id="eCall" value="${t.callsign}"><label>HIRE DATE</label><input id="eHire" type="date" value="${t.hireDate}"><label>REGION</label><input id="eReg" value="${t.region}"><label>MENTOR</label><input id="eMen" value="${t.mentor}"><div class="row-btns" style="margin-top:12px"><button class="solid" id="eSave">SAVE</button><button class="pink" id="eDel">DELETE TECH</button><button id="eClose">CLOSE</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector("#eClose").onclick=()=>wrap.remove();
  wrap.querySelector("#eSave").onclick=()=>{t.name=wrap.querySelector("#eName").value;t.callsign=wrap.querySelector("#eCall").value;t.hireDate=wrap.querySelector("#eHire").value;t.region=wrap.querySelector("#eReg").value;t.mentor=wrap.querySelector("#eMen").value;save();wrap.remove();render()};
  wrap.querySelector("#eDel").onclick=()=>{state.techs=state.techs.filter(x=>x.id!==t.id);state.selected=state.techs[0]&&state.techs[0].id;save();wrap.remove();render()};
}
function addModal(){
  const wrap=document.createElement("div");wrap.className="modal";
  wrap.innerHTML=`<div class="sheet"><h3 style="font-family:Orbitron;color:var(--g);margin-bottom:10px">NEW TECHNICIAN</h3><label>NAME</label><input id="nName" placeholder="First Last"><label>CALLSIGN</label><input id="nCall" placeholder="ANT-31"><label>HIRE DATE</label><input id="nHire" type="date" value="${today()}"><label>REGION</label><input id="nReg" value="DFW / Lewisville"><label>MENTOR</label><input id="nMen" value="A. Albert"><div class="row-btns" style="margin-top:12px"><button class="solid" id="nGo">ADD TO CYCLE</button><button id="nClose">CLOSE</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector("#nClose").onclick=()=>wrap.remove();
  wrap.querySelector("#nGo").onclick=()=>{const name=wrap.querySelector("#nName").value.trim();if(!name)return toast("Name required.");const tech={id:uid(),name,callsign:wrap.querySelector("#nCall").value||"ANT-XX",hireDate:wrap.querySelector("#nHire").value,region:wrap.querySelector("#nReg").value,mentor:wrap.querySelector("#nMen").value,reviews:[],notes:""};state.techs.unshift(tech);state.selected=tech.id;state.view="dossier";save();wrap.remove();render()};
}
document.getElementById("menuBtn").onclick=()=>document.getElementById("rail").classList.toggle("open");
document.getElementById("addTech").onclick=addModal;
document.getElementById("resetDemo").onclick=()=>{state.techs=seed();state.selected=state.techs[0].id;state.view="dossier";save();render();toast("Demo fleet loaded.")};
document.getElementById("exportAll").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({exported:today(),source:"Hood Boss NEXUS Cycle Gate",techs:state.techs},null,2)],{type:"application/json"}));a.download="cycle-gate-roster.json";a.click()};
document.getElementById("installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById("installBar").classList.remove("show")}else toast("iOS: Share → Add to Home Screen.")};
function render(){renderRoster();if(state.view==="review")renderReview();else if(state.view==="sim")renderSim();else if(state.view==="packet")renderPacket();else renderDossier()}
render();
