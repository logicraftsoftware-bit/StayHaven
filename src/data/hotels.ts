import { Hotel } from "@/types";

const photos = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
];

const seed = [
  ["grand-orion", "The Grand Orion Hotel", "Mumbai", "Maharashtra", 4.6, 1245, 6499],
  ["elivaas-cloud", "Serene Cloud Retreat", "Lonavala", "Maharashtra", 4.7, 982, 12999],
  ["holy-resort", "Lake Palace Resort & Spa", "Udaipur", "Rajasthan", 4.5, 754, 8999],
  ["oceanfront", "Azure Oceanfront Resort", "Goa", "Goa", 4.8, 1624, 7999],
  ["cedar-heights", "Cedar Heights Manali", "Manali", "Himachal Pradesh", 4.7, 865, 5499],
  ["pink-city-haveli", "The Pink City Haveli", "Jaipur", "Rajasthan", 4.4, 631, 4799],
  ["backwater-cove", "Backwater Cove Villas", "Kumarakom", "Kerala", 4.9, 448, 14500],
  ["urban-nest", "Urban Nest Bengaluru", "Bengaluru", "Karnataka", 4.5, 1102, 5899],
] as const;

export const hotels: Hotel[] = seed.map((h, i) => ({
  id: String(i + 1), slug: h[0], name: h[1], city: h[2], state: h[3],
  location: `${h[2]}, ${h[3]}`, country: "India", rating: h[4], reviewCount: h[5],
  pricePerNight: h[6], taxes: Math.round(h[6] * .18), images: [photos[i], photos[(i + 2) % photos.length], photos[(i + 4) % photos.length]],
  propertyType: i % 3 === 0 ? "Resort" : i % 3 === 1 ? "Villa" : "Hotel",
  amenities: ["Free Wi-Fi", "Breakfast", "Pool", "Air conditioning", "24/7 front desk"],
  featured: i < 4, freeCancellation: i !== 5,
  description: "A thoughtfully designed stay pairing warm hospitality with restful rooms, local flavours and easy access to the destination’s most memorable experiences.",
}));

export const getHotel = (slug: string) => hotels.find((hotel) => hotel.slug === slug);
