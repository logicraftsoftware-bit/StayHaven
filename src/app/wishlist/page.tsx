import { WishlistGrid } from "@/components/hotel/WishlistGrid"; import { Shell } from "@/components/layout/Shell";
export default function Wishlist(){return <Shell><div className="container py-10"><p className="eyebrow">YOUR COLLECTION</p><h1 className="font-display mb-8 text-4xl font-bold">Saved stays</h1><WishlistGrid/></div></Shell>}
