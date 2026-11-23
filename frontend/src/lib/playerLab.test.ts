import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { EMPTY_ENTRY } from "./goals";
import { compareWindows, EMPTY_BOOK, labRows, validateBook, validateRecord, type LabRecord } from "./playerLab";
const name = "Sam Example";
const tag = (id: string, category: string, time_s = 10, actions?: string[]) => ({ id, category, time_s, duration_s: 10, actions });
const match = (id: string, day: number, moments = [tag("p", name, 10, ["passes"]) ]): HudlMatch => ({ id, title: `2611${String(day).padStart(2,"0")} U11 v Rovers`, age_group: "U11", capture_key: id, moments });
const record: LabRecord = { match: "m1", player: name, position: "CB", minutes: 40, counts: { passAttempts: 10, passCompleted: 8 }, note: "" };
it("counts individual actions and applies paired manual outcomes without changing source tags", () => {
  const m = match("m1",1);
  const row = labRows([m], name, "CB", "Aston Villa", { ...EMPTY_BOOK, records: [record] })[0];
  expect(row?.stats.passes).toMatchObject({ value: 1, source: "action" });
  expect(row?.stats.passAccuracy).toMatchObject({ value: 80, source: "manual", numerator: 8, denominator: 10 });
  expect(row?.minutes).toBe(40);
  expect(m.moments?.[0].actions).toEqual(["passes"]);
});
it("keeps absent outcomes missing rather than treating generic passing or 1v1s as successes", () => {
  const row = labRows([match("m1",1)], name,"CB",null,EMPTY_BOOK)[0];
  expect(row?.stats.passAccuracy.value).toBeNull();
  expect(row?.stats.dribbleSuccess.value).toBeNull();
  expect(row?.stats.tackles.value).toBeNull();
});
it("labels overlap as involvement and preserves recorded zero", () => {
  const row = labRows([match("m1",1,[tag("p",name),tag("t","ASTON VILLA TACKLE",100)])],name,"CB","Aston Villa",EMPTY_BOOK)[0];
  expect(row?.stats.tackles).toMatchObject({value:0,source:"overlap"});
});
it("uses corrected scorers and keeps untimed goals without fabricated clip links", () => {
  const row = labRows([match("m1",1)],name,"CB",null,EMPTY_BOOK,{m1:{...EMPTY_ENTRY,added:[{id:"added",side:"ours" as const}],scorers:{added:name}}})[0];
  expect(row?.stats.goals).toMatchObject({value:1,source:"confirmed"});
  expect(row?.stats.goals.clips).toEqual([{id:"added",time_s:null}]);
});
it("compares disjoint complete five-match windows and withholds mixed-source samples", () => {
  const rows = labRows(Array.from({length:10},(_,i)=>match(`m${i}`,i+1,Array.from({length:i+1},(_,j)=>tag(`p${j}`,name,10+j*20,["passes"])))),name,"CB",null,EMPTY_BOOK);
  expect(compareWindows(rows,"passes")).toMatchObject({recent:8,previous:3,source:"action"});
  rows[0].stats.passes.source="overlap";
  expect(compareWindows(rows,"passes")).toBeNull();
});
it("weights percentages by attempts instead of averaging match percentages", () => {
  const records=Array.from({length:10},(_,i)=>({...record,match:`m${i}`,counts:{passAttempts:i===9?100:10,passCompleted:i===9?50:10}}));
  const rows=labRows(records.map((r,i)=>match(r.match,i+1)),name,"CB",null,{...EMPTY_BOOK,records});
  expect(compareWindows(rows,"passAccuracy")?.recent).toBeCloseTo(64.2857,3);
});
it("rejects impossible paired outcomes and preserves explicitly recorded zero", () => {
  expect(validateRecord({...record,counts:{passAttempts:2,passCompleted:3}})).toContain("completed");
  expect(validateRecord({...record,counts:{passAttempts:0,passCompleted:0}})).toBeNull();
  expect(validateRecord({...record,minutes:-1})).toContain("Minutes");
});
it("validates notebook imports and rejects malformed or oversized records", () => {
  expect(validateBook({...EMPTY_BOOK,records:[record]}).records).toEqual([record]);
  expect(()=>validateBook({version:2})).toThrow();
  expect(()=>validateBook({...EMPTY_BOOK,records:[{...record,counts:{passAttempts:-1}}]})).toThrow();
  expect(()=>validateBook({...EMPTY_BOOK,goals:[{id:"x"}]})).toThrow();
});
it("excludes Veo and duplicate recordings, sorts dates and retains manual-only appearances", () => {
  const m=match("m1",1,[]);
  expect(labRows([m,m,{...match("v",2),source:"veo"}],name,"CB",null,{...EMPTY_BOOK,records:[record]}).map(r=>r.match.id)).toEqual(["m1"]);
});

it("does not claim a confirmed zero from another player's likely scorer assignment", () => {
 const m=match("m1",1,[tag("me",name,1),tag("other","Alex Sample",100),tag("g","ASTON VILLA GOAL",100)]);
 expect(labRows([m],name,"CB","Aston Villa",EMPTY_BOOK)[0].stats.goals).toMatchObject({value:0,source:"likely"});
});

it("withholds ratios when attempts are zero",()=>{
 const row=labRows([match("m1",1)],name,"CB",null,{...EMPTY_BOOK,records:[{...record,counts:{passAttempts:0,passCompleted:0}}]})[0];
 expect(row.stats.passAccuracy.value).toBeNull();
 expect(row.stats.passCompleted.value).toBe(0);
});
it("withholds trends across a recorded position change",()=>{
 const rows=labRows(Array.from({length:10},(_,i)=>match(`m${i}`,i+1)),name,"CB",null,EMPTY_BOOK);
 rows[0].position="GK";
 expect(compareWindows(rows,"passes")).toBeNull();
});
it("does not present the outfield touch-span estimate as goalkeeper playing time",()=>{
 const m=match("m1",1,[tag("one",name,10),tag("two",name,600)]);
 const row=labRows([m],name,"GK",null,EMPTY_BOOK)[0];
 expect(row.estimatedMinutes).toBeNull();
});
