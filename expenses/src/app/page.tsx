"use client";

import {
  FormEvent,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
};

type DraftExpense = {
  description: string;
  category: string;
  amount: string;
  date: string;
  note: string;
};

const STORAGE_KEY = "agentic-expenses:v1";

const categoryPalette = [
  "Essentials",
  "Food",
  "Transport",
  "Health",
  "Leisure",
  "Tech",
  "Other",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function Home() {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [draft, setDraft] = useState<DraftExpense>({
    description: "",
    category: "",
    amount: "",
    date: todayIso,
    note: "",
  });
  const [month, setMonth] = useState(() => todayIso.slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Expense[];
      if (Array.isArray(parsed)) {
        startTransition(() => {
          setExpenses(
            parsed
              .filter((item): item is Expense => {
                return (
                  typeof item.id === "string" &&
                  typeof item.description === "string" &&
                  typeof item.category === "string" &&
                  typeof item.amount === "number" &&
                  typeof item.date === "string"
                );
              })
              .sort((a, b) => b.date.localeCompare(a.date))
          );
        });
      }
    } catch {
      // ignore malformed payloads
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const byMonth = expenses.filter((expense) =>
      expense.date.startsWith(month ?? "")
    );

    const byCategory =
      categoryFilter === "all"
        ? byMonth
        : byMonth.filter((expense) => expense.category === categoryFilter);

    const bySearch = searchTerm.trim()
      ? byCategory.filter((expense) => {
          const needle = searchTerm.trim().toLowerCase();
          return (
            expense.description.toLowerCase().includes(needle) ||
            expense.note?.toLowerCase().includes(needle)
          );
        })
      : byCategory;

    return [...bySearch].sort((a, b) =>
      a.date === b.date
        ? b.createdAt.localeCompare(a.createdAt)
        : b.date.localeCompare(a.date)
    );
  }, [expenses, month, categoryFilter, searchTerm]);

  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const byCategory = filteredExpenses.reduce<Record<string, number>>(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
        return acc;
      },
      {}
    );

    const daysInMonth = month
      ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)) , 0).getDate()
      : 30;

    const dailyAverage = daysInMonth ? total / daysInMonth : total;

    const topCategory = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      total,
      dailyAverage,
      categories: byCategory,
      topCategory: topCategory
        ? { name: topCategory[0], amount: topCategory[1] }
        : null,
    };
  }, [filteredExpenses, month]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedDescription = draft.description.trim();
    if (!trimmedDescription) {
      setError("Add a short description to remember the expense.");
      return;
    }

    const amountValue = Number.parseFloat(draft.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Amount should be a positive number.");
      return;
    }

    const isoDate = draft.date;
    if (!isoDate || Number.isNaN(Date.parse(isoDate))) {
      setError("Choose a valid date.");
      return;
    }

    const payload: Expense = {
      id: crypto.randomUUID(),
      description: trimmedDescription,
      category: draft.category || "Other",
      amount: Number(amountValue.toFixed(2)),
      date: isoDate,
      note: draft.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setExpenses((previous) => [payload, ...previous]);
    setDraft({
      description: "",
      category: draft.category,
      amount: "",
      date: isoDate,
      note: "",
    });
  };

  const handleDelete = (id: string) => {
    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
  };

  const resetFilters = () => {
    setMonth(todayIso.slice(0, 7));
    setCategoryFilter("all");
    setSearchTerm("");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-5 pb-16 pt-14 text-slate-900">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/60 px-8 py-10 glass-surface">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
              personal finance
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">
              Minimal Expense Tracker
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full border border-slate-200 px-3 py-1">
              {expenses.length} tracked
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1">
              {month ? month : "All months"}
            </span>
          </div>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              total spent
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {currencyFormatter.format(totals.total || 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              daily average
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {currencyFormatter.format(totals.dailyAverage || 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              top category
            </p>
            <p className="mt-3 text-xl font-semibold text-slate-900">
              {totals.topCategory
                ? `${totals.topCategory.name} · ${currencyFormatter.format(
                    totals.topCategory.amount
                  )}`
                : "None yet"}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              search
            </p>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search notes or merchants"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </article>
        </section>
      </header>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white/70 p-8 glass-surface">
          <h2 className="text-lg font-semibold text-slate-900">Add expense</h2>
          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-5"
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Description</span>
                <input
                  required
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Groceries, rent, etc."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Category</span>
                <div className="flex flex-col gap-3">
                  <input
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    list="categories"
                    placeholder="Select or type"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  />
                  <datalist id="categories">
                    {categoryPalette.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-2">
                    {categoryPalette.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, category }))
                        }
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] transition ${
                          draft.category === category
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-900/30"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Amount</span>
                <input
                  required
                  value={draft.amount}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Date</span>
                <input
                  required
                  type="date"
                  value={draft.date}
                  max={todayIso}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Note</span>
              <textarea
                value={draft.note}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, note: event.target.value }))
                }
                rows={3}
                placeholder="Optional context"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>
            {error ? (
              <p className="text-sm font-medium text-rose-500">{error}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800"
              >
                Save expense
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    description: "",
                    category: "",
                    amount: "",
                    date: todayIso,
                    note: "",
                  })
                }
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-900/30 hover:text-slate-900"
              >
                Reset form
              </button>
            </div>
          </form>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 glass-surface">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Filters
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Month</span>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  max={todayIso.slice(0, 7)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="all">All categories</option>
                  {categoryPalette.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={resetFilters}
                className="w-max rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-900/30 hover:text-slate-900"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 glass-surface">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Category split
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              {Object.keys(totals.categories).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add expenses to understand your spending pattern.
                </p>
              ) : (
                Object.entries(totals.categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const share =
                      totals.total === 0 ? 0 : Math.round((amount / totals.total) * 100);
                    return (
                      <article
                        key={category}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                          <span>{category}</span>
                          <span>{currencyFormatter.format(amount)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          {share}% of this month
                        </span>
                      </article>
                    );
                  })
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 glass-surface">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Timeline
            </h2>
            <p className="text-sm text-slate-500">
              Showing {filteredExpenses.length} of {expenses.length} entries.
            </p>
          </div>
        </div>
        <ul className="mt-6 flex flex-col divide-y divide-slate-100">
          {filteredExpenses.length === 0 ? (
            <li className="py-10 text-center text-sm text-slate-500">
              Nothing to show yet. Add a new expense to populate the timeline.
            </li>
          ) : (
            filteredExpenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    {expense.category}
                  </span>
                  <p className="text-lg font-medium text-slate-900">
                    {expense.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {dateFormatter.format(new Date(expense.date))}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold text-slate-900">
                    {currencyFormatter.format(expense.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500 transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
