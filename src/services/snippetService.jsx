import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_URL}/api/snippets`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getSnippets = async () => {
  const response = await api.get("/");
  return response.data.snippets;
};

export const getSnippet = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data.snippet;
};

export const createSnippet = async (snippetData) => {
  const response = await api.post("/", snippetData);
  return response.data.snippet;
};

export const updateSnippet = async (id, snippetData) => {
  const response = await api.put(`/${id}`, snippetData);
  return response.data.snippet;
};

export const deleteSnippet = async (id) => {
  const response = await api.delete(`/${id}`);
  return response.data;
};

export const getPublicSnippets = async () => {
  const response = await api.get("/public/all");
  return response.data.snippets;
};
