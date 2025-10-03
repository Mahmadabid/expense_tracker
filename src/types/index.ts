export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
  guestToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EntryType = 'income' | 'expense' | 'loan';
export type LoanDirection = 'lent' | 'borrowed';
export type EntryStatus = 'active' | 'paid' | 'cancelled';
export type Currency = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'KWD' | 'JPY' | 'CAD' | 'AUD' | 'SAR' | 'AED';

export interface Entry {
  _id: string;
  userId: string;
  type: EntryType;
  amount: number;
  currency: Currency;
  description?: string;
  category?: string;
  date: Date;
  status: EntryStatus;
  tags?: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface Loan extends Entry {
  type: 'loan';
  direction: LoanDirection;
  counterparty: {
    userId?: string; // If registered user
    name: string;
    email?: string;
    phone?: string;
  };
  originalAmount: number;
  remainingAmount: number;
  dueDate?: Date;
  payments: Payment[];
  comments: LoanComment[];
  collaborators: LoanCollaborator[];
  pendingApprovals: PendingApproval[];
  shareToken?: string; // For non-registered counterparty access
}

export interface Payment {
  _id: string;
  amount: number;
  date: Date;
  method?: string;
  notes?: string;
  paidBy: string; // userId
  createdAt: Date;
  version: number;
}

export interface LoanComment {
  _id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type CollaboratorRole = 'owner' | 'collaborator' | 'viewer';
export type CollaboratorStatus = 'pending' | 'accepted' | 'declined';

export interface LoanCollaborator {
  userId: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invitedAt: Date;
  respondedAt?: Date;
  invitedBy: string;
}

export type ApprovalAction = 'delete' | 'close' | 'modify';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PendingApproval {
  _id: string;
  action: ApprovalAction;
  requestedBy: string;
  requiredApprovers: string[];
  approvals: {
    userId: string;
    status: ApprovalStatus;
    approvedAt?: Date;
    comments?: string;
  }[];
  data?: unknown; // Additional data for the action
  expiresAt: Date;
  createdAt: Date;
}

export interface FilterOptions {
  type?: EntryType[];
  status?: EntryStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  currency?: Currency[];
  userId?: string[];
  search?: string;
  tags?: string[];
  category?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GuestClaim {
  guestToken: string;
  firebaseUid: string;
  entries: string[]; // Array of entry IDs to transfer
  expiresAt: Date;
}

// Form interfaces
export interface CreateEntryRequest {
  type: EntryType;
  amount: number;
  currency: Currency;
  description: string;
  category?: string;
  date: Date;
  tags?: string[];
}

export interface CreateLoanRequest extends CreateEntryRequest {
  type: 'loan';
  direction: LoanDirection;
  counterparty: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  dueDate?: Date;
}

export interface AddPaymentRequest {
  amount: number;
  date: Date;
  method?: string;
  notes?: string;
}

export interface InviteCollaboratorRequest {
  email?: string;
  userId?: string;
  role: CollaboratorRole;
}

// Context interfaces
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  claimGuestAccount: (guestToken: string) => Promise<void>;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

// Component props
export interface EntryCardProps {
  entry: Entry | Loan;
  onEdit?: (entry: Entry | Loan) => void;
  onDelete?: (id: string) => void;
  onPayment?: (loan: Loan) => void;
}

export interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onExport: () => void;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// Security
export interface SecurityContext {
  userId: string;
  email: string;
  isGuest: boolean;
  permissions: string[];
  rateLimit: RateLimitInfo;
}