import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar navbar-dark bg-primary shadow sticky-top">
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h1">Expense Tracker</span>
        <div className="d-flex gap-3">
          <Link className="text-white text-decoration-none" to="/dashboard">
            Dashboard
          </Link>
          <Link className="text-white text-decoration-none" to="/expenses">
            Expenses & Categories
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;