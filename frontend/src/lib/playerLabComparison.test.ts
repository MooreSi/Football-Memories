import { expect,it } from "vitest";
import { EMPTY_BOOK, labRows, teammateComparison } from "./playerLab";
const matches=Array.from({length:3},(_,i)=>({id:`m${i}`,title:`26110${i+1} U11 v Town`,age_group:"U11",capture_key:`m${i}`,moments:[{id:"sam",category:"Sam Example",time_s:10,duration_s:10},{id:"alex",category:"Alex Sample",time_s:10,duration_s:10}]}));
const records=matches.flatMap(m=>[{match:m.id,player:"Sam Example",position:"CB",minutes:30,counts:{tackles:4},note:""},{match:m.id,player:"Alex Sample",position:"CB",minutes:60,counts:{tackles:6},note:""}]);
it("compares matched positions on shared fixtures per thirty confirmed minutes",()=>{
 const book={...EMPTY_BOOK,records};
 expect(teammateComparison(labRows(matches,"Sam Example","CB",null,book),labRows(matches,"Alex Sample",null,null,book),"tackles")).toEqual({ours:4,theirs:3,matches:3,percent:false});
});
it("withholds comparisons with mismatched positions or missing minutes",()=>{
 const book={...EMPTY_BOOK,records:records.map(r=>({...r,position:r.player==="Alex Sample"?"ST":"CB"}))};
 expect(teammateComparison(labRows(matches,"Sam Example","CB",null,book),labRows(matches,"Alex Sample",null,null,book),"tackles")).toBeNull();
});
it("does not use team-tag overlap as an individual teammate benchmark",()=>{
 const book={...EMPTY_BOOK,records};
 const own=labRows(matches,"Sam Example","CB",null,book),other=labRows(matches,"Alex Sample",null,null,book);
 own[0].stats.tackles.source="overlap";
 expect(teammateComparison(own,other,"tackles")).toBeNull();
});
