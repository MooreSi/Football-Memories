import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach,expect,it,vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { VideoTeamCalibration } from "./VideoTeamCalibration";
afterEach(()=>vi.unstubAllGlobals());
it("tags each team's jersey and queues a source-bound new analysis with CSRF",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];const queued=vi.fn();
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{calls.push({url,init});return url.endsWith("/me")?Response.json({csrf_token:"synthetic"}):Response.json({id:"new-team-job",state:"queued"});}));
 renderWithProviders(<VideoTeamCalibration jobId="parent" sourceHash={"a".repeat(64)} onQueued={queued}/>);
 expect(screen.getByRole("button",{name:"Apply jersey colours"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Our team jersey colour"),{target:{value:"#dd3322"}});
 fireEvent.change(screen.getByLabelText("Opponent jersey colour"),{target:{value:"#ffff99"}});
 await userEvent.click(screen.getByRole("button",{name:"Apply jersey colours"}));
 expect(queued).toHaveBeenCalledWith({id:"new-team-job",state:"queued"});
 const post=calls.find(c=>c.init?.method==="POST")!;
 expect(post.url).toBe("/_admin/api/video-analytics/jobs/parent/team-calibration");
 expect(post.init?.headers).toMatchObject({"X-CSRF-Token":"synthetic"});
 expect(JSON.parse(post.init?.body as string)).toEqual({source_sha256:"a".repeat(64),kits:[{id:"own",label:"Our team",colour_hex:"#dd3322"},{id:"opponent",label:"Opponent",colour_hex:"#ffff99"}]});
});
it("rejects identical tagged colours and reports queue refusal",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.endsWith("/me")?Response.json({csrf_token:"synthetic"}):new Response("",{status:409})));
 renderWithProviders(<VideoTeamCalibration jobId="parent" sourceHash={"a".repeat(64)} onQueued={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText("Our team jersey colour"),{target:{value:"#dd3322"}});
 fireEvent.change(screen.getByLabelText("Opponent jersey colour"),{target:{value:"#dd3322"}});
 expect(screen.getByRole("button",{name:"Apply jersey colours"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Opponent jersey colour"),{target:{value:"#ffff99"}});
 await userEvent.click(screen.getByRole("button",{name:"Apply jersey colours"}));
 expect(await screen.findByRole("alert")).toHaveTextContent(/already running or video changed/i);
});
it("accepts an explicit black jersey via its hex field",async()=>{
 renderWithProviders(<VideoTeamCalibration jobId="parent" sourceHash={"a".repeat(64)} onQueued={vi.fn()}/>);
 await userEvent.type(screen.getByLabelText("Our team jersey hex value"),"#000000");
 await userEvent.type(screen.getByLabelText("Opponent jersey hex value"),"#ffffff");
 expect(screen.getByRole("button",{name:"Apply jersey colours"})).toBeEnabled();
});
