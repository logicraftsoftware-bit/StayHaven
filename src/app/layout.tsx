import type { Metadata } from "next"; import { Inter, Lora } from "next/font/google"; import "./globals.css";
const inter=Inter({variable:"--font-inter",subsets:["latin"]}); const lora=Lora({variable:"--font-lora",subsets:["latin"]});
export const metadata:Metadata={title:{default:"StayHaven — Discover, Book, Explore",template:"%s | StayHaven"},description:"Discover hotels, resorts, villas and unique stays across India with StayHaven."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${inter.variable} ${lora.variable}`}><body>{children}</body></html>}
