import { SampleCall } from "../types.ts";

export const sampleBrokerDebriefs: SampleCall[] = [
  {
    id: "debrief-1",
    title: "1420 Market Street - Post-Meeting Debrief",
    propertyAddress: "1420 Market Street, San Francisco, CA",
    participants: "Marcus Vance (Buyer, Apex Horizon), Elena Rostova (Seller, Bayshore AM)",
    dealValue: "$14.2M",
    duration: "1m 15s",
    description: "Post-lunch walkthrough debrief with buyer and seller agreeing on terms.",
    transcript: `Hey Broker Buddy, voice memo debrief on 1420 Market Street. Just walked the property and had coffee with Marcus Vance from Apex Horizon and Elena Rostova from Bayshore Asset Management.

We hammered out the final deal structure. Marcus agreed to our price at $14,200,000, which gives him a clean 6.35% entry cap rate on the $901,700 in-place NOI. This is his priority 1031 exchange replacement, so his timeline is tight. He agreed to a $450,000 earnest money deposit going hard after a 30-day diligence window, with a hard 45-day closing.

Next steps we need out immediately:
First, email Sarah Chen at First American Title to open escrow for 1420 Market and send earnest money wiring instructions for the $450k deposit.
Second, notify David Steinberg at Pacific Crest Commercial Lending to lock in their 65% LTV debt quote at 6.15% fixed—send him the trailing 12 P&L and rent roll.
Third, tell Robert Hawthorne Esq. to draft the standard PSA including the 30-day diligence period and the contingency requiring tenant estoppel certificates from Blue Bottle and Wells Fargo by day 21.
Finally, push an executive recap email to Marcus and Elena confirming today's agreed numbers so everyone is aligned.`
  },
  {
    id: "debrief-2",
    title: "88 Hudson Penthouse 34A - Buyer Walkthrough Debrief",
    propertyAddress: "88 Hudson Avenue, Penthouse 34A, San Francisco, CA",
    participants: "Victoria Bennett (Highland Luxury Trust)",
    dealValue: "$4.85M",
    duration: "55s",
    description: "Voice debrief right after twilight penthouse showing with private buyer.",
    transcript: `Broker Buddy, quick debrief. Just stepped out of the private twilight tour of Penthouse 34A at 88 Hudson with Victoria Bennett from Highland Luxury Trust.

She loves the terrace and bay views and is offering full asking price of $4,850,000 all-cash, no financing contingency. She can close in 21 days. Her condition is a $75,000 seller closing credit for terrace glass railing maintenance, plus a 5% earnest deposit of $242,500 held with Sarah Chen at First American Title.

Let's push emails to Sarah Chen to open the escrow file, have counsel draft the contract with the $75k credit and 21-day closing date, and confirm next steps with Victoria's advisory team.`
  },
  {
    id: "debrief-3",
    title: "Fremont Logistics Hub - 50k SF Industrial Sublease",
    propertyAddress: "42000 Bayside Parkway, Fremont, CA",
    participants: "Jason Reed (LogiTrans), Elena Rostova (Landlord Rep)",
    dealValue: "$1.45M/yr ($2.40/SF NNN)",
    duration: "1m 05s",
    description: "Industrial warehouse walkthrough debrief with logistics tenant securing 32' clear height space.",
    transcript: `Broker Buddy, recording debrief on the Fremont Logistics Hub at 42000 Bayside Parkway. Just wrapped the site tour with Jason Reed, VP of Supply Chain at LogiTrans.

We agreed on sublease terms for 50,000 square feet: $2.40 per square foot NNN on a 3-year term starting December 1st. Landlord agreed to 2 months free rent for warehouse racking setup. 4 dock-high doors and 1 drive-in ramp are dedicated to them. Sublease deposit is 2 months rent, $240,000.

Next steps immediately:
1. Email Sarah Chen at First American to request escrow setup and standard sublease security deposit escrow.
2. Email Robert Hawthorne to prepare the Master Landlord Sublease Consent and draft the 3-year sublease agreement with the 60-day early access clause.
3. Push an email recap to Jason Reed and Elena Rostova locking in the rate and 32-foot clear height specs.`
  },
  {
    id: "debrief-4",
    title: "555 California - 28,000 SF Tech Office Lease Renewal",
    propertyAddress: "555 California Street, 22nd Floor, San Francisco, CA",
    participants: "David Steinberg (CFO, Meridian Tech), Co-Broker Chris Alvarez",
    dealValue: "$8.9M (5-Year Term, $64/SF FS)",
    duration: "1m 10s",
    description: "High-floor trophy office renewal meeting debrief securing tenant retention and TI package.",
    transcript: `Broker Buddy, voice memo debrief on 555 California, 22nd floor renewal. Met with David Steinberg, CFO of Meridian Tech, and our co-broker Chris Alvarez.

We finalized the renewal framework: 28,000 rentable square feet at $64 per square foot Full Service Gross for a 5-year extension. Landlord will provide a $45 per square foot turnkey tenant improvement allowance for open collaboration spaces, plus 3 months abated base rent in months 1 through 3.

Critical next steps:
1. Email Robert Hawthorne to draft the Fourth Lease Amendment with the $45/SF TI disbursement schedule and expansion right on floor 23.
2. Email David Steinberg with the revised economic proposal matrix showing annual gross rent and effective rate.
3. Put the lease execution milestone on our calendar for 30 days out so tenant improvement construction starts on schedule.`
  }
];
