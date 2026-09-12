"use client";
import { LogOut, X } from "lucide-react";

export function ConfirmDialog({open,title,description,confirmLabel="Logout",busy=false,onCancel,onConfirm}:{open:boolean;title:string;description:string;confirmLabel?:string;busy?:boolean;onCancel:()=>void;onConfirm:()=>void}) {
  if(!open)return null;
  return <div className="confirm-overlay" role="presentation" onMouseDown={onCancel}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={event=>event.stopPropagation()}><button className="confirm-close" onClick={onCancel} aria-label="Close"><X/></button><div className="confirm-icon"><LogOut/></div><h2 id="confirm-title">{title}</h2><p>{description}</p><footer><button className="confirm-cancel" onClick={onCancel}>Cancel</button><button className="confirm-action" disabled={busy} onClick={onConfirm}>{busy?"Please wait…":confirmLabel}</button></footer></section></div>;
}
