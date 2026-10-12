
import { useEffect, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus,
  Trash2, LayoutDashboard, ArrowUpRight,
  ArrowDownRight, Receipt, LoaderCircle
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import './App.css'

const emptyForm = {
  title: '',
  amount: '',
  category: 'Food',
  type: 'EXPENSE',
  date: new Date().toISOString().slice(0, 10),
  description: ''
}

const chartColors = [
  '#287c4a', '#e8a44a', '#518bd0', '#d76b56',
  '#9575cd', '#43a6a0', '#d77ba3', '#8b9b70'
]

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0)
}

function App() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0
  })
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadData() {
    try {
      const [txResponse, summaryResponse] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/transactions/summary')
      ])

      if (!txResponse.ok || !summaryResponse.ok) {
        throw new Error('Could not load backend data.')
      }

      const txData = await txResponse.json()
      const summaryData = await summaryResponse.json()

      setTransactions(txData)
      setSummary(summaryData)
      setMessage('')
    } catch (error) {
      setMessage(
        'Backend connection failed. Make sure Spring Boot is running on port 8080.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addTransaction(event) {
    event.preventDefault()
    setMessage('')

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      })

      if (!response.ok) {
        throw new Error('Unable to save transaction.')
      }

      setForm({
        ...emptyForm,
        date: new Date().toISOString().slice(0, 10)
      })

      await loadData()
      setMessage('Transaction added successfully!')
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction?')) return

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Unable to delete transaction.')
      }

      await loadData()
      setMessage('Transaction deleted successfully!')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const filtered = transactions.filter(transaction =>
    filter === 'ALL' || transaction.type === filter
  )

  const categoryTotals = Object.values(
    transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((totals, tx) => {
        const category = tx.category || 'Other'

        if (!totals[category]) {
          totals[category] = {
            name: category,
            value: 0
          }
        }

        totals[category].value += Number(tx.amount) || 0
        return totals
      }, {})
  )

  const sortedCategories = [...categoryTotals].sort(
    (a, b) => b.value - a.value
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={25} />
          </div>
          <span>PennyWise</span>
        </div>

        <p className="side-label">WORKSPACE</p>

        <div className="nav-item active">
          <LayoutDashboard size={19} />
          Dashboard
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">PW</div>
          <div>
            <strong>My Wallet</strong>
            <small>Personal account</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL FINANCE</p>
            <h1>Dashboard</h1>
            <p className="muted">
              Track your money. Build better habits.
            </p>
          </div>

          <div className="today">
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </header>

        {message && (
          <div className="notice">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {/* Summary cards */}
        <section className="stats">
          <article className="stat-card balance-card">
            <div className="stat-top">
              <span>Total Balance</span>
              <span className="stat-icon">
                <Wallet size={20} />
              </span>
            </div>
            <h2>{money(summary.balance)}</h2>
            <p>Your current financial balance</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Total Income</span>
              <span className="stat-icon income-icon">
                <TrendingUp size={20} />
              </span>
            </div>
            <h2>{money(summary.income)}</h2>
            <p>
              <ArrowUpRight size={15} />
              Money coming in
            </p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Total Expenses</span>
              <span className="stat-icon expense-icon">
                <TrendingDown size={20} />
              </span>
            </div>
            <h2>{money(summary.expenses)}</h2>
            <p>
              <ArrowDownRight size={15} />
              Money going out
            </p>
          </article>
        </section>

        {/* Expense chart */}
        <section className="panel chart-panel">
          <div className="panel-heading">
            <h3>Expense Breakdown</h3>
            <p>
              See how your spending is distributed by category.
            </p>
          </div>

          {categoryTotals.length === 0 ? (
            <div className="chart-empty">
              <Receipt size={30} />
              <p>No expenses to display yet.</p>
              <small>
                Add an expense to see your spending chart.
              </small>
            </div>
          ) : (
            <div className="chart-layout">
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categoryTotals.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={
                            chartColors[index % chartColors.length]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={value => [money(value), 'Spent']}
                    />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="category-list">
                {sortedCategories.map(item => {
                  const originalIndex = categoryTotals.findIndex(
                    category => category.name === item.name
                  )

                  return (
                    <div className="category-row" key={item.name}>
                      <span
                        className="category-dot"
                        style={{
                          background:
                            chartColors[
                              originalIndex % chartColors.length
                            ]
                        }}
                      />

                      <span>{item.name}</span>
                      <strong>{money(item.value)}</strong>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Add transaction and transaction history */}
        <section className="content-grid">
          <article className="panel form-panel">
            <div className="panel-heading">
              <h3>
                <Plus size={19} />
                Add Transaction
              </h3>
              <p>Record your income or expenses.</p>
            </div>

            <form onSubmit={addTransaction}>
              <label>Transaction type</label>

              <div className="type-toggle">
                <button
                  type="button"
                  className={
                    form.type === 'EXPENSE'
                      ? 'selected expense-selected'
                      : ''
                  }
                  onClick={() =>
                    setForm({ ...form, type: 'EXPENSE' })
                  }
                >
                  <TrendingDown size={16} />
                  Expense
                </button>

                <button
                  type="button"
                  className={
                    form.type === 'INCOME'
                      ? 'selected income-selected'
                      : ''
                  }
                  onClick={() =>
                    setForm({ ...form, type: 'INCOME' })
                  }
                >
                  <TrendingUp size={16} />
                  Income
                </button>
              </div>

              <label htmlFor="title">Title</label>
              <input
                id="title"
                required
                placeholder="e.g. Monthly salary"
                value={form.title}
                onChange={e =>
                  setForm({ ...form, title: e.target.value })
                }
              />

              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e =>
                  setForm({ ...form, amount: e.target.value })
                }
              />

              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={e =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {[
                  'Food',
                  'Transport',
                  'Shopping',
                  'Bills',
                  'Entertainment',
                  'Health',
                  'Education',
                  'Salary',
                  'Business',
                  'Investment',
                  'Other'
                ].map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={e =>
                  setForm({ ...form, date: e.target.value })
                }
              />

              <label htmlFor="description">
                Description (optional)
              </label>
              <textarea
                id="description"
                rows="2"
                placeholder="Add a note..."
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              <button className="submit-btn" type="submit">
                <Plus size={18} />
                Add Transaction
              </button>
            </form>
          </article>

          <article className="panel history-panel">
            <div className="panel-heading history-heading">
              <div>
                <h3>
                  <Receipt size={19} />
                  Recent Transactions
                </h3>
                <p>Your income and spending history.</p>
              </div>

              <select
                aria-label="Filter transactions"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expenses</option>
              </select>
            </div>

            {loading ? (
              <div className="empty">
                <LoaderCircle className="spin" />
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Receipt size={25} />
                </div>
                <strong>No transactions yet</strong>
                <p>Add your first transaction to get started.</p>
              </div>
            ) : (
              <div className="transaction-list">
                {filtered.map((tx, index) => (
                  <div
                    className="transaction"
                    key={tx.id ?? index}
                  >
                    <div
                      className={`tx-icon ${
                        tx.type === 'INCOME'
                          ? 'tx-income'
                          : 'tx-expense'
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <TrendingUp size={19} />
                      ) : (
                        <TrendingDown size={19} />
                      )}
                    </div>

                    <div className="tx-info">
                      <strong>{tx.title || tx.category}</strong>
                      <span>
                        {tx.category} · {tx.date}
                      </span>
                      {tx.description && (
                        <small>{tx.description}</small>
                      )}
                    </div>

                    <div className="tx-right">
                      <strong
                        className={
                          tx.type === 'INCOME' ? 'green' : 'red'
                        }
                      >
                        {tx.type === 'INCOME' ? '+' : '−'}
                        {money(tx.amount)}
                      </strong>

                      <button
                        className="delete-btn"
                        type="button"
                        title="Delete transaction"
                        onClick={() => deleteTransaction(tx.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <footer>
          Made for smarter money decisions <span>·</span> PennyWise
        </footer>
      </main>
    </div>
  )
}

export default App
