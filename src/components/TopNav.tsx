import { NavLink } from "react-router-dom";

export default function TopNav() {
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/">PennyCoach</a>
        <nav>
          <NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Overview</NavLink>
          <NavLink to="/budget" className={({isActive}) => isActive ? "active" : ""}>Budget</NavLink>
          <NavLink to="/subs-tx" className={({isActive}) => isActive ? "active" : ""}>Subscriptions &amp; Transactions</NavLink>
        </nav>
      </div>
    </header>
  );
}
