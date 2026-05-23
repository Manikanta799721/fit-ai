import { useEffect, useRef, useState } from "react";
import "./styles.css";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const heroImages = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1200&auto=format&fit=crop",
];

const categoryCards = [
  {
    title: "Topwear",
    search: "Topwear",
    type: "category",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Streetwear",
    search: "streetwear",
    type: "search",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Luxury",
    search: "Luxury",
    type: "search",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Sneakers",
    search: "Sneakers",
    type: "search",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Dresses",
    search: "Dresses",
    type: "category",
    image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Accessories",
    search: "Accessories",
    type: "category",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Activewear",
    search: "Activewear",
    type: "search",
    image: "https://images.unsplash.com/photo-1506629905607-d9f297d6f5f3?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Ethnic",
    search: "Ethnic",
    type: "search",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1000&auto=format&fit=crop",
  },
];

const readSavedJson = (key, fallback) => {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();
const wishlistStorageKey = (email) => `fitai-wishlist:${normalizeEmail(email)}`;

const contactLinks = {
  email: "manikanta799721@gmail.com",
  linkedin: "https://www.linkedin.com/in/manikanta-aatla-m16",
  github: "https://github.com/Manikanta799721",
};

function App() {

  /* ---------- STATES ---------- */

  const [gender, setGender] = useState("");
  const [colour, setColour] = useState("");
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  const [results, setResults] = useState(null);

  const [genders, setGenders] = useState([]);
  const [colours, setColours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(() => readSavedJson("fitai-user", null));
  const [wishlist, setWishlist] = useState(() => {
    const savedUser = readSavedJson("fitai-user", null);
    return savedUser?.email ? readSavedJson(wishlistStorageKey(savedUser.email), []) : [];
  });
  const [showWishlist, setShowWishlist] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const productsRef = useRef(null);
  const searchRef = useRef(null);
  const wishlistRef = useRef(null);

  const [currentHero, setCurrentHero] = useState(0);

  useEffect(() => {

    if (!currentUser?.email) {
      return;
    }

    localStorage.setItem(wishlistStorageKey(currentUser.email), JSON.stringify(wishlist));

  }, [wishlist, currentUser]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    const storageKey = wishlistStorageKey(currentUser.email);

    axios
      .get(`${API_BASE_URL}/wishlist/${encodeURIComponent(currentUser.email)}`)
      .then((response) => {
        const serverWishlist = Array.isArray(response.data) ? response.data : [];
        setWishlist(serverWishlist);
        localStorage.setItem(storageKey, JSON.stringify(serverWishlist));
      })
      .catch(() => {
        const savedWishlist = readSavedJson(storageKey, []);
        setWishlist(savedWishlist);
      });
  }, [currentUser]);

  /* ---------- AUTO IMAGE SLIDER ---------- */

  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentHero((prev) =>
        prev === heroImages.length - 1 ? 0 : prev + 1
      );

    }, 3000);

    return () => clearInterval(interval);

  }, []);

  /* ---------- THEME ---------- */

  useEffect(() => {

    if (darkMode) {

      document.body.classList.remove("light-mode");

    } else {

      document.body.classList.add("light-mode");

    }

  }, [darkMode]);

  /* ---------- FETCH FILTER VALUES ---------- */

  useEffect(() => {

    fetch(`${API_BASE_URL}/values`)
      .then((response) => response.json())
      .then((data) => {

        setGenders(data.genders || []);
        setColours(data.colours || []);
        setSeasons(data.seasons || []);
        setCategories(data.categories || []);

      })
      .catch(() => setError("Backend is not reachable. Start FastAPI on port 8000."));

  }, []);

  /* ---------- GET RECOMMENDATIONS ---------- */

  const fetchRecommendations = async (overrides = {}, requireInput = true) => {
    const selectedGender = overrides.gender ?? gender;
    const selectedColour = overrides.colour ?? colour;
    const selectedSeason = overrides.season ?? season;
    const selectedCategory = overrides.category ?? category;
    const selectedSearch = overrides.search ?? search;

    if (requireInput && !selectedGender && !selectedColour && !selectedSeason && !selectedCategory && !selectedSearch) {

      alert("Please choose at least one filter or search keyword.");

      return;
    }

    setLoading(true);
    setError("");

    try {

      const params = new URLSearchParams({
        gender: selectedGender,
        colour: selectedColour,
        season: selectedSeason,
        category: selectedCategory,
        search: selectedSearch,
      });

      const response = await fetch(
        `${API_BASE_URL}/recommend?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Recommendation request failed");
      }

      const data = await response.json();

      setResults(data);

      setTimeout(() => {

        productsRef.current?.scrollIntoView({
          behavior: "smooth",
        });

      }, 300);

    } catch (error) {

      console.log(error);
      setError("Could not fetch recommendations. Please check the backend server.");

    } finally {
      setLoading(false);
    }

  };

  const getRecommendations = () => fetchRecommendations();

  /* ---------- RESET ---------- */

  const clearFilters = () => {

    setGender("");
    setColour("");
    setSeason("");
    setCategory("");
    setSearch("");

    setResults(null);
    setError("");

  };

  const scrollToSearch = () => {
    searchRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const applyCategory = (card) => {
    const nextCategory = card.type === "category" ? card.search : "";
    const nextSearch = card.search;

    setGender("");
    setColour("");
    setSeason("");
    setCategory(nextCategory);
    setSearch(nextSearch);
    setShowWishlist(false);

    fetchRecommendations({
      gender: "",
      colour: "",
      season: "",
      category: nextCategory,
      search: nextSearch,
    }, false);
  };

  const quickSearch = (value) => {
    setGender("");
    setColour("");
    setSeason("");
    setCategory("");
    setSearch(value);
    setShowWishlist(false);

    fetchRecommendations({
      gender: "",
      colour: "",
      season: "",
      category: "",
      search: value,
    }, false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    getRecommendations();
  };

  const handleImageError = (event) => {
    event.currentTarget.src = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=90&w=1200&auto=format&fit=crop";
  };

  const openWishlist = () => {
    setShowWishlist(true);

    setTimeout(() => {
      wishlistRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const openAuth = (mode) => {

  setAuthMode(mode);

  setAuthMessage("");

  setAuthForm({
    name: "",
    email: "",
    password: "",
  });

  setAuthOpen(true);

};

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthMessage("");
  };

  const handleAuthSubmit = async (event) => {

  event.preventDefault();

  const email = normalizeEmail(authForm.email);

  if (!email || !authForm.password || (authMode === "signup" && !authForm.name.trim())) {
    setAuthMessage("Please fill all required fields.");
    return;
  }

  if (authMode === "signup" && authForm.password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.");
    return;
  }

  setAuthLoading(true);
  setAuthMessage("");

  try {

    if (authMode === "signup") {

      const response = await axios.post(
        "http://127.0.0.1:8000/signup",
        {
          username: authForm.name.trim(),
          email,
          password: authForm.password,
        }
      );

      setAuthMessage(response.data.message || "Signup successful. Login to continue.");

      setTimeout(() => {
        setAuthMode("login");
        setAuthMessage("Account created. Please login.");
      }, 1000);

    } else {

      const response = await axios.post(
        "http://127.0.0.1:8000/login",
        {
          email,
          password: authForm.password,
        }
      );

      if (response.data.token) {

        localStorage.setItem(
          "fitai-token",
          response.data.token
        );

        const user = {
          name: response.data.username,
          email: response.data.email || email,
        };

        setCurrentUser(user);
        setWishlist(readSavedJson(wishlistStorageKey(user.email), []));
        setShowWishlist(false);

        localStorage.setItem(
          "fitai-user",
          JSON.stringify(user)
        );

        setAuthMessage("Login successful.");

        setTimeout(() => {

  setAuthOpen(false);

  setAuthForm({
    name: "",
    email: "",
    password: "",
  });

}, 1000);

      } else {

        setAuthMessage("Invalid credentials.");

      }

    }

  } catch (error) {

    console.log(error);

    setAuthMessage(
      error.response?.data?.detail ||
      error.response?.data?.message ||
      "Authentication failed. Please try again."
    );

  } finally {
    setAuthLoading(false);
  }

};

  const logout = () => {
    setCurrentUser(null);
    setWishlist([]);
    setShowWishlist(false);
    localStorage.removeItem("fitai-user");
    localStorage.removeItem("fitai-token");
  };

  const toggleWishlist = async (item) => {
    if (!currentUser) {
      openAuth("login");
      setAuthMessage("Login first to save your wishlist.");
      return;
    }

    const alreadySaved = wishlist.some((product) => product.id === item.id);

    setWishlist((items) => {
      const exists = items.some((product) => product.id === item.id);

      if (exists) {
        return items.filter((product) => product.id !== item.id);
      }

      return [item, ...items];
    });

    try {
      if (alreadySaved) {
        await axios.delete(
          `${API_BASE_URL}/wishlist/${encodeURIComponent(currentUser.email)}/${item.id}`
        );
      } else {
        await axios.post(`${API_BASE_URL}/save-wishlist`, {
          email: currentUser.email,
          product: item,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const isWishlisted = (id) => wishlist.some((item) => item.id === id);

  return (

    <div className="app">

      {/* ---------- NAVBAR ---------- */}

      <nav className="navbar">

        <div className="logo">
          FIT.AI
        </div>

        <div className="nav-links">

          <button
            className="nav-action"
            onClick={() => quickSearch("trending")}
          >
            Trending
          </button>

          <button
            className="nav-action"
            onClick={() => quickSearch("streetwear")}
          >
            Streetwear
          </button>

          <button
            className="nav-action"
            onClick={() => quickSearch("luxury")}
          >
            Luxury
          </button>

          <button
            className="nav-action"
            onClick={() => quickSearch("sneakers")}
          >
            Sneakers
          </button>

          <button
            className="nav-action"
            onClick={openWishlist}
          >
            Wishlist ({wishlist.length})
          </button>

          {currentUser ? (
            <div className="user-menu">
              <span>{currentUser.name}</span>
              <button onClick={logout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={() => openAuth("login")}>Login</button>
              <button onClick={() => openAuth("signup")}>Sign Up</button>
            </div>
          )}

          <button
            className="theme-btn"
            onClick={() => setDarkMode(!darkMode)}
          >

            {darkMode ? "☀️ Light" : "🌙 Dark"}

          </button>

        </div>

      </nav>

      {/* ---------- HERO ---------- */}

      <section className="hero">

        <div className="hero-left">

          <p className="mini-title">
            AI FASHION ENGINE
          </p>

          <h1>
            FIND YOUR
            <br />
            PERFECT FIT.
          </h1>

          <p className="hero-text">

            Build a personal style profile from gender, colour,
            season, category and vibe. FIT.AI scores every product
            like a digital stylist.

          </p>

          <div className="hero-stats">
            <div>
              <strong>44K+</strong>
              <span>products</span>
            </div>
            <div>
              <strong>12+</strong>
              <span>fashion categories</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>match scoring</span>
            </div>
          </div>

          <button
            className="hero-btn"
            onClick={scrollToSearch}
          >
            Explore Now
          </button>

        </div>

        <div className="hero-right">

          <div className="hero-card">

            <img
              src={heroImages[currentHero]}
              alt="AI styled fashion editorial"
            />

          </div>

          <div className="hero-indicators">
            {heroImages.map((_, index) => (
              <button
                key={index}
                className={index === currentHero ? "active" : ""}
                aria-label={`Show hero image ${index + 1}`}
                onClick={() => setCurrentHero(index)}
              />
            ))}
          </div>

        </div>

      </section>

      {/* ---------- SEARCH ---------- */}

      <form
        className="search-container"
        ref={searchRef}
        onSubmit={handleSearchSubmit}
      >

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >

          <option value="">
            Gender
          </option>

          {genders.map((item, index) => (

            <option
              key={index}
              value={item}
            >
              {item}
            </option>

          ))}

        </select>

        <select
          value={colour}
          onChange={(e) => setColour(e.target.value)}
        >

          <option value="">
            Colour
          </option>

          {colours.map((item, index) => (

            <option
              key={index}
              value={item}
            >
              {item}
            </option>

          ))}

        </select>

        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        >

          <option value="">
            Season
          </option>

          {seasons.map((item, index) => (

            <option
              key={index}
              value={item}
            >
              {item}
            </option>

          ))}

        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >

          <option value="">
            Category
          </option>

          {categories.map((item, index) => (

            <option
              key={index}
              value={item}
            >
              {item}
            </option>

          ))}

        </select>

        <input
          type="text"
          placeholder="Search fashion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* ---------- BUTTONS ---------- */}

        <div className="button-group">

          <button type="submit">
            {loading
              ? "Styling Looks..."
              : "Get Recommendations"}
          </button>

          <button
            className="reset-btn"
            type="button"
            onClick={clearFilters}
          >
            Reset
          </button>

        </div>

      </form>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <section className="ai-panel">
        <div>
          <p className="mini-title">AI STYLIST PROFILE</p>
          <h2>Recommendations that explain themselves.</h2>
        </div>

        <div className="ai-steps">
          <div>
            <span>01</span>
            <strong>Profile Match</strong>
            <p>Gender, season, colour and category shape the first filter.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Style Signal</strong>
            <p>Search terms match article type, vibe, trend, occasion and brand.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Fit Score</strong>
            <p>Each card gets a readable match score and styling reason.</p>
          </div>
        </div>
      </section>

      {/* ---------- CATEGORY SECTION ---------- */}

      <section className="fashion-types">

        <h2 className="section-title">
          Shop By Category
        </h2>

        <div className="fashion-grid">

          {categoryCards.map((category) => (
            <button
              className="fashion-card"
              key={category.title}
              onClick={() => applyCategory(category)}
            >
              <img
                src={category.image}
                alt={`${category.title} fashion category`}
                onError={handleImageError}
              />

              <div className="fashion-overlay">
                <span>{category.title}</span>
                <small>Tap for instant fits</small>
              </div>

            </button>
          ))}

        </div>

      </section>

      {/* ---------- PRODUCTS ---------- */}

      <section
        className="products-section"
        ref={productsRef}
      >

        <h2>
          AI Recommended Fits
        </h2>

        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="product-card skeleton-card" key={index}>
                <div className="skeleton-image" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line medium" />
                <div className="skeleton-button" />
              </div>
            ))}
          </div>
        ) : results === null ? null : results.length === 0 ? (

          <div className="no-results">

            <h2>
              No Results Found 😔
            </h2>

            <p>
              Try changing colour, season,
              gender or search keyword.
            </p>

          </div>

        ) : (

          <div className="products-grid">

            {results.map((item, index) => (

              <div
                className="product-card"
                key={index}
              >

                <div className="image-container">

                  <img
                    src={item.image}
                    alt={item.productDisplayName}
                    loading="lazy"
                    onError={handleImageError}
                  />

                </div>

                <div className="product-info">

                  <div className="match-badge">
                    {item.match}% Match
                  </div>

                  <h3>
                    {item.productDisplayName}
                  </h3>

                  <p>
                    {item.subCategory || item.articleType} · {item.articleType}
                  </p>

                  <p>
                    {item.baseColour}
                  </p>

                  <p>
                    {item.brand} · {item.season}
                  </p>

                  <div className="ai-reason">
                    {item.aiReason}
                  </div>

                  <div className="score-bars">
                    <span style={{ width: `${item.scoreBreakdown?.profileFit || item.match}%` }} />
                  </div>

                  <div className="product-tags">
                    <span>{item.style}</span>
                    <span>{item.vibe}</span>
                    <span>{item.trend}</span>
                  </div>

                  <button
                    className={`wishlist-btn ${isWishlisted(item.id) ? "saved" : ""}`}
                    onClick={() => toggleWishlist(item)}
                  >
                    {isWishlisted(item.id) ? "Saved to Wishlist" : "♡ Wishlist"}
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

      {showWishlist && (
        <section
          className="wishlist-section"
          ref={wishlistRef}
        >
          <div className="wishlist-header">
            <div>
              <p className="mini-title">SAVED STYLE BOARD</p>
              <h2>Your Wishlist</h2>
            </div>

            <button onClick={() => setShowWishlist(false)}>
              Hide Wishlist
            </button>
          </div>

          {wishlist.length === 0 ? (
            <div className="no-results">
              <h2>No Wishlist Items</h2>
              <p>Save products from recommendations to build your style board.</p>
            </div>
          ) : (
            <div className="products-grid">
              {wishlist.map((item) => (
                <div
                  className="product-card"
                  key={item.id}
                >
                  <div className="image-container">
                    <img
                      src={item.image}
                      alt={item.productDisplayName}
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </div>

                  <div className="product-info">
                    <div className="match-badge">
                      Saved
                    </div>

                    <h3>{item.productDisplayName}</h3>
                    <p>{item.articleType}</p>
                    <p>{item.baseColour}</p>
                    <p>{item.brand} · {item.season}</p>
                    {item.aiReason && (
                      <div className="ai-reason">
                        {item.aiReason}
                      </div>
                    )}

                    <button
                      className="wishlist-btn saved"
                      onClick={() => toggleWishlist(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="site-footer">
        <div>
          <p className="mini-title">PORTFOLIO PROJECT</p>
          <h2>FIT.AI Fashion Recommendation System</h2>
          <p>
            Built with React, FastAPI, Pandas and an AI-style recommendation
            experience for portfolio, placement and MS application showcase.
          </p>
        </div>

        <div className="footer-links">
          <a href={`mailto:${contactLinks.email}`}>
            Mail
          </a>
          <a
            href={contactLinks.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <a
            href={contactLinks.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>

      {authOpen && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <button
              className="modal-close"
              onClick={closeAuth}
              aria-label="Close auth modal"
            >
              ×
            </button>

            <p className="mini-title">FIT.AI ACCOUNT</p>
            <h2>{authMode === "login" ? "Login" : "Sign up"}</h2>
            <p className="auth-copy">
              {authMode === "login"
                ? "Access your saved styles, wishlist and recommendations."
                : "Create your account to keep your fashion board personal."}
            </p>

            <div className="auth-tabs" role="tablist" aria-label="Account mode">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "signup" ? "active" : ""}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthMessage("");
                }}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Full name"
                  autoComplete="name"
                  value={authForm.name}
                  onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                />
              )}

              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              />

              <div className="password-box">

  <input
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    autoComplete={authMode === "login" ? "current-password" : "new-password"}
    value={authForm.password}
    onChange={(event) =>
      setAuthForm({
        ...authForm,
        password: event.target.value,
      })
    }
  />

  <button
    type="button"
    className="show-pass-btn"
    onClick={() =>
      setShowPassword(!showPassword)
    }
  >
    {showPassword ? "Hide" : "Show"}
  </button>

</div>

              {authMessage && (
                <p className="auth-message">
                  {authMessage}
                </p>
              )}

              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "login" ? "Login" : "Create account"}
              </button>
            </form>

            <div className="auth-perks">
              <span>Secure login</span>
              <span>User-only wishlist</span>
              <span>Fast checkout-ready profile</span>
            </div>

            <button
              className="switch-auth"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthMessage("");
              }}
            >
              {authMode === "login"
                ? "New here? Create an account"
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      )}

    </div>

  );

}

export default App;
