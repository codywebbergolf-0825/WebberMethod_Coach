const COACH_CODE = "webbercoach";
const PROGRAMS = {
  "Break 100 Program": ["Tee shot start-line control","Approach contact priority","Short-game ladder work","Eliminate penalty strokes"],
  "Break 90 Program": ["Driver dispersion windows","Approach proximity 100-150","Wedge matrix","3-putt prevention"],
  "Break 80 Program": ["Shot-shape ownership","Approach proximity 125-175","Inside-10ft pressure putting","Expected-value decision drills"],
  "Break 70 Program": ["Elite benchmarking","Pin strategy and spin windows","Random-lie scrambling","Tournament routines"]
};

const db = {
  rounds: JSON.parse(localStorage.getItem("wm_rounds") || "[]"),
  practice: JSON.parse(localStorage.getItem("wm_practice") || "[]"),
  trackman: JSON.parse(localStorage.getItem("wm_trackman") || "[]"),
  drills: JSON.parse(localStorage.getItem("wm_drills") || "[]"),
  coach: JSON.parse(localStorage.getItem("wm_coach") || '{"practiceFocus":"Start-line consistency and speed-control putting.","programOverride":"","trackmanGoal":"Improve face-to-path variance to ±2°."}')
};

const save = () => {
  localStorage.setItem("wm_rounds", JSON.stringify(db.rounds));
  localStorage.setItem("wm_practice", JSON.stringify(db.practice));
  localStorage.setItem("wm_trackman", JSON.stringify(db.trackman));
  localStorage.setItem("wm_drills", JSON.stringify(db.drills));
  localStorage.setItem("wm_coach", JSON.stringify(db.coach));
};

function rec(avg10) { // exact threshold logic from workbook
  if (avg10 == null || Number.isNaN(avg10)) return "Need 10 rounds";
  if (avg10 >= 100) return "Break 100 Program";
  if (avg10 >= 90) return "Break 90 Program";
  if (avg10 >= 80) return "Break 80 Program";
  if (avg10 >= 70) return "Break 70 Program";
  return "Break 70 Program";
}

function displayScores(rounds) { // workbook intent: 18-hole direct, pair sequential 9-hole rounds
  const sorted = [...rounds].sort((a,b)=>a.date.localeCompare(b.date));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (+r.holes === 18) out.push(+r.score);
    else if (+r.holes === 9 && sorted[i+1] && +sorted[i+1].holes === 9) {
      out.push(+r.score + +sorted[i+1].score); i++;
    }
  }
  return out;
}

function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }

function shotFeedback(path, f2p, handed){
  const fa = path + f2p;
  const st = fa > 1 ? "Starts Right" : fa < -1 ? "Starts Left" : "Starts On Line";
  let curve = "Straight";
  if (f2p > 1) curve = handed === "LH" ? (f2p > 3 ? "Hook" : "Draw") : (f2p > 3 ? "Slice" : "Fade");
  else if (f2p < -1) curve = handed === "LH" ? (f2p < -3 ? "Slice" : "Fade") : (f2p < -3 ? "Hook" : "Draw");
  const sm = fa > 1 ? (handed === "LH" ? "Pull" : "Push") : fa < -1 ? (handed === "LH" ? "Push" : "Pull") : "";
  const miss = sm ? (curve === "Straight" ? sm : `${sm}-${curve}`) : (curve === "Straight" ? "" : curve);
  return miss ? `${st} • ${curve} • Miss: ${miss}` : `${st} • ${curve}`;
}

function renderHome(){
  const ds = displayScores(db.rounds);
  const avgScore = avg(ds);
  const avg10 = ds.length >= 10 ? avg(ds.slice(-10)) : null;
  const currentHandicap = avg10 == null ? null : Math.round((Math.max(-10, Math.min(35, avg10 - 72))) * 10) / 10;
  const recommendation = db.coach.programOverride || rec(avg10);
  homeMetrics.innerHTML = [
    ["Avg Score", avgScore ? avgScore.toFixed(1) : "—"],
    ["10-Round Avg", avg10 ? avg10.toFixed(1) : "Need 10 rounds"],
    ["Current Handicap", currentHandicap ?? "—"],
    ["Rounds Logged", db.rounds.length],
    ["Recommended Program", recommendation]
  ].map(([k,v])=>`<div class='metric'><h4>${k}</h4><p>${v}</p></div>`).join('');
  coachFocus.textContent = db.coach.practiceFocus;
  coachGoal.textContent = db.coach.trackmanGoal;
}

function renderRoundSummary(){
  const ds = displayScores(db.rounds);
  const avg5 = ds.length >= 5 ? avg(ds.slice(-5)) : null;
  const avg10 = ds.length >= 10 ? avg(ds.slice(-10)) : null;
  const handicapProxy = avg10 == null ? "—" : Math.round((Math.max(-10, Math.min(35, avg10 - 72))) * 10) / 10;
  roundSummary.innerHTML = `<div>
    <p><strong>Average Score:</strong> ${avg(ds)?.toFixed(2) ?? "—"}</p>
    <p><strong>Last 5 Avg:</strong> ${avg5?.toFixed(2) ?? "—"}</p>
    <p><strong>Last 10 Avg:</strong> ${avg10?.toFixed(2) ?? "—"}</p>
    <p><strong>Recommended Program:</strong> ${rec(avg10)}</p>
    <p><strong>Handicap Proxy:</strong> ${handicapProxy}</p>
  </div>`;
}

function renderPracticeSummary(){
  const total = db.practice.reduce((a,p)=>a + p.totalPoints, 0);
  const avgApproach = avg(db.practice.map(p=>p.approach).filter(n=>n>0));
  const now = new Date();
  const from = new Date(now); from.setDate(now.getDate()-6);
  const last7 = db.practice.filter(p => new Date(p.date) >= from).reduce((a,p)=>a+p.totalPoints,0);
  practiceSummary.innerHTML = `<div>
    <p><strong>Total Practice Points:</strong> ${total}</p>
    <p><strong>Sessions:</strong> ${db.practice.length}</p>
    <p><strong>Average Approach Minutes:</strong> ${avgApproach?.toFixed(1) ?? "—"}</p>
    <p><strong>Last 7 Days Points:</strong> ${last7}</p>
  </div>`;
}

function renderProgram(){
  const ds = displayScores(db.rounds);
  const avg10 = ds.length >= 10 ? avg(ds.slice(-10)) : null;
  const selected = db.coach.programOverride || rec(avg10);
  programPanel.innerHTML = `<div><h3>${selected}</h3><ul>${PROGRAMS[selected].map(i=>`<li>${i}</li>`).join("")}</ul></div>`;
}

function rolling(arr, n=10){
  return arr.map((_,i)=> i+1 < n ? null : avg(arr.slice(i-n+1,i+1)));
}

function renderTrackmanSummary(){
  const club = db.trackman.map(t=>t.clubSpeed), path = db.trackman.map(t=>t.path), f2p=db.trackman.map(t=>t.faceToPath), att=db.trackman.map(t=>t.attack);
  const rClub = rolling(club), rPath = rolling(path), rF2p = rolling(f2p), rAtt = rolling(att);
  const rows = db.trackman.map((t,i)=>`<tr><td>${t.date}</td><td>${t.clubSpeed}</td><td>${t.path}</td><td>${t.faceToPath}</td><td>${t.attack}</td><td>${rClub[i]?.toFixed(2) ?? ""}</td><td>${rPath[i]?.toFixed(2) ?? ""}</td><td>${rF2p[i]?.toFixed(2) ?? ""}</td><td>${rAtt[i]?.toFixed(2) ?? ""}</td></tr>`).join("");
  trackmanSummary.innerHTML = `<div><p><strong>Coach Goal:</strong> ${db.coach.trackmanGoal}</p><table><tr><th>Date</th><th>Club Speed</th><th>Path</th><th>Face-to-Path</th><th>Attack</th><th>CS Roll10</th><th>Path Roll10</th><th>F2P Roll10</th><th>Attack Roll10</th></tr>${rows}</table></div>`;
}

function renderDrills(){
  const sections = ["Tee Shot Performance","Approach Shot Performance","Short Game Performance","Course Management"];
  drillSections.innerHTML = sections.map(s=>{
    const rows = db.drills.filter(d=>d.section===s).map(d=>`<li><strong>${d.title}</strong> — ${d.description}${d.fileName ? ` (file: ${d.fileName})` : ""}</li>`).join("") || "<li>No drills yet.</li>";
    return `<div class='card'><h3>${s}</h3><ul>${rows}</ul></div>`;
  }).join("");
}

document.querySelectorAll(".nav button").forEach(btn => btn.addEventListener("click", ()=>{
  document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.page).classList.add("active");
}));

jumpPractice.onclick = ()=> document.querySelector('[data-page="Log Practice"]').click();
jumpRound.onclick = ()=> document.querySelector('[data-page="Track Round"]').click();

roundForm.onsubmit = (e)=>{
  e.preventDefault();
  const f = new FormData(roundForm);
  db.rounds.push({
    date:f.get("date"), course:f.get("course"), holes:+f.get("holes"), par:+f.get("par"), score:+f.get("score"),
    fairwaysHit:+f.get("fairwaysHit"), fairwayOpps:+f.get("fairwayOpps"), gir:+f.get("gir"), putts:+f.get("putts"),
    fairwayPct:+f.get("fairwaysHit") / +f.get("fairwayOpps"), girPerHole:+f.get("gir") / +f.get("holes"), puttsPerHole:+f.get("putts") / +f.get("holes")
  });
  save(); renderAll(); alert("Round saved");
};

practiceForm.onsubmit = (e)=>{
  e.preventDefault();
  const f = new FormData(practiceForm);
  const totalPoints = +f.get("tee") + +f.get("approach") + +f.get("shortGame") + +f.get("courseMgmt") + +f.get("putting") + (f.get("completed") === "Yes" ? 5 : 0);
  db.practice.push({ date:f.get("date"), tee:+f.get("tee"), approach:+f.get("approach"), shortGame:+f.get("shortGame"), courseMgmt:+f.get("courseMgmt"), putting:+f.get("putting"), completed:f.get("completed"), notes:f.get("notes"), totalPoints });
  save(); renderAll(); alert("Practice saved");
};

trackmanForm.onsubmit = (e)=>{
  e.preventDefault();
  const f = new FormData(trackmanForm);
  const path = +f.get("path"), faceToPath = +f.get("faceToPath"), handed = f.get("handed");
  const feedback = shotFeedback(path, faceToPath, handed);
  db.trackman.push({ date:f.get("date"), clubSpeed:+f.get("clubSpeed"), path, faceToPath, attack:+f.get("attack"), handed, feedback });
  trackmanFeedback.textContent = feedback;
  save(); renderAll();
};

coachUnlock.onclick = ()=>{
  coachControls.classList.toggle("hidden", coachCode.value !== COACH_CODE);
  if (coachCode.value === COACH_CODE) {
    coachFocusInput.value = db.coach.practiceFocus;
    coachGoalInput.value = db.coach.trackmanGoal;
    coachProgramOverride.value = db.coach.programOverride;
  } else alert("Invalid coach code");
};

saveCoach.onclick = ()=>{
  db.coach.practiceFocus = coachFocusInput.value;
  db.coach.trackmanGoal = coachGoalInput.value;
  db.coach.programOverride = coachProgramOverride.value;
  save(); renderAll(); alert("Coach updates saved");
};

drillForm.onsubmit = (e)=>{
  e.preventDefault();
  const f = new FormData(drillForm);
  if (f.get("coachCode") !== COACH_CODE) return alert("Coach code required");
  const file = f.get("file");
  db.drills.push({ section:f.get("section"), title:f.get("title"), description:f.get("description"), fileName: file && file.name ? file.name : "" });
  save(); renderDrills(); alert("Drill added");
};

function renderAll(){ renderHome(); renderRoundSummary(); renderPracticeSummary(); renderProgram(); renderTrackmanSummary(); renderDrills(); }
renderAll();
