import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { BookingCheckout } from "@/components/booking/BookingCheckout";
import { coverFor, getPublicProperty } from "@/lib/public-marketplace";
export default async function BookingPage({ params, searchParams }: { params: Promise<{ hotelId: string }>; searchParams: Promise<{ roomId?: string; checkIn?: string; checkOut?: string; guests?: string }> }) {
  const { hotelId } = await params; const query = await searchParams; const property = await getPublicProperty(hotelId); if (!property) notFound();
  if (!query.roomId || !query.checkIn || !query.checkOut) redirect(`/hotels/${property.slug}#rooms`);
  const room = (property.roomDetails || []).find((item, index) => String(item.id || item._id || index) === query.roomId); if (!room) notFound();
  return <Shell><BookingCheckout property={property} room={room} roomId={query.roomId} checkIn={query.checkIn} checkOut={query.checkOut} guests={Math.max(1, Number(query.guests || 2))} cover={coverFor(property)}/></Shell>;
}
