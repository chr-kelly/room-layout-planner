import { parseProject, serializableProject } from './model.js';
export const STORAGE_KEY='room-layout-planner.project.v1';
/** Access to localStorage itself can throw (private mode / policy). Keep it inside try. */
export function saveProject(project, storageFactory=()=>window.localStorage) {
  try { storageFactory().setItem(STORAGE_KEY,JSON.stringify(serializableProject(project)));return {ok:true}; }
  catch(error) {return {ok:false,error:'Not saved: browser storage is unavailable or full. Download a JSON backup.',cause:error};}
}
export function loadProject(storageFactory=()=>window.localStorage) {
  try { const json=storageFactory().getItem(STORAGE_KEY);return {ok:true,project:json?parseProject(json):null}; }
  catch(error) {return {ok:false,project:null,error:'Your saved project could not be restored. The stored copy was not changed.',cause:error};}
}
export function clearProject(storageFactory=()=>window.localStorage) {
  try {storageFactory().removeItem(STORAGE_KEY);return {ok:true};}
  catch(error) {return {ok:false,error:'The project is empty, but browser storage could not be cleared. Your previous saved copy may return on refresh.',cause:error};}
}
