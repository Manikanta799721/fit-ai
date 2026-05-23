function ProductCard({
  item,
  isSaved,
  onAddToCart,
  onImageClick,
  onImageError,
  onWishlistToggle,
  variant = "result",
}) {
  const isWishlist = variant === "wishlist";
  const profileScore = item.scoreBreakdown?.profileFit || item.match || 0;
  const styleScore = item.scoreBreakdown?.styleSignal || item.match || 0;
  const price = item.price || Math.round((899 + (Number(item.id) % 2400) + (item.match || 0) * 7) / 10) * 10 - 1;

  return (
    <div className={`product-card ${item.isExactMatch === false ? "near-match" : ""}`}>
      <button
        type="button"
        className="image-container product-image-button"
        onClick={() => onImageClick(item)}
        aria-label={`Open ${item.productDisplayName}`}
      >
        <img
          src={item.image}
          alt={item.productDisplayName}
          loading="lazy"
          onError={onImageError}
        />
        <span className="image-hover-label">Quick View</span>
      </button>

      <div className="product-info">
        <div className="product-card-topline">
          <div className="match-badge">
            {isWishlist ? "Saved" : `${item.match}% Match`}
          </div>
          {!isWishlist && (
            <span className="confidence-pill">
              {item.confidence || (item.isExactMatch ? "Exact match" : "Closest pick")}
            </span>
          )}
        </div>

        <h3>{item.productDisplayName}</h3>
        <p>{item.subCategory || item.articleType} · {item.articleType}</p>
        <p>{item.baseColour}</p>
        <p>{item.brand} · {item.season}</p>
        <strong className="product-price">Rs. {price}</strong>

        {item.aiReason && (
          <div className="ai-reason">
            {item.aiReason}
          </div>
        )}

        {!isWishlist && (
          <div className="score-stack" aria-label="AI score breakdown">
            <div>
              <span>Profile</span>
              <strong>{profileScore}%</strong>
            </div>
            <div className="score-bars">
              <span style={{ width: `${profileScore}%` }} />
            </div>
            <div>
              <span>Style</span>
              <strong>{styleScore}%</strong>
            </div>
            <div className="score-bars">
              <span style={{ width: `${styleScore}%` }} />
            </div>
          </div>
        )}

        <div className="product-tags">
          <span>{item.style}</span>
          <span>{item.vibe}</span>
          <span>{item.trend}</span>
        </div>

        <div className="commerce-actions">
          <button
            className={`wishlist-btn ${isSaved ? "saved" : ""}`}
            onClick={() => onWishlistToggle(item)}
          >
            {isWishlist ? "Remove" : isSaved ? "Saved" : "Wishlist"}
          </button>

          {!isWishlist && (
            <button
              className="bag-btn"
              onClick={() => onAddToCart(item)}
            >
              Add to Bag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
