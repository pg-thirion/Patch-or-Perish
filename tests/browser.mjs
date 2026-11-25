import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cases, groups } from "../cases.js";
const root=fileURLToPath(new URL("../",import.meta.url));
const types={"index.html":"text/html","app.js":"text/javascript","engine.js":"text/javascript","learning.js":"text/javascript","cases.js":"text/javascript","styles.css":"text/css","icon.svg":"image/svg+xml"};
const prefix="/Patch-or-Perish/";
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,"http://localhost").pathname;
 const name=pathname.startsWith(prefix)?pathname.slice(prefix.length)||"index.html":"";
 if(!Object.hasOwn(types,name)){res.writeHead(404);res.end();return;}
 try{const content=await readFile(join(root,name));res.writeHead(200,{"Content-Type":types[name],"Cache-Control":"no-store"});res.end(content);}
 catch{res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const url="http://127.0.0.1:"+server.address().port+prefix;
const dir=await mkdtemp(join(tmpdir(),"patch-browser-"));
let chrome,socket,chromeError="",seq=0,checks=0;
const pending=new Map(),errors=[],network=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function ok(v,m){assert.ok(v,m);checks++;}
function eq(a,b,m){assert.equal(a,b,m);checks++;}
async function until(fn,desc){for(let i=0;i<100;i++){try{const v=await fn();if(v)return v;}catch{}await sleep(100);}throw Error("Timeout: "+desc+" "+chromeError);}
function send(method,params={}){
 const id=++seq;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout: "+method));},10000);
  pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
  socket.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
const J=JSON.stringify;
const click=label=>evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==="+J(label)+");if(!b||b.disabled)throw Error('Missing or disabled button: '+"+J(label)+");b.click();return true})()");
const value=(label,v)=>evaluate("(()=>{const e=[...document.querySelectorAll('label')].find(x=>x.firstChild.textContent==="+J(label)+").querySelector('select');e.value="+J(String(v))+";e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()");
const selectText=t=>evaluate("(()=>{const b=[...document.querySelectorAll('.option')].find(x=>x.lastElementChild.textContent==="+J(t)+");if(!b)throw Error('Choice missing');b.click();return b.getAttribute('aria-pressed')})()");
const heading=()=>evaluate("document.querySelector('main h1')?.textContent");
const text=()=>evaluate("document.querySelector('main').textContent");
async function go(){await send("Page.navigate",{url});await until(async()=>await heading()==="Every line is a decision.","home");}
async function key(key,code,vk){await send("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:vk});await send("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:vk});}
async function viewport(w,h){await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:1,mobile:false});}
async function fits(){const layout=await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll(\"main *, header *, footer *\")].filter(x=>x.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(x=>x.tagName+\":\"+x.className)})");ok(layout.scroll<=layout.width,"No horizontal overflow: "+JSON.stringify(layout));}
try{
 chrome=spawn(process.env.CHROME_BIN||"google-chrome",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--disable-extensions","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+dir,"about:blank"],{stdio:["ignore","ignore","pipe"]});
 chrome.stderr.on("data",b=>{chromeError=(chromeError+b).slice(-2500);});
 chrome.on("error",e=>{chromeError=String(e);});
 const port=await until(async()=>Number((await readFile(join(dir,"DevToolsActivePort"),"utf8")).split("\n")[0]),"Chrome startup");
 const target=await until(async()=>{const r=await fetch("http://127.0.0.1:"+port+"/json/list");return (await r.json()).find(x=>x.type==="page");},"Chrome target");
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
 socket.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else if(m.method==="Runtime.exceptionThrown"){errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}else if(m.method==="Network.requestWillBeSent"){network.push(m.params.request.url);}});
 await send("Page.enable");await send("Runtime.enable");await send("Network.enable");
 await viewport(1440,900);await go();await fits();
 eq(await evaluate("document.querySelectorAll('.topic').length"),groups.length,"All modules");
 await value("Vulnerability family",groups[0]);await value("Difficulty",3);
 ok((await text()).includes("1 challenges available"),"Combined filter");
 await value("Vulnerability family","all");await value("Difficulty",0);await value("Mission size",24);await click("Start mission");
 const seen=new Set();
 for(let i=0;i<cases.length;i++){
  const title=await heading(),c=cases.find(x=>x.title===title);
  ok(c,"Known challenge");ok(!seen.has(c.id),"No repeats");seen.add(c.id);
  eq(await evaluate("document.querySelector('#submit').disabled"),true,"No empty diagnosis");
  eq(await selectText(c.category),"true","Correct diagnosis selected");
  await click("Lock diagnosis");
  eq(await evaluate("document.querySelector('#submit').disabled"),true,"No empty patch");
  eq(await selectText(c.patches[0]),"true","Correct patch selected");
  await click("Apply patch");
  ok((await text()).includes("100 / 100 points"),"Correct score");
  await fits();await click(i===cases.length-1?"View mission report":"Next challenge");
 }
 eq(await heading(),"Mission complete","Full mission completed");
 ok((await text()).includes("2400/2400"),"Perfect total");
 eq(await evaluate("document.querySelectorAll('details').length"),24,"All cases reviewed");
 await click("New mission");ok((await text()).includes("100%"),"Saved score");
 await go();ok((await text()).includes("2400/2400"),"Persists on reload");
 await viewport(320,740);await fits();
 await value("Vulnerability family",groups[1]);await value("Difficulty",1);await click("Start mission");await fits();
 const xss=cases.find(c=>c.category===groups[1]&&c.level===1);
 await click("Reveal hint (−15 points)");ok((await text()).includes(xss.hint),"Hint displayed");
 await evaluate("document.querySelector('.option').focus()");
 const index=await evaluate("[...document.querySelectorAll('.option')].findIndex(x=>x.lastElementChild.textContent==="+J(xss.category)+")");
 await key(String(index+1),"Digit"+(index+1),49+index);
 eq(await evaluate("document.querySelectorAll('.option[aria-pressed=true]').length"),1,"Keyboard selection");
 await key("Enter","Enter",13);
 ok((await text()).includes("Which patch is safest?"),"Keyboard confirms option");
 await fits();await selectText(xss.patches[1]);await click("Apply patch");
 ok((await text()).includes("25 / 100 points"),"Hint and wrong patch partial score");
 await click("View mission report");ok((await text()).includes("25/100"),"Partial total");
 await fits();await click("New mission");
 await value("Game mode","timed");await click("Start mission");
 eq(await evaluate("document.querySelector('#clock').textContent"),"03:00","Timer starts");
 await evaluate("window.originalNow=Date.now;Date.now=()=>window.originalNow()+181000");
 await until(async()=>await heading()==="Time expired","Expiry");
 ok((await text()).includes("0/800"),"Unanswered count");
 await evaluate("Date.now=window.originalNow");await click("New mission");
 await click("Start mission");await evaluate("window.confirm=()=>false");
 await click("End mission");ok((await text()).includes("What is the vulnerability?"),"Cancel end");
 await evaluate("window.confirm=()=>true");await click("End mission");eq(await heading(),"Mission ended","End mission");
 await click("New mission");await click("Clear local progress");ok(!(await text()).includes("Recent missions"),"Clear history");

 // Learning centre, filters, bookmarks and individual challenge launches.
 await click("Challenge library");eq(await heading(),"Challenge library","Library page");
 eq(await evaluate("document.querySelectorAll('.library-results article').length"),24,"All library cases");
 await evaluate("(()=>{const x=document.querySelector('input[type=search]');x.value='CWE-89';x.dispatchEvent(new Event('input',{bubbles:true}));})()");
 eq(await evaluate("document.querySelectorAll('.library-results article').length"),3,"CWE search");
 await value("Library category",groups[0]);await value("Library difficulty",3);
 eq(await evaluate("document.querySelectorAll('.library-results article').length"),1,"Library filters combine");
 await value("Library category",groups[1]);ok((await text()).includes("No matching challenges"),"Empty library state");
 await value("Library category",groups[0]);await click("Bookmark challenge");
 await value("Library view","bookmarks");eq(await evaluate("document.querySelectorAll('.library-results article').length"),1,"Bookmark filter");
 await click("Play challenge");const chosen=cases.find(c=>c.category===groups[0]&&c.level===3);
 eq(await heading(),chosen.title,"Single challenge launch");
 await selectText(chosen.category);await click("Lock diagnosis");await click("Change diagnosis");
 eq(await evaluate("document.querySelectorAll('.option[aria-pressed=true]').length"),1,"Diagnosis retained on back");
 await click("Lock diagnosis");await selectText(chosen.patches[0]);await click("Apply patch");await click("View mission report");
 ok((await text()).includes("Elapsed:"),"Report elapsed statistics");
 await value("Review filter","correct");eq(await evaluate("document.querySelectorAll('.review details').length"),1,"Correct review filter");
 await click("Expand reviews");eq(await evaluate("document.querySelectorAll('.review details[open]').length"),1,"Expand reviews");
 await click("Collapse reviews");eq(await evaluate("document.querySelectorAll('.review details[open]').length"),0,"Collapse reviews");
 await value("Review filter","missed");ok((await text()).includes("No challenges match"),"Missed review empty");
 await send("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:dir});
 await click("Download report");
 const report=await until(async()=>JSON.parse(await readFile(join(dir,"patch-or-perish-report.json"),"utf8")),"Report download");
 eq(report.score,100,"Downloaded report score");eq(report.challenges[0].id,chosen.id,"Downloaded report case");
 await click("Replay mission");eq(await heading(),chosen.title,"Replay same case");
 await click("Skip challenge");ok((await text()).includes("Challenge skipped"),"Skip feedback");await click("View mission report");
 await value("Review filter","unanswered");eq(await evaluate("document.querySelectorAll('.review details').length"),0,"Skipped not unanswered");
 await value("Review filter","missed");eq(await evaluate("document.querySelectorAll('.review details').length"),1,"Skipped in missed filter");
 await click("Retry missed challenges");eq(await heading(),chosen.title,"Retry missed case");
 await click("Skip challenge");await click("View mission report");await click("New mission");
 ok((await text()).includes("First patch · Unlocked"),"Achievement persists");
 ok((await text()).includes("Category mastery"),"Mastery dashboard");
 eq(await evaluate("document.querySelectorAll('.mastery-item').length"),8,"Category progress");
 await value("Game mode","weak");ok((await text()).includes("1 challenges available"),"Weak mode selection");
 await click("Start mission");eq(await heading(),chosen.title,"Weak case selected");await click("Skip challenge");await click("View mission report");await click("New mission");
 await value("Game mode","bookmarks");ok((await text()).includes("1 challenges available"),"Bookmarks mode selection");
 await click("Start mission");eq(await heading(),chosen.title,"Bookmarked case selected");await click("Remove bookmark");await click("Skip challenge");await click("View mission report");await click("New mission");
 await value("Game mode","bookmarks");eq(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Start mission').disabled"),true,"No bookmarks disables start");
 await value("Game mode","survival");await value("Mission size",4);await click("Start mission");
 for(let i=0;i<3;i++){await click("Skip challenge");ok((await text()).includes("STRIKES "+(i+1)+"/3"),"Survival strike");await click(i===2?"View mission report":"Next challenge");}
 eq(await heading(),"Survival ended","Survival stops after three strikes");
 await value("Review filter","unanswered");eq(await evaluate("document.querySelectorAll('.review details').length"),1,"Unanswered review");
 await click("New mission");await value("Game mode","daily");
 eq(await evaluate("[...document.querySelectorAll('label')].find(x=>x.firstChild.textContent==='Vulnerability family').querySelector('select').disabled"),true,"Daily filters locked");
 const daily=[];
 await click("Start mission");
 for(let i=0;i<3;i++){const title=await heading(),c=cases.find(c=>c.title===title);daily.push(title);await selectText(c.category);await click("Lock diagnosis");await selectText(c.patches[0]);await click("Apply patch");ok((await text()).includes("STREAK "+(i+1)),"Live streak");await click(i===2?"View mission report":"Next challenge");}
 await click("New mission");ok((await text()).includes("Daily defender · Unlocked"),"Daily achievement");
 await value("Game mode","daily");ok((await text()).includes("Daily challenge completed"),"Daily completion indicator");await click("Start mission");eq(await heading(),daily[0],"Daily deterministic replay");
 await click("Pause mission");eq(await heading(),"Mission paused","Pause hides challenge");await click("Resume mission");eq(await heading(),daily[0],"Resume preserves challenge");
 await click("Skip challenge");await click("Next challenge");await click("Skip challenge");await click("Next challenge");await click("Skip challenge");await click("View mission report");await click("New mission");
 await click("Security glossary");eq(await heading(),"Security glossary","Glossary page");eq(await evaluate("document.querySelectorAll('main details').length"),8,"All glossary terms");eq(await evaluate("document.querySelectorAll('main a').length"),2,"Reference links");await click("Back to home");
 await click("Settings");await value("Appearance","light");await value("Text size","largest");await value("Code layout","scroll");await value("Timed mission duration",60);
 eq(await evaluate("document.documentElement.dataset.theme"),"light","Light theme");
 eq(await evaluate("document.documentElement.dataset.font"),"largest","Text scale");eq(await evaluate("document.documentElement.dataset.wrap"),"scroll","Code scroll setting");
 await value("Appearance","contrast");eq(await evaluate("document.documentElement.dataset.theme"),"contrast","High contrast");
 await click("Back to home");await go();eq(await evaluate("document.documentElement.dataset.theme"),"contrast","Settings persist");
 await value("Game mode","timed");await click("Start mission");eq(await evaluate("document.querySelector('#clock').textContent"),"01:00","Custom timer");await fits();
 await click("Pause mission");await evaluate("window.originalNow=Date.now;Date.now=()=>window.originalNow()+120000");await click("Resume mission");ok((await text()).includes("01:00")||(await text()).includes("00:59"),"Pause freezes timer");
 await evaluate("Date.now=window.originalNow");await click("Skip challenge");await click("Next challenge");
 // End without a native modal in the test.
 await evaluate("window.confirm=()=>true");await click("End mission");await click("New mission");
 await click("Settings");await click("Restore default settings");eq(await evaluate("document.documentElement.dataset.theme"),"dark","Restore defaults");eq(await evaluate("document.documentElement.dataset.font"),"normal","Restore font");await click("Back to home");
 await click("Clear local progress");ok((await text()).includes("MASTERED0/24"),"Clear resets mastery");
 await evaluate("localStorage.setItem('patch-or-perish-learning-v2','{invalid')");

 await evaluate("localStorage.setItem('patch-or-perish-v1','{invalid')");
 await go();ok(!(await text()).includes("Recent missions"),"Corrupt storage recovery");
 await send("Page.addScriptToEvaluateOnNewDocument",{source:"Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable')}})"});
 await go();await click("Start mission");ok((await text()).includes("What is the vulnerability?"),"Unavailable storage does not block play");
 ok(network.every(u=>u.startsWith(url)||u.startsWith("data:")||u.startsWith("blob:"+url.split("/Patch-or-Perish/")[0])||u==="about:blank"),"No external requests");
 eq(errors.length,0,"No uncaught browser errors: "+errors.join("; "));
 console.log("Browser checks passed: "+checks+" assertions");
}catch(e){console.error(e);process.exitCode=1;}
finally{
 if(socket)socket.close();
 if(chrome){chrome.kill();await Promise.race([new Promise(r=>chrome.once("exit",r)),sleep(1500)]);}
 await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true,maxRetries:3});
}
