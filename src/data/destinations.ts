import { Destination } from "@/types";

export const destinations: Destination[] = [
  ["Goa", "1,450+", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=700&q=80"],
  ["Manali", "980+", "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=700&q=80"],
  ["Udaipur", "620+", "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=700&q=80"],
  ["Kerala", "1,250+", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=700&q=80"],
  ["Jaipur", "870+", "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=700&q=80"],
  ["Lonavala", "540+", "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=700&q=80"],
  ["Mumbai", "2,100+", "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=700&q=80"],
  ["Delhi", "3,400+", "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=700&q=80"],
].map(([name, count, image]) => ({ name, count, image }));
