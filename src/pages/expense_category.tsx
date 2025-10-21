import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useEffect, useRef } from "react";
import type { Category, Expense } from "../types/type";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const ymdToDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : null);

const formatDDMMYYYY = (d: string | Date) => {
  const ymd =
    typeof d === "string"
      ? d.includes("T")
        ? d.slice(0, 10)
        : d // ISO -> YMD
      : toYMD(d);
  const [y, m, day] = ymd.split("-");
  return `${day}/${m}/${y}`;
};

const Expense_category = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<"categories" | "expenses">(
    "expenses"
  );

  type EditForm = {
    _id: string;
    name: string;
    description: string;
    amount: string; // keep as string in input, convert on save
    dateYMD: string;
    categoryId: string;
  };

  type EditCategoryForm = {
    _id: string;
    name: string;
  };

  type NewExpenseForm = {
    name: string;
    description: string;
    amount: string; // keep as string in input, convert on save
    dateYMD: string;
    categoryId: string;
  };

  type NewCategoryForm = {
    name: string;
  };

  const [addForm, setAddForm] = useState<NewExpenseForm>({
    name: "",
    description: "",
    amount: "",
    dateYMD: "",
    categoryId: "",
  });
  const [addCategoryForm, setAddCategoryForm] = useState<NewCategoryForm>({
    name: "",
  });

  const handleAddChange = <K extends keyof NewExpenseForm>(
    key: K,
    val: NewExpenseForm[K]
  ) => {
    setAddForm((prev) => ({ ...prev, [key]: val }));
  };
  const handleAddCategoryChange = <K extends keyof NewCategoryForm>(
    key: K,
    val: NewCategoryForm[K]
  ) => {
    setAddCategoryForm((prev) => ({ ...prev, [key]: val }));
  };

  const closeAddExpenseModal = () => {
    const inst = (window as any).bootstrap?.Modal.getInstance(
      addExpenseModalRef.current!
    );
    inst?.hide();
  };
  const closeAddCategoryModal = () => {
    const inst = (window as any).bootstrap?.Modal.getInstance(
      addCategoryModalRef.current!
    );
    inst?.hide();
  };

  const handleCreateExpense = async () => {
    const amt = Number(addForm.amount);
    if (
      !addForm.name ||
      Number.isNaN(amt) ||
      !addForm.dateYMD ||
      !addForm.categoryId
    ) {
      alert("Please fill name, amount, date, and category.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: addForm.name,
        description: addForm.description || "",
        amount: amt,
        date: addForm.dateYMD, // send Y-M-D to API
        category: addForm.categoryId,
      };
      const { data: created } = await client.post<Expense>(
        "/expenses",
        payload
      );

      const ensured: Expense = {
        ...created,
        category:
          (created as any).category &&
          typeof (created as any).category === "object"
            ? (created as any).category
            : (categories.find(
                (c) => c._id === addForm.categoryId
              ) as Category),
      };

      setExpenses((prev) => [ensured, ...prev]);
      closeAddExpenseModal();
      setAddForm({
        name: "",
        description: "",
        amount: "",
        dateYMD: "",
        categoryId: "",
      });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!addCategoryForm.name.trim()) {
      alert("Category name is required");
      return;
    }
    try {
      setSaving(true);
      const { data: created } = await client.post<Category>("/categories", {
        name: addCategoryForm.name.trim(),
      });
      setCategories((prev) => [created, ...prev]);
      closeAddCategoryModal();
      setAddCategoryForm({ name: "" });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const addExpenseModalRef = useRef<HTMLDivElement>(null);
  const addCategoryModalRef = useRef<HTMLDivElement>(null);

  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editCategoryForm, setEditCategoryForm] =
    useState<EditCategoryForm | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const categoryModalRef = useRef<HTMLDivElement>(null);

  const openEdit = (exp: Expense) => {
    setEditForm({
      _id: exp._id,
      name: exp.name,
      description: exp.description ?? "",
      amount: String(exp.amount),
      dateYMD: exp.date ? exp.date.slice(0, 10) : "", // inline isoToYMD
      categoryId: exp.category?._id ?? "",
    });
  };

  const openEditCategory = (cat: Category) => {
    setEditCategoryForm({
      _id: cat._id,
      name: cat.name,
    });
  };

  const handleEditChange = <K extends keyof EditForm>(
    key: K,
    val: EditForm[K]
  ) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const handleEditCategoryChange = <K extends keyof EditCategoryForm>(
    key: K,
    val: EditCategoryForm[K]
  ) => {
    setEditCategoryForm((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const closeModal = () => {
    const inst = (window as any).bootstrap?.Modal.getInstance(
      modalRef.current!
    );
    inst?.hide();
  };

  const closeCategoryModal = () => {
    const inst = (window as any).bootstrap?.Modal.getInstance(
      categoryModalRef.current!
    );
    inst?.hide();
  };

  const handleSave = async () => {
    if (!editForm) return;
    const amt = Number(editForm.amount);
    if (Number.isNaN(amt)) {
      alert("Amount must be a number");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description || "",
        amount: amt,
        date: editForm.dateYMD,
        category: editForm.categoryId,
      };
      const { data: updated } = await client.put<Expense>(
        `/expenses/${editForm._id}`,
        payload
      );

      // If API returns populated category, great. If not, attach from categories:
      const ensured: Expense = {
        ...updated,
        category:
          (updated as any).category &&
          typeof (updated as any).category === "object"
            ? (updated as any).category
            : (categories.find(
                (c) => c._id === editForm.categoryId
              ) as Category),
      };

      setExpenses((prev) =>
        prev.map((e) => (e._id === ensured._id ? ensured : e))
      );
      closeModal();
      setEditForm(null);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!editCategoryForm) return;
    setSaving(true);
    try {
      const { data: updated } = await client.put<Category>(
        `/categories/${editCategoryForm._id}`,
        { name: editCategoryForm.name }
      );
      setCategories((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
      closeCategoryModal();
      setEditCategoryForm(null);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

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

  const getCategoryName = (
    cat: Expense["category"],
    all: Category[]
  ): string => {
    if (typeof cat === "string") {
      const m =
        all.find((c) => String((c as any)._id ?? (c as any).id) === String(cat))
          ?.name ?? "Unknown";
      return m;
    }
    return cat?.name ?? "Unknown";
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th", { style: "currency", currency: "THB" }).format(
      n
    );

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      setDeletingId(id);
      await client.delete(`/expenses/${id}`);
      setExpenses((prev) =>
        prev.filter((e) => String((e as any)._id ?? e._id) !== id)
      );
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      setDeletingId(id);
      await client.delete(`/categories/${id}`);
      setCategories((prev) =>
        prev.filter((c) => String((c as any)._id ?? (c as any).id) !== id)
      );
    } catch (error: any) {
      alert(error?.response?.data?.message ?? error.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="btn-group mb-3">
        <button
          className={`btn btn-${
            selectedTab === "expenses" ? "primary" : "outline-primary"
          }`}
          onClick={() => setSelectedTab("expenses")}
        >
          Expenses
        </button>
        <button
          className={`btn btn-${
            selectedTab === "categories" ? "primary" : "outline-primary"
          }`}
          onClick={() => setSelectedTab("categories")}
        >
          Categories
        </button>
      </div>

      {selectedTab === "expenses" ? (
        <div className="table-responsive">
          <div className="d-flex justify-content-end mb-3">
            <button
              className="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#addExpenseModal"
            >
              Add Expense
            </button>
          </div>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => (
                <tr key={String((exp as any)._id ?? exp._id ?? idx)}>
                  <td>{idx + 1}</td>
                  <td>{exp.name}</td>
                  <td>{exp.description || "-"}</td>
                  <td>{formatCurrency(exp.amount)}</td>
                  <td>{getCategoryName(exp.category, categories)}</td>
                  <td>{formatDDMMYYYY(exp.date)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-warning"
                      data-bs-toggle="modal"
                      data-bs-target="#editExpenseModal"
                      onClick={() => openEdit(exp)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger ms-2"
                      onClick={() => handleDeleteExpense(exp._id)}
                      disabled={!exp._id || deletingId === exp._id}
                    >
                      {deletingId === exp._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-responsive">
          <div className="d-flex justify-content-end mb-3">
            <button
              className="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#addCategoryModal"
            >
              Add Category
            </button>
          </div>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={String((cat as any)._id ?? (cat as any).id)}>
                  <td>{idx + 1}</td>
                  <td>{cat.name}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-warning"
                      data-bs-toggle="modal"
                      data-bs-target="#editCategoryModal"
                      onClick={() => openEditCategory(cat)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger ms-2"
                      onClick={() => handleDeleteCategory(cat._id)}
                      disabled={!cat._id || deletingId === cat._id}
                    >
                      {deletingId === cat._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <div
        className="modal fade"
        id="editExpenseModal"
        tabIndex={-1}
        aria-hidden="true"
        ref={modalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Expense</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              {!editForm ? (
                <div>Loading…</div>
              ) : (
                <form>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) =>
                        handleEditChange("description", e.target.value)
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={editForm.amount}
                      onChange={(e) =>
                        handleEditChange("amount", e.target.value)
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <DatePicker
                      wrapperClassName="d-block w-100"
                      selected={ymdToDate(editForm.dateYMD)}
                      onChange={(d: Date | null) =>
                        handleEditChange("dateYMD", d ? toYMD(d) : "")
                      }
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={editForm.categoryId}
                      onChange={(e) =>
                        handleEditChange("categoryId", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !editForm}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      <div
        className="modal fade"
        id="editCategoryModal"
        tabIndex={-1}
        aria-hidden="true"
        ref={categoryModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Category</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              {!editCategoryForm ? (
                <div>Loading…</div>
              ) : (
                <form>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={editCategoryForm.name}
                      onChange={(e) =>
                        handleEditCategoryChange("name", e.target.value)
                      }
                    />
                  </div>
                </form>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCategory}
                disabled={saving || !editCategoryForm}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      <div
        className="modal fade"
        id="addCategoryModal"
        tabIndex={-1}
        aria-hidden="true"
        ref={addCategoryModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Category</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={addCategoryForm.name}
                    onChange={(e) =>
                      handleAddCategoryChange("name", e.target.value)
                    }
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateCategory}
                disabled={saving || !addCategoryForm.name.trim()}
              >
                {saving ? "Saving..." : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <div
        className="modal fade"
        id="addExpenseModal"
        tabIndex={-1}
        aria-hidden="true"
        ref={addExpenseModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Expense</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={addForm.name}
                    onChange={(e) => handleAddChange("name", e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={addForm.description}
                    onChange={(e) =>
                      handleAddChange("description", e.target.value)
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={addForm.amount}
                    onChange={(e) => handleAddChange("amount", e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <DatePicker
                    wrapperClassName="d-block w-100"
                    selected={ymdToDate(addForm.dateYMD)}
                    onChange={(d: Date | null) =>
                      handleAddChange("dateYMD", d ? toYMD(d) : "")
                    }
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/yyyy"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={addForm.categoryId}
                    onChange={(e) =>
                      handleAddChange("categoryId", e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateExpense}
                disabled={
                  saving ||
                  !addForm.name ||
                  !addForm.amount ||
                  !addForm.dateYMD ||
                  !addForm.categoryId
                }
              >
                {saving ? "Saving..." : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Expense_category;
