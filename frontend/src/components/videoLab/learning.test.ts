import { expect, it } from "vitest";
import { propagateTeams } from "./teams";
import type { AppearanceTrack } from "./labTypes";
const view=(v:number[],kit:number[])=>({v,kit});
const pink=view([1,0,0],[120,180,130]),back=view([0,1,0],[90,160,140]),green=view([0,0,1],[80,100,145]);
const person=(track_id:number,views:typeof pink[]):AppearanceTrack=>({track_id,group:0,start_s:0,end_s:10,thumb:0,v:[1,0,0],views} as AppearanceTrack);
const labels=[{track_id:1,team:"own" as const,role:"player" as const},{track_id:2,team:"opponent" as const,role:"player" as const}];
it("uses reviewed front and back views across a pan instead of an averaged appearance",()=>{
 const teams=propagateTeams([person(1,[pink,back]),person(2,[green,green]),person(3,[back,back])],labels,[],[]);
 expect(teams.get(3)).toMatchObject({team:"own",source:"similar"});
});
it("abstains on a mixed track instead of flipping its team or trusting its group",()=>{
 const teams=propagateTeams([person(1,[pink,back]),person(2,[green,green]),person(3,[pink,green])],labels,[{group_id:0,team:"own",role:"player"}],[]);
 expect(teams.get(3)).toMatchObject({team:null,source:"none"});
});
it("a referee correction teaches that role without crediting a team",()=>{
 const teams=propagateTeams([person(1,[pink,pink]),person(3,[pink,pink])],[{track_id:1,team:null,role:"referee"}],[],[]);
 expect(teams.get(3)).toMatchObject({team:null,role:"referee",source:"similar"});
});
