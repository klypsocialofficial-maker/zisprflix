import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Info, X, Search as SearchIcon } from 'lucide-react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;
import PersistentPlayer from './PersistentPlayer';
import MovieCard from './MovieCard';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Movie {
  id: number | string;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  isArchive?: boolean;
  identifier?: string;
  isYoutube?: boolean;
  source?: string;
}

interface CatalogProps {
  activeTab: string;
  searchQuery: string;
  user: User;
  profileId: string;
  onSearchQueryChange?: (query: string) => void;
}

export default function Catalog({ activeTab, searchQuery, user, profileId, onSearchQueryChange }: CatalogProps) {
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [classics, setClassics] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<{ id: string | number, name: string }[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<string | number | null>(null);
  const [watchmodeMovies, setWatchmodeMovies] = useState<Movie[]>([]);
  const [watchmodeLoading, setWatchmodeLoading] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch('/api/watchmode/genres');
        if (res.ok) {
          const data = await res.json();
          setGenres([{ id: '', name: 'Todos os Gêneros' }, ...(data || [])]);
        }
      } catch (err) {
        console.error("Error fetching watchmode genres:", err);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    if (selectedGenreId === null) return;
    
    const fetchWatchmodeByGenre = async () => {
      setWatchmodeLoading(true);
      try {
        const queryParam = selectedGenreId ? `?genres=${selectedGenreId}` : '';
        const res = await fetch(`/api/watchmode/popular${queryParam}`);
        if (!res.ok) throw new Error('Falha ao filtrar filmes por gênero.');
        const data = await res.json();
        setWatchmodeMovies(data.results || []);
      } catch (err: any) {
        console.error(err);
        setError('Falha ao carregar catálogo de filmes por gênero.');
      } finally {
        setWatchmodeLoading(false);
      }
    };
    
    fetchWatchmodeByGenre();
  }, [selectedGenreId]);

  useEffect(() => {
    const fetchSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`/api/watchmode/search?q=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Falha ao buscar filmes');
            const data = await response.json();
            
            // Map Watchmode/Archive data to Movie interface
            const movies: Movie[] = data.results.map((m: any) => ({
                id: m.id,
                title: m.name,
                poster_path: m.image_url,
                backdrop_path: m.image_url,
                overview: '',
                release_date: '',
                source: m.source,
                identifier: m.identifier
            }));
            setSearchResults(movies);
        } catch (error) {
            console.error(error);
            setError('Falha ao buscar filmes');
        } finally {
            setLoading(false);
        }
    };
    if (searchQuery.trim()) {
        fetchSearch();
    } else {
        setLoading(false);
    }
  }, [searchQuery]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingTitle, setPlayingTitle] = useState<string>('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [inlinePlaying, setInlinePlaying] = useState(false);
  const [inlineUrl, setInlineUrl] = useState<string | null>(null);

  useEffect(() => {
    setInlinePlaying(false);
    setInlineUrl(null);
    if (!selectedMovie) {
      setSimilar([]);
      return;
    }
    const fetchSimilar = async () => {
      try {
        const res = await fetch(`/api/movies/${selectedMovie.id}/similar`);
        if (res.ok) {
          const data = await res.json();
          const movies: Movie[] = (data.results || []).slice(0, 10).map((m: any) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            overview: m.overview,
            release_date: m.release_date
          }));
          setSimilar(movies);
        }
      } catch (err) {
        console.error("Error fetching similar movies:", err);
      }
    };
    fetchSimilar();
  }, [selectedMovie]);

  const startInlinePlay = async (movie: Movie) => {
    setIsLoadingVideo(true);
    try {
      if (movie.source === 'archive' && movie.identifier) {
        const res = await fetch(`/api/archive/stream/${movie.identifier}`);
        if (res.ok) {
          const data = await res.json();
          setInlineUrl(data.url);
          setInlinePlaying(true);
          setIsLoadingVideo(false);
          return;
        } else {
          alert('Stream não encontrado para este filme.');
          setIsLoadingVideo(false);
          return;
        }
      }

      if (movie.isYoutube) {
        setInlineUrl(`https://www.youtube.com/watch?v=${movie.id}`);
        setInlinePlaying(true);
        setIsLoadingVideo(false);
        return;
      }

      // Check DB first for direct mp4 link
      const movieDocRef = doc(db, 'movie_videos', String(movie.id));
      const movieDoc = await getDoc(movieDocRef);
      if (movieDoc.exists() && movieDoc.data()?.url) {
        setInlineUrl(movieDoc.data().url);
        setInlinePlaying(true);
        setIsLoadingVideo(false);
        return;
      }

      // Fallback TMDB
      const res = await fetch(`/api/movies/${movie.id}/videos`);
      if (res.ok) {
        const data = await res.json();
        let youtubeVideos = data.results?.filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
        if (!youtubeVideos || youtubeVideos.length === 0) {
          youtubeVideos = data.results?.filter((v: any) => v.site === 'YouTube');
        }

        if (youtubeVideos && youtubeVideos.length > 0) {
          setInlineUrl(`https://www.youtube.com/watch?v=${youtubeVideos[0].key}`);
          setInlinePlaying(true);
        } else {
          alert('Trailer não disponível no YouTube para este filme.');
        }
      } else {
        alert('Erro ao carregar o vídeo.');
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar o trailer.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const watchMovie = async (movie: Movie) => {
    setIsLoadingVideo(true);
    try {
      if (movie.source === 'archive' && movie.identifier) {
        const res = await fetch(`/api/archive/stream/${movie.identifier}`);
        if (res.ok) {
          const data = await res.json();
          setPlayingUrl(data.url);
          setPlayingTitle(movie.title);
          setIsLoadingVideo(false);
          return;
        } else {
          alert('Stream não encontrado para este filme.');
          setIsLoadingVideo(false);
          return;
        }
      }

      if (movie.isYoutube) {
        setPlayingUrl(`https://www.youtube.com/watch?v=${movie.id}`);
        setPlayingTitle(movie.title);
        setIsLoadingVideo(false);
        return;
      }

      // First, look up our database to see if we have a direct MP4 link
      const movieDocRef = doc(db, 'movie_videos', String(movie.id));
      const movieDoc = await getDoc(movieDocRef);
      
      if (movieDoc.exists() && movieDoc.data()?.url) {
        setPlayingUrl(movieDoc.data().url);
        setPlayingTitle(movie.title);
        setIsLoadingVideo(false);
        return;
      }

      // Fallback: search for trailer in TMDB
      const res = await fetch(`/api/movies/${movie.id}/videos`);
      if (res.ok) {
        const data = await res.json();
        const youtubeVideos = data.results?.filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
        if (youtubeVideos && youtubeVideos.length > 0) {
          setPlayingUrl(`https://www.youtube.com/watch?v=${youtubeVideos[0].key}`);
          setPlayingTitle(movie.title);
        } else {
          alert('Trailer não disponível para este vídeo.');
        }
      } else {
        alert('Erro ao carregar o vídeo.');
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível conectar ao servidor para buscar o vídeo.');
    } finally {
        setIsLoadingVideo(false);
    }
  };



  const [myList, setMyList] = useState<Movie[]>([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from TMDB API
        const response = await fetch('/api/movies/popular');
        
        if (!response.ok) {
           throw new Error('Falha ao carregar o catálogo.');
        }
        
        const data = await response.json();
        
        // Map TMDB data to Movie interface
        const movies: Movie[] = (data.results || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path, // TMDB path
            backdrop_path: m.backdrop_path,
            overview: m.overview,
            release_date: m.release_date,
            source: m.source,
            identifier: m.identifier
        }));
        
        setPopular(movies);
        setTopRated(movies); // Using same list for now
        setClassics(movies);
      } catch (err) {
        console.error(err);
        setError('Falha ao carregar o catálogo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCatalog();
  }, []);

  useEffect(() => {
    const fetchMyList = async () => {
        if (activeTab === 'minhaLista') {
            const listRef = collection(db, 'users', user.uid, 'profiles', profileId, 'myList');
            const snapshot = await getDocs(listRef);
            setMyList(snapshot.docs.map(doc => doc.data() as Movie));
        }
    };
    fetchMyList();
  }, [activeTab, profileId, user.uid]);

  const toggleMyList = async (movie: Movie) => {
    const listRef = doc(db, 'users', user.uid, 'profiles', profileId, 'myList', String(movie.id));
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
        await deleteDoc(listRef);
        setMyList(prev => prev.filter(m => m.id !== movie.id));
    } else {
        await setDoc(listRef, movie);
        setMyList(prev => [...prev, movie]);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center h-screen items-center text-red-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
     return (
       <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 gap-4">
         <div className="bg-red-600/20 text-red-400 p-6 rounded-xl border border-red-600/40 max-w-lg">
           <Info className="w-12 h-12 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-white mb-2">Ops, algo deu errado!</h2>
           <p>{error}</p>
         </div>
       </div>
     )
  }

  const featured = popular[0];

  return (
    <div className="flex flex-col gap-12 pb-20">
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedMovie(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setInlinePlaying(false);
                  setTimeout(() => setSelectedMovie(null), 150);
                }} 
                className="absolute top-4 right-4 z-30 bg-black/60 p-2 rounded-full hover:bg-white hover:text-black text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="relative h-64 sm:h-[450px] w-full shrink-0">
                {inlineUrl ? (
                  <div className="w-full h-full bg-black relative pointer-events-none z-0">
                    <Player
                      url={inlineUrl}
                      playing={inlinePlaying}
                      muted={true}
                      loop={true}
                      controls={false}
                      width="100%"
                      height="100%"
                      style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
                      config={{
                        youtube: {
                          playerVars: { showinfo: 0, controls: 0, rel: 0, modestbranding: 1 }
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                  </div>
                ) : (
                  <div 
                    className="relative w-full h-full cursor-pointer group"
                    onClick={() => startInlinePlay(selectedMovie)}
                  >
                    <img 
                      src={selectedMovie.isYoutube 
                        ? selectedMovie.poster_path 
                        : (selectedMovie.isArchive && selectedMovie.identifier 
                          ? `https://archive.org/services/img/${selectedMovie.identifier}`
                          : `https://image.tmdb.org/t/p/original${selectedMovie.backdrop_path || selectedMovie.poster_path}`
                        )} 
                      className="w-full h-full object-cover bg-zinc-800 transition-transform group-hover:scale-[1.01] duration-500" 
                      alt={selectedMovie.title}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="bg-black/60 p-4 rounded-full text-white scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                        <Play fill="white" size={32} />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent pointer-events-none" />
                  </div>
                )}
              </div>
              
              <div className="p-8 sm:p-12 relative z-10 overflow-y-auto -mt-24 sm:-mt-32">
                <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight drop-shadow-md">{selectedMovie.title}</h2>
                <div className="flex items-center gap-4 mb-6 text-sm sm:text-base">
                  <span className="text-green-500 font-bold">Relevância 98%</span>
                  <span className="text-gray-300 border border-gray-600 px-2 py-0.5 rounded text-xs">HD</span>
                  {selectedMovie.release_date && (
                    <span className="text-gray-300">{new Date(selectedMovie.release_date).getFullYear()}</span>
                  )}
                </div>
                <p className="text-gray-200 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
                  {selectedMovie.overview || "Nenhuma sinopse disponível para este título."}
                </p>
                <div className="flex gap-4 mb-10">
                  <button 
                    onClick={() => {
                      setInlinePlaying(false);
                      setTimeout(() => {
                        setSelectedMovie(null);
                        watchMovie(selectedMovie);
                      }, 150);
                    }}
                    disabled={isLoadingVideo}
                    className="flex border-none items-center gap-2 bg-white text-black px-8 py-3 rounded text-lg font-bold hover:bg-white/80 transition-colors disabled:opacity-50"
                  >
                    <Play fill="black" size={20} /> {isLoadingVideo ? 'Carregando...' : 'Assistir'}
                  </button>
                  <button 
                    onClick={() => toggleMyList(selectedMovie)}
                    className="flex items-center gap-2 bg-zinc-800 text-white px-6 py-3 rounded text-lg font-bold hover:bg-zinc-700 transition-colors"
                  >
                     {myList.some(m => m.id === selectedMovie.id) ? 'Remover da Lista' : 'Minha Lista'}
                  </button>
                </div>

                {similar.length > 0 && (
                  <div className="mt-8 border-t border-white/10 pt-8">
                    <h3 className="text-xl sm:text-2xl font-bold mb-6 text-white">Títulos Semelhantes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
                      {similar.map((movie) => (
                        <motion.div
                          key={movie.id}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => {
                            setSelectedMovie(movie);
                          }}
                          className="aspect-[2/3] rounded-md overflow-hidden cursor-pointer bg-zinc-800 relative group border border-white/5 shadow-md"
                        >
                          {movie.poster_path || (movie.isArchive && movie.identifier) ? (
                            <img 
                              src={movie.poster_path 
                                ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                                : `https://archive.org/services/img/${movie.identifier}`
                              } 
                              alt={movie.title} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-center p-4 text-gray-500 text-sm font-medium">{movie.title}</div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <span className="text-xs text-white font-bold line-clamp-2 mb-1">{movie.title}</span>
                            <span className="text-[10px] text-green-500 font-bold">Assistir Trailer</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PersistentPlayer 
        url={playingUrl} 
        title={playingTitle} 
        onClose={() => setPlayingUrl(null)} 
      />

      {activeTab === 'pesquisa_mobile' ? (
        <div className="safe-top-padding px-4 sm:px-8 flex flex-col gap-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar filmes, clássicos e categorias..."
              value={searchQuery}
              onChange={e => {
                onSearchQueryChange?.(e.target.value);
                if (selectedGenreId !== null) setSelectedGenreId(null);
              }}
              className="w-full bg-zinc-900 border border-white/10 text-white rounded-full py-3.5 pl-11 pr-12 text-sm focus:outline-none focus:border-red-600 transition-all font-medium placeholder-zinc-500 shadow-xl"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchQueryChange?.('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {searchQuery.trim() ? (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Resultados Encontrados</h3>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {searchResults.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onClick={() => setSelectedMovie(movie)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <SearchIcon size={48} className="mb-4 opacity-50" />
                  <p className="text-xl">Nenhum título encontrado.</p>
                </div>
              )}
            </div>
          ) : selectedGenreId !== null ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white capitalize">
                  Filmes de {genres.find(g => g.id === selectedGenreId)?.name || 'Gênero'}
                </h3>
                <button 
                  onClick={() => setSelectedGenreId(null)}
                  className="text-xs text-red-500 font-extrabold hover:underline cursor-pointer border-none bg-transparent"
                >
                  Voltar para Categorias
                </button>
              </div>

              {watchmodeLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {watchmodeMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onClick={() => setSelectedMovie(movie)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Navegar por Gêneros</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
                {genres.filter(g => g.id !== '').map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGenreId(g.id)}
                    className="bg-zinc-900 border border-white/5 py-4 px-5 rounded-2xl text-left text-sm font-extrabold flex items-center justify-between transition-all hover:bg-zinc-800 hover:border-white/10 group cursor-pointer"
                  >
                    <span className="group-hover:text-red-500 transition-colors">{g.name}</span>
                    <span className="text-zinc-600 group-hover:text-red-500 transition-colors">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : searchQuery.trim() ? (
        <div className="pt-28 md:pt-24 px-4 sm:px-8 safe-top-padding">
          <h2 className="text-2xl font-bold mb-6 text-gray-400">
            Resultados para: <span className="text-white">"{searchQuery}"</span>
          </h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <SearchIcon size={48} className="mb-4 opacity-50" />
              <p className="text-xl">Nenhum título encontrado.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'minhaLista' ? (
        <div className="pt-28 md:pt-24 px-4 sm:px-8 safe-top-padding">
          <h2 className="text-2xl font-bold mb-6 text-white">Minha Lista</h2>
          {myList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myList.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p className="text-xl">Sua lista está vazia.</p>
             </div>
          )}
        </div>
      ) : activeTab === 'series' ? (
        <div className="safe-top-padding flex flex-col items-center justify-center text-center h-[60vh] px-4">
            <h1 className="text-5xl font-black text-white mb-4">Séries</h1>
            <p className="text-gray-400 text-xl">Em breve um catálogo completo de séries para você.</p>
        </div>
      ) : (
        <div className="pt-28 md:pt-24 px-4 sm:px-8 safe-top-padding">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white capitalize">
              {activeTab === 'filmes' ? 'Filmes Populares' : 
               activeTab === 'classicos' ? 'Clássicos' : 
               activeTab === 'bombando' ? 'Bombando' : 'Catálogo'}
            </h2>
            
            {/* Seletor de Gêneros do Watchmode */}
            {genres.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 max-w-full scrollbar-none">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider shrink-0 hidden sm:inline">Filtrar por Gênero:</span>
                <div className="flex gap-2">
                  {genres.map((g) => {
                    const isSelected = selectedGenreId === g.id || (g.id === '' && selectedGenreId === null);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGenreId(g.id === '' ? null : g.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap border-none cursor-pointer ${
                          isSelected 
                            ? 'bg-red-600 text-white font-black shadow-lg shadow-red-600/30' 
                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {watchmodeLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(selectedGenreId !== null ? watchmodeMovies : (
                activeTab === 'filmes' ? popular : 
                activeTab === 'classicos' ? classics : 
                activeTab === 'bombando' ? topRated : popular
              )).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
