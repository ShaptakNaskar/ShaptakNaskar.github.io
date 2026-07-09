import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, Music, Youtube, Radio } from 'lucide-react';

const rankIcon = (i) => {
  if (i === 0) return <Crown className="text-yellow-400" size={22} />;
  if (i === 1) return <Medal className="text-gray-300" size={22} />;
  if (i === 2) return <Award className="text-amber-600" size={22} />;
  return <span className="text-gray-400 font-bold w-[22px] text-center">{i + 1}</span>;
};

const fmtHours = (secs) => {
  const h = Math.floor((secs || 0) / 3600);
  const m = Math.floor(((secs || 0) % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function HanamimiLeaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hanamimi/leaderboard');
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Could not load the leaderboard right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto px-4 py-10"
    >
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="text-primary" size={28} />
        <h1 className="text-3xl font-bold">Hanamimi+ Leaderboard</h1>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Top 10 listeners by total time. Everyone here chose to share their
        stats — nicknames only, no real names.
      </p>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-gray-400">
          No one on the board yet — be the first from the app’s You tab.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.nickname + i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-center gap-4 rounded-2xl border p-4 ${
              i < 3
                ? 'border-primary/40 bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-white/5'
            }`}
          >
            <div className="flex-shrink-0 w-8 flex justify-center">{rankIcon(i)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {r.nickname}
                {r.device ? (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    · {r.device}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Music size={12} /> {fmtHours(r.localSeconds)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Youtube size={12} /> {fmtHours(r.youtubeSeconds)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Radio size={12} /> {fmtHours(r.saavnSeconds)}
                </span>
                <span>{r.totalSongs} songs</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-primary">{fmtHours(r.totalSeconds)}</div>
              <div className="text-xs text-gray-400">total</div>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-10">
        Local · YouTube · JioSaavn shown left to right. Sharing is opt-in
        from Hanamimi+ (You → Listening stats). Please use a nickname, not
        your real name.
      </p>
    </motion.div>
  );
}
