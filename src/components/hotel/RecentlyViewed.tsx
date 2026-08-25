"use client"; import { useEffect } from "react";
export function RecentlyViewed({id}:{id:string}){useEffect(()=>{const key="guwahati-homestay-recent";const ids:string[]=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([id,...ids.filter(x=>x!==id)].slice(0,4)))},[id]);return null}
