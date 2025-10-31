// Centralized exports for easy importing

// Shared Components
export { Button } from './shared/Button';
export type { ButtonProps } from './shared/Button';

export { Modal } from './shared/Modal';
export { StatsCard } from './shared/StatsCard';
export type { StatsCardProps } from './shared/StatsCard';

export { SkeletonCard } from './shared/SkeletonCard';

// Feature Components
export { TransactionCard } from './features/transactions/TransactionCard';
export { FilterBar } from './features/filters/FilterBar';
export { ExportButton } from './features/export/ExportButton';
export { BudgetTracker } from './features/budget/BudgetTracker';
export { ExpenseAnalytics } from './features/analytics/ExpenseAnalytics';
export { RecurringTransactions } from './features/recurring/RecurringTransactions';
export type { RecurringTransaction } from './features/recurring/RecurringTransactions';

// Now you can import like this:
// import { Button, Modal, FilterBar, BudgetTracker } from '@/components';
