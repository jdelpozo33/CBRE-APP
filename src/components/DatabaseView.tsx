import React, { useState } from "react";
import {
  Users,
  Building,
  TrendingUp,
  History,
  Search,
  Plus,
  Mail,
  Phone,
  CheckCircle2,
  MapPin,
  Filter,
  PhoneCall,
  CalendarCheck,
  Zap,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  Check,
} from "lucide-react";
import { Contact, ListingProperty, MarketComp, DispatchedMessage, QuickActivityLog } from "../types.ts";

interface DatabaseViewProps {
  contacts: Contact[];
  listings: ListingProperty[];
  comps: MarketComp[];
  messagesLog: DispatchedMessage[];
  activityLogs: QuickActivityLog[];
  onAddContact: (contact: Partial<Contact>) => Promise<void>;
  onAddListing: (listing: Partial<ListingProperty>) => Promise<void>;
  onAddActivityLog: (log: Partial<QuickActivityLog>) => Promise<void>;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  contacts,
  listings,
  comps,
  messagesLog,
  activityLogs,
  onAddContact,
  onAddListing,
  onAddActivityLog,
}) => {
  const [activeSection, setActiveSection] = useState<"contacts" | "listings" | "comps" | "logs">("contacts");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");

  // Quick Actions Sidebar State
  const [quickActionTab, setQuickActionTab] = useState<"call" | "tour">("call");
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || "");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(listings[0]?.id || "");
  const [callOutcome, setCallOutcome] = useState<string>("Agreed Deal Terms");
  const [tourOutcome, setTourOutcome] = useState<string>("High Interest - LOI Imminent");
  const [quickNotes, setQuickNotes] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("Today 3:00 PM");
  const [isLogging, setIsLogging] = useState(false);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);
  const [showQuickSidebar, setShowQuickSidebar] = useState<boolean>(true);

  // Add Contact Modal State
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState<Contact["role"]>("Buyer");
  const [contactCompany, setContactCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");

  // Add Listing Modal State
  const [showAddListing, setShowAddListing] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingType, setListingType] = useState<ListingProperty["propertyType"]>("Commercial Office");
  const [listingAddress, setListingAddress] = useState("");
  const [listingPrice, setListingPrice] = useState<number>(10000000);
  const [listingSqFt, setListingSqFt] = useState<number>(25000);
  const [listingCapRate, setListingCapRate] = useState<number>(6.2);
  const [listingSummary, setListingSummary] = useState("");

  // Quick Action Call Logging
  const handleQuickLogCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const contact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
    if (!contact) return;

    setIsLogging(true);
    await onAddActivityLog({
      type: "call",
      title: `Client Call: ${contact.name}`,
      entityName: `${contact.name} (${contact.role}, ${contact.company})`,
      propertyOrContext: "1420 Market Street / Active Portfolio",
      outcome: callOutcome,
      notes: quickNotes || `Spoke with ${contact.name}. Outcome: ${callOutcome}. Next follow-up set for ${followUpDate}.`,
      followUpDate,
    });

    setIsLogging(false);
    setQuickNotes("");
    setQuickSuccessMsg(`Logged call with ${contact.name}!`);
    setTimeout(() => setQuickSuccessMsg(null), 3000);
  };

  // Quick Action Site Visit Logging
  const handleQuickLogTour = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const property = listings.find((l) => l.id === selectedPropertyId) || listings[0];
    const contact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
    if (!property) return;

    setIsLogging(true);
    await onAddActivityLog({
      type: "tour",
      title: `Site Walkthrough: ${property.title}`,
      entityName: contact ? `${contact.name} (${contact.role})` : "Prospective Principal",
      propertyOrContext: property.address,
      outcome: tourOutcome,
      notes: quickNotes || `Completed property walkthrough of ${property.title}. Buyer feedback: ${tourOutcome}.`,
      followUpDate,
    });

    setIsLogging(false);
    setQuickNotes("");
    setQuickSuccessMsg(`Logged site tour for ${property.title}!`);
    setTimeout(() => setQuickSuccessMsg(null), 3000);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) return;
    await onAddContact({
      name: contactName,
      role: contactRole,
      company: contactCompany,
      email: contactEmail,
      phone: contactPhone,
      notes: contactNotes,
      preferredChannel: "email",
    });
    setShowAddContact(false);
    setContactName("");
    setContactCompany("");
    setContactEmail("");
    setContactPhone("");
    setContactNotes("");
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingTitle || !listingAddress) return;
    await onAddListing({
      title: listingTitle,
      propertyType: listingType,
      address: listingAddress,
      city: "San Francisco",
      state: "CA",
      price: Number(listingPrice),
      squareFeet: Number(listingSqFt),
      capRate: Number(listingCapRate),
      zoning: "Commercial",
      status: "Active Listing",
      summary: listingSummary,
    });
    setShowAddListing(false);
    setListingTitle("");
    setListingAddress("");
    setListingSummary("");
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredListings = listings.filter((l) => {
    return (
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.propertyType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Brokerage Database & Activity Engine</h2>
          </div>

          <div className="flex items-center gap-2">
            {activeSection === "contacts" && (
              <button
                type="button"
                onClick={() => setShowAddContact(true)}
                className="flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            )}
            {activeSection === "listings" && (
              <button
                type="button"
                onClick={() => setShowAddListing(true)}
                className="flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Property</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("contacts")}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === "contacts"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Stakeholders CRM ({contacts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("listings")}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === "listings"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Properties & Inventory ({listings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("comps")}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === "comps"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Market Comps ({comps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("logs")}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === "logs"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Dispatched Emails ({messagesLog.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickSidebar(!showQuickSidebar)}
            className={`sm:ml-auto flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              showQuickSidebar
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
            }`}
            title="Toggle Quick Actions Sidebar to expand database table width"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sidebar: {showQuickSidebar ? "Visible" : "Hidden"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Data Content on Left (8 or 12 cols) + Quick Actions Sidebar on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Database Content Column */}
        <div className={showQuickSidebar ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
          {/* Search & Filter Bar */}
          {(activeSection === "contacts" || activeSection === "listings") && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${activeSection === "contacts" ? "contacts by name, company, or role..." : "listings by title, address, or asset class..."}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {activeSection === "contacts" && (
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <select
                    aria-label="Filter Contacts by Role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    <option value="Buyer">Buyers / Principals</option>
                    <option value="Seller">Sellers</option>
                    <option value="Lender">Commercial Lenders</option>
                    <option value="Escrow Officer">Escrow Officers</option>
                    <option value="Attorney">Real Estate Counsel</option>
                    <option value="Co-Broker">Co-Brokers</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 1. Contacts Section */}
          {activeSection === "contacts" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{contact.name}</h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">{contact.company}</p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {contact.role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">{contact.notes}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs font-mono text-slate-600">
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 hover:text-emerald-600 transition-colors truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Listings Section */}
          {activeSection === "listings" && (
            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-sm space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        {listing.propertyType}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{listing.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {listing.address}, {listing.city}, {listing.state}
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-lg font-bold font-mono text-emerald-700">
                        ${(listing.price / 1000000).toFixed(2)}M
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block sm:block mt-1">
                        {listing.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{listing.summary}</p>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Square Footage</span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {listing.squareFeet.toLocaleString()} sqft
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Cap Rate</span>
                      <span className="text-xs font-bold font-mono text-emerald-700">
                        {listing.capRate ? `${listing.capRate}%` : "N/A"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Price / SqFt</span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ${Math.round(listing.price / listing.squareFeet)}/sqft
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Comps Section */}
          {activeSection === "comps" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-semibold">Address</th>
                    <th className="pb-3 font-semibold">Asset Class</th>
                    <th className="pb-3 font-semibold">Closed Price</th>
                    <th className="pb-3 font-semibold">Square Footage</th>
                    <th className="pb-3 font-semibold">Price / SqFt</th>
                    <th className="pb-3 font-semibold">Cap Rate</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {comps.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-sans font-medium text-slate-900">{comp.address}</td>
                      <td className="py-3 font-sans text-slate-500">{comp.propertyType}</td>
                      <td className="py-3 text-emerald-700 font-bold">${(comp.salePrice / 1000000).toFixed(2)}M</td>
                      <td className="py-3">{comp.squareFeet.toLocaleString()} sqft</td>
                      <td className="py-3 text-slate-800">${comp.pricePerSqFt}/sqft</td>
                      <td className="py-3 text-emerald-700">{comp.capRate ? `${comp.capRate}%` : "—"}</td>
                      <td className="py-3 text-slate-500">{comp.closedDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Logs Section */}
          {activeSection === "logs" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              {messagesLog.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No communications dispatched yet. Use Step 2 ("Push Emails") to send deal instructions.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 font-semibold">Delivery Status</th>
                        <th className="pb-3 font-semibold">Recipient</th>
                        <th className="pb-3 font-semibold">Subject</th>
                        <th className="pb-3 font-semibold">Deal Reference</th>
                        <th className="pb-3 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {messagesLog.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-900">
                            <div>{log.recipientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{log.recipientEmail}</div>
                          </td>
                          <td className="py-3 text-slate-800 font-medium max-w-xs truncate">{log.subject}</td>
                          <td className="py-3 text-slate-600">{log.dealReference || "—"}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): DEDICATED QUICK-ACCESS 'QUICK ACTIONS' SIDEBAR */}
        {showQuickSidebar && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 sticky top-20">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Instant CRM
                </span>
              </div>

              {/* Success toast inside sidebar */}
              {quickSuccessMsg && (
                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{quickSuccessMsg}</span>
                </div>
              )}

              {/* Toggle: Log Call vs Log Tour */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickActionTab("call")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    quickActionTab === "call"
                      ? "bg-emerald-600 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Log Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickActionTab("tour")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    quickActionTab === "tour"
                      ? "bg-emerald-600 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Log Site Tour</span>
                </button>
              </div>

              {/* Mode 1: Log Client Call */}
              {quickActionTab === "call" && (
                <form onSubmit={handleQuickLogCall} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Client / Contact</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    >
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.role} - {c.company})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fast Outcome Chips */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quick Outcome Tag</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Agreed Deal Terms",
                        "Counter-Offer Review",
                        "Requested Rent Roll",
                        "Underwriting In Progress",
                        "Voicemail Left",
                      ].map((outcome) => (
                        <button
                          type="button"
                          key={outcome}
                          onClick={() => setCallOutcome(outcome)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            callOutcome === outcome
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {outcome}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brief Notes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Call Takeaway Notes</label>
                    <textarea
                      rows={2}
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      placeholder="e.g. Agreed to $14.2M; awaiting Sarah Chen's wiring instructions..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Follow-up target */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Follow-up Target</label>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      {["Today 3 PM", "Tomorrow 10 AM", "In 3 Days"].map((time) => (
                        <button
                          type="button"
                          key={time}
                          onClick={() => setFollowUpDate(time)}
                          className={`py-1 px-1.5 rounded-lg font-semibold border text-center transition-all cursor-pointer ${
                            followUpDate === time
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLogging}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {isLogging ? "Logging to CRM..." : "Save Call Log Directly"}
                  </button>
                </form>
              )}

              {/* Mode 2: Log Site Tour */}
              {quickActionTab === "tour" && (
                <form onSubmit={handleQuickLogTour} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Property Toured</label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    >
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} ({l.propertyType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Client Who Attended</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    >
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.company})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Buyer Tour Feedback</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "High Interest - LOI Imminent",
                        "Loved Layout - Price High",
                        "Needs HVAC / Seismic Walk",
                        "Second Tour with Principal",
                      ].map((outcome) => (
                        <button
                          type="button"
                          key={outcome}
                          onClick={() => setTourOutcome(outcome)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            tourOutcome === outcome
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {outcome}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tour Walkthrough Notes</label>
                    <textarea
                      rows={2}
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      placeholder="e.g. Client loved the natural light; requested estoppel timeline..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLogging}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {isLogging ? "Logging Site Tour..." : "Save Site Tour Directly"}
                  </button>
                </form>
              )}

              {/* Live Activity Feed Stream */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Live Activity Stream
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">
                    {activityLogs.length} Logged
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-[11px] truncate max-w-[170px]">
                          {log.title}
                        </span>
                        <span className="flex items-center gap-1">
                          {log.pendingSync && (
                            <span className="text-[9px] font-bold text-amber-800 px-1.5 rounded bg-amber-100 border border-amber-200">
                              Waiting to sync
                            </span>
                          )}
                          <span className="text-[9px] uppercase font-bold text-emerald-800 px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-200">
                            {log.type}
                          </span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 font-semibold truncate">
                        {log.entityName}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Outcome: {log.outcome}
                      </div>
                      {log.notes && log.type === "call" && (
                        <p className="text-[10px] text-slate-600 line-clamp-2">{log.notes}</p>
                      )}
                      {log.tags && log.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {log.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-semibold text-slate-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between pt-0.5">
                        <span>{log.timestamp.slice(11, 16)}</span>
                        <span>Next: {log.followUpDate || "Done"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Contact */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Contact to CBRE CRM</h3>
            <form onSubmit={handleCreateContact} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Role</label>
                  <select
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value="Buyer">Buyer / Principal</option>
                    <option value="Seller">Seller</option>
                    <option value="Lender">Commercial Lender</option>
                    <option value="Escrow Officer">Escrow Officer</option>
                    <option value="Attorney">Real Estate Counsel</option>
                    <option value="Co-Broker">Co-Broker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Company / Firm</label>
                <input
                  type="text"
                  value={contactCompany}
                  onChange={(e) => setContactCompany(e.target.value)}
                  placeholder="First American Title"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="schen@firstam.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (415) 555-0192"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Underwriting / Notes</label>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Criteria, preferred terms, turnaround times..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Listing */}
      {showAddListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Property to CBRE Inventory</h3>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Property Name</label>
                <input
                  type="text"
                  required
                  value={listingTitle}
                  onChange={(e) => setListingTitle(e.target.value)}
                  placeholder="e.g. Pacific Logistics Distribution Hub"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Asset Class</label>
                  <select
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value="Commercial Office">Commercial Office</option>
                    <option value="Industrial Warehouse">Industrial Warehouse</option>
                    <option value="Multi-Family">Multi-Family</option>
                    <option value="Retail Center">Retail Center</option>
                    <option value="Luxury Residential">Luxury Residential</option>
                    <option value="Mixed-Use">Mixed-Use</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Price ($)</label>
                  <input
                    type="number"
                    required
                    value={listingPrice}
                    onChange={(e) => setListingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Address</label>
                <input
                  type="text"
                  required
                  value={listingAddress}
                  onChange={(e) => setListingAddress(e.target.value)}
                  placeholder="1420 Market Street, San Francisco, CA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddListing(false)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
