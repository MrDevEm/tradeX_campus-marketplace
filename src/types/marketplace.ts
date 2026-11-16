export type ListingType = 'Buy / Sell' | 'Swap' | 'Giveaway';

export type ListingBadgeClass = 'type-sell' | 'type-swap' | 'type-free';

export type ListingSortOrder = 'newest' | 'price-low' | 'price-high';

export type ChatMobileView = 'inbox' | 'chat' | 'info';

export type AuthTab = 'login' | 'register' | 'verify';

export interface CarouselItem {
  src: string;
  name: string;
  bg: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  count: string;
  icon: string;
}

export interface Listing {
  id: string;
  title: string;
  category: string;
  type: ListingType;
  typeClass: ListingBadgeClass;
  price: number;
  priceLabel: string;
  condition: string;
  spot: string;
  seller: string;
  dept: string;
  desc: string;
  img: string;
  saved: boolean;
}

export interface CreateListingPayload {
  title: string;
  category: string;
  type: ListingType;
  price: number;
  condition: string;
  desc: string;
  imageDataUrl?: string;
}

export interface ChatMessage {
  id: string;
  in: boolean;
  time: string;
  text: string;
  img?: string;
}

export interface Conversation {
  id: string;
  listingId?: string;
  seller: string;
  item: string;
  priceLabel: string;
  img: string;
  pinned: boolean;
  lastTime: string;
  sharedMedia: string[];
  messages: ChatMessage[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  studentId: string;
  academicYear: string;
  department: string;
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    studentId?: string;
    department?: string;
    verified: boolean;
  };
}

export interface VerificationStatus {
  badge: string;
  emailConfirmed: boolean;
  feeTier: string;
}

export interface DashboardSummary {
  activeListingsCount: number;
  savedItemsCount: number;
  unreadChatsCount: number;
  trustScore: string;
}
