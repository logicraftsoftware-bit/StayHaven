import PDFDocument from 'pdfkit';

export type BookingDocumentData = {
  bookingNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  propertyName: string;
  propertyAddress: string;
  propertyPhone?: string;
  siteName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDetails: Array<{ name: string; age: number }>;
  checkIn: Date;
  checkOut: Date;
  rooms: number;
  adults: number;
  children: number;
  nights: number;
  roomName: string;
  roomAmount: number;
  extraGuestAmount: number;
  couponCode: string;
  couponDiscountAmount: number;
  gstAmount: number;
  gstRatePercent: number | null;
  gstIncluded: boolean;
  propertyTaxAmount: number;
  grossAmount: number;
};

const navy = '#14243c';
const red = '#a30e20';
const muted = '#66758c';
const border = '#dce3ea';
const money = (paise: number) =>
  `INR ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export function renderBookingDocument(
  data: BookingDocumentData,
): Promise<Buffer> {
  const pdf = new PDFDocument({
    size: 'A4',
    margin: 44,
    info: { Title: `Booking ${data.bookingNumber}`, Author: data.siteName },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });
  const width = pdf.page.width - 88;
  let y = 44;
  const text = (
    value: string,
    x: number,
    at: number,
    size = 10,
    color = navy,
    maxWidth = width,
  ) =>
    pdf
      .font('Helvetica')
      .fontSize(size)
      .fillColor(color)
      .text(value, x, at, { width: maxWidth, lineGap: 2 });
  const bold = (
    value: string,
    x: number,
    at: number,
    size = 10,
    color = navy,
    maxWidth = width,
  ) =>
    pdf
      .font('Helvetica-Bold')
      .fontSize(size)
      .fillColor(color)
      .text(value, x, at, { width: maxWidth, lineGap: 2 });
  const rule = (at: number) =>
    pdf
      .strokeColor(border)
      .lineWidth(1)
      .moveTo(44, at)
      .lineTo(44 + width, at)
      .stroke();
  const section = (label: string) => {
    if (y > 680) {
      pdf.addPage();
      y = 48;
    }
    bold(label, 44, y, 11);
    y += 25;
  };
  const line = (label: string, value: string, highlight = false) => {
    if (y > 730) {
      pdf.addPage();
      y = 48;
    }
    text(
      label,
      44,
      y,
      highlight ? 11 : 10,
      highlight ? navy : muted,
      width * 0.65,
    );
    bold(
      value,
      44 + width * 0.65,
      y,
      highlight ? 12 : 10,
      highlight ? navy : muted,
      width * 0.35,
    );
    y += highlight ? 29 : 24;
  };

  bold(data.siteName.toUpperCase(), 44, y, 15, navy, width * 0.55);
  bold(
    'BOOKING INVOICE / VOUCHER',
    44 + width * 0.55,
    y + 2,
    12,
    red,
    width * 0.45,
  );
  y += 31;
  rule(y);
  y += 18;
  bold(data.propertyName, 44, y, 17);
  y += 24;
  text(
    data.propertyAddress || 'Address available on the property page',
    44,
    y,
    9,
    muted,
    width * 0.67,
  );
  if (data.propertyPhone)
    text(
      `Hotel phone: ${data.propertyPhone}`,
      44 + width * 0.68,
      y,
      9,
      muted,
      width * 0.32,
    );
  y += Math.max(
    34,
    pdf.heightOfString(data.propertyAddress, { width: width * 0.67 }) + 12,
  );
  rule(y);
  y += 18;

  const left = 44;
  const right = 44 + width * 0.52;
  bold('PRIMARY GUEST', left, y, 9, red);
  bold('BOOKING DETAILS', right, y, 9, red);
  y += 17;
  bold(data.guestName, left, y, 11, navy, width * 0.46);
  text(`Booking ID: ${data.bookingNumber}`, right, y, 10, navy, width * 0.47);
  y += 19;
  text(data.guestEmail, left, y, 9, muted, width * 0.46);
  text(`Booked on: ${date(data.createdAt)}`, right, y, 9, muted, width * 0.47);
  y += 18;
  text(data.guestPhone, left, y, 9, muted, width * 0.46);
  text(`Booking status: ${data.status}`, right, y, 9, muted, width * 0.47);
  y += 29;
  rule(y);
  y += 18;

  bold('CHECK-IN', left, y, 9, red);
  bold('CHECK-OUT', left + width / 3, y, 9, red);
  bold('STAY', left + (width * 2) / 3, y, 9, red);
  y += 17;
  bold(date(data.checkIn), left, y, 11);
  bold(date(data.checkOut), left + width / 3, y, 11);
  bold(
    `${data.nights} night${data.nights === 1 ? '' : 's'}`,
    left + (width * 2) / 3,
    y,
    11,
  );
  y += 23;
  text(
    `${data.rooms} room${data.rooms === 1 ? '' : 's'}  |  ${data.adults} adult${data.adults === 1 ? '' : 's'}  |  ${data.children} child${data.children === 1 ? '' : 'ren'}`,
    left,
    y,
    10,
    muted,
  );
  y += 35;
  rule(y);
  y += 18;

  section('ROOM AND GUESTS');
  bold(`${data.rooms} x ${data.roomName}`, 44, y, 11);
  y += 25;
  if (data.guestDetails?.length) {
    text(
      `Additional guests: ${data.guestDetails.map((guest) => `${guest.name} (${guest.age})`).join(', ')}`,
      44,
      y,
      9,
      muted,
    );
    y +=
      pdf.heightOfString(
        `Additional guests: ${data.guestDetails.map((guest) => `${guest.name} (${guest.age})`).join(', ')}`,
        { width },
      ) + 18;
  }
  rule(y);
  y += 20;

  section('PRICE BREAKUP');
  line(
    `Room charges (${data.rooms} room${data.rooms === 1 ? '' : 's'} x ${data.nights} night${data.nights === 1 ? '' : 's'})`,
    money(data.roomAmount),
  );
  if (data.extraGuestAmount)
    line('Extra guest charges', money(data.extraGuestAmount));
  if (data.couponDiscountAmount)
    line(
      `Coupon discount (${data.couponCode})`,
      `- ${money(data.couponDiscountAmount)}`,
    );
  line(
    `GST${data.gstRatePercent === null ? '' : ` (${data.gstRatePercent}%)`}${data.gstIncluded ? ' - included above' : ''}`,
    money(data.gstAmount),
  );
  if (data.propertyTaxAmount)
    line('Other property taxes and fees', money(data.propertyTaxAmount));
  rule(y);
  y += 12;
  line(
    data.paymentStatus === 'PAID'
      ? 'TOTAL PAID ONLINE'
      : 'TOTAL BOOKING AMOUNT',
    money(data.grossAmount),
    true,
  );
  y += 5;
  const status =
    data.status === 'CANCELLED'
      ? 'CANCELLED BOOKING'
      : data.paymentStatus === 'PAID'
        ? 'PAID ONLINE'
        : data.paymentStatus === 'PAY_AT_HOTEL'
          ? 'PAYMENT DUE AT HOTEL'
          : 'ONLINE PAYMENT PENDING';
  pdf
    .roundedRect(44, y, width, 40, 6)
    .fill(data.paymentStatus === 'PAID' ? '#edf8f2' : '#fff5e9');
  bold(
    status,
    56,
    y + 11,
    11,
    data.paymentStatus === 'PAID' ? '#08764d' : '#92530e',
  );
  y += 58;
  if (y > 690) {
    pdf.addPage();
    y = 48;
  }
  text(
    'This booking summary is not a GST tax invoice. Request the applicable tax invoice from the property. For pay-at-hotel bookings, no online payment has been collected. Keep your booking ID and a valid identity document for check-in.',
    44,
    y,
    9,
    muted,
  );
  y += 48;
  rule(y);
  y += 12;
  text(
    `Generated by ${data.siteName}  |  Booking reference ${data.bookingNumber}`,
    44,
    y,
    8,
    muted,
  );
  pdf.end();
  return result;
}
