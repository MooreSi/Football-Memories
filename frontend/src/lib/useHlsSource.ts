import { useEffect, type RefObject } from 'react';
import type Hls from 'hls.js';
export function useHlsSource(video:RefObject<HTMLVideoElement|null>,src:string){
 useEffect(()=>{const element=video.current;if(!element||!src.includes('.m3u8'))return;
 let disposed=false;let player:Hls|undefined;
 if(element.canPlayType('application/vnd.apple.mpegurl')){element.src=src;return()=>{element.removeAttribute('src');element.load();};}
 void import('hls.js/light').then(({default:Hls})=>{if(disposed)return;player=new Hls({maxBufferLength:20,maxMaxBufferLength:30,manifestLoadingMaxRetry:0,fragLoadingMaxRetry:0,levelLoadingMaxRetry:0});player.loadSource(src);player.attachMedia(element);player.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)player?.destroy();});});
 return()=>{disposed=true;player?.destroy();};
 },[src,video]);
}
