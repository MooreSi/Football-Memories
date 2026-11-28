import {screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders} from "../../test/render";
import {PanoramaPanel} from "./PanoramaPanel";
import type {Panorama} from "./panorama";
const data:Panorama={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),width:1600,height:600,image:"pitch_panorama.jpg",times:[0,1],cuts:[false],frame_to_panorama:[[1,0,0,0,1,0,0,0,1],null],suggested_boundary:[[.1,.9],[.9,.9],[.8,.2],[.2,.2]],keyframe_times:[0,1]};
afterEach(()=>vi.unstubAllGlobals());
it("requires explicit acceptance and keeps the proposed boundary editable",async()=>{
 const accept=vi.fn();renderWithProviders(<PanoramaPanel jobId={"c".repeat(32)} sourceHash={data.source_sha256} data={data} onAccept={accept} onQueued={vi.fn()}/>);
 expect(await screen.findByRole("img",{name:"Stitched pitch panorama"})).toBeInTheDocument();
 expect(accept).not.toHaveBeenCalled();
 await userEvent.click(screen.getByRole("button",{name:"Edit panoramic boundary"}));
 await userEvent.click(screen.getByRole("button",{name:"Add panorama point"}));
 expect(screen.getAllByRole("slider",{name:/Boundary point/})).toHaveLength(5);
 await userEvent.click(screen.getByRole("button",{name:"Accept boundary for this video"}));
 expect(accept).toHaveBeenCalledWith(expect.objectContaining({panorama_id:data.panorama_id,accepted:true,points:expect.any(Array),corners:null}));
 expect(accept.mock.calls[0][0].points).toHaveLength(5);
});
it("prepares a new panorama through the existing source-bound camera queue",async()=>{
 const queued=vi.fn();let payload:unknown;
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{if(url.endsWith("/me"))return Response.json({csrf_token:"synthetic"});payload=JSON.parse(init?.body as string);return Response.json({id:"d".repeat(32)});}));
 renderWithProviders(<PanoramaPanel jobId={"c".repeat(32)} sourceHash={data.source_sha256} onAccept={vi.fn()} onQueued={queued}/>);
 await userEvent.click(screen.getByRole("button",{name:"Build stitched pitch"}));
 await waitFor(()=>expect(queued).toHaveBeenCalledWith("d".repeat(32)));
 expect(payload).toEqual({source_sha256:data.source_sha256});
});
it("says why the last build found no stitched pitch instead of looking as if nothing happened",async()=>{
 // 28 November 2026 (261122 U11 v Wolves, indoor court): both builds finished with no panorama and the panel looked unchanged.
 renderWithProviders(<PanoramaPanel jobId={"c".repeat(32)} sourceHash={data.source_sha256} unavailable="Not enough overlapping panned views" onAccept={vi.fn()} onQueued={vi.fn()}/>);
 expect(screen.getByRole("status")).toHaveTextContent("The last build made no stitched pitch: Not enough overlapping panned views.");
 expect(screen.getByRole("button",{name:"Build stitched pitch"})).toBeEnabled();
});
it("says nothing about a failed build when there was none",()=>{
 renderWithProviders(<PanoramaPanel jobId={"c".repeat(32)} sourceHash={data.source_sha256} onAccept={vi.fn()} onQueued={vi.fn()}/>);
 expect(screen.queryByText(/The last build made no stitched pitch/)).not.toBeInTheDocument();
});
