import { lazy, Suspense } from "react";
import { Film } from "lucide-react";
import { NavLink } from "react-router-dom";
import { PlayerLabAccess } from "./PlayerLabAccess";
import { Spinner } from "./ui/Spinner";
const Page=lazy(()=>import("../pages/VideoLabPage"));
export function VideoLabLink(){return <PlayerLabAccess quiet>{()=> <NavLink to="/video-lab" end title="Video Lab · private admin preview" aria-label="Video Lab · private admin preview" className={({isActive})=>`screen-link player-lab-tab ${isActive?"is-active":""}`}><Film size={18} aria-hidden/><span className="nav-label">Video Lab</span></NavLink>}</PlayerLabAccess>;}
export function VideoLabRoute(){return <PlayerLabAccess>{account=><Suspense fallback={<Spinner label="Loading video lab"/>}><Page key={account}/></Suspense>}</PlayerLabAccess>;}
