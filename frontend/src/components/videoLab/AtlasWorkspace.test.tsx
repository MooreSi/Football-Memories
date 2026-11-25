import {screen,waitFor,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders} from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";
const points=[[.05,.9],[.95,.9],[.9,.3],[.1,.3]];
const goals=[{id:"goal-1",posts:[[.1,.8],[.15,.6]],tops:[[.1,.7],[.15,.5]],time_s:0,support:3,score:1,requires_review:true},{id:"goal-2",posts:[[.9,.8],[.85,.6]],tops:[[.9,.7],[.85,.5]],time_s:1,support:4,score:1,requires_review:true}];
afterEach(()=>vi.unstubAllGlobals());
it("prefers the complete cylindrical atlas and persists goal anchors with the linked top-down review",async()=>{
 let saved:Record<string,unknown>|undefined;
 const id="a".repeat(32),hash="b".repeat(64),atlasId="c".repeat(64);
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/me"))return Response.json({csrf_token:"synthetic"});
  if(url.endsWith("/samples"))return Response.json([]);
  if(init?.method==="PUT"){saved=JSON.parse(init.body as string);return Response.json({...saved,revision:2});}
  if(url.endsWith("/review"))return Response.json({revision:1,source_sha256:hash});
  if(url.endsWith("camera_motion.json"))return Response.json({source_sha256:hash,times:[0,1],steps:[[1,0,0,0,1,0,0,0,1]],cuts:[false]});
  if(url.endsWith("pitch_atlas.json"))return Response.json({panorama_id:atlasId,source_sha256:hash,width:2400,height:900,image:"pitch_atlas.jpg",times:[0,1],cuts:[false],frame_to_panorama:[[1,0,0,0,1,0,0,0,1],[1,0,0,0,1,0,0,0,1]],frame_to_world:[[1,0,-.5,0,1,0,0,0,.8],[1,0,-.5,0,1,0,0,0,.8]],projection:{kind:"cylindrical",origin:[-1,-.3],span:[2,1.3]},suggested_boundary:points,selected_goals:goals,goal_candidates:goals,keyframe_times:[0,1]});
  if(url.endsWith("pitch_panorama.json"))throw new Error("Do not prefer the incomplete legacy image");
  if(url.endsWith("team_assignments.json"))return Response.json({image_width:1920,image_height:1080,observations:[]});
  const job={id,state:"complete",progress:1,summary:{source_sha256:hash},artifacts:["sample.mp4","camera_motion.json","team_assignments.json","pitch_panorama.json","pitch_panorama.jpg","pitch_atlas.json","pitch_atlas.jpg"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 }));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByRole("img",{name:"Complete pitch panorama"})).toHaveAttribute("src",expect.stringContaining("pitch_atlas.jpg"));
 expect(screen.getByRole("img",{name:"Bird’s-eye pitch"})).toBeInTheDocument();
 expect(screen.getByText(/Both goal ends located/)).toBeInTheDocument();
 expect(saved).toBeUndefined();
 await userEvent.click(screen.getByRole("button",{name:"Edit linked boundary"}));
 expect(within(screen.getByLabelText("Bird’s-eye boundary editor")).getAllByRole("slider")).toHaveLength(4);
 await userEvent.click(screen.getByRole("button",{name:"Accept pitch calibration"}));
 await waitFor(()=>expect(saved?.pitch_panorama).toEqual(expect.objectContaining({panorama_id:atlasId,points,goal_posts:[goals[0].posts[0],goals[0].posts[1],goals[1].posts[1],goals[1].posts[0]],goals_confirmed:false,accepted:true})),{timeout:3000});
});
