// Admin retains its existing LAN route; granted users use the account portal route.
export let VIDEO_LAB_BASE = "/_admin/api/video-analytics";
export function selectVideoLabEndpoint(role:unknown){
  VIDEO_LAB_BASE=role==="admin"?"/_admin/api/video-analytics":"/_portal/api/video-analytics";
}
