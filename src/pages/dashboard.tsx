import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Category, Expense } from "../types/type";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseYMD = (s: string) => (s ? new Date(`${s}T00:00:00`) : null);


const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th", { style: "currency", currency: "THB" }).format(n);

const Dashboard = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Apply filters
  const filteredExpenses = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return expenses.filter((exp) => {
      const expDate = new Date((exp as any).date);
      const cat = (exp as any).category;
      const catId: string | undefined =
        typeof cat === "string" ? cat : cat?._id;

      if (selectedCategory !== "all" && catId !== selectedCategory)
        return false;
      if (start && expDate < start) return false;

      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (expDate > endOfDay) return false;
      }
      return true;
    });
  }, [expenses, selectedCategory, startDate, endDate]);

  // Totals from filtered data
  const totalsByCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const exp of filteredExpenses) {
      const cat = (exp as any).category;
      const catId: string | undefined =
        typeof cat === "string" ? cat : cat?._id;
      const catName: string =
        typeof cat === "string"
          ? categories.find((c) => c._id === cat)?.name ?? "Unknown"
          : cat?.name ?? "Unknown";
      if (!catId) continue;

      const prev = map.get(catId);
      if (prev) prev.total += (exp as any).amount;
      else map.set(catId, { name: catName, total: (exp as any).amount });
    }
    return Array.from(map.values());
  }, [filteredExpenses, categories]);

  const grandTotal = useMemo(
    () => totalsByCategory.reduce((sum, r) => sum + r.total, 0),
    [totalsByCategory]
  );

  const chartLabels = useMemo(() => {
    const set = new Set<string>();
    for (const exp of filteredExpenses) {
      const day = new Date((exp as any).date).toISOString().slice(0, 10); // YYYY-MM-DD
      set.add(day);
    }
    return Array.from(set).sort();
  }, [filteredExpenses]);

  const catList = useMemo(() => {
    const map = new Map<string, string>(); // id -> name
    for (const exp of filteredExpenses) {
      const cat = (exp as any).category;
      const id: string | undefined = typeof cat === "string" ? cat : cat?._id;
      const name: string =
        typeof cat === "string"
          ? categories.find((c) => c._id === cat)?.name ?? "Unknown"
          : cat?.name ?? "Unknown";
      if (id) map.set(id, name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [filteredExpenses, categories]);

  const palette = [
    "#4e79a7",
    "#59a14f",
    "#e15759",
    "#f28e2b",
    "#76b7b2",
    "#edc949",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ab",
  ];

  const chartDatasets = useMemo(() => {
    return catList.map((c, idx) => ({
      label: c.name,
      data: chartLabels.map((day) =>
        filteredExpenses.reduce((sum, exp) => {
          const eDay = new Date((exp as any).date).toISOString().slice(0, 10);
          const cat = (exp as any).category;
          const id: string | undefined =
            typeof cat === "string" ? cat : cat?._id;
          return eDay === day && id === c.id ? sum + (exp as any).amount : sum;
        }, 0)
      ),
      backgroundColor: palette[idx % palette.length],
      stack: "total",
    }));
  }, [catList, chartLabels, filteredExpenses]);

  const barData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: chartDatasets,
    }),
    [chartLabels, chartDatasets]
  );

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd} / ${mm} / ${yyyy}`;
  };

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          callbacks: {
            title: (items: any[]) =>
              items?.length ? formatDateLabel(items[0].label as string) : "",
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: "Date" },
          ticks: {
            callback: (_: any, index: number) =>
              formatDateLabel(chartLabels[index]),
          },
        },
        y: { stacked: true, title: { display: true, text: "Amount (THB)" } },
      },
    }),
    [chartLabels]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get<Category[]>("/categories"),
      client.get<Expense[]>("/expenses"),
    ])
      .then(([catRes, expRes]) => {
        setCategories(catRes.data);
        setExpenses(expRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Categories list (unchanged) */}
      <div>
        <h2 className="text-xl font-bold mb-2">Categories</h2>
        <p>Total categories: {categories.length}</p>
        <ul>
          {categories.map((category) => (
            <li key={category._id}>{category.name}</li>
          ))}
        </ul>
      </div>

      {/* filter by date & categories */}
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Filters</h2>
        <div className="d-flex gap-3 align-items-end flex-wrap">
          <div>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <DatePicker
              wrapperClassName="d-block w-100"
                selected={parseYMD(startDate)}
                onChange={(d: Date | null) => setStartDate(d ? toYMD(d) : "")}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/mm/yyyy"
                className="form-control"
                isClearable
            />
            </div>
            <div>
            <label className="form-label">To</label>
            <DatePicker
                wrapperClassName="d-block w-100"
                selected={parseYMD(endDate)}
                onChange={(d: Date | null) => setEndDate(d ? toYMD(d) : "")}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/mm/yyyy"
                className="form-control"
                isClearable
            />
            </div>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              setSelectedCategory("all");
              setStartDate("");
              setEndDate("");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Totals by category */}
      <div className="mt-6">
        <p>Total expenses: {totalsByCategory.length}</p>

        {/*chart here */}
        <div className="my-3" style={{ height: 280 }}>
          <Bar data={barData} options={barOptions} />
        </div>

        {totalsByCategory.length === 0 ? (
          <div className="text-muted">No expenses found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {totalsByCategory.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Grand Total</th>
                  <th>{formatCurrency(grandTotal)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
