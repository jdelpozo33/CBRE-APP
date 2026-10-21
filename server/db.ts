// Where a record came from; shown as a label on search results and lists.
export type DataSource = 'Email' | 'Call' | 'Note' | 'Calendar' | 'External' | 'CRM';

export interface Contact {
  id: string;
  name: string;
  role: 'Buyer' | 'Seller' | 'Lender' | 'Escrow Officer' | 'Attorney' | 'Co-Broker' | 'Appraiser';
  company: string;
  email: string;
  phone: string;
  notes: string;
  preferredChannel: 'email' | 'sms' | 'phone';
  source?: DataSource;
}

export interface ListingProperty {
  id: string;
  title: string;
  propertyType: 'Commercial Office' | 'Industrial Warehouse' | 'Multi-Family' | 'Retail Center' | 'Luxury Residential' | 'Mixed-Use';
  address: string;
  city: string;
  state: string;
  price: number;
  squareFeet: number;
  capRate?: number;
  noi?: number;
  occupancyRate?: number;
  zoning: string;
  status: 'Active Listing' | 'Under Contract' | 'Off-Market Pocket' | 'Sold';
  ownerContactId?: string;
  summary: string;
  source?: DataSource;
}

export interface MarketComp {
  id: string;
  address: string;
  propertyType: string;
  salePrice: number;
  squareFeet: number;
  pricePerSqFt: number;
  capRate: number;
  closedDate: string;
  source?: DataSource;
}

export interface DispatchedMessage {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  type: 'email' | 'sms';
  status: 'Delivered' | 'Sent' | 'Draft';
  timestamp: string;
  dealReference?: string;
  source?: DataSource;
}

export const initialContacts: Contact[] = [
  {
    id: 'c-1',
    name: 'Marcus Vance',
    role: 'Buyer',
    company: 'Apex Horizon Capital Partners',
    email: 'm.vance@apexhorizon.com',
    phone: '+1 (415) 890-3412',
    notes: 'Managing $45M 1031 exchange fund. Looking for 6.2%+ cap rate mixed-use or multi-family in urban corridors.',
    preferredChannel: 'email'
  },
  {
    id: 'c-2',
    name: 'Elena Rostova',
    role: 'Seller',
    company: 'Bayshore Asset Management',
    email: 'elena@bayshoream.com',
    phone: '+1 (415) 773-1940',
    notes: 'Primary owner of 1420 Market St and Grandview Plaza. Motivated to close before Q4 tax cycle.',
    preferredChannel: 'email'
  },
  {
    id: 'c-3',
    name: 'David Steinberg',
    role: 'Lender',
    company: 'Pacific Crest Commercial Lending',
    email: 'dsteinberg@pacificcrestlending.com',
    phone: '+1 (310) 554-9021',
    notes: 'Senior debt originator. Offers 65% LTV at 6.15% fixed 5-year for commercial mixed-use and multi-family.',
    preferredChannel: 'email'
  },
  {
    id: 'c-4',
    name: 'Sarah Chen',
    role: 'Escrow Officer',
    company: 'First American Title & Escrow',
    email: 'schen@firstam-commercial.com',
    phone: '+1 (415) 920-8811',
    notes: 'Fast turnaround on commercial title commitments & earnest money deposit wiring instructions.',
    preferredChannel: 'email'
  },
  {
    id: 'c-5',
    name: 'Robert Hawthorne, Esq.',
    role: 'Attorney',
    company: 'Hawthorne & Sterling Real Estate Law',
    email: 'rhawthorne@hawthornelaw.com',
    phone: '+1 (415) 321-4560',
    notes: 'Brokerage preferred PSA drafting counsel. Specializes in 1031 safe harbor contingencies and tenant estoppel clauses.',
    preferredChannel: 'email'
  },
  {
    id: 'c-6',
    name: 'Julian Montgomery',
    role: 'Co-Broker',
    company: 'Cushman & Wakefield Alliance',
    email: 'julian.montgomery@cushwake-partner.com',
    phone: '+1 (415) 609-2234',
    notes: 'Represents institutional buyers on west coast. 2.5% co-broke standard agreement.',
    preferredChannel: 'email'
  },
  {
    id: 'c-7',
    name: 'Victoria Bennett',
    role: 'Buyer',
    company: 'Highland Luxury Trust',
    email: 'v.bennett@highlandtrust.com',
    phone: '+1 (212) 880-9921',
    notes: 'High net worth client seeking trophy residential penthouses or prime retail properties $4M-$15M, all-cash capability.',
    preferredChannel: 'email'
  },
  {
    id: 'c-8',
    name: 'Derek Kowalski',
    role: 'Appraiser',
    company: 'CBRE Valuation & Advisory',
    email: 'derek.k@cbre-valuation.com',
    phone: '+1 (415) 443-1289',
    notes: 'Commercial appraiser certified for MAI reports. Expedited 7-day turnaround option.',
    preferredChannel: 'email'
  }
];

export const initialListings: ListingProperty[] = [
  {
    id: 'prop-1',
    title: 'The Meridian Mixed-Use Center',
    propertyType: 'Mixed-Use',
    address: '1420 Market Street',
    city: 'San Francisco',
    state: 'CA',
    price: 14200000,
    squareFeet: 32400,
    capRate: 6.35,
    noi: 901700,
    occupancyRate: 94.5,
    zoning: 'C-3-G Downtown Commercial',
    status: 'Active Listing',
    ownerContactId: 'c-2',
    summary: '6-story boutique mixed-use with ground floor credit retail (Blue Bottle, Wells Fargo ATM) and 24 Class-A residential loft units above. Recent $1.8M seismic and HVAC retrofit completed.'
  },
  {
    id: 'prop-2',
    title: 'Hudson Panorama Penthouse 34A',
    propertyType: 'Luxury Residential',
    address: '88 Hudson Avenue, Penthouse 34A',
    city: 'San Francisco',
    state: 'CA',
    price: 4850000,
    squareFeet: 3450,
    zoning: 'RH-3 Residential',
    status: 'Active Listing',
    summary: 'Direct bay views, private 850 sqft wrap terrace, 3 beds, 3.5 baths, Gaggenau appliances, 2 private underground valet spaces with EV charger.'
  },
  {
    id: 'prop-3',
    title: 'Pacific Logistics Logistics Hub',
    propertyType: 'Industrial Warehouse',
    address: '4200 Industrial Parkway',
    city: 'Oakland',
    state: 'CA',
    price: 18500000,
    squareFeet: 78500,
    capRate: 6.85,
    noi: 1267250,
    occupancyRate: 100,
    zoning: 'M-2 Heavy Industrial',
    status: 'Off-Market Pocket',
    summary: '32-ft clear height, 12 dock doors, 100% leased to regional logistics 3PL with 7 years remaining on NNN lease with 3% annual escalations.'
  },
  {
    id: 'prop-4',
    title: 'Grandview Medical & Professional Plaza',
    propertyType: 'Commercial Office',
    address: '750 Grandview Boulevard',
    city: 'San Mateo',
    state: 'CA',
    price: 8900000,
    squareFeet: 21800,
    capRate: 6.1,
    noi: 542900,
    occupancyRate: 88,
    zoning: 'O-C Office Commercial',
    status: 'Active Listing',
    ownerContactId: 'c-2',
    summary: '2-story medical/dental facility with dedicated parking field (4.2/1000 ratio). Anchor surgery clinic on 10-year term.'
  },
  {
    id: 'prop-5',
    title: 'Valencia Boulevard Retail Promenade',
    propertyType: 'Retail Center',
    address: '1080 Valencia Street',
    city: 'San Francisco',
    state: 'CA',
    price: 6400000,
    squareFeet: 11200,
    capRate: 5.9,
    noi: 377600,
    occupancyRate: 100,
    zoning: 'NCT Neighborhood Commercial Transit',
    status: 'Under Contract',
    summary: 'Four fully occupied retail storefronts with triple net leases. High pedestrian footfall corridor in the Mission District.'
  }
];

export const initialComps: MarketComp[] = [
  {
    id: 'comp-1',
    address: '1388 Market Street',
    propertyType: 'Mixed-Use',
    salePrice: 13900000,
    squareFeet: 30800,
    pricePerSqFt: 451,
    capRate: 6.2,
    closedDate: '2026-08-14'
  },
  {
    id: 'comp-2',
    address: '1550 Market Street',
    propertyType: 'Commercial Office',
    salePrice: 15200000,
    squareFeet: 34000,
    pricePerSqFt: 447,
    capRate: 6.4,
    closedDate: '2026-06-20'
  },
  {
    id: 'comp-3',
    address: '120 Hudson Avenue, Penthouse 28B',
    propertyType: 'Luxury Residential',
    salePrice: 4650000,
    squareFeet: 3200,
    pricePerSqFt: 1453,
    capRate: 0,
    closedDate: '2026-07-02'
  },
  {
    id: 'comp-4',
    address: '3900 Industrial Boulevard',
    propertyType: 'Industrial Warehouse',
    salePrice: 19100000,
    squareFeet: 82000,
    pricePerSqFt: 233,
    capRate: 6.7,
    closedDate: '2026-05-18'
  }
];

export interface QuickActivityLog {
  id: string;
  type: 'call' | 'tour' | 'auto_pipeline';
  title: string;
  entityName: string;
  propertyOrContext: string;
  outcome: string;
  notes: string;
  timestamp: string;
  followUpDate?: string;
  source?: DataSource;
}

export const initialActivityLogs: QuickActivityLog[] = [
  {
    id: 'log-1',
    type: 'tour',
    title: 'Private Twilight Property Walkthrough',
    entityName: 'Victoria Bennett (Highland Luxury Trust)',
    propertyOrContext: '88 Hudson Avenue, Penthouse 34A',
    outcome: 'Full-Price All-Cash Offer ($4.85M)',
    notes: 'Client toured wrap terrace and panoramic bay view. Requesting $75k credit for railing seal maintenance.',
    timestamp: '2026-10-04 17:45:00',
    followUpDate: 'Tomorrow at 10:00 AM'
  },
  {
    id: 'log-2',
    type: 'call',
    title: '1031 Exchange Replacement Terms Call',
    entityName: 'Marcus Vance (Apex Horizon Capital)',
    propertyOrContext: '1420 Market Street',
    outcome: 'Deal Terms Agreed ($14.2M / 6.35% Cap)',
    notes: 'Agreed to 30-day diligence, $450k deposit with Sarah Chen at First American, and Day-21 estoppel condition.',
    timestamp: '2026-10-05 11:20:00',
    followUpDate: 'Today 3:00 PM'
  },
  {
    id: 'log-3',
    type: 'call',
    title: 'Commercial Senior Debt Underwriting Review',
    entityName: 'David Steinberg (Pacific Crest Lending)',
    propertyOrContext: '1420 Market Street',
    outcome: 'Debt Quote 65% LTV @ 6.15% Fixed',
    notes: 'Lender pre-underwriting confirmed. Awaiting final trailing 12 P&L package to issue term sheet.',
    timestamp: '2026-10-05 13:10:00',
    followUpDate: 'Within 24 Hours'
  }
];

export const dispatchedMessagesLog: DispatchedMessage[] = [
  {
    id: 'msg-seed-1',
    recipientEmail: 'schen@firstam-commercial.com',
    recipientName: 'Sarah Chen (Escrow Officer)',
    subject: 'Escrow Opening & Title Request - 1420 Market St ($14.2M)',
    body: 'Hi Sarah, please open escrow for 1420 Market Street. Purchase price is $14,200,000. Buyer is Apex Horizon Capital. Earnest money deposit of $450,000 will be wired within 48 hours of PSA execution.',
    type: 'email',
    status: 'Delivered',
    timestamp: '2026-09-28 14:32:00',
    dealReference: '1420 Market Street'
  }
];
