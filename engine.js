export const createEngine = function createEngine(cases,groups){
 const shuffle=(items,rng=Math.random)=>{let a=[...items];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 function select(category="all",level=0,count=8,rng=Math.random){return shuffle(cases.filter(c=>(category==="all"||c.category===category)&&(!level||c.level===level)),rng).slice(0,count);}
 function grade(c,diagnosis,patch,hint=false){const identified=diagnosis===c.category, fixed=patch===0;return {identified,fixed,points:Math.max(0,(identified?40:0)+(fixed?60:0)-(hint?15:0))};}
 function summarise(results,total){const score=results.reduce((s,r)=>s+r.points,0);return {score,max:total*100,accuracy:total?Math.round(results.filter(r=>r.identified&&r.fixed).length/total*100):0,patched:results.filter(r=>r.fixed).length,identified:results.filter(r=>r.identified).length};}
 function choices(c,rng=Math.random){return {categories:shuffle([c.category,...shuffle(groups.filter(g=>g!==c.category),rng).slice(0,3)],rng),patches:shuffle(c.patches.map((text,index)=>({text,index})),rng)};}
 return {select,grade,summarise,choices,shuffle};
};
