export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              Expense Tracker
            </h1>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Expense Tracker
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Track your expenses, income, and loans with collaborative features.
            </p>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Total Income</h3>
                <p className="text-3xl font-bold text-green-600">$0.00</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Total Expenses</h3>
                <p className="text-3xl font-bold text-red-600">$0.00</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Outstanding Loans</h3>
                <p className="text-3xl font-bold text-blue-600">$0.00</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
                  Add Income
                </button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
                  Add Expense
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
                  Add Loan
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-center py-8 text-gray-500">
                <p>No entries yet. Add your first income, expense, or loan to get started!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}