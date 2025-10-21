export interface Category {
  _id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Expense {
  _id: string;
  name: string;
  description?: string;
  amount: number;
  date: string;
  category: Category;
  createdAt?: string;
  updatedAt?: string;
}