export interface Contact {
  id: string;
  name: string;
  role: 'Buyer' | 'Seller' | 'Lender' | 'Escrow Officer' | 'Attorney' | 'Co-Broker' | 'Appraiser';
  company: string;
  email: string;
  phone: string;
  notes: string;
  preferredChannel: 'email' | 'sms' | 'phone';
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
}

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
}

export interface FinancialTerms {
  purchasePrice: string;
  capRate: string;
  earnestMoneyDeposit: string;
  dueDiligenceDays: string;
  closingTimeline: string;
  financingStructure: string;
}

export interface RiskItem {
  risk: string;
  severity: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface StakeholderCommunication {
  id: string;
  recipientName: string;
  recipientRole: string;
  recipientCompany: string;
  recipientEmail: string;
  recipientPhone: string;
  subject: string;
  body: string;
  urgency: 'Immediate' | 'Within 24 Hours' | 'Routine';
  purpose: string;
  channel: 'email' | 'sms';
  status?: 'Draft' | 'Sending' | 'Delivered';
}

export interface StrategicInsight {
  category: string;
  insight: string;
  recommendedAction: string;
}

export interface WebResearchSource {
  title: string;
  url: string;
}

export interface WebResearchResult {
  summary: string;
  keyFindings: string[];
  searchQueries: string[];
  sources: WebResearchSource[];
  macroContext?: string;
  localMarketNotes?: string;
}

export interface DayToDayCadenceItem {
  timeWindow: string;
  action: string;
  whyCritical: string;
}

export interface NegotiationScript {
  counterparty: string;
  scenario: string;
  exactScript: string;
}

export interface DealBreakerItem {
  risk: string;
  triggerWarning: string;
  brokerProtocol: string;
}

export interface BrokerDayToDayPlaybook {
  first24HoursCadence: DayToDayCadenceItem[];
  negotiationScript: NegotiationScript;
  commissionAndAgencyGuards: string[];
  dealBreakerWatchlist: DealBreakerItem[];
  dailyScheduleRecommendation: string[];
}

export interface DealAnalysisResult {
  dealName: string;
  executiveSummary: string;
  financialTerms: FinancialTerms;
  keyDiscussionPoints: string[];
  sentimentAndLeverage: {
    urgency: 'High' | 'Moderate' | 'Low';
    sentiment: string;
    negotiationLeverage: string;
    keyConcerns: string[];
  };
  risksAndRedFlags: RiskItem[];
  matchedListing?: {
    id: string;
    title: string;
    address: string;
    compComparison: string;
  } | null;
  actionItems: ActionItem[];
  communications: StakeholderCommunication[];
  strategicInsights: StrategicInsight[];
  webResearch?: WebResearchResult;
  dayToDayPlaybook?: BrokerDayToDayPlaybook;
}

export interface PreMeetingDossier {
  id: string;
  meetingTitle: string;
  meetingDate?: string;
  targetPropertyAddress: string;
  clientOrCounterparty: {
    name: string;
    role: string;
    company: string;
    email?: string;
    phone?: string;
    relationshipHistory: string;
  };
  propertyProfile: {
    propertyType: string;
    estimatedValue: string;
    targetCapRate: string;
    squareFeet: string;
    zoningAndUse: string;
    taxAssessmentOrDebtNote?: string;
  };
  externalWebIntel: {
    submarketCapRateRange: string;
    recentSubmarketSalesComps: string[];
    interestRateBenchmark: string;
    localMunicipalOrZoningNews: string;
    webSources: { title: string; url: string }[];
  };
  meetingStrategy?: {
    primaryObjective?: string;
    strategicTalkingPoints?: string[];
    landminesAndTrapsToAvoid?: string[];
    recommendedClosingAsk?: string;
  };
  recommendedNextStepsPrep: {
    step: string;
    assignedTo: string;
    contingencyTrigger: string;
  }[];
}

export interface ContingencyMilestone {
  id: string;
  name: string;
  daysFromMutual: number;
  calculatedDate: string;
  urgency: 'Critical' | 'Warning' | 'On Track';
  responsibleParty: string;
  description: string;
}

export interface SampleCall {
  id: string;
  title: string;
  propertyAddress: string;
  participants: string;
  dealValue: string;
  duration: string;
  description: string;
  transcript: string;
}

