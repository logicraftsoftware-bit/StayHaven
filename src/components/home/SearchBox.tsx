"use client";
import { BedDouble, CalendarDays, ChevronDown, MapPin, Minus, Plus, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSite } from "@/components/site/SiteProvider";

type Panel = "destination" | "type" | "dates" | "guests" | null;
const suggestions = ["Guwahati", "Shillong", "Kaziranga", "Sohra", "Tawang", "Majuli", "Tezpur", "Jorhat"];
const propertyTypes = ["Hotels", "Villas", "Resorts", "Apartments", "Homestays", "Guest houses", "Treehouses", "Cottages"];
const august = Array.from({length:31},(_,i)=>i+1);
const september = Array.from({length:30},(_,i)=>i+1);

function Month({name,days,offset,onPick,selected}:{name:string;days:number[];offset:number;onPick:(day:number)=>void;selected?:number}){
  return <div className="calendar-month"><h3>{name}</h3><div className="calendar-week">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><b key={d}>{d}</b>)}</div><div className="calendar-days">{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{days.map(day=><button type="button" className={selected===day?"selected":""} onClick={()=>onPick(day)} key={day}>{day}</button>)}</div></div>
}

export function SearchBox(){
  const site=useSite();
  const router=useRouter(); const wrap=useRef<HTMLFormElement>(null);
  const [panel,setPanel]=useState<Panel>(null); const [destination,setDestination]=useState(site.city);
  const [propertyType,setPropertyType]=useState("Hotels");
  const [checkInDay,setCheckInDay]=useState(24); const [checkOutDay,setCheckOutDay]=useState(27);
  const [adults,setAdults]=useState(2); const [children,setChildren]=useState(0); const [rooms,setRooms]=useState(1);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!wrap.current?.contains(event.target as Node))setPanel(null)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  const submit=(event:React.FormEvent)=>{event.preventDefault();const q=new URLSearchParams({destination:destination||site.city,type:propertyType.toLowerCase().replace(" houses","house").replace(/s$/, ""),checkIn:`2026-08-${String(checkInDay).padStart(2,"0")}`,checkOut:`2026-08-${String(checkOutDay).padStart(2,"0")}`,adults:String(adults),children:String(children),rooms:String(rooms)});router.push(`/hotels?${q}`)};
  const chooseDate=(day:number)=>{if(panel!=="dates")return;if(day<=checkInDay){setCheckInDay(day);setCheckOutDay(Math.max(day+1,checkOutDay))}else{setCheckOutDay(day)}};
  return <form ref={wrap} onSubmit={submit} className="search-panel">
    <button type="button" className={`search-field ${panel==="destination"?"active":""}`} onClick={()=>setPanel(panel==="destination"?null:"destination")}><span>Where are you going?</span><div><MapPin/><strong>{destination||"City, hotel or landmark"}</strong><ChevronDown/></div></button>
    <button type="button" className={`search-field ${panel==="type"?"active":""}`} onClick={()=>setPanel(panel==="type"?null:"type")}><span>Property type</span><div><BedDouble/><strong>{propertyType}</strong><ChevronDown/></div></button>
    <button type="button" className={`search-field ${panel==="dates"?"active":""}`} onClick={()=>setPanel(panel==="dates"?null:"dates")}><span>Check-in</span><div><CalendarDays/><strong>{checkInDay} Aug 2026</strong><ChevronDown/></div></button>
    <button type="button" className={`search-field ${panel==="dates"?"active":""}`} onClick={()=>setPanel(panel==="dates"?null:"dates")}><span>Check-out</span><div><CalendarDays/><strong>{checkOutDay} Aug 2026</strong><ChevronDown/></div></button>
    <button type="button" className={`search-field ${panel==="guests"?"active":""}`} onClick={()=>setPanel(panel==="guests"?null:"guests")}><span>Guests & Rooms</span><div><Users/><strong>{adults} Adult{adults>1?"s":""}{children>0?`, ${children} Child${children>1?"ren":""}`:""}, {rooms} Room{rooms>1?"s":""}</strong><ChevronDown/></div></button>
    <button className="btn-primary h-14 justify-center md:h-16"><Search className="size-4"/>Search Hotels</button>
    {panel&&<div className={`search-popover ${panel}`}>
      <button type="button" className="popover-close" onClick={()=>setPanel(null)} aria-label="Close search options"><X/></button>
      {panel==="destination"&&<><div className="destination-input"><Search/><input autoFocus value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Search city, hotel or landmark"/></div><p className="popover-label">POPULAR DESTINATIONS</p><div className="suggestion-list">{suggestions.filter(x=>x.toLowerCase().includes(destination.toLowerCase())).map(x=><button type="button" key={x} onClick={()=>{setDestination(x);setPanel("type")}}><MapPin/><span><b>{x}</b><small>Explore stays in {x}</small></span></button>)}</div></>}
      {panel==="type"&&<><p className="popover-label property-label">CHOOSE YOUR STAY</p><div className="property-type-list">{propertyTypes.map(type=><button type="button" className={propertyType===type?"selected":""} key={type} onClick={()=>{setPropertyType(type);setPanel("dates")}}><BedDouble/><span>{type}</span></button>)}</div></>}
      {panel==="dates"&&<><div className="calendar-grid"><Month name="August 2026" days={august} offset={5} onPick={chooseDate} selected={checkInDay}/><Month name="September 2026" days={september} offset={1} onPick={()=>{}}/></div><div className="calendar-footer"><span>{checkInDay} Aug → {checkOutDay} Aug · 3 nights</span><button type="button" onClick={()=>{setCheckInDay(24);setCheckOutDay(27)}}>Reset dates</button></div></>}
      {panel==="guests"&&<div className="guest-list"><Counter title="Adults" description="Age 13 and above" value={adults} minimum={1} setValue={setAdults}/><Counter title="Children" description="Ages 0–12" value={children} minimum={0} setValue={setChildren}/><Counter title="Rooms" description="Number of rooms" value={rooms} minimum={1} setValue={setRooms}/></div>}
    </div>}
  </form>
}

function Counter({title,description,value,minimum,setValue}:{title:string;description:string;value:number;minimum:number;setValue:React.Dispatch<React.SetStateAction<number>>}){
  return <div><span><b>{title}</b><small>{description}</small></span><div><button type="button" disabled={value<=minimum} onClick={()=>setValue(Math.max(minimum,value-1))} aria-label={`Decrease ${title}`}><Minus/></button><b>{value}</b><button type="button" onClick={()=>setValue(value+1)} aria-label={`Increase ${title}`}><Plus/></button></div></div>
}
