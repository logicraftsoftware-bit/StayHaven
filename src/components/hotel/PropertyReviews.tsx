"use client";
import { Star } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CUSTOMER_AUTH_EVENT, CUSTOMER_TOKEN } from "@/components/customer/CustomerAuth";
import { apiRequest } from "@/lib/api-client";

type Review = { _id: string; guestName: string; rating: number; comment: string; ownerReply?: string; createdAt: string };
type ReviewData = { count: number; average: number; reviews: Review[] };
type Eligible = { _id: string; bookingNumber: string; roomName: string; checkOut: string };
const categories = ["cleanliness", "location", "service", "value"] as const;

export function PropertyReviews({ propertyId, slug }: { propertyId: string; slug: string }) {
  const [data, setData] = useState<ReviewData>({ count: 0, average: 0, reviews: [] });
  const [token, setToken] = useState("");
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [rating, setRating] = useState(0);
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const sync = () => setToken(localStorage.getItem(CUSTOMER_TOKEN) || "");
    sync();
    window.addEventListener(CUSTOMER_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(CUSTOMER_AUTH_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    apiRequest<{ data: ReviewData }>(`/api/v1/properties/${encodeURIComponent(slug)}/reviews`).then((result) => setData(result.data)).catch(() => setError("Reviews are temporarily unavailable."));
  }, [slug]);
  useEffect(() => {
    if (!token) return;
    apiRequest<{ data: Eligible[] }>(`/api/v1/customer/reviews/eligible/${propertyId}`, token).then((result) => { setEligible(result.data); setBookingId(result.data[0]?._id || ""); }).catch(() => setEligible([]));
  }, [propertyId, token]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!bookingId || !rating) { setError("Choose a completed stay and an overall rating."); return; }
    setBusy(true);
    try {
      await apiRequest("/api/v1/customer/reviews", token, { method: "POST", body: JSON.stringify({ bookingId, rating, comment, categories: categoryScores }) });
      const updated = await apiRequest<{ data: ReviewData }>(`/api/v1/properties/${encodeURIComponent(slug)}/reviews`);
      setData(updated.data); setEligible((value) => value.filter((booking) => booking._id !== bookingId)); setBookingId(""); setComment(""); setRating(0); setCategoryScores({}); setNotice("Thank you. Your review is now published.");
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  return <section className="property-section property-guest-reviews" id="reviews"><div className="property-section-heading"><p className="market-eyebrow">GUEST EXPERIENCES</p><h2>Ratings &amp; reviews</h2><span>{data.count} verified reviews</span></div>
    {data.count ? <div className="property-review-average"><Star/><strong>{data.average.toFixed(1)}</strong><span>/5 from {data.count} completed stays</span></div> : <p className="property-review-intro">Be the first to share feedback from a completed stay.</p>}
    {data.reviews.length > 0 && <div className="property-review-public-list">{data.reviews.slice(0, 12).map((review) => <article key={review._id}><div><b>{review.guestName}</b><span>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div><small>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>{review.comment && <p>{review.comment}</p>}{review.ownerReply && <blockquote><strong>Property response</strong><p>{review.ownerReply}</p></blockquote>}</article>)}</div>}
    <div className="property-review-form-card"><h3>Review your stay</h3><p>Reviews are available to guests after checkout from a paid booking at this property.</p>{!token ? <a className="btn-primary" href="?review=1&login=1#reviews">Log in to review your stay</a> : !eligible.length ? <p className="property-review-eligibility">You have no completed stays available to review.</p> : <form onSubmit={(event) => void submit(event)}><label>Completed stay<select required value={bookingId} onChange={(event) => setBookingId(event.target.value)}>{eligible.map((booking) => <option key={booking._id} value={booking._id}>{booking.bookingNumber} · {booking.roomName} · checked out {new Date(booking.checkOut).toLocaleDateString("en-IN")}</option>)}</select></label><fieldset><legend>Overall rating</legend><div className="property-review-stars">{[1,2,3,4,5].map((score) => <button type="button" key={score} aria-label={`${score} stars`} aria-pressed={rating === score} onClick={() => setRating(score)} className={rating >= score ? "active" : ""}>★</button>)}</div></fieldset><div className="property-review-category-grid">{categories.map((category) => <label key={category}>{category.charAt(0).toUpperCase() + category.slice(1)}<select value={categoryScores[category] || ""} onChange={(event) => setCategoryScores((value) => ({ ...value, [category]: Number(event.target.value) }))}><option value="">Not rated</option>{[5,4,3,2,1].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label>)}</div><label>Your experience<textarea maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What stood out during your stay?"/></label><button className="btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish review"}</button></form>}{notice && <p role="status" className="property-review-success">{notice}</p>}{error && <p role="alert" className="property-review-error">{error}</p>}</div>
  </section>;
}
