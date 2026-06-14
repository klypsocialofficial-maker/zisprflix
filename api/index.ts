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
    const apiKey = process.env.WATCHMODE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "WATCHMODE_API_KEY is not configured" });
    }
    const response = await fetch(`https://api.watchmode.com/v1/genres/?apiKey=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Watchmode error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching watchmode genres:", error);
    const fallbackGenres = [
      { id: 1, name: "Ação" },
      { id: 2, name: "Aventura" },
      { id: 3, name: "Animação" },
      { id: 4, name: "Comédia" },
      { id: 5, name: "Crime" },
      { id: 6, name: "Documentário" },
      { id: 7, name: "Drama" },
      { id: 8, name: "Família" },
      { id: 9, name: "Fantasia" },
      { id: 11, name: "História" },
      { id: 12, name: "Terror" },
      { id: 13, name: "Música" },
      { id: 14, name: "Musical" },
      { id: 15, name: "Mistério" },
      { id: 18, name: "Romance" },
      { id: 19, name: "Ficção Científica" },
      { id: 22, name: "Suspense" },
      { id: 24, name: "Guerra" },
      { id: 25, name: "Faroeste" }
    ];
    res.json(fallbackGenres);
  }
});

app.get("/api/watchmode/popular", async (req, res) => {
  try {
    const apiKey = process.env.WATCHMODE_API_KEY;
    const genres = req.query.genres as string;
    
    if (apiKey) {
        let url = `https://api.watchmode.com/v1/list-titles/?apiKey=${apiKey}&types=movie&sort_by=popularity_desc&limit=20`;
        if (genres) {
            url += `&genres=${genres}`;
        }
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const movies = await Promise.all(data.titles.slice(0, 10).map(async (t: any) => {
                const detailRes = await fetch(`https://api.watchmode.com/v1/title/${t.id}/details/?apiKey=${apiKey}&append_to_response=poster_path`);
                const detail = await detailRes.json();
                return {
                    id: t.id,
                    title: t.title,
                    poster_path: detail.poster,
                    backdrop_path: detail.backdrop,
                    overview: detail.plot_overview,
                    release_date: detail.release_date,
                    source: 'watchmode'
                };
            }));
            return res.json({ results: movies });
        }
    }

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
