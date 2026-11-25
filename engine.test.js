import test from "node:test";
import assert from "node:assert/strict";
import {cases,groups} from "./cases.js";
import {createEngine} from "./engine.js";
const e=createEngine(cases,groups);
test("24 unique challenges and valid options",()=>{assert.equal(cases.length,24);assert.equal(new Set(cases.map(c=>c.id)).size,24);for(const c of cases){assert.ok(groups.includes(c.category));assert.equal(new Set(c.patches).size,3);const options=e.choices(c);assert.equal(new Set(options.categories).size,4);assert.ok(options.categories.includes(c.category));assert.equal(new Set(options.patches.map(p=>p.index)).size,3);}});
test("each family has three difficulties",()=>{for(const g of groups){assert.equal(e.select(g,0,99).length,3);for(const l of [1,2,3])assert.equal(e.select(g,l,99).length,1);}});
test("grading and hint penalties",()=>{for(const c of cases){assert.equal(e.grade(c,c.category,0).points,100);assert.equal(e.grade(c,c.category,1).points,40);assert.equal(e.grade(c,"wrong",0).points,60);assert.equal(e.grade(c,"wrong",1,true).points,0);assert.equal(e.grade(c,c.category,0,true).points,85);}});
test("mission selection and incomplete mission scoring",()=>{assert.equal(e.select("all",0,8).length,8);assert.equal(e.select("all",0,24).length,24);assert.equal(e.select("all",0,0).length,0);assert.equal(e.summarise([],8).score,0);assert.equal(e.summarise([e.grade(cases[0],cases[0].category,0)],2).accuracy,50);});