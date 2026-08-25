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
  ["brahmaputra-haven", "Brahmaputra Haven", "Guwahati", "Assam", 4.6, 245, 3499],
  ["nilachal-homestay", "Nilachal Homestay", "Guwahati", "Assam", 4.7, 182, 2899],
  ["assam-valley-retreat", "Assam Valley Retreat", "Guwahati", "Assam", 4.5, 154, 4299],
  ["riverfront-residency", "Riverfront Residency", "Guwahati", "Assam", 4.8, 324, 4999],
  ["pine-cloud-stay", "Pine Cloud Stay", "Shillong", "Meghalaya", 4.7, 165, 3899],
  ["kaziranga-wild-grass", "Wild Grass Eco Retreat", "Kaziranga", "Assam", 4.4, 131, 4599],
  ["majuli-river-villa", "Majuli River Villa", "Majuli", "Assam", 4.9, 98, 5500],
  ["urban-nest-guwahati", "Urban Nest Guwahati", "Guwahati", "Assam", 4.5, 202, 3199],
] as const;

export const hotels: Hotel[] = seed.map((h, i) => ({
  id: String(i + 1), slug: h[0], name: h[1], city: h[2], state: h[3],
  location: `${h[2]}, ${h[3]}`, country: "India", rating: h[4], reviewCount: h[5],
  pricePerNight: h[6], taxes: Math.round(h[6] * .18), images: [photos[i], photos[(i + 2) % photos.length], photos[(i + 4) % photos.length]],
  propertyType: ["Hotel", "Homestay", "Resort", "Hotel", "Homestay", "Guesthouse", "Villa", "Apartment"][i],
  amenities: ["Free Wi-Fi", "Breakfast", "Pool", "Air conditioning", "24/7 front desk"],
  featured: i < 4, freeCancellation: i !== 5,
  description: "A thoughtfully designed stay pairing warm hospitality with restful rooms, local flavours and easy access to the destination’s most memorable experiences.",
}));

export const getHotel = (slug: string) => hotels.find((hotel) => hotel.slug === slug);
