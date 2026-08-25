export interface Hotel {
  id: string;
  slug: string;
  name: string;
  location: string;
  city: string;
  state: string;
  country: string;
  images: string[];
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  taxes: number;
  propertyType: string;
  amenities: string[];
  featured: boolean;
  freeCancellation: boolean;
  description: string;
}

export interface Destination {
  name: string;
  count: string;
  image: string;
}
