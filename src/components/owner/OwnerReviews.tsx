"use client";
/* Generated review QR is a data URL. */
/* eslint-disable @next/next/no-img-element */
import { Copy, Download, Filter, MessageSquareText, QrCode, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";

type Review = { _id: string; bookingNumber: string; guestName: string; roomName: string; rating: number; comment: string; categories?: Record<string, number>; ownerReply?: string; createdAt: string };
type ReviewData = { count: number; average: number; distribution: number[]; categories: Record<string, number>; reviews: Review[] };
const empty: ReviewData = { count: 0, average: 0, distribution: [0, 0, 0, 0, 0], categories: {}, reviews: [] };

export function OwnerReviews({ propertyId, propertyName, reviewLink, qr, onGenerateQr, token, canReply }: { propertyId: string; propertyName: string; reviewLink: string; qr: string; onGenerateQr: () => void; token: string; canReply: boolean }) {
  const [data, setData] = useState<ReviewData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState(0);
  const [replyStatus, setReplyStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReply, setSavingReply] = useState("");
  useEffect(() => {
    let alive = true;
    apiRequest<{ data: ReviewData }>(`/api/v1/owner/properties/${propertyId}/reviews`, token).then((result) => { if (alive) setData(result.data); }).catch((reason) => { if (alive) setError((reason as Error).message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [propertyId, token]);
  const filtered = useMemo(() => data.reviews.filter((review) => {
    const term = search.toLowerCase().trim();
    return (!term || `${review.bookingNumber} ${review.guestName} ${review.roomName}`.toLowerCase().includes(term)) && (!rating || review.rating === rating) && (replyStatus === "all" || (replyStatus === "replied") === Boolean(review.ownerReply));
  }).sort((a, b) => sort === "oldest" ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt)), [data.reviews, search, rating, replyStatus, sort]);
  const copyLink = async () => { await navigator.clipboard.writeText(reviewLink); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const saveReply = async (review: Review) => {
    setSavingReply(review._id); setError("");
    try {
      const reply = (replyDrafts[review._id] ?? review.ownerReply ?? "").trim();
      await apiRequest(`/api/v1/owner/properties/${propertyId}/reviews/${review._id}/reply`, token, { method: "PATCH", body: JSON.stringify({ reply }) });
      setData((value) => ({ ...value, reviews: value.reviews.map((item) => item._id === review._id ? { ...item, ownerReply: reply } : item) }));
    } catch (reason) { setError((reason as Error).message); } finally { setSavingReply(""); }
  };
  return <div className="owner-ratings-dashboard">
    <div className="owner-ratings-heading"><div><h2>Ratings &amp; Reviews</h2><p>All ratings and guest reviews received by {propertyName}.</p></div><button className="owner-review-qr-link" onClick={onGenerateQr}><QrCode/> Get review QR code</button></div>
    {error && <p className="owner-review-note" role="alert">{error}</p>}
    <div className="owner-rating-overview">
      <article className="owner-rating-summary-card"><header><div className="owner-rating-brand"><Star/><span><strong>Direct website</strong><small>{data.count} ratings &amp; reviews</small></span></div><span className="owner-rating-status">{data.count ? `${data.average}/5 average` : "Awaiting first review"}</span></header><div className="owner-rating-score-layout"><div className="owner-rating-score"><strong>{data.count ? data.average.toFixed(1) : "—"}</strong><span>/5</span><small>{data.count ? "Guest rating" : "No ratings yet"}</small></div><div className="owner-rating-bars">{[5,4,3,2,1].map((score) => <div key={score}><span>{score} star</span><i><b style={{ width: `${data.count ? Math.round(data.distribution[score - 1] / data.count * 100) : 0}%` }} /></i><small>{data.count ? Math.round(data.distribution[score - 1] / data.count * 100) : 0}% ({data.distribution[score - 1]})</small></div>)}</div></div><div className="owner-rating-subsection"><span>Category ratings</span>{Object.keys(data.categories).length ? <div className="owner-review-category-results">{Object.entries(data.categories).map(([key, value]) => <span key={key}>{key} <b>{value.toFixed(1)}/5</b></span>)}</div> : <p>Category scores will appear after guests rate cleanliness, location, service and value.</p>}</div><div className="owner-rating-subsection"><span>Recent ratings</span>{data.count ? <div className="owner-rating-chips">{data.reviews.slice(0, 6).map((review) => <i key={review._id}>{review.rating}</i>)}</div> : <p>No ratings yet.</p>}</div></article>
      <article className="owner-rating-qr-card"><div className="owner-rating-qr-icon"><QrCode/></div><h3>Collect more guest reviews</h3><p>Share this property-specific link or place the QR code at reception and inside guest rooms. Guests can review a paid stay after checkout.</p>{qr ? <img src={qr} alt={`${propertyName} review QR code`}/> : <button className="btn-primary" onClick={onGenerateQr}><QrCode/> Generate QR code</button>}<div className="owner-rating-link-row"><span>{reviewLink}</span><button onClick={() => void copyLink()}><Copy/> {copied ? "Copied" : "Copy"}</button></div>{qr && <a className="owner-rating-download" href={qr} download={`${propertyName}-review-qr.png`}><Download/> Download PNG</a>}</article>
    </div>
    <section className="owner-review-list-card"><header><div><h2>All Ratings &amp; Reviews <span>({data.count})</span></h2><p>Feedback from verified completed stays.</p></div><label className="owner-review-search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by booking ID or guest"/></label></header><div className="owner-review-filters"><span><Filter/> Filters</span><select aria-label="Posted on" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Posted: Newest first</option><option value="oldest">Oldest first</option></select><select aria-label="Rating" value={rating} onChange={(event) => setRating(Number(event.target.value))}><option value={0}>Rating: All</option>{[5,4,3,2,1].map((score) => <option value={score} key={score}>{score} stars</option>)}</select><select aria-label="Reply status" value={replyStatus} onChange={(event) => setReplyStatus(event.target.value)}><option value="all">Reply: All</option><option value="replied">Replied</option><option value="unreplied">Not replied</option></select><button type="button" onClick={() => { setSearch(""); setRating(0); setReplyStatus("all"); setSort("newest"); }}>Clear all</button></div>
      {loading ? <div className="owner-review-empty">Loading reviews…</div> : filtered.length ? <div className="owner-review-entries">{filtered.map((review) => <article key={review._id}><div className="owner-review-entry-top"><span className="owner-review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><time>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></div><h3>{review.guestName}</h3><small>{review.roomName} · Booking {review.bookingNumber}</small>{review.comment && <p>{review.comment}</p>}{review.ownerReply && <blockquote><b>Your reply</b><p>{review.ownerReply}</p></blockquote>}{canReply && <div className="owner-review-reply"><textarea value={replyDrafts[review._id] ?? review.ownerReply ?? ""} maxLength={1500} onChange={(event) => setReplyDrafts((value) => ({ ...value, [review._id]: event.target.value }))} placeholder="Write a public response to this guest"/><button disabled={savingReply === review._id} onClick={() => void saveReply(review)}>{savingReply === review._id ? "Saving…" : review.ownerReply ? "Update reply" : "Post reply"}</button></div>}</article>)}</div> : <div className="owner-review-empty"><div><MessageSquareText/></div><h3>{data.count ? "No reviews match these filters" : "No guest reviews yet"}</h3><p>{data.count ? "Try clearing your search or filters." : "Ratings and reviews will appear here after guests submit feedback for completed stays."}</p><button onClick={onGenerateQr}><QrCode/> Share review QR</button></div>}
    </section>
  </div>;
}
