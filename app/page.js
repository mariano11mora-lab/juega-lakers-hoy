"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [gameToday, setGameToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Obtener la fecha actual en formato YYYY-MM-DD sin desfase horario
  const getTodayString = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());
  };

  // Parsea la fecha de la API ignorando la hora UTC para que no "salte" de día
  function parseGameDate(dateStr, isTodayGame) {
    const datePart = dateStr.split("T")[0]; // "2026-05-01"
    
    if (isTodayGame) {
      // Si sabemos que es hoy, forzamos las 22:30 de Argentina
      const d = new Date(`${datePart}T22:30:00-03:00`);
      return d;
    }
    // Para otros días, usamos una hora estándar (ej. 21hs) para que no sea ayer
    return new Date(`${datePart}T21:00:00-03:00`);
  }

  async function fetchGames() {
    try {
      const todayStr = getTodayString();
      
      const res = await fetch(
        `https://api.balldontlie.io/v1/games?team_ids[]=14&start_date=${todayStr}&per_page=10`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
          },
        }
      );

      const data = await res.json();
      const games = data.data || [];

      if (games.length > 0) {
        // Ordenamos para asegurarnos de que el primero sea el más cercano
        const sorted = games.sort((a, b) => a.date.localeCompare(b.date));
        setGameToday(sorted[0]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1. Carga inicial al abrir la página
    fetchGames();

    // 2. Reloj y refresco de datos
    let secondsCounter = 0;
    const interval = setInterval(() => {
      setNow(Date.now());
      secondsCounter++;

      // Cada 60 segundos (cuando el contador llega a 60) pide los puntos nuevos
      if (secondsCounter >= 60) {
        fetchGames();
        secondsCounter = 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // <--- Importante que estén estos corchetes

  // Lógica de estados
  const todayStr = getTodayString();
  const gameDatePart = gameToday?.date.split("T")[0];
  const isToday = gameToday && gameDatePart === todayStr;
  
  const gameFullDate = gameToday ? parseGameDate(gameToday.date, isToday) : null;
  const gameTime = gameFullDate?.getTime() || 0;

  const isLive = isToday && now >= gameTime && gameToday?.status !== "Final";

  function getCountdown() {
    const diff = gameTime - now;
    if (diff <= 0) return "¡En juego!";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `Faltan ${hours}h ${minutes}m ${seconds}s`;
  }

  const formattedDate = gameFullDate
    ? new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(gameFullDate)
    : "";

  function getLogo(team) {
    const map = {
      1: "atl", 2: "bos", 3: "bkn", 4: "cha", 5: "chi",
      6: "cle", 7: "dal", 8: "den", 9: "det", 10: "gsw",
      11: "hou", 12: "ind", 13: "lac", 14: "lal", 15: "mem",
      16: "mia", 17: "mil", 18: "min", 19: "nop", 20: "nyk",
      21: "okc", 22: "orl", 23: "phi", 24: "phx", 25: "por",
      26: "sac", 27: "sas", 28: "tor", 29: "uta", 30: "wsh",
    };
    return `https://a.espncdn.com/i/teamlogos/nba/500/${map[team.id] || "nba"}.png`;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
      isLive ? "bg-gradient-to-br from-[#552583] to-[#FDB927] text-black" : "bg-purple-900 text-white"
    }`}>
      <div className="flex flex-col items-center text-center space-y-6 w-full max-w-lg px-4">
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
          ¿Hoy juegan los Lakers?
        </h1>

        {!loading && gameToday && (
          <h2 className={`text-6xl font-black ${isLive ? "animate-bounce" : ""}`}>
            {isLive ? "🏀 ¡AHORA!" : isToday ? "✅ SÍ" : "❌ NO"}
          </h2>
        )}

        {loading ? (
          <p className="animate-pulse text-xl">Consultando a la NBA...</p>
        ) : gameToday ? (
          <div className="w-full space-y-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col items-center">
                  <img src={getLogo(gameToday.home_team)} className="w-20 h-20 drop-shadow-lg" alt="Home" />
                  <p className="font-bold mt-2 text-sm uppercase">{gameToday.home_team.name}</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black opacity-50">VS</span>
                  {isLive && (
                    <div className="text-4xl font-black tabular-nums mt-1">
                      {gameToday.home_team_score} - {gameToday.visitor_team_score}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col items-center">
                  <img src={getLogo(gameToday.visitor_team)} className="w-20 h-20 drop-shadow-lg" alt="Visitor" />
                  <p className="font-bold mt-2 text-sm uppercase">{gameToday.visitor_team.name}</p>
                </div>
              </div>

              {isLive && (
                <div className="inline-block mt-6 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">
                  EN VIVO
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Próximo Salto</p>
              <p className="text-xl font-medium capitalize">{formattedDate}</p>
              
              {!isLive && now < gameTime && (
                <p className="mt-4 text-2xl font-black text-yellow-400 font-mono tracking-tight">
                  {getCountdown()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xl opacity-50">No hay partidos programados próximamente.</p>
        )}
      </div>
    </div>
  );
}