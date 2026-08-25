import { Shell } from "@/components/layout/Shell"; import { Results } from "@/components/search/Results";
export default async function HotelsPage({searchParams}:{searchParams:Promise<{destination?:string,type?:string}>}){const p=await searchParams;return <Shell><Results destination={p.destination} type={p.type}/></Shell>}
