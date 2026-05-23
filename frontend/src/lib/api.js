import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

export const getApiError = (error, fallback = "Something went wrong. Please try again.") => {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" ");
  }

  return detail || error.response?.data?.message || fallback;
};

export const fetchValues = async () => {
  const response = await client.get("/values");
  return response.data;
};

export const fetchRecommendations = async (filters) => {
  const response = await client.get("/recommend", {
    params: filters,
  });
  return response.data;
};

export const signupUser = async ({ name, email, password }) => {
  const response = await client.post("/signup", {
    username: name,
    email,
    password,
  });
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await client.post("/login", {
    email,
    password,
  });
  return response.data;
};

export const fetchWishlist = async (email) => {
  const response = await client.get(`/wishlist/${encodeURIComponent(email)}`);
  return Array.isArray(response.data) ? response.data : [];
};

export const saveWishlistItem = async (email, product) => {
  const response = await client.post("/save-wishlist", {
    email,
    product,
  });
  return response.data;
};

export const removeWishlistItem = async (email, productId) => {
  const response = await client.delete(`/wishlist/${encodeURIComponent(email)}/${productId}`);
  return response.data;
};
