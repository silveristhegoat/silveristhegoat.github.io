const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_IMAGE_URL = "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg";

app.use(express.static(path.join(__dirname, "public")));

function mapBreedToCard(breed) {
  const imageUrl = breed.image?.url
    ? breed.image.url
    : breed.reference_image_id
      ? `https://cdn2.thecatapi.com/images/${breed.reference_image_id}.jpg`
      : FALLBACK_IMAGE_URL;

  return {
    id: breed.id,
    imageUrl,
    name: breed.name || "Unknown Cat",
    origin: breed.origin || "Unknown",
    temperament: breed.temperament || "Not available",
    lifeSpan: breed.life_span || "Not available",
    description: breed.description || "No description available.",
    intelligence: breed.intelligence ?? "Not available",
    dogFriendly: breed.dog_friendly ?? "Not available",
    childFriendly: breed.child_friendly ?? "Not available",
    wikipediaUrl: breed.wikipedia_url || ""
  };
}

async function fetchAllBreeds() {
  const response = await fetch("https://api.thecatapi.com/v1/breeds");

  if (!response.ok) {
    throw new Error(`TheCatAPI returned status ${response.status}`);
  }

  return response.json();
}

app.get("/api/cats", async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requestedLimit)
    ? 9
    : Math.min(Math.max(requestedLimit, 1), 20);

  try {
    const breeds = await fetchAllBreeds();

    const pool = breeds.filter((breed) => breed.image?.url || breed.reference_image_id);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, limit);

    const cats = selected.map(mapBreedToCard);

    res.json(cats);
  } catch (error) {
    console.error("Failed to load cat data:", error.message);
    res.status(500).json({
      message: "Could not fetch cats from external API."
    });
  }
});

app.get("/api/breeds/search", async (req, res) => {
  const query = String(req.query.query || "").trim().toLowerCase();
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requestedLimit)
    ? 24
    : Math.min(Math.max(requestedLimit, 1), 50);

  if (!query) {
    res.json([]);
    return;
  }

  try {
    const breeds = await fetchAllBreeds();
    const matches = breeds
      .filter((breed) => String(breed.name || "").toLowerCase().includes(query))
      .slice(0, limit)
      .map(mapBreedToCard);

    res.json(matches);
  } catch (error) {
    console.error("Failed to search breeds:", error.message);
    res.status(500).json({
      message: "Could not search breeds from external API."
    });
  }
});

app.get("/api/daily-cat", async (req, res) => {
  const requestedDate = String(req.query.date || "").trim();
  const date = requestedDate ? new Date(requestedDate) : new Date();

  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ message: "Invalid date format." });
    return;
  }

  try {
    const breeds = await fetchAllBreeds();
    const pool = breeds.filter((breed) => breed.image?.url || breed.reference_image_id);

    if (pool.length === 0) {
      res.status(404).json({ message: "No cat breeds available." });
      return;
    }

    const dateKey = date.toISOString().slice(0, 10);
    const daySeed = dateKey
      .split("")
      .reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
    const index = daySeed % pool.length;
    const cat = mapBreedToCard(pool[index]);

    res.json({
      date: dateKey,
      cat
    });
  } catch (error) {
    console.error("Failed to load daily cat:", error.message);
    res.status(500).json({
      message: "Could not fetch daily cat from external API."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
