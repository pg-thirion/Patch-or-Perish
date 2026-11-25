export const PROFILE_KEY="patch-or-perish-learning-v2";
export const DEFAULT_SETTINGS=Object.freeze({theme:"dark",font:"normal",wrap:"wrap",seconds:180});
export const emptyProfile=()=>({settings:{...DEFAULT_SETTINGS},bookmarks:[],records:{},xp:0,bestStreak:0,streak:0,days:[]});
const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
export function normaliseProfile(raw,cases){
 const p=emptyProfile(),ids=new Set(cases.map(c=>c.id));
 if(!raw||typeof raw!=="object")return p;
 const s=raw.settings||{};
 if(["dark","light","contrast"].includes(s.theme))p.settings.theme=s.theme;
 if(["normal","large","largest"].includes(s.font))p.settings.font=s.font;
 if(["wrap","scroll"].includes(s.wrap))p.settings.wrap=s.wrap;
 if([60,180,300,600].includes(s.seconds))p.settings.seconds=s.seconds;
 if(Array.isArray(raw.bookmarks))p.bookmarks=[...new Set(raw.bookmarks.filter(id=>ids.has(id)))];
 if(raw.records&&typeof raw.records==="object")for(const id of ids){
  const r=raw.records[id];if(!r||!integer(r.attempts,1,1000000)||!integer(r.correct,0,r.attempts)||typeof r.lastCorrect!=="boolean")continue;
  p.records[id]={attempts:r.attempts,correct:r.correct,lastCorrect:r.lastCorrect,best:integer(r.best,0,100)?r.best:0};
 }
 p.xp=integer(raw.xp,0,100000000)?raw.xp:0;
 p.streak=integer(raw.streak,0,1000000)?raw.streak:0;
 p.bestStreak=Math.max(p.streak,integer(raw.bestStreak,0,1000000)?raw.bestStreak:0);
 if(Array.isArray(raw.days))p.days=[...new Set(raw.days.filter(d=>typeof d==="string"&&datePattern.test(d)))].sort().slice(-366);
 return p;
}
export function recordAnswer(p,id,result){
 const correct=Boolean(result.identified&&result.fixed&&!result.skipped);
 const r=p.records[id]||{attempts:0,correct:0,lastCorrect:false,best:0};
 p.records[id]={attempts:r.attempts+1,correct:r.correct+Number(correct),lastCorrect:correct,best:Math.max(r.best,result.points)};
 p.xp+=result.points;p.streak=correct?p.streak+1:0;p.bestStreak=Math.max(p.bestStreak,p.streak);
 return p;
}
export function toggleBookmark(p,id){const i=p.bookmarks.indexOf(id);if(i>=0)p.bookmarks.splice(i,1);else p.bookmarks.push(id);return i<0;}
export function dailyCases(cases,day,count=3){
 let h=2166136261;for(const c of day){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 const a=[...cases];for(let i=a.length-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);[a[i],a[j]]=[a[j],a[i]];}
 return a.slice(0,count);
}
export function eligibleCases(cases,p,category="all",level=0,mode="practice",day=""){
 if(mode==="daily")return dailyCases(cases,day);
 return cases.filter(c=>(category==="all"||c.category===category)&&(!level||c.level===level)&&
 (mode!=="bookmarks"||p.bookmarks.includes(c.id))&&(mode!=="weak"||p.records[c.id]?.lastCorrect===false));
}
export function profileStats(p,cases,groups){
 const mastered=cases.filter(c=>p.records[c.id]?.lastCorrect).length;
 const attempts=Object.values(p.records).reduce((n,r)=>n+r.attempts,0);
 const correct=Object.values(p.records).reduce((n,r)=>n+r.correct,0);
 return {mastered,attempts,correct,accuracy:attempts?Math.round(correct*100/attempts):0,
 rank:p.xp>=5000?"Security lead":p.xp>=2500?"Senior analyst":p.xp>=1000?"Analyst":p.xp>=300?"Apprentice":"Recruit",
 modules:groups.map(category=>{const list=cases.filter(c=>c.category===category);return {category,total:list.length,mastered:list.filter(c=>p.records[c.id]?.lastCorrect).length};}),
 achievements:[["First patch",correct>=1],["Three in a row",p.bestStreak>=3],["Ten in a row",p.bestStreak>=10],["Full catalogue",mastered===cases.length],["1,000 XP",p.xp>=1000],["Daily defender",p.days.length>=1]]};
}
export function findCases(cases,query="",category="all",level=0){
 const q=query.trim().toLowerCase();
 return cases.filter(c=>(category==="all"||category===c.category)&&(!level||level===c.level)&&(!q||[c.title,c.category,c.cwe,c.file,c.context].some(v=>v.toLowerCase().includes(q))));
}
export function reportData(current,summary,date){
 return {game:"Patch or Perish",date,mode:current.mode,score:summary.score,maximum:summary.max,accuracy:summary.accuracy,elapsedSeconds:current.elapsedSeconds,
 challenges:current.items.map(c=>{const r=current.results.find(x=>x.id===c.id);return {id:c.id,title:c.title,category:c.category,cwe:c.cwe,outcome:!r?"unanswered":r.skipped?"skipped":r.identified&&r.fixed?"correct":"incorrect",points:r?.points||0,diagnosis:r?.diagnosis||null,patch:r?.patch??null};})};
}
export function reviewCases(items,results,filter){
 return items.filter(c=>{const r=results.find(x=>x.id===c.id);return filter==="all"||filter==="correct"&&r?.identified&&r?.fixed||filter==="missed"&&!(r?.identified&&r?.fixed)||filter==="unanswered"&&!r;});
}
export function glossary(groups){
 const descriptions=["Untrusted input changes a database query. Bind parameters for values and allowlist identifiers.","Untrusted content is interpreted as active browser markup. Use safe text sinks, context-aware escaping or vetted sanitisation.","Identity or session checks are insufficient. Use established password hashing, token validation and attempt limits.","Secrets become accessible through code, logs or clients. Rotate exposed secrets and use scoped server-side storage.","A user can access an operation or object without the required permission. Enforce server-side authorisation.","Untrusted data reaches a dangerous interpreter, file path or deserialiser. Validate inputs and avoid unsafe execution.","Weak randomness, unauthenticated encryption or incorrect TLS verification undermine confidentiality or integrity.","Unsafe defaults, overly broad trust or missing protections expose a system. Use secure settings and least privilege."];
 return groups.map((category,i)=>({category,description:descriptions[i]}));
}
