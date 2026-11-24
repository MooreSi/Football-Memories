import {screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders} from "../test/render";
import {VideoTeamOverlay} from "./VideoTeamOverlay";
afterEach(()=>vi.unstubAllGlobals());
function fixtures(){vi.stubGlobal("fetch",vi.fn(async()=>Response.json({image_width:1920,image_height:1080,teams:[{id:"own",label:"Our team",colour_hex:"#ff0000"}],observations:[{track_id:1,time_s:2,team_id:"own",role:"player_candidate",image_box:[.1,.1,.2,.3]},{track_id:2,time_s:2,team_id:null,role:"sideline_candidate",image_box:[.3,.1,.4,.3]},{track_id:3,time_s:10,team_id:null,role:"official_candidate",image_box:[.5,.1,.6,.3]}]})));}
it("overlays contemporaneous team and sideline labels, excluding future observations",async()=>{
 fixtures();renderWithProviders(<VideoTeamOverlay jobId="synthetic" at={2.1}/>);
 expect(await screen.findByText("Our team · T1")).toBeInTheDocument();
 expect(screen.getByText("Sideline candidate · T2")).toBeInTheDocument();
 expect(screen.queryByText(/Referee candidate/)).toBeNull();
});
it("does not hold stale team boxes across gaps",async()=>{
 fixtures();renderWithProviders(<VideoTeamOverlay jobId="synthetic" at={5}/>);
 expect(await screen.findByText("No current team observations")).toBeInTheDocument();
 expect(screen.queryByText("Our team · T1")).toBeNull();
});
