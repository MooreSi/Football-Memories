import { useState } from "react";
import { EMPTY_BOOK, validateBook, type LabBook } from "./playerLabBook";
export function useLabNotebook(account:string){
 const key=`fm.playerLab.v1:${encodeURIComponent(account)}`;
 const [initial]=useState(()=>{try{const raw=localStorage.getItem(key);return {book:raw?validateBook(JSON.parse(raw)):EMPTY_BOOK,error:""};}catch{return {book:EMPTY_BOOK,error:"The saved notebook could not be read. Export any available draft before importing a replacement."};}});
 const [book,setBook]=useState(initial.book),[error,setError]=useState(initial.error);
 function save(next:LabBook):boolean{try{const clean=validateBook(next);localStorage.setItem(key,JSON.stringify(clean));setBook(clean);setError("");return true;}catch(e){setError(e instanceof Error?e.message:"Notebook could not be saved.");return false;}}
 return {book,save,error};
}
