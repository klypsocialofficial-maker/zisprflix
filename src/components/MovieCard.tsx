import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

const videoCache: Record<string | number, string | null> = {};

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

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
    let timer: NodeJS.Timeout;

    if (isHovered) {
      timer = setTimeout(async () => {
        if (!isHoveredRef.current) return;

        if (movie.isYoutube) {
          setVideoUrl(`https://www.youtube.com/watch?v=${movie.id}`);
          setIsPlaying(true);
          return;
        }

        if (movie.source === 'archive' && movie.identifier) {
          try {
            const res = await fetch(`/api/archive/stream/${movie.identifier}`);
            if (res.ok && isHoveredRef.current) {
              const data = await res.json();
              setVideoUrl(data.url);
              setIsPlaying(true);
            }
          } catch(e) {
            console.error('Error fetching archive hover video', e);
          }
          return;
        }

        const cached = videoCache[movie.id];
        if (cached !== undefined) {
          if (cached && isHoveredRef.current) {
            setVideoUrl(cached);
            setIsPlaying(true);
          }
          return;
        }

        try {
          const res = await fetch(`/api/movies/${movie.id}/videos`);
          if (res.ok && isHoveredRef.current) {
            const data = await res.json();
            let youtubeVideos = data.results?.filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
            if (!youtubeVideos || youtubeVideos.length === 0) {
              youtubeVideos = data.results?.filter((v: any) => v.site === 'YouTube');
            }

            if (youtubeVideos && youtubeVideos.length > 0) {
              const url = `https://www.youtube.com/watch?v=${youtubeVideos[0].key}`;
              videoCache[movie.id] = url;
              if (isHoveredRef.current) {
                setVideoUrl(url);
                setIsPlaying(true);
              }
            } else {
              videoCache[movie.id] = null;
            }
          }
        } catch (err) {
          console.error("Error fetching hover video:", err);
        }
      }, 600);
    } else {
      setIsPlaying(false);
      // Wait before unmounting the video to allow the pause operation to resolve safely
      timer = setTimeout(() => {
        if (!isHoveredRef.current) {
          setVideoUrl(null);
          setIsReady(false);
        }
      }, 500);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isHovered, movie]);

  const hasPoster = !!movie.poster_path;
  const posterSrc = hasPoster
    ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
    : (movie.isArchive && movie.identifier ? `https://archive.org/services/img/${movie.identifier}` : '');

  return (
    <motion.div
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="aspect-[2/3] rounded-md overflow-hidden cursor-pointer bg-zinc-800 relative shadow-md select-none group border border-white/5"
    >
      {videoUrl ? (
        <div className={`absolute inset-0 bg-black w-full h-full transition-opacity duration-300 ${!isHovered || !isReady ? 'opacity-0' : 'opacity-100'}`}>
          <Player
            url={videoUrl}
            playing={isPlaying && isReady}
            onReady={() => setIsReady(true)}
            muted={true}
            loop={true}
            controls={false}
            width="100%"
            height="100%"
            config={{
              youtube: {
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  showinfo: 0,
                  rel: 0,
                  modestbranding: 1,
                  iv_load_policy: 3
                }
              }
            }}
          />
        </div>
      ) : hasPoster ? (
        <img 
          src={posterSrc} 
          alt={movie.title} 
          className="w-full h-full object-cover transition-opacity duration-300" 
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-zinc-900 border border-zinc-800 rounded-md">
          <span className="text-gray-300 text-sm font-bold line-clamp-3 mb-1">{movie.title}</span>
          <span className="text-zinc-500 text-xs">{movie.release_date ? new Date(movie.release_date).getFullYear() : ''}</span>
        </div>
      )}
      
      {/* Visual Indicator/Label Overlay on Hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <p className="text-white text-xs font-bold truncate">{movie.title}</p>
        <p className="text-red-500 text-[10px] font-semibold mt-0.5 uppercase tracking-wider">Trailer Auto-Play</p>
      </div>
    </motion.div>
  );
}
