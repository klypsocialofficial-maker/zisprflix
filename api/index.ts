import express from "express";

const app = express();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/movies/search", async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }
    
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TMDB error: ${response.status} - ${text}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/watchmode/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const response = await fetch(`https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(query)})+AND+mediatype:(movies)+AND+format:(h.264+OR+MPEG4)&fl[]=identifier,title,description,year,downloads&rows=20&page=1&output=json`);
    if (!response.ok) {
      throw new Error(`Archive error: ${response.status}`);
    }
    const data = await response.json();
    
    const results = data.response.docs.map((doc: any) => ({
      id: `archive_${doc.identifier}`,
      name: doc.title,
      image_url: `https://archive.org/services/img/${doc.identifier}`,
      identifier: doc.identifier,
      source: 'archive'
    }));

    res.json({ results });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/watchmode/genres", async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (apiKey) {
      const response = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=pt-BR`);
      if (response.ok) {
        const data = await response.json();
        return res.json(data.genres);
      }
    }
    const fallbackGenres = [
      { id: 28, name: "Ação" },
      { id: 12, name: "Aventura" },
      { id: 16, name: "Animação" },
      { id: 35, name: "Comédia" },
      { id: 80, name: "Crime" },
      { id: 99, name: "Documentário" },
      { id: 18, name: "Drama" },
      { id: 10751, name: "Família" },
      { id: 14, name: "Fantasia" },
      { id: 36, name: "História" },
      { id: 27, name: "Terror" },
      { id: 10402, name: "Música" },
      { id: 9648, name: "Mistério" },
      { id: 10749, name: "Romance" },
      { id: 878, name: "Ficção Científica" },
      { id: 53, name: "Suspense" },
      { id: 10752, name: "Guerra" },
      { id: 37, name: "Faroeste" }
    ];
    res.json(fallbackGenres);
  } catch (error: any) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/watchmode/popular", async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    const genres = req.query.genres as string;
    
    if (apiKey) {
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&page=1`;
        if (genres) {
            url += `&with_genres=${genres}`;
        }
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }
    }

    // Fallback to archive
    let queryStr = 'collection:(SciFi_Horror+OR+feature_films+OR+comedy_films)+AND+mediatype:(movies)+AND+format:(h.264+OR+MPEG4)';
    if (genres) {
      const genreMap: Record<string, string> = {
        '1': 'action',
        '2': 'adventure',
        '3': 'animation',
        '4': 'comedy',
        '5': 'crime',
        '6': 'documentary',
        '7': 'drama',
        '8': 'family',
        '9': 'fantasy',
        '11': 'history',
        '12': 'horror',
        '13': 'music',
        '14': 'musical',
        '15': 'mystery',
        '18': 'romance',
        '19': 'sci-fi',
        '22': 'thriller',
        '24': 'war',
        '25': 'western'
      };
      const genreQuery = genreMap[genres];
      if (genreQuery) {
        queryStr += `+AND+subject:(${genreQuery})`;
      }
    }

    const response = await fetch(`https://archive.org/advancedsearch.php?q=${queryStr}&fl[]=identifier,title,description,year,downloads&sort[]=downloads+desc&rows=20&page=1&output=json`);
    if (!response.ok) throw new Error(`Archive error: ${response.status}`);
    const data = await response.json();
    
    const results = data.response.docs.map((doc: any) => ({
      id: `archive_${doc.identifier}`,
      title: doc.title,
      name: doc.title,
      overview: doc.description ? doc.description.substring(0, 300) : '',
      release_date: doc.year ? `${doc.year}-01-01` : '',
      poster_path: `https://archive.org/services/img/${doc.identifier}`,
      backdrop_path: `https://archive.org/services/img/${doc.identifier}`,
      image_url: `https://archive.org/services/img/${doc.identifier}`,
      source: 'archive',
      identifier: doc.identifier
    }));

    res.json({ results });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/movies/details/:id", async (req, res) => {
  try {
    const movieId = req.params.id;
    if (movieId.startsWith('archive_')) {
      const identifier = movieId.replace('archive_', '');
      return res.json({
        id: movieId,
        title: `Archive: ${identifier}`,
        overview: "Internet Archive movie.",
        genres: []
      });
    }
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=pt-BR`);
    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/movies/:id/videos", async (req, res) => {
  try {
    const movieId = req.params.id;
    if (movieId.startsWith('archive_')) {
      return res.json({ results: [] });
    }
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=pt-BR`);
    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/movies/:id/similar", async (req, res) => {
  try {
    const movieId = req.params.id;
    if (movieId.startsWith('archive_')) {
      return res.json({ results: [] });
    }
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${apiKey}&language=pt-BR`);
    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/youtube/channel/:channelId", async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured" });
    }
    const channelId = req.params.channelId;
    
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    if (!channelRes.ok) {
      const text = await channelRes.text();
      throw new Error(`YouTube API error (channels): ${channelRes.status} - ${text}`);
    }
    const channelData = await channelRes.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return res.json({ items: [] });
    }
    
    const uploadsId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=20&key=${apiKey}`);
    if (!playlistRes.ok) {
      const text = await playlistRes.text();
      throw new Error(`YouTube API error (playlistItems): ${playlistRes.status} - ${text}`);
    }
    const data = await playlistRes.json();
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/movies/popular", async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (apiKey) {
      const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`);
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    }

    // Fallback to Archive
    const response = await fetch(`https://archive.org/advancedsearch.php?q=collection:(SciFi_Horror+OR+feature_films+OR+comedy_films)+AND+mediatype:(movies)+AND+format:(h.264+OR+MPEG4)&fl[]=identifier,title,description,year,downloads&sort[]=downloads+desc&rows=40&page=1&output=json`);
    if (!response.ok) {
      throw new Error(`Archive error: ${response.status}`);
    }
    const data = await response.json();
    
    const movies = data.response.docs.map((doc: any) => ({
      id: `archive_${doc.identifier}`,
      title: doc.title,
      overview: doc.description ? doc.description.substring(0, 300) : '',
      release_date: doc.year ? `${doc.year}-01-01` : '',
      poster_path: `https://archive.org/services/img/${doc.identifier}`,
      backdrop_path: `https://archive.org/services/img/${doc.identifier}`,
      source: 'archive',
      identifier: doc.identifier
    }));

    res.json({ results: movies });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/archive/stream/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const response = await fetch(`https://archive.org/metadata/${identifier}`);
    if (!response.ok) {
      throw new Error(`Archive metadata error: ${response.status}`);
    }
    const data = await response.json();
    const files = data.files || [];
    const playable = 
      files.find((f: any) => (f.name.endsWith('.mp4') || f.name.endsWith('.m4v')) && f.format === '512Kb MPEG4') ||
      files.find((f: any) => (f.name.endsWith('.mp4') || f.name.endsWith('.m4v')) && f.format === 'h.264') ||
      files.find((f: any) => (f.name.endsWith('.mp4') || f.name.endsWith('.m4v')) && f.format === 'MPEG4') ||
      files.find((f: any) => f.name.endsWith('.mp4') || f.name.endsWith('.m4v'));
    
    if (playable) {
      let finalUrl = `https://archive.org/download/${identifier}/${playable.name}`;
      try {
        const headRes = await fetch(finalUrl, { method: 'HEAD' });
        if (headRes.url) {
          finalUrl = headRes.url;
        }
      } catch(e) {
        console.warn("Could not resolve HEAD", e);
      }
      res.json({ url: finalUrl });
    } else {
      res.status(404).json({ error: "No playable stream found" });
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
