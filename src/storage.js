import { parseProject, serializableProject } from './model.js';
import { message, english } from './messages.js';
export const STORAGE_KEY='room-layout-planner.project.v1';
/** Access to localStorage itself can throw (private mode / policy). Keep it inside try. */
export function saveProject(project, storageFactory=()=>window.localStorage) {
  try { storageFactory().setItem(STORAGE_KEY,JSON.stringify(serializableProject(project)));return {ok:true}; }
  catch(error) {const errorCode='ui.not_saved_browser_storage_is_unavailable_or_full';return {ok:false,error:english(message(errorCode)),errorCode,cause:error};}
}
export function loadProject(storageFactory=()=>window.localStorage) {
  try { const json=storageFactory().getItem(STORAGE_KEY);return {ok:true,project:json?parseProject(json):null}; }
  catch(error) {const errorCode='ui.your_saved_project_could_not_be_restored_the';return {ok:false,project:null,error:english(message(errorCode)),errorCode,cause:error};}
}
export function clearProject(storageFactory=()=>window.localStorage) {
  try {storageFactory().removeItem(STORAGE_KEY);return {ok:true};}
  catch(error) {const errorCode='ui.the_project_is_empty_but_browser_storage_could';return {ok:false,error:english(message(errorCode)),errorCode,cause:error};}
}
