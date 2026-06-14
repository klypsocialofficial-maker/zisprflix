import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;
import { Play, Pause, X, Maximize2, Minimize2, Volume2, VolumeX, Settings, MonitorPlay } from 'lucide-react';

interface PersistentPlayerProps {
  url: string | null;
  title: string;
  onClose: () => void;
}

export default function PersistentPlayer({ url, title, onClose }: PersistentPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const playerRef = useRef<any>(null);

  const activeUrl = url;

  useEffect(() => {
    if (url) {
      setPlayed(0);
      setIsReady(false);
      setPlaying(false);
      setErrorMsg(null);
    } else {
      setPlaying(false);
    }
  }, [url]);

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleToggleMute = () => {
    setMuted(!muted);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(val);
      } else if (playerRef.current.duration) {
        playerRef.current.currentTime = val * playerRef.current.duration;
      }
    }
  };

  const handleProgress = (state: { played: number }) => {
    setPlayed(state.played);
  };

  const handleReady = () => {
    setIsReady(true);
    setPlaying(true);
  };

  const closePlayer = () => {
    setPlaying(false);
    setTimeout(() => onClose(), 500); // Increased timeout to let pause resolve safely
  };

  return (
    <AnimatePresence>
      {url && (
        <motion.div
          key="persistent-player"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed left-0 right-0 z-[90] bg-black border-t border-white/5 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] transition-all duration-300 ${
            isExpanded 
              ? 'h-full inset-0 bottom-0 z-[110]' 
              : 'bottom-[calc(80px+env(safe-area-inset-bottom,0px))] md:bottom-0 h-24 sm:h-28'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-white/10 cursor-pointer group z-10">
            <div 
              className="h-full bg-red-600 transition-all group-hover:h-2 relative shadow-[0_0_10px_rgba(220,38,38,0.8)]" 
              style={{ width: `${played * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <input
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className={`flex h-full ${isExpanded ? 'flex-col sm:flex-row p-0 sm:p-6 pb-20 sm:pb-6 gap-6 overflow-y-auto sm:overflow-hidden' : 'items-center px-4 sm:px-8 gap-4'}`}>
            
            <div className={`relative bg-black shrink-0 ${
               isExpanded 
                ? 'w-full sm:w-2/3 lg:w-3/4 aspect-video sm:aspect-auto sm:h-full rounded-none sm:rounded-lg overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl' 
                : 'w-24 sm:w-32 h-16 sm:h-20 rounded overflow-hidden mt-1'
            }`}>
                {!isReady && !errorMsg && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 pointer-events-none z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                  </div>
                )}
                {errorMsg && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 border border-red-900/50 z-10">
                    <span className="text-red-500 text-sm px-4 text-center">{errorMsg}</span>
                  </div>
                )}
                
                {activeUrl && (activeUrl.includes('.archive.org') && activeUrl.includes('/embed/')) ? (
                  <iframe
                    src={activeUrl}
                    className="w-full h-full border-none"
                    allowFullScreen
                    onLoad={() => setIsReady(true)}
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                ) : activeUrl && activeUrl.includes('.archive.org') ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        playerRef.current = el;
                        el.volume = volume;
                        if (playing && el.paused) {
                          const playPromise = el.play();
                          if (playPromise !== undefined) {
                            playPromise.catch(e => {
                              if (e.name !== 'AbortError') console.warn('Error playing:', e?.message);
                            });
                          }
                        } else if (!playing && !el.paused) {
                          el.pause();
                        }
                      }
                    }}
                    key={activeUrl}
                    src={activeUrl}
                    autoPlay
                    muted={muted}
                    controls={isExpanded}
                    onCanPlay={() => {
                      setIsReady(true);
                      setPlaying(true);
                      if (playerRef.current) {
                        playerRef.current.volume = volume;
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const tgt = e.target as HTMLVideoElement;
                      if (tgt.duration > 0) {
                        setPlayed(tgt.currentTime / tgt.duration);
                      }
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onError={(e) => {
                      console.error('Video error with type:', e.type);
                      setErrorMsg('Erro ao carregar o vídeo. Tente outro.');
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : activeUrl && activeUrl.includes('vidlink.pro') ? (
                  <iframe
                    src={activeUrl}
                    className="w-full h-full border-none"
                    allowFullScreen
                    onLoad={() => setIsReady(true)}
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                ) : (
                  <Player
                    ref={playerRef}
                    key={activeUrl}
                    url={activeUrl || undefined}
                    playing={playing}
                    muted={muted}
                    volume={volume}
                    onReady={handleReady}
                    onProgress={handleProgress as any}
                    onError={(e: any) => {
                      console.error('ReactPlayer error');
                      setErrorMsg('Erro ao carregar o vídeo. Tente outro.');
                    }}
                    width="100%"
                    height="100%"
                    style={{ objectFit: 'contain' }}
                    controls={isExpanded} // Allow native controls when expanded if desired, though we override it below mostly
                    config={{
                      youtube: {
                        playerVars: { showinfo: 1, fs: 1 }
                      },
                      file: {
                        forceVideo: true,
                        attributes: {
                          controlsList: "nodownload noremoteplayback"
                        }
                      }
                    }}
                  />
                )}
              </div>

            <div className={`flex flex-col flex-grow ${isExpanded ? 'px-4 sm:px-0 w-full sm:w-1/3 lg:w-1/4 pb-8' : 'justify-center overflow-hidden'}`}>
               <h3 className={`font-bold text-white pr-4 ${isExpanded ? 'text-xl sm:text-3xl mb-2 sm:mb-4' : 'text-sm sm:text-base truncate'}`}>
                 {title}
               </h3>
               
               {isExpanded ? (
                 <div className="flex flex-col h-full text-zinc-400">
                   <p className="text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                     {activeUrl?.includes('vidlink.pro') 
                       ? "Reproduzindo via VidLink Premium." 
                       : activeUrl?.includes('.archive.org') 
                         ? "Reproduzindo diretamente através do Internet Archive." 
                         : "Reproduzindo via Stream."}
                   </p>

                   <div className="mt-auto flex flex-wrap items-center gap-2 sm:gap-3">
                     <button onClick={handlePlayPause} className="flex-1 min-w-[120px] sm:min-w-[150px] flex justify-center items-center gap-3 bg-white text-black py-3 rounded hover:bg-zinc-200 transition-all text-sm sm:text-base font-bold tracking-wide">
                       {playing ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} />}
                       {playing ? 'PAUSAR' : 'REPRODUZIR'}
                     </button>
                     <button onClick={handleToggleMute} className="p-3 bg-zinc-900/50 text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-all flex justify-center items-center shrink-0">
                       {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                   <span>{isReady ? 'Reproduzindo' : 'Carregando...'}</span>
                 </div>
               )}
            </div>

            {/* Compact Controls (Bottom Bar) */}
            {!isExpanded && (
              <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
                <button onClick={handlePlayPause} className="p-2 sm:p-2.5 bg-white text-black rounded-full hover:bg-gray-200 transition-colors hidden sm:flex">
                  {playing ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
                </button>
                <button onClick={handlePlayPause} className="p-2 text-white hover:text-red-500 transition-colors sm:hidden">
                  {playing ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                </button>
                
                <button onClick={handleToggleMute} className="p-2 text-zinc-400 hover:text-white transition-colors hidden sm:block">
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block"></div>

                <button 
                  onClick={() => setIsExpanded(true)} 
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                  title="Expandir"
                >
                  <Maximize2 size={20} />
                </button>
                
                <button 
                  onClick={closePlayer} 
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
            )}
            
            {/* Close/Minimize for Expanded View - Mobile/Desktop */}
            {isExpanded && (
              <div className="absolute top-6 right-6 flex gap-4 z-50">
                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="p-3 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-md transition-all border border-white/10 hover:scale-105"
                >
                  <Minimize2 size={24} />
                </button>
                <button 
                  onClick={closePlayer} 
                  className="p-3 bg-black/60 text-white rounded-full hover:bg-red-600 backdrop-blur-md transition-all border border-white/10 hover:scale-105"
                >
                  <X size={24} />
                </button>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
