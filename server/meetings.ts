import type { Contact, ListingProperty, MarketComp } from "./db.ts";

export interface MeetingInput {
  id: string;
  title: string;
  description?: string;
  location?: string;
  attendees?: { email: string; name?: string }[];
}

export type DataStrength = "Strong" | "Partial" | "Limited";

const norm = (value: string | undefined) => (value || "").toLowerCase();

// Street part of an address ("1420 Market Street, San Francisco" -> "1420 market street").
const street = (address: string) => norm(address.split(",")[0]).trim();

function findCounterparty(meeting: MeetingInput, contacts: Contact[]): Contact | null {
  const emails = new Set((meeting.attendees || []).map((a) => norm(a.email)));
  const byEmail = contacts.find((c) => c.email && emails.has(norm(c.email)));
  if (byEmail) return byEmail;

  const haystack = norm(
    [meeting.title, meeting.description, ...(meeting.attendees || []).map((a) => a.name)].join(" ")
  );
  return contacts.find((c) => haystack.includes(norm(c.name).replace(/,.*$/, ""))) || null;
}

function findProperty(meeting: MeetingInput, listings: ListingProperty[]): ListingProperty | null {
  const haystack = norm([meeting.location, meeting.title, meeting.description].join(" "));
  return (
    listings.find((l) => haystack.includes(street(l.address)) || haystack.includes(norm(l.title))) || null
  );
}

function findComps(property: ListingProperty | null, comps: MarketComp[]): MarketComp[] {
  if (!property) return [];
  const sameType = comps.filter((c) => c.propertyType === property.propertyType);
  const pool = sameType.length > 0 ? sameType : comps.filter((c) => norm(c.address).includes(norm(property.city)));
  return [...pool].sort((a, b) => b.closedDate.localeCompare(a.closedDate)).slice(0, 2);
}

// Builds the counterparty / comps / property snapshot for a meeting from CRM data, with a
// data-strength rating based on how many of the three blocks are backed by records.
export function buildMeetingSnapshot(
  meeting: MeetingInput,
  contacts: Contact[],
  listings: ListingProperty[],
  comps: MarketComp[]
) {
  const counterparty = findCounterparty(meeting, contacts);
  const property = findProperty(meeting, listings);
  const topComps = findComps(property, comps);
  const backed = [counterparty, property, topComps.length > 0 ? topComps : null].filter(Boolean).length;
  const dataStrength: DataStrength = backed === 3 ? "Strong" : backed === 2 ? "Partial" : "Limited";
  return { meetingId: meeting.id, counterparty, property, topComps, dataStrength };
}
