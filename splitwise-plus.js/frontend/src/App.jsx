import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const ROLE_META = {
  user: { label: 'Normal user', accent: 'User' },
  group_admin: { label: 'Group admin', accent: 'Admin' },
  platform_admin: { label: 'Platform admin', accent: 'Platform' },
};

const STORAGE_KEYS = {
  users: 'splitwise-plus.users',
  session: 'splitwise-plus.session',
  groups: 'splitwise-plus.groups',
  expenses: 'splitwise-plus.expenses',
};

const seededUsers = [
  { id: 'u-001', name: 'Aarav Sharma', email: 'admin@splitwiseplus.app', password: 'admin1234', role: 'group_admin' },
  { id: 'u-002', name: 'Priya Nair', email: 'platform@splitwiseplus.app', password: 'platform1234', role: 'platform_admin' },
  { id: 'u-003', name: 'Meera Iyer', email: 'user@splitwiseplus.app', password: 'user1234', role: 'user' },
];

const seededGroups = [
  { id: 'g-001', name: 'College Friends', type: 'social', description: 'Weekend plans and shared semester expenses', adminId: 'u-001', members: ['Aarav Sharma', 'Meera Iyer', 'Rohan Verma', 'Sana Khan', 'Ishaan Patel'], permissions: ['Add expenses', 'Approve splits', 'Manage members'], totalSpent: '₹18,420', balance: '+₹2,740', status: 'Healthy' },
  { id: 'g-002', name: 'Roommates', type: 'home', description: 'Rent, groceries, and utility management', adminId: 'u-001', members: ['Aarav Sharma', 'Priya Nair', 'Kabir Seth', 'Naina Rao'], permissions: ['View expenses', 'Manage details', 'Settle debts'], totalSpent: '₹42,100', balance: '-₹1,260', status: 'On track' },
  { id: 'g-003', name: 'Goa Trip 2026', type: 'travel', description: 'Adventure trip planning and travel costs', adminId: 'u-001', members: ['Aarav Sharma', 'Meera Iyer', 'Tanya Das', 'Aditya Rao', 'Riya Shah', 'Yash Menon'], permissions: ['Add expenses', 'Set permissions', 'View reports'], totalSpent: '₹68,940', balance: '+₹5,410', status: 'Planning' },
  { id: 'g-004', name: 'Family', type: 'family', description: 'Events, gifting, and household bills', adminId: 'u-001', members: ['Aarav Sharma', 'Aditi Sharma', 'Nikhil Sharma', 'Kavya Sharma'], permissions: ['Add expenses', 'Manage members', 'Share summaries'], totalSpent: '₹32,640', balance: '+₹820', status: 'Settled' },
  { id: 'g-005', name: 'Office Team', type: 'work', description: 'Team lunches, client outings, and bonding', adminId: 'u-001', members: ['Aarav Sharma', 'Neha Malik', 'Harsh Singh', 'Ritika Menon', 'Dev Kapoor'], permissions: ['View expenses', 'Assign permissions', 'Create budget'], totalSpent: '₹24,750', balance: '-₹930', status: 'Active' },
];

const initialExpenses = [
  { id: 'e-001', title: 'Rent', group: 'Roommates', amount: 12600, payer: 'Aarav Sharma', due: 3150 },
  { id: 'e-002', title: 'Groceries', group: 'Family', amount: 2480, payer: 'Nikhil Sharma', due: 620 },
  { id: 'e-003', title: 'Hotel booking', group: 'Goa Trip 2026', amount: 16300, payer: 'Priya Nair', due: 2715 },
  { id: 'e-004', title: 'Team lunch', group: 'Office Team', amount: 1440, payer: 'Ritika Menon', due: 360 },
];

const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const parseCurrency = (amount) => Number(String(amount).replace(/[^\d.]/g, '')) || 0;

const AuthContext = createContext(null);

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);

  if (!value) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function persistSession(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user }));
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.session);
  }
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(STORAGE_KEYS.session);
    if (!saved) return null;
    try {
      return JSON.parse(saved).user ?? null;
    } catch {
      return null;
    }
  });

  const value = useMemo(() => ({
    user,
    login: async ({ email, password }) => {
      const users = readStorage(STORAGE_KEYS.users, seededUsers);
      const match = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password);

      if (!match) {
        throw new Error('Invalid email or password. Try one of the demo accounts.');
      }

      const safeUser = {
        id: match.id,
        name: match.name,
        email: match.email,
        role: match.role,
      };

      persistSession(safeUser);
      setUser(safeUser);
      return safeUser;
    },
    register: async ({ name, email, password, role = 'user' }) => {
      const users = readStorage(STORAGE_KEYS.users, seededUsers);
      const normalizedEmail = email.trim().toLowerCase();

      if (users.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
        throw new Error('An account with this email already exists.');
      }

      const nextUser = {
        id: `u-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
      };

      users.push(nextUser);
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));

      const safeUser = {
        id: nextUser.id,
        name: nextUser.name,
        email: nextUser.email,
        role: nextUser.role,
      };

      persistSession(safeUser);
      setUser(safeUser);
      return safeUser;
    },
    logout: () => {
      persistSession(null);
      setUser(null);
    },
  }), [user]);

  useEffect(() => {
    if (!user) {
      persistSession(null);
      return;
    }
    persistSession(user);
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Icon({ name, size = 18, className = '' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    sparkle: <><path d="m12 3 1.9 5.9L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.1L12 3Z" /><path d="m19 14 1 2.2L22.2 18 20 19l-1 2.2L18 19l-2.2-1 2.2-1L19 14Z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="3" /><path d="M3 10h18" /><path d="M16 15h2" /><path d="M7 6V4a2 2 0 0 1 2-2h9" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.8" /><path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.3 3.3-.7" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.6-3 5-4.5 8-4.5s6.4 1.5 8 4.5" /></>,
  };

  return (
    <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? null}
    </svg>
  );
}

function Brand({ light = false }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="Splitwise Plus home">
      <span className="brand-mark"><Icon name="sparkle" size={18} /></span>
      <span>splitwise<span className="brand-plus">++</span></span>
    </Link>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="landing-page">
      <header className="site-header">
        <div className="nav-shell">
          <Brand />
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
          <nav className={`nav-links${menuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
            <Link to="/how-it-works">How it works</Link>
            <Link to="/features">Features</Link>
            <Link to="/about">About</Link>
            <Link className="nav-login" to="/login">Log in</Link>
            <Link className="button button-dark button-nav" to="/signup">Get started <Icon name="arrow" size={16} /></Link>
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Shared spending, made simple</div>
            <h1>Make shared<br />expenses feel<br /><span>effortless.</span></h1>
            <p className="hero-description">
              Keep every trip, dinner, and household bill in one place. Splitwise++ tracks who paid, what you owe, and when you’re all settled.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/signup">Get started for free <Icon name="arrow" size={18} /></Link>
              <Link className="text-link" to="/how-it-works">See how it works <Icon name="chevron" size={16} /></Link>
            </div>
            <div className="social-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span className="proof-avatar proof-one">A</span>
                <span className="proof-avatar proof-two">N</span>
                <span className="proof-avatar proof-three">R</span>
                <span className="proof-avatar proof-four">+</span>
              </div>
              <div>
                <strong>Less settling up. More living.</strong>
                <span>For the people you do life with</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Preview of Splitwise++ expense tracking on mobile">
            <div className="hero-phone-glow" />
            <div className="hero-floating-stat"><span className="stat-check"><Icon name="check" size={15} /></span><span><strong>All settled</strong><small>Good times, shared fairly</small></span></div>
            <div className="hero-phone phone-back" aria-hidden="true">
              <div className="phone-screen">
                <div className="phone-status"><span>9:41</span><span>● ● ▰</span></div>
                <div className="phone-appbar"><span className="phone-greeting">YOUR GROUPS</span><span className="phone-avatar">A</span></div>
                <h3>Weekend in Goa</h3>
                <p className="phone-subtitle">6 friends · 12 expenses</p>
                <div className="phone-total"><small>You are owed</small><strong>₹2,563</strong><span>↑ Looking good this month</span></div>
                <div className="phone-section-title">Recent activity <span>See all</span></div>
                <div className="phone-transaction"><i className="transaction-icon icon-hotel">⌂</i><span><b>Beach house</b><small>Paid by you</small></span><strong>+₹1,440</strong></div>
                <div className="phone-transaction"><i className="transaction-icon icon-food">✦</i><span><b>Friday dinner</b><small>Paid by Nisha</small></span><strong className="owed-amount">−₹630</strong></div>
                <div className="phone-transaction"><i className="transaction-icon icon-taxi">↗</i><span><b>Airport cab</b><small>Paid by Sam</small></span><strong className="owed-amount">−₹285</strong></div>
                <div className="phone-tabbar"><span className="tab-active">⌂</span><span>◷</span><span>◎</span><span>☻</span></div>
              </div>
            </div>
            <div className="hero-phone phone-front" aria-hidden="true">
              <div className="phone-screen">
                <div className="phone-status"><span>9:41</span><span>● ● ▰</span></div>
                <div className="phone-appbar"><span className="phone-back-arrow">‹</span><span className="phone-greeting">EXPENSE DETAILS</span><span className="phone-more">•••</span></div>
                <div className="expense-illustration"><span>↗</span></div>
                <p className="expense-category">TRIP · GOA</p>
                <h3>Sunset dinner</h3>
                <p className="expense-date">Today, 8:42 PM</p>
                <div className="expense-total"><small>Total bill</small><strong>₹3,780.00</strong></div>
                <div className="phone-section-title">Split between <span>3 people</span></div>
                <div className="phone-person"><span className="person-avatar person-a">A</span><span><b>You</b><small>Paid full amount</small></span><strong>₹1,260</strong></div>
                <div className="phone-person"><span className="person-avatar person-b">N</span><span><b>Nisha</b><small>Owes you</small></span><strong>₹1,260</strong></div>
                <div className="phone-person"><span className="person-avatar person-c">S</span><span><b>Sam</b><small>Owes you</small></span><strong>₹1,260</strong></div>
                <button type="button" className="phone-settle">Settle up <Icon name="arrow" size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section section-shell">
        <div className="feature-intro">
          <span className="section-tag">WHY PEOPLE CHOOSE US</span>
          <h2>One clean place for every shared life.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon"><Icon name="users" size={20} /></div><h3>Group-first roles</h3><p>Assign member access, set group admin control, and keep each shared circle organized.</p></article>
          <article className="feature-card"><div className="feature-icon"><Icon name="wallet" size={20} /></div><h3>Clear expense tracking</h3><p>Capture who paid, how it was split, and how much each person owes in real time.</p></article>
          <article className="feature-card"><div className="feature-icon"><Icon name="shield" size={20} /></div><h3>Admin controls</h3><p>Group admins can manage membership, permissions, and expense visibility without friction.</p></article>
        </div>
      </section>

      <section className="section-shell cta-panel">
        <div className="cta-content">
          <span className="cta-eyebrow">Built for every day</span>
          <h2>Manage college friends, roommates, family, and work teams in one place.</h2>
        </div>
        <Link className="button button-primary cta-button" to="/signup">Create your account <Icon name="arrow" size={17} /></Link>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand"><Brand light /> <p>Good times, shared fairly.<br />That’s the whole idea.</p></div>
          <div className="footer-links"><Link to="/how-it-works">How it works</Link><Link to="/features">Features</Link><Link to="/about">About</Link><a href="mailto:hello@splitwiseplus.app">Get in touch</a></div>
          <Link className="footer-top" to="/">Back to home ↑</Link>
        </div>
        <div className="footer-bottom"><span>© 2026 Splitwise++. Made for sharing.</span><span>Spend together. Stay together.</span></div>
      </footer>
    </main>
  );
}

const routeContent = {
  '/how-it-works': {
    tag: 'THREE EASY STEPS',
    title: <>Shared expenses,<br /><span>without the hassle.</span></>,
    description: 'Create a group, add expenses, and track balances as your team moves through life together.',
    cards: [
      ['01', 'Create a group', 'Set up a space for your trip, home, or teammates.'],
      ['02', 'Add expenses', 'Track payments with equal, custom, or percentage splits.'],
      ['03', 'Settle up', 'See all balances clearly and move faster toward a clean close-out.'],
    ],
  },
  '/features': {
    tag: 'BUILT FOR SHARING',
    title: <>The details are handled.<br /><span>Enjoy the moment.</span></>,
    description: 'A little less spreadsheet, a lot more confidence. Explore the tools that make shared spending easier.',
    cards: [
      ['01', 'Flexible splits', 'Divide expenses equally or by exact amounts and percentages.'],
      ['02', 'Clear balances', 'See what you owe and what you are owed, without confusion.'],
      ['03', 'Role-based access', 'Keep group admin and platform admin permissions clear and organized.'],
    ],
  },
  '/about': {
    tag: 'OUR IDEA',
    title: <>Good times should be<br /><span>easy to share.</span></>,
    description: 'Splitwise++ gives friends, families, roommates, and work teams one place to manage expenses fairly.',
    cards: [
      ['01', 'Keep it fair', 'Everyone can view the expense and understand their share.'],
      ['02', 'Make it simple', 'One place for groups, bills, and balances.'],
      ['03', 'Stay together', 'Spend less time chasing numbers and more time making plans.'],
    ],
  },
};

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register } = useAuth();
  const [formError, setFormError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = location.pathname === '/login';
  const isSignup = location.pathname === '/signup';
  const isForgot = location.pathname === '/forgot-password';

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());

    try {
      if (isForgot) {
        setFormError('Password reset instructions would be sent to this address.');
        return;
      }

      if (isLogin) {
        await login({ email: values.email, password: values.password });
      } else {
        await register({ name: values.name, email: values.email, password: values.password, role: values.role || 'user' });
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const text = routeContent[location.pathname];

  return (
    <main className="route-page">
      <header className="site-header">
        <div className="nav-shell">
          <Brand />
          <nav className="nav-links route-nav" aria-label="Main navigation">
            <Link to="/">Home</Link>
            <Link to="/features">Features</Link>
            <Link to={isLogin ? '/signup' : '/login'}>{isLogin ? 'Create account' : 'Log in'}</Link>
            <Link className="button button-dark button-nav" to="/signup">Get started <Icon name="arrow" size={16} /></Link>
          </nav>
        </div>
      </header>

      {text && (
        <section className="route-content section-shell">
          <span className="section-tag">{text.tag}</span>
          <h1>{text.title}</h1>
          <p className="route-description">{text.description}</p>
          <div className="route-cards">
            {text.cards.map(([number, title, description]) => (
              <article className="step-card" key={number}>
                <span className="step-number">{number}</span>
                <div className="step-icon step-icon-green"><Icon name={number === '01' ? 'users' : number === '02' ? 'plus' : 'check'} size={22} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <Link className="button button-primary route-cta" to="/signup">Start splitting free <Icon name="arrow" size={17} /></Link>
        </section>
      )}

      <section className="auth-route">
        <div className="auth-card">
          <span className="section-tag">{isForgot ? 'ACCOUNT RECOVERY' : isLogin ? 'WELCOME BACK' : 'YOUR PEOPLE ARE WAITING'}</span>
          <h1>{isForgot ? 'Forgot your password?' : isLogin ? 'Good to see you.' : <>Make room for<br /><span>more good times.</span></>}</h1>
          <p>{isForgot ? 'Enter your email address and we will help you reset access to your account.' : isLogin ? 'Log in to see how your groups are doing.' : 'Create your Splitwise++ account to start sharing fairly.'}</p>

          <form onSubmit={handleSubmit}>
            {!isLogin && !isForgot && (
              <>
                <label htmlFor="display-name">Your name<input id="display-name" name="name" autoComplete="name" placeholder="e.g. Jamie Lee" required /></label>
                <label htmlFor="role-select">Role<select id="role-select" name="role" defaultValue="user">
                  <option value="user">Normal user</option>
                  <option value="group_admin">Group admin</option>
                  <option value="platform_admin">Platform admin</option>
                </select></label>
              </>
            )}

            <label htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>

            {!isForgot && (
              <div className="auth-password-group">
                <label htmlFor="password">Password</label>
                <span className="password-field">
                  <input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} required />
                  <button className="password-toggle" type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((value) => !value)}>
                    <Icon name={passwordVisible ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </span>
              </div>
            )}

            {isLogin && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}
            {formError && <p className="auth-error" role="alert">{formError}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || isForgot}>
              {isSubmitting ? 'Please wait…' : isForgot ? 'Send reset link' : isLogin ? 'Log in' : 'Create account'}
              {!isSubmitting && <Icon name="arrow" size={17} />}
            </button>
          </form>

          <div className="auth-switch">
            {isForgot ? 'Remembered your password?' : isLogin ? 'New to Splitwise++?' : 'Already have an account?'}
            <Link to={isForgot ? '/login' : isLogin ? '/signup' : '/login'}>
              {isForgot ? 'Back to login' : isLogin ? 'Create account' : 'Log in'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState(() => readStorage(STORAGE_KEYS.groups, seededGroups));
  const [selectedId, setSelectedId] = useState(() => readStorage(STORAGE_KEYS.groups, seededGroups)[0]?.id ?? '');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [memberName, setMemberName] = useState('');
  const [permissionName, setPermissionName] = useState('');
  const [expenses, setExpenses] = useState(() => readStorage(STORAGE_KEYS.expenses, initialExpenses));
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayer, setExpensePayer] = useState(user?.name ?? '');
  const [reportOpen, setReportOpen] = useState(false);

  const groupList = user?.role === 'platform_admin' ? groups : groups.filter((group) => group.adminId === user?.id || group.members.includes(user?.name));
  const selectedGroup = groupList.find((group) => group.id === selectedId) ?? groupList[0] ?? null;
  const selectedExpenses = selectedGroup ? expenses.filter((expense) => expense.group === selectedGroup.name) : [];
  const selectedPayer = selectedGroup?.members.includes(expensePayer) ? expensePayer : selectedGroup?.members[0] ?? user?.name ?? '';
  const reportTotal = selectedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  useEffect(() => {
    if (selectedId && !groupList.some((group) => group.id === selectedId)) {
      setSelectedId(groupList[0]?.id ?? '');
    }
  }, [groupList, selectedId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    setReportOpen(false);
  }, [selectedGroup?.id]);

  const addExpense = (event) => {
    event.preventDefault();
    if (!selectedGroup || !expenseTitle.trim()) return;

    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const newExpense = {
      id: `e-${Date.now()}`,
      title: expenseTitle.trim(),
      group: selectedGroup.name,
      amount,
      payer: selectedPayer,
      due: amount / Math.max(selectedGroup.members.length, 1),
    };

    setExpenses((current) => [newExpense, ...current]);
    setGroups((current) => current.map((group) => (
      group.id === selectedGroup.id
        ? { ...group, totalSpent: formatCurrency(parseCurrency(group.totalSpent) + amount) }
        : group
    )));
    setExpenseTitle('');
    setExpenseAmount('');
    setExpensePayer(selectedPayer);
  };

  const addGroup = (event) => {
    event.preventDefault();
    if (!groupName.trim()) return;

    const newGroup = {
      id: `g-${Date.now()}`,
      name: groupName.trim(),
      type: 'custom',
      description: groupDescription.trim() || 'New shared group',
      adminId: user.id,
      members: [user.name, ...(groupName.trim().toLowerCase().includes('family') ? ['Aditi Sharma'] : [])],
      permissions: ['Add expenses', 'View expenses', 'Manage details'],
      totalSpent: '₹0',
      balance: '₹0',
      status: 'New',
    };

    const updated = [newGroup, ...groups];
    setGroups(updated);
    setSelectedId(newGroup.id);
    setGroupName('');
    setGroupDescription('');
  };

  const addMember = () => {
    if (!memberName.trim() || !selectedGroup) return;

    const nextGroups = groups.map((group) => {
      if (group.id !== selectedGroup.id) return group;
      if (group.members.includes(memberName.trim())) return group;
      return { ...group, members: [...group.members, memberName.trim()] };
    });

    setGroups(nextGroups);
    setMemberName('');
  };

  const removeMember = (member) => {
    if (!selectedGroup) return;

    const nextGroups = groups.map((group) => {
      if (group.id !== selectedGroup.id) return group;
      return { ...group, members: group.members.filter((entry) => entry !== member) };
    });

    setGroups(nextGroups);
  };

  const addPermission = () => {
    if (!permissionName.trim() || !selectedGroup) return;

    const nextGroups = groups.map((group) => {
      if (group.id !== selectedGroup.id) return group;
      if (group.permissions.includes(permissionName.trim())) return group;
      return { ...group, permissions: [...group.permissions, permissionName.trim()] };
    });

    setGroups(nextGroups);
    setPermissionName('');
  };

  const stats = {
    totalGroups: groupList.length,
    totalMembers: groupList.reduce((count, group) => count + group.members.length, 0),
    totalSpent: groupList.reduce((sum, group) => sum + parseCurrency(group.totalSpent), 0),
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <main className="dashboard-page">
      <header className="dash-header">
        <div className="dash-header-inner">
          <div>
            <p className="section-tag dashboard-tag">WELCOME BACK</p>
            <h1>{user.name}</h1>
          </div>
          <div className="header-actions">
            <span className="role-pill">{ROLE_META[user.role]?.label}</span>
            <button type="button" className="button button-dark auth-button" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>

      <section className="dashboard-shell">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total groups</span>
            <strong>{stats.totalGroups}</strong>
            <small>Across your workspace</small>
          </div>
          <div className="stat-card">
            <span className="stat-label">Members</span>
            <strong>{stats.totalMembers}</strong>
            <small>Active group members</small>
          </div>
          <div className="stat-card">
            <span className="stat-label">Expense value</span>
            <strong>{formatCurrency(stats.totalSpent)}</strong>
            <small>Shared spending tracked</small>
          </div>
        </div>

        <div className="dashboard-layout">
          <aside className="panel">
            <div className="panel-header">
              <h3>Group list</h3>
              <span>{groupList.length} groups</span>
            </div>

            <form className="group-form" onSubmit={addGroup}>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
                aria-label="Group name"
                maxLength={60}
                required
              />
              <textarea
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="Add a short description"
                aria-label="Group description"
                rows="2"
                maxLength={240}
              />
              <button type="submit" className="button button-primary">Create group</button>
            </form>

            <div className="group-list">
              {groupList.map((group) => (
                <button type="button" key={group.id} className={`group-card${selectedGroup?.id === group.id ? ' active' : ''}`} onClick={() => setSelectedId(group.id)}>
                  <div className="group-card-header">
                    <strong>{group.name}</strong>
                    <span className="status-badge">{group.status}</span>
                  </div>
                  <small>{group.members.length} members · {group.type}</small>
                  <div className="mini-balance">
                    <span>Total spent</span>
                    <strong>{group.totalSpent}</strong>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="panel panel-large">
            {selectedGroup ? (
              <>
                <div className="panel-header detail-header">
                  <div>
                    <p className="section-tag">MANAGE GROUP</p>
                    <h3>{selectedGroup.name}</h3>
                  </div>
                  <span className="role-pill subtle">{selectedGroup.balance}</span>
                </div>

                <div className="group-details">
                  <div className="detail-box">
                    <h4>Overview</h4>
                    <p>{selectedGroup.description}</p>
                    <div className="meta-row">
                      <span>Type</span>
                      <strong>{selectedGroup.type}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Admin</span>
                      <strong>{selectedGroup.adminId === user.id ? user.name : 'Shared Owner'}</strong>
                    </div>
                  </div>

                  <div className="detail-box">
                    <h4>Members</h4>
                    <div className="member-list">
                      {selectedGroup.members.map((member) => (
                        <span key={member} className="member-chip">
                          {member}
                          {(user.role === 'group_admin' || user.role === 'platform_admin') && (
                            <button type="button" onClick={() => removeMember(member)} aria-label={`Remove ${member}`}>×</button>
                          )}
                        </span>
                      ))}
                    </div>
                    {(user.role === 'group_admin' || user.role === 'platform_admin') && (
                      <div className="inline-form">
                        <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add a member" />
                        <button type="button" className="button button-primary" onClick={addMember}>Add</button>
                      </div>
                    )}
                  </div>

                  <div className="detail-box">
                    <h4>Permissions</h4>
                    <div className="permission-list">
                      {selectedGroup.permissions.map((permission) => (
                        <span key={permission} className="permission-pill">{permission}</span>
                      ))}
                    </div>
                    {(user.role === 'group_admin' || user.role === 'platform_admin') && (
                      <div className="inline-form">
                        <input value={permissionName} onChange={(event) => setPermissionName(event.target.value)} placeholder="New permission" />
                        <button type="button" className="button button-primary" onClick={addPermission}>Add</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="expense-panel">
                  <div className="panel-header expense-header">
                    <h3>Group expenses</h3>
                    <button type="button" className="button button-primary" onClick={() => setReportOpen(true)}>View report</button>
                  </div>
                  <form className="expense-form" onSubmit={addExpense}>
                    <input
                      aria-label="Expense name"
                      value={expenseTitle}
                      onChange={(event) => setExpenseTitle(event.target.value)}
                      placeholder="Expense name"
                      maxLength={80}
                      required
                    />
                    <label className="expense-value-field">
                      <span>Expense value (₹)</span>
                      <input
                        aria-label="Expense value in rupees"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={expenseAmount}
                        onChange={(event) => setExpenseAmount(event.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </label>
                    <label className="expense-payer-field">
                      <span>Paid by</span>
                      <select value={selectedPayer} onChange={(event) => setExpensePayer(event.target.value)}>
                        {selectedGroup.members.map((member) => <option key={member} value={member}>{member}</option>)}
                      </select>
                    </label>
                    <button type="submit" className="button button-primary">Add expense</button>
                  </form>
                  <div className="expense-table">
                    {selectedExpenses.length ? (
                      selectedExpenses.map((expense) => (
                        <div key={expense.id} className="expense-row">
                          <div>
                            <strong>{expense.title}</strong>
                            <small>{expense.payer}</small>
                          </div>
                          <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                          <span className="expense-due">Due {formatCurrency(expense.due)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No expenses recorded for this group yet.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state large-empty">Select or create a group to manage it.</div>
            )}
          </section>
        </div>
      </section>
      {reportOpen && selectedGroup && (
        <div className="report-backdrop" onClick={() => setReportOpen(false)}>
          <section
            className="report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="report-heading">
              <div>
                <p className="section-tag">EXPENSE SUMMARY</p>
                <h2 id="report-title">{selectedGroup.name} report</h2>
              </div>
              <button type="button" className="report-close" onClick={() => setReportOpen(false)} aria-label="Close report">×</button>
            </div>
            <div className="report-stats">
              <div><span>Recorded expenses</span><strong>{selectedExpenses.length}</strong></div>
              <div><span>Expense value</span><strong>{formatCurrency(reportTotal)}</strong></div>
              <div><span>Average per member</span><strong>{formatCurrency(reportTotal / Math.max(selectedGroup.members.length, 1))}</strong></div>
            </div>
            <h3>Expense details</h3>
            <div className="report-expenses">
              {selectedExpenses.length ? selectedExpenses.map((expense) => (
                <div className="report-expense-row" key={expense.id}>
                  <div><strong>{expense.title}</strong><small>Paid by {expense.payer}</small></div>
                  <strong>{formatCurrency(expense.amount)}</strong>
                </div>
              )) : <div className="empty-state">No expenses recorded for this group yet.</div>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/how-it-works" element={<AuthPage />} />
      <Route path="/features" element={<AuthPage />} />
      <Route path="/about" element={<AuthPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
