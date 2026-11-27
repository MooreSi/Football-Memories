import {expect,it} from "vitest";
import {applyRay,rayPanorama} from "./atlasGeometry";
import {inverse} from "./landmarks";
import {ballPath,pitchSource,playersAt,sidelineTracks,trackPaths,trailOf} from "./livePitch";
import type {Panorama} from "./panorama";
import type {Camera,PitchKeyframe} from "./pitch";
import type {Observation} from "./labTypes";

const I=[1,0,0,0,1,0,0,0,1];
const still=(times:number[]):Camera=>({times,segment:times.map(()=>0),total:times.map(()=>I),inverse:times.map(()=>I)});
// The whole frame is marked as the pitch: image x maps onto the length, image y (down) onto the width.
const WHOLE:PitchKeyframe[]=[{time_s:0,corners:[[0,1],[1,1],[1,0],[0,0]]}];
const SIZE={length_m:100,width_m:60};
const at=(track:number,time:number,x:number,y:number):Observation=>({track_id:track,time_s:time,team_id:null,role:"unknown",image_box:[x-.01,y-.1,x+.01,y]});

it("glides a player between detections instead of jumping at each one",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 const paths=trackPaths([at(2,0,.4,.5),at(2,1,.45,.5)],source);
 const [p]=playersAt(paths,.5);
 expect(p.track_id).toBe(2);
 expect(p.x).toBeCloseTo(42.5,6);
 expect(p.y).toBeCloseTo(30,6);
});

it("does not glide across a long gap: a player unseen for seconds is not dragged across the pitch",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 const paths=trackPaths([at(2,0,.1,.5),at(2,4,.9,.5)],source);
 expect(playersAt(paths,.3)[0].x).toBeCloseTo(10,6); // held briefly where last seen
 expect(playersAt(paths,2)).toEqual([]);
});

it("drops a detection that would need an impossible sprint, so a swapped box does not teleport the dot",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 // 0.5 s apart, 50 m away: 100 m/s.
 const paths=trackPaths([at(2,0,.2,.5),at(2,.5,.7,.5),at(2,1,.21,.5)],source);
 expect(paths.get(2)!.map(p=>Math.round(p.x))).toEqual([20,21]);
});

it("marked pitch corners give exact metres; nothing marked and no outline gives no pitch",()=>{
 expect(pitchSource(still([0,10]),WHOLE,SIZE)!.exact).toBe(true);
 expect(pitchSource(still([0,10]),[],SIZE)).toBeNull();
});

it("keeps the last few seconds of a player's path for a trail, and none of the future",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 const paths=trackPaths([0,1,2,3,4,5].map(i=>at(2,i,.1+.02*i,.5)),source);
 const trail=trailOf(paths.get(2)!,3.5,2);
 expect(trail.map(p=>p.time_s)).toEqual([2,3,3.5]);
 expect(trail.at(-1)!.x).toBeCloseTo(17,6);
});

it("puts the ball where it touches the ground and glides it between sightings",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 // Tracked balls are fractions of the frame, the radius a fraction of its width (ball.ts). In a
 // 1000 x 500 frame a 0.01 radius is 0.02 of the height, so the ground contact is at y 0.5.
 const path=ballPath([{time_s:0,x:.5,y:.48,r:.01},{time_s:1,x:.6,y:.48,r:.01}],source,1000,500);
 expect(path[0].x).toBeCloseTo(50,6);
 expect(path[0].y).toBeCloseTo(30,6);
});

/* The camera-level synthetic from levelGround.test: a Veo-like camera one unit above flat
 * ground pans across the pitch. The worker's automatic outline is all the lab has. */
const rx=(a:number)=>[1,0,0,0,Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a)];
const ry=(a:number)=>[Math.cos(a),0,Math.sin(a),0,1,0,-Math.sin(a),0,Math.cos(a)];
const mul=(a:number[],b:number[])=>[0,1,2].flatMap(r=>[0,1,2].map(c=>a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]));
const tr=(m:number[])=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
const kinv=[1,0,-.5,0,9/16,-.5*9/16,0,0,.8];
const cam=(yaw:number,tilt:number)=>mul(ry(yaw),rx(-tilt));
function synthetic(){
 const first=cam(.35,.22),yaws=[-.9,-.6,-.3,0,.3,.6,.9];
 const frame_to_world=yaws.map(y=>mul(mul(tr(first),cam(y,.22)),kinv));
 const toWorld=(p:number[])=>applyRay(tr(first),p);
 const data:Panorama={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:yaws.map((_,i)=>i),cuts:yaws.slice(1).map(()=>false),frame_to_panorama:frame_to_world,frame_to_world,projection:{kind:"cylindrical",origin:[-2.2,-.6],span:[4.4,1.8]},suggested_boundary:[],keyframe_times:[0]};
 return {data,toWorld};
}

it("builds an approximate pitch from the automatic outline alone, with the camera's touchline nearest",()=>{
 const s=synthetic();
 // A 60 x 40 pitch on the ground: x across, z away from the camera.
 const outline=[[-30,6],[30,6],[30,46],[-30,46]].map(([x,z])=>rayPanorama(s.data,s.toWorld([x,1,z])));
 const camera={...still(s.data.times),proposal:{data:s.data,review:{panorama_id:s.data.panorama_id,points:outline,accepted:true as const}}};
 const source=pitchSource(camera,[],{length_m:60,width_m:40})!;
 expect(source.exact).toBe(false);
 // A player at ground (10, 26), seen in the middle frame.
 const ray=s.toWorld([10,1,26]),image=applyRay(inverse(s.data.frame_to_world![3]!),ray);
 const [p]=playersAt(trackPaths([at(7,3,image[0]/image[2],image[1]/image[2])],source),3);
 expect(p.x).toBeCloseTo(40,3);
 expect(p.y).toBeCloseTo(20,3);
});

it("treats someone standing still on a touchline as a sideline person, not a player",()=>{
 const source=pitchSource(still([0,10]),WHOLE,SIZE)!;
 // Feet at image y 0.02: 58.8 m in, on the far touchline of a 60 m wide pitch, for ten seconds.
 const parent=[0,2,4,6,8,10].map(t=>at(9,t,.7+.002*t,.02));
 // A winger who runs 30 m along the same touchline.
 const winger=[0,1,2,3,4,5].map(t=>at(3,t,.2+.06*t,.03));
 // A coach on the near touchline.
 const coach=[0,2,4].map(t=>at(4,t,.5,.99));
 const paths=trackPaths([...parent,...winger,...coach],source);
 expect([...sidelineTracks(paths,SIZE,()=>false)].sort()).toEqual([4,9]);
 // Your label always wins: a labelled player standing on the line stays on the map.
 expect([...sidelineTracks(paths,SIZE,id=>id===9)]).toEqual([4]);
});
