import { Footer } from "./Footer"; import { Header } from "./Header"; import { MobileBottomNav } from "./MobileBottomNav";
export function Shell({children}:{children:React.ReactNode}){return <><Header/><main>{children}</main><Footer/><MobileBottomNav/></>}
