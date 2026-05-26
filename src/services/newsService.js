const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function fetchLocalNews(city) {
  const response = await fetch(
    `${apiBaseUrl}/api/local-news?city=${encodeURIComponent(city)}`
  );

  if (!response.ok) {
    throw new Error("Could not fetch local news.");
  }

  const data = await response.json();
  return data.articles || [];
}
