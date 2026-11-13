export const projectURL=(id,file='project.json')=>new URL('../projects/'+encodeURIComponent(id)+'/'+file,import.meta.url).href;
export const asset=(id,kind)=>projectURL(id,'assets/'+encodeURIComponent(kind));
export async function api(path){const id=path.split('/')[1];const r=await fetch(projectURL(id));if(!r.ok)throw Error('Project is not published at this address.');return r.json();}
