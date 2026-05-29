import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  fetchRecommendations as getRecommendationResults,
  fetchValues,
  fetchWishlist,
  getApiError,
  loginUser,
  removeWishlistItem,
  saveWishlistItem,
  signupUser,
} from "./lib/api";
import ProductCard from "./components/ProductCard";
import { categoryCards, contactLinks, heroImages } from "./lib/catalog";
import { cartStorageKey, normalizeEmail, readSavedJson, saveJson, wishlistStorageKey } from "./lib/storage";

const getProductPrice = (item) => {
  if (item.price) {
    return item.price;
  }

  const base = 899 + (Number(item.id) % 2400);
  const premiumBoost = item.match ? item.match * 7 : 0;
  return Math.round((base + premiumBoost) / 10) * 10 - 1;
};

const cartSubtotal = (items) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

const merchantName = "AATLA MANI KANTHA ESWAR REDDY";
const fallbackUpiId = "fitai.demo@upi";
const merchantQrImage = "/payment-qr.png";

const demoProduct = {
  id: -1,
  image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=1000&auto=format&fit=crop",
  productDisplayName: "FIT.AI Rs. 1 Payment Test Tee",
  masterCategory: "Apparel",
  subCategory: "Topwear",
  articleType: "Tshirts",
  baseColour: "Black",
  season: "All Season",
  gender: "Unisex",
  brand: "FIT.AI Demo",
  style: "Minimal",
  vibe: "Checkout Test",
  trend: "Demo Drop",
  occasion: "Trial",
  match: 99,
  confidence: "Payment test",
  isExactMatch: true,
  aiReason: "A Rs. 1 demo item for testing checkout and QR payment flow.",
  price: 1,
  scoreBreakdown: {
    profileFit: 99,
    styleSignal: 99,
    trendSignal: 99,
  },
};

const buildUpiUrl = (amount) => {
  const params = new URLSearchParams({
    pa: fallbackUpiId,
    pn: merchantName,
    am: amount.toString(),
    cu: "INR",
    tn: `FIT.AI demo order Rs ${amount}`,
  });

  return `upi://pay?${params.toString()}`;
};

function App() {

  /* ---------- STATES ---------- */

  const [gender, setGender] = useState("");
  const [colour, setColour] = useState("");
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceLimit, setPriceLimit] = useState(4500);
  const [patternFilter, setPatternFilter] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyExact, setOnlyExact] = useState(false);

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
  const [cart, setCart] = useState(() => {
    const savedUser = readSavedJson("fitai-user", null);
    return savedUser?.email ? readSavedJson(cartStorageKey(savedUser.email), []) : [];
  });
  const [showWishlist, setShowWishlist] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("address");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    method: "upi",
    upiId: "",
    upiReference: "",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    codConfirmed: false,
  });
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

    saveJson(wishlistStorageKey(currentUser.email), wishlist);

  }, [wishlist, currentUser]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    saveJson(cartStorageKey(currentUser.email), cart);
  }, [cart, currentUser]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    const storageKey = wishlistStorageKey(currentUser.email);
    fetchWishlist(currentUser.email)
      .then((response) => {
        setWishlist(response);
        saveJson(storageKey, response);
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

    fetchValues()
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

      const params = {
        gender: selectedGender,
        colour: selectedColour,
        season: selectedSeason,
        category: selectedCategory,
        search: selectedSearch,
      };

      const data = await getRecommendationResults(params);

      setResults(data);

      setTimeout(() => {

        productsRef.current?.scrollIntoView({
          behavior: "smooth",
        });

      }, 300);

    } catch (error) {

      console.log(error);
      setError(getApiError(error, "Could not fetch recommendations. Please check the backend server."));

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
    setPriceLimit(4500);
    setPatternFilter("");
    setSortBy("recommended");
    setOnlyExact(false);

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
    setCartOpen(false);

    setTimeout(() => {
      wishlistRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const openCart = () => {
    setCartOpen(true);
    setShowWishlist(false);
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

      const response = await signupUser({
        name: authForm.name.trim(),
        email,
        password: authForm.password,
      });

      setAuthMessage(response.message || "Signup successful. Login to continue.");

      setTimeout(() => {
        setAuthMode("login");
        setAuthMessage("Account created. Please login.");
      }, 1000);

    } else {

      const response = await loginUser({
        email,
        password: authForm.password,
      });

      if (response.token) {

        localStorage.setItem(
          "fitai-token",
          response.token
        );

        const user = {
          name: response.username,
          email: response.email || email,
        };

        setCurrentUser(user);
        setWishlist(readSavedJson(wishlistStorageKey(user.email), []));
        setCart(readSavedJson(cartStorageKey(user.email), []));
        setCartOpen(false);
        setShowWishlist(false);

        saveJson("fitai-user", user);

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
      getApiError(error, "Authentication failed. Please try again.")
    );

  } finally {
    setAuthLoading(false);
  }

};

  const logout = () => {
    setCurrentUser(null);
    setWishlist([]);
    setCart([]);
    setCartOpen(false);
    setCheckoutOpen(false);
    setActiveProduct(null);
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

    const previousWishlist = wishlist;

    setWishlist((items) => {
      const exists = items.some((product) => product.id === item.id);

      if (exists) {
        return items.filter((product) => product.id !== item.id);
      }

      return [item, ...items];
    });

    try {
      if (alreadySaved) {
        await removeWishlistItem(currentUser.email, item.id);
      } else {
        await saveWishlistItem(currentUser.email, item);
      }
    } catch (error) {
      console.log(error);
      setWishlist(previousWishlist);
      setError(getApiError(error, "Wishlist could not be updated. Please try again."));
    }
  };

  const addToCart = (item) => {
    const isDemoProduct = item.id === demoProduct.id;

    if (!currentUser && !isDemoProduct) {
      openAuth("login");
      setAuthMessage("Login first to add items to your bag.");
      return;
    }

    const pricedItem = {
      ...item,
      price: item.price || getProductPrice(item),
    };

    setCart((items) => {
      const exists = items.some((product) => product.id === item.id);

      if (exists) {
        return items.map((product) =>
          product.id === item.id
            ? { ...product, quantity: product.quantity + 1 }
            : product
        );
      }

      return [{ ...pricedItem, quantity: 1, size: "M" }, ...items];
    });

    setCartOpen(true);
    setShowWishlist(false);
  };

  const openProductPreview = (item) => {
    setActiveProduct({
      ...item,
      price: item.price || getProductPrice(item),
    });
  };

  const updateCartQuantity = (id, quantity) => {
    setCart((items) =>
      items
        .map((item) =>
          item.id === id
            ? { ...item, quantity }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((items) => items.filter((item) => item.id !== id));
  };

  const startCheckout = () => {
    const isDemoCheckout = cart.length > 0 && cart.every((item) => item.id === demoProduct.id);

    if (!currentUser && !isDemoCheckout) {
      openAuth("login");
      setAuthMessage("Login first to checkout.");
      return;
    }

    setCheckoutOpen(true);
    setOrderConfirmation(null);
    setCheckoutStep("address");
    setPaymentMessage("");
  };

  const addDemoProduct = () => {
    addToCart(demoProduct);
  };

  const resetPaymentFields = (method) => {
    setCheckoutForm((form) => ({
      ...form,
      method,
      upiId: "",
      upiReference: "",
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvv: "",
      codConfirmed: false,
    }));
    setPaymentMessage("");
  };

  const placeOrder = (event) => {
    event.preventDefault();

    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.city || !checkoutForm.pincode) {
      setPaymentMessage("Please complete delivery details before payment.");
      return;
    }

    if (checkoutStep === "address") {
      setCheckoutStep("payment");
      setPaymentMessage("");
      return;
    }

    if (checkoutForm.method === "upi") {
      const hasUpiId = checkoutForm.upiId.trim().includes("@");
      const hasReference = checkoutForm.upiReference.trim().length >= 6;

      if (!hasUpiId && !hasReference) {
        setPaymentMessage("Scan the PhonePe QR and enter a 6+ character reference ID, or enter a valid UPI ID.");
        return;
      }
    }

    if (checkoutForm.method === "card") {
      const cardNumber = checkoutForm.cardNumber.replace(/\s/g, "");
      const expiryOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(checkoutForm.cardExpiry);
      const cvvOk = /^\d{3,4}$/.test(checkoutForm.cardCvv);

      if (cardNumber.length < 12 || !checkoutForm.cardName.trim() || !expiryOk || !cvvOk) {
        setPaymentMessage("Enter valid card number, cardholder name, MM/YY expiry and CVV.");
        return;
      }
    }

    if (checkoutForm.method === "cod" && !checkoutForm.codConfirmed) {
      setPaymentMessage("Confirm cash on delivery to place this order.");
      return;
    }

    setOrderConfirmation({
      id: `FIT${String(cartCount).padStart(2, "0")}${String(grandTotal).padStart(4, "0")}`,
      amount: grandTotal,
      method: checkoutForm.method === "upi"
        ? "UPI"
        : checkoutForm.method === "card" ? "Card" : "Cash on Delivery",
      name: checkoutForm.name,
      city: checkoutForm.city,
    });
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
    setPaymentMessage("");
  };

  const isWishlisted = (id) => wishlist.some((item) => item.id === id);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartSubtotal(cart);
  const demoOnlyOrder = cart.length > 0 && cart.every((item) => item.id === demoProduct.id);
  const deliveryFee = demoOnlyOrder || subtotal > 2499 || subtotal === 0 ? 0 : 79;
  const platformFee = subtotal > 0 && !demoOnlyOrder ? 19 : 0;
  const grandTotal = subtotal + deliveryFee + platformFee;
  const upiUrl = buildUpiUrl(grandTotal || 1);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;
  const paymentButtonText = checkoutStep === "address"
    ? "Continue to Payment"
    : checkoutForm.method === "upi"
      ? "Verify UPI Payment"
      : checkoutForm.method === "card"
        ? `Pay Rs. ${grandTotal}`
        : "Place COD Order";
  const patternOptions = useMemo(() => {
    if (!results) {
      return [];
    }

    const values = results.flatMap((item) => [
      item.style,
      item.vibe,
      item.trend,
      item.occasion,
      item.articleType,
    ]);

    return [...new Set(values.filter(Boolean))].slice(0, 16);
  }, [results]);
  const displayResults = useMemo(() => {
    if (!results) {
      return results;
    }

    const selectedPattern = patternFilter.toLowerCase();

    return results
      .map((item) => ({
        ...item,
        price: getProductPrice(item),
      }))
      .filter((item) => item.price <= priceLimit)
      .filter((item) => !onlyExact || item.isExactMatch)
      .filter((item) => {
        if (!selectedPattern) {
          return true;
        }

        return [item.style, item.vibe, item.trend, item.occasion, item.articleType]
          .filter(Boolean)
          .some((value) => value.toLowerCase() === selectedPattern);
      })
      .sort((first, second) => {
        if (sortBy === "price-low") {
          return first.price - second.price;
        }

        if (sortBy === "price-high") {
          return second.price - first.price;
        }

        if (sortBy === "match") {
          return second.match - first.match;
        }

        return 0;
      });
  }, [results, priceLimit, patternFilter, sortBy, onlyExact]);

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

          <button
            className="nav-action cart-nav"
            onClick={openCart}
          >
            Bag ({cartCount})
          </button>

          <button
            className="nav-action"
            onClick={addDemoProduct}
          >
            Rs. 1 Test
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

            {darkMode ? "Light mode" : "Dark mode"}

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

        {results && (
          <div className="shop-filter-shell">
            <div className="shop-filter-top">
              <div>
                <p className="mini-title">SHOPPING FILTERS</p>
                <strong>{displayResults.length} of {results.length} styles</strong>
              </div>

              <button
                type="button"
                className="filter-toggle"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                {filtersOpen ? "Hide Filters" : "Filter"}
              </button>
            </div>

            <div className={`shop-filters ${filtersOpen ? "open" : ""}`}>
              <label>
                <span>Max price: Rs. {priceLimit}</span>
                <input
                  type="range"
                  min="1"
                  max="4500"
                  step="100"
                  value={priceLimit}
                  onChange={(event) => setPriceLimit(Number(event.target.value))}
                />
              </label>

              <label>
                <span>Pattern / vibe</span>
                <select
                  value={patternFilter}
                  onChange={(event) => setPatternFilter(event.target.value)}
                >
                  <option value="">All patterns</option>
                  {patternOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="match">Best match</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>

              <label className="exact-toggle">
                <input
                  type="checkbox"
                  checked={onlyExact}
                  onChange={(event) => setOnlyExact(event.target.checked)}
                />
                <span>Exact matches only</span>
              </label>

              <button
                type="button"
                className="filter-clear"
                onClick={() => {
                  setPriceLimit(4500);
                  setPatternFilter("");
                  setSortBy("recommended");
                  setOnlyExact(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
        ) : results === null ? null : displayResults.length === 0 ? (

          <div className="no-results">

            <h2>
              No Results Found
            </h2>

            <p>
              Try changing colour, season,
              gender or search keyword.
            </p>

          </div>

        ) : (

          <div className="products-grid">

            {displayResults.map((item) => (
              <ProductCard
                item={item}
                key={item.id}
                onAddToCart={addToCart}
                onImageClick={openProductPreview}
                isSaved={isWishlisted(item.id)}
                onImageError={handleImageError}
                onWishlistToggle={toggleWishlist}
              />
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
                <ProductCard
                  item={item}
                  key={item.id}
                  variant="wishlist"
                  isSaved
                  onAddToCart={addToCart}
                  onImageClick={openProductPreview}
                  onImageError={handleImageError}
                  onWishlistToggle={toggleWishlist}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {cartOpen && (
        <aside className="cart-drawer" aria-label="Shopping bag">
          <div className="cart-header">
            <div>
              <p className="mini-title">SHOPPING BAG</p>
              <h2>{cartCount} Item{cartCount === 1 ? "" : "s"}</h2>
            </div>
            <button onClick={() => setCartOpen(false)} aria-label="Close bag">
              ×
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <h3>Your bag is empty</h3>
              <p>Add recommended styles and checkout with a demo payment flow.</p>
              <button className="demo-product-btn" onClick={addDemoProduct}>
                Add Rs. 1 Test Product
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <button
                      type="button"
                      className="cart-product-trigger cart-image-trigger"
                      onClick={() => openProductPreview(item)}
                      aria-label={`Open ${item.productDisplayName} details`}
                    >
                      <img
                        src={item.image}
                        alt={item.productDisplayName}
                        onError={handleImageError}
                      />
                    </button>
                    <div>
                      <button
                        type="button"
                        className="cart-product-trigger cart-title-trigger"
                        onClick={() => openProductPreview(item)}
                      >
                        <h3>{item.productDisplayName}</h3>
                      </button>
                      <p>{item.brand} · {item.baseColour}</p>
                      <strong>Rs. {item.price}</strong>
                      <div className="qty-control">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease ${item.productDisplayName} quantity`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase ${item.productDisplayName} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="remove-cart"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="price-box">
                <div>
                  <span>Subtotal</span>
                  <strong>Rs. {subtotal}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee}`}</strong>
                </div>
                <div>
                  <span>Platform fee</span>
                  <strong>Rs. {platformFee}</strong>
                </div>
                <div className="price-total">
                  <span>Total</span>
                  <strong>Rs. {grandTotal}</strong>
                </div>
              </div>

              <button className="checkout-btn" onClick={startCheckout}>
                Checkout Securely
              </button>
            </>
          )}
        </aside>
      )}

      {activeProduct && (
        <div className="product-preview-overlay" onClick={() => setActiveProduct(null)}>
          <div className="product-preview" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setActiveProduct(null)}
              aria-label="Close product preview"
            >
              ×
            </button>
            <img
              src={activeProduct.image}
              alt={activeProduct.productDisplayName}
              onError={handleImageError}
            />
            <div>
              <p className="mini-title">QUICK VIEW</p>
              <h2>{activeProduct.productDisplayName}</h2>
              <p>{activeProduct.aiReason}</p>
              <div className="preview-meta">
                <span>{activeProduct.brand}</span>
                <span>{activeProduct.baseColour}</span>
                <span>{activeProduct.season}</span>
                <span>{activeProduct.match}% Match</span>
              </div>
              <strong className="preview-price">Rs. {getProductPrice(activeProduct)}</strong>
              <div className="preview-actions">
                <button onClick={() => toggleWishlist(activeProduct)}>
                  {isWishlisted(activeProduct.id) ? "Saved" : "Wishlist"}
                </button>
                <button onClick={() => addToCart(activeProduct)}>
                  Add to Bag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="auth-overlay">
          <div className="checkout-modal">
            <button
              className="modal-close"
              onClick={() => setCheckoutOpen(false)}
              aria-label="Close checkout"
            >
              ×
            </button>

            <p className="mini-title">SECURE CHECKOUT</p>
            <h2>{checkoutStep === "address" ? "Delivery Details" : "Payment"}</h2>

            <form onSubmit={placeOrder}>
              {checkoutStep === "address" ? (
                <>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={checkoutForm.name}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, name: event.target.value })}
                  />
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={checkoutForm.phone}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={checkoutForm.address}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, address: event.target.value })}
                  />
                  <div className="checkout-grid">
                    <input
                      type="text"
                      placeholder="City"
                      value={checkoutForm.city}
                      onChange={(event) => setCheckoutForm({ ...checkoutForm, city: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={checkoutForm.pincode}
                      onChange={(event) => setCheckoutForm({ ...checkoutForm, pincode: event.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="delivery-summary">
                  <span>Delivering to</span>
                  <strong>{checkoutForm.name} · {checkoutForm.phone}</strong>
                  <p>{checkoutForm.address}, {checkoutForm.city} - {checkoutForm.pincode}</p>
                </div>
              )}

              {checkoutStep === "payment" && (
                <div className="payment-panel">
                  <div className="payment-panel-header">
                    <div>
                      <span>Payment method</span>
                      <strong>Choose how you want to pay</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep("address")}
                    >
                      Edit address
                    </button>
                  </div>

                  <div className="payment-methods">
                    {["upi", "card", "cod"].map((method) => (
                      <button
                        type="button"
                        className={checkoutForm.method === method ? "active" : ""}
                        key={method}
                        onClick={() => resetPaymentFields(method)}
                      >
                        <span>{method === "upi" ? "UPI" : method === "card" ? "Card" : "Cash"}</span>
                        <small>
                          {method === "upi"
                            ? "QR / UPI ID"
                            : method === "card" ? "Credit / Debit" : "Pay on delivery"}
                        </small>
                      </button>
                    ))}
                  </div>

                  {checkoutForm.method === "upi" && (
                    <div className="upi-payment-box">
                      <div className="upi-qr">
                        <img
                          src={merchantQrImage}
                          alt={`UPI QR code to pay Rs. ${grandTotal}`}
                          onError={(event) => {
                            event.currentTarget.src = qrCodeUrl;
                          }}
                        />
                      </div>
                      <div>
                        <strong>Scan and pay Rs. {grandTotal}</strong>
                        <p>PhonePe QR: {merchantName}</p>
                        <a href={upiUrl}>Open demo UPI link</a>
                      </div>
                      <input
                        type="text"
                        placeholder="Your UPI ID, e.g. name@bank"
                        value={checkoutForm.upiId}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, upiId: event.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="UPI reference ID after payment"
                        value={checkoutForm.upiReference}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, upiReference: event.target.value })}
                      />
                    </div>
                  )}

                  {checkoutForm.method === "card" && (
                    <div className="card-payment-box">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Card number"
                        maxLength="19"
                        value={checkoutForm.cardNumber}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, cardNumber: event.target.value.replace(/[^\d\s]/g, "") })}
                      />
                      <input
                        type="text"
                        placeholder="Name on card"
                        value={checkoutForm.cardName}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, cardName: event.target.value })}
                      />
                      <div className="checkout-grid">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength="5"
                          value={checkoutForm.cardExpiry}
                          onChange={(event) => setCheckoutForm({ ...checkoutForm, cardExpiry: event.target.value })}
                        />
                        <input
                          type="password"
                          inputMode="numeric"
                          placeholder="CVV"
                          maxLength="4"
                          value={checkoutForm.cardCvv}
                          onChange={(event) => setCheckoutForm({ ...checkoutForm, cardCvv: event.target.value.replace(/\D/g, "") })}
                        />
                      </div>
                      <p>Card payments are validated in demo mode. Connect Razorpay, Stripe, or Cashfree before accepting live cards.</p>
                    </div>
                  )}

                  {checkoutForm.method === "cod" && (
                    <label className="cod-payment-box">
                      <input
                        type="checkbox"
                        checked={checkoutForm.codConfirmed}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, codConfirmed: event.target.checked })}
                      />
                      <span>
                        I will pay Rs. {grandTotal} in cash when the order is delivered.
                      </span>
                    </label>
                  )}
                </div>
              )}

              <div className="price-box compact">
                <div className="price-total">
                  <span>Payable</span>
                  <strong>Rs. {grandTotal}</strong>
                </div>
              </div>

              {paymentMessage && <p className="auth-message">{paymentMessage}</p>}

              <button type="submit">
                {paymentButtonText}
              </button>
            </form>
          </div>
        </div>
      )}

      {orderConfirmation && (
        <div className="auth-overlay">
          <div className="order-placed-modal">
            <div className="order-checkmark">✓</div>
            <p className="mini-title">ORDER CONFIRMED</p>
            <h2>Order Placed</h2>
            <p>
              Thanks {orderConfirmation.name}. Your FIT.AI order has been placed successfully.
            </p>

            <div className="order-summary-box">
              <div>
                <span>Order ID</span>
                <strong>{orderConfirmation.id}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{orderConfirmation.method}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>Rs. {orderConfirmation.amount}</strong>
              </div>
              <div>
                <span>Delivery city</span>
                <strong>{orderConfirmation.city}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOrderConfirmation(null)}
            >
              Continue Shopping
            </button>
          </div>
        </div>
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
          <a href={`tel:+91${contactLinks.phone}`}>
            Contact Us
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
