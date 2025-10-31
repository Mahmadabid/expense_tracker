# Quick Reference Guide - New Components

## 🎯 Import Everything at Once

```tsx
// Import all components
import {
  Button,
  Modal,
  StatsCard,
  SkeletonCard,
  TransactionCard,
  FilterBar,
  ExportButton,
  BudgetTracker,
  ExpenseAnalytics,
  RecurringTransactions,
} from '@/components';

// Import constants
import {
  SUPPORTED_CURRENCIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/lib';
```

---

## 🔥 Quick Copy-Paste Examples

### 1. Filter Bar
```tsx
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState('');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');

<FilterBar
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  selectedCategory={selectedCategory}
  setSelectedCategory={setSelectedCategory}
  categories={EXPENSE_CATEGORIES}
  dateFrom={dateFrom}
  setDateFrom={setDateFrom}
  dateTo={dateTo}
  setDateTo={setDateTo}
  onClearFilters={() => {
    setSearchQuery('');
    setSelectedCategory('');
    setDateFrom('');
    setDateTo('');
  }}
/>
```

### 2. Export Button
```tsx
<ExportButton 
  data={{
    entries: entries,
    loans: loans,
    summary: dashboardData?.summary
  }}
/>
```

### 3. Budget Tracker
```tsx
const [budgets, setBudgets] = useState([]);

<BudgetTracker
  budgets={budgets}
  onAddBudget={(budget) => {
    const newBudget = { ...budget, _id: Date.now().toString() };
    setBudgets([...budgets, newBudget]);
  }}
  onDeleteBudget={(id) => {
    setBudgets(budgets.filter(b => b._id !== id));
  }}
/>
```

### 4. Expense Analytics
```tsx
<ExpenseAnalytics entries={entries} />
```

### 5. Recurring Transactions
```tsx
const [recurring, setRecurring] = useState([]);

<RecurringTransactions
  recurring={recurring}
  onAdd={(transaction) => {
    const newTransaction = { ...transaction, _id: Date.now().toString() };
    setRecurring([...recurring, newTransaction]);
  }}
  onDelete={(id) => {
    setRecurring(recurring.filter(r => r._id !== id));
  }}
  onToggle={(id) => {
    setRecurring(recurring.map(r => 
      r._id === id ? { ...r, isActive: !r.isActive } : r
    ));
  }}
/>
```

### 6. Transaction Card
```tsx
{entries.map((entry) => (
  <TransactionCard
    key={entry._id}
    entry={entry}
    onUpdate={() => refetchData()}
    addToast={(toast) => showToast(toast)}
  />
))}
```

### 7. Button Component
```tsx
<Button 
  variant="primary" // primary | success | danger | secondary | ghost
  size="md" // sm | md
  loading={isLoading}
  onClick={handleClick}
  fullWidth
>
  Click Me
</Button>
```

### 8. Modal Component
```tsx
const [showModal, setShowModal] = useState(false);

<Modal 
  isOpen={showModal} 
  onClose={() => setShowModal(false)} 
  title="My Modal"
  maxWidth="md" // sm | md | lg | xl
>
  <div>Modal content here</div>
</Modal>
```

### 9. Stats Card
```tsx
<StatsCard
  title="Total Balance"
  value="PKR 50,000.00"
  icon={
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  }
  color="blue" // blue | green | red | orange | cyan
  loading={false}
/>
```

---

## 🔍 Filter Logic Example

```tsx
const filteredEntries = entries?.filter((entry) => {
  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    const matchesDesc = entry.description?.toLowerCase().includes(query);
    const matchesCat = entry.category?.toLowerCase().includes(query);
    if (!matchesDesc && !matchesCat) return false;
  }
  
  // Category filter
  if (selectedCategory && entry.category !== selectedCategory) {
    return false;
  }
  
  // Date range filter
  const entryDate = new Date(entry.date);
  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    if (entryDate < from) return false;
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    if (entryDate > to) return false;
  }
  
  return true;
}) || [];
```

---

## 💾 LocalStorage Persistence

### Save Budget Goals
```tsx
useEffect(() => {
  localStorage.setItem('budgets', JSON.stringify(budgets));
}, [budgets]);

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('budgets');
  if (saved) setBudgets(JSON.parse(saved));
}, []);
```

### Save Recurring Transactions
```tsx
useEffect(() => {
  localStorage.setItem('recurring', JSON.stringify(recurring));
}, [recurring]);

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('recurring');
  if (saved) setRecurring(JSON.parse(saved));
}, []);
```

### Save Filter Preferences
```tsx
useEffect(() => {
  localStorage.setItem('filterPrefs', JSON.stringify({
    searchQuery,
    selectedCategory,
    dateFrom,
    dateTo,
  }));
}, [searchQuery, selectedCategory, dateFrom, dateTo]);
```

---

## 🎨 Color Palette

### Button Variants
- `primary` → Blue
- `success` → Green
- `danger` → Red
- `secondary` → Gray
- `ghost` → Transparent

### StatsCard Colors
- `blue` → Blue background
- `green` → Green background
- `red` → Red background
- `orange` → Orange background
- `cyan` → Cyan background

---

## 📱 Responsive Breakpoints

All components are responsive:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Special breakpoints:
- `min-[450px]` - Used in some components
- `sm:` - 640px
- `lg:` - 1024px

---

## 🌙 Dark Mode

All components automatically support dark mode via Tailwind's `dark:` prefix.

No additional configuration needed!

---

## ⚡ Performance Tips

1. **Memoize Filtered Data**
```tsx
const filteredEntries = useMemo(() => {
  return entries?.filter(/* filter logic */) || [];
}, [entries, searchQuery, selectedCategory, dateFrom, dateTo]);
```

2. **Debounce Search**
```tsx
const debouncedSearch = useMemo(
  () => debounce((value) => setSearchQuery(value), 300),
  []
);
```

3. **Virtualize Long Lists**
```tsx
// For 100+ items, consider react-window or react-virtualized
```

---

## 🎯 Common Patterns

### Loading State
```tsx
{loading ? <SkeletonCard /> : <TransactionCard entry={entry} />}
```

### Empty State
```tsx
{entries.length === 0 ? (
  <p className="text-center text-gray-500 py-8">No transactions yet</p>
) : (
  entries.map(entry => <TransactionCard key={entry._id} entry={entry} />)
)}
```

### Error Handling
```tsx
try {
  await fetchData();
} catch (error) {
  addToast({ 
    type: 'error', 
    title: 'Error', 
    description: error.message 
  });
}
```

---

That's it! You're ready to go! 🚀
