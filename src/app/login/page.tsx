import { redirect } from "next/navigation";
export default async function LoginPage({searchParams}:{searchParams:Promise<{mode?:string}>}) { const {mode}=await searchParams; redirect(mode==="forgot"?"/?login=forgot":"/?login=1"); }
