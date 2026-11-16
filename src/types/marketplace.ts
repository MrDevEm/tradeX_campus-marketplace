export type ListingType = 'Buy / Sell' | 'Swap' | 'Giveaway';

export type ListingBadgeClass = 'type-sell' | 'type-swap' | 'type-free';

export type ListingSortOrder = 'newest' | 'price-low' | 'price-high';

export type ChatMobileView = 'inbox' | 'chat' | 'info';

export type AuthTab = 'login' | 'register' | 'otp' | 'upload-id' | 'verify';

export type UserStatus =
  | 'PENDING_EMAIL'
  | 'PENDING_UPLOAD'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

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

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface UploadStudentIdPayload {
  idDocumentDataUrl: string;
  fileName?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  studentId?: string;
  department?: string;
  academicYear?: string;
  verified: boolean;
  status: UserStatus;
  role?: 'STUDENT' | 'ADMIN';
  idDocumentUploaded?: boolean;
  rejectionReason?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface VerificationStatus {
  status: UserStatus;
  badge: string;
  emailConfirmed: boolean;
  idDocumentUploaded: boolean;
  rejectionReason?: string;
  feeTier: string;
}

export interface DashboardSummary {
  activeListingsCount: number;
  savedItemsCount: number;
  unreadChatsCount: number;
  trustScore: string;
}

export interface VerificationQueueItem {
  id: string;
  userId: string;
  studentName: string;
  studentId: string;
  department: string;
  academicYear: string;
  email: string;
  idDocumentUrl: string;
  submittedAt: string;
  status: UserStatus;
  rejectionReason?: string;
}

export interface AdminStudent {
  id: string;
  fullName: string;
  studentId: string;
  department: string;
  academicYear: string;
  email: string;
  status: UserStatus;
  role: 'STUDENT' | 'ADMIN';
  joinedAt: string;
  activeListingsCount: number;
  trustScore: number;
}

export interface ModerationReport {
  id: string;
  reporterName: string;
  reporterId: string;
  targetType: 'LISTING' | 'USER' | 'CHAT';
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolutionNote?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  targetType: string;
  targetName: string;
  notes?: string;
}

export interface AdminSummary {
  pendingVerificationsCount: number;
  openReportsCount: number;
  verifiedStudentsCount: number;
  totalListingsCount: number;
}
