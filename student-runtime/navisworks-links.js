// Read identity from the nearest GLTF node, including parents of multi-primitive meshes.
export function componentIdentity(mesh){
 for(let node=mesh;node;node=node.parent){const d=node.userData||{};if(d.revitElementId!=null||d.uniqueId)return {revitElementId:String(d.revitElementId||''),uniqueId:String(d.uniqueId||'')};}
 return {revitElementId:'',uniqueId:''};
}
const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
export function previewLinks(data,components,tasks,existing={}){
 if(data?.schema!=='construction-ar-navisworks/1'||!Array.isArray(data.tasks)||data.tasks.length>500)throw Error('Choose a Construction AR Lab Navisworks export JSON file (up to 500 tasks).');
 const proposed={},blocked=new Set(),issues=[],sources=new Map(),claims=new Map();let matchedTasks=0;
 for(const t of data.tasks){if(!Array.isArray(t.elements)||t.elements.length>100000)throw Error('Invalid task elements.');for(const e of t.elements){const key=String(e.revitElementId||'');if(key){if(!sources.has(key))sources.set(key,new Set());sources.get(key).add(String(e.sourceModel||''));}}}
 const byUnique=new Map(),byId=new Map();for(const c of components){for(const [map,k]of [[byUnique,c.uniqueId],[byId,c.revitElementId]])if(k){if(!map.has(k))map.set(k,[]);map.get(k).push(c);}}
 for(const t of data.tasks){
 const candidates=tasks.filter(x=>norm(x.name)===norm(t.name));
 if(candidates.length!==1){issues.push({task:t.name,reason:candidates.length?'Ambiguous task name':'No matching schedule task'});continue;}
 const task=candidates[0];matchedTasks++;
 if(t.error)issues.push({task:t.name,reason:t.error});
 if(t.unidentifiedCount)issues.push({task:t.name,reason:`${t.unidentifiedCount} geometry items have no Revit identity`});
 for(const e of t.elements){
 const uid=String(e.uniqueId||''),id=String(e.revitElementId||'');let matches=uid?byUnique.get(uid):undefined;
 // Never fall back from a mismatched unique ID to a coincident numeric ID.
 if(!uid&&id&&sources.get(id)?.size===1){const rows=byId.get(id)||[];const uids=new Set(rows.map(x=>x.uniqueId).filter(Boolean));if(uids.size<=1)matches=rows;}
 if(!matches?.length){issues.push({task:t.name,element:id||uid,reason:'Missing or ambiguous model identity'});continue;}
 for(const c of matches){if(!claims.has(c.id))claims.set(c.id,new Set());claims.get(c.id).add(task.id);if(existing[c.id]&&existing[c.id]!==task.id){blocked.add(c.id);issues.push({task:t.name,element:id,component:c.id,reason:'Existing link preserved'});}else proposed[c.id]=task.id;}
 }
 }
 for(const [id,set]of claims)if(set.size>1){blocked.add(id);issues.push({component:id,reason:'Attached to multiple tasks; review in Navisworks'});}
 for(const id of blocked)delete proposed[id];
 return {mappings:{...existing,...proposed},added:Object.keys(proposed).filter(k=>!existing[k]).length,matchedTasks,issues,exportWarnings:data.warnings||[],schedulePolicy:'Existing schedule dates and tasks retained; exact task-name matching only.'};
}
