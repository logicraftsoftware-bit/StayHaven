import { Destination } from "@/types";

export const destinations: Destination[] = [
  ["Guwahati", "180+", "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=700&q=80"],
  ["Shillong", "120+", "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=700&q=80"],
  ["Kaziranga", "75+", "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=700&q=80"],
  ["Sohra", "90+", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=700&q=80"],
  ["Tawang", "65+", "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=700&q=80"],
  ["Majuli", "45+", "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=700&q=80"],
  ["Tezpur", "55+", "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=700&q=80"],
  ["Jorhat", "70+", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=80"],
].map(([name, count, image]) => ({ name, count, image }));
