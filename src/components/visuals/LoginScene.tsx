'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

type OrbSeed = {
  id: number;
  size: number;
  top: string;
  left: string;
  delay: number;
  duration: number;
  opacity: number;
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const generateSeeds = () => {
  const rand = mulberry32(0x1a2b3c4d);
  return Array.from({ length: 8 }).map((_, index) => ({
    id: index,
    size: 140 + rand() * 200,
    top: `${10 + rand() * 70}%`,
    left: `${5 + rand() * 90}%`,
    delay: rand() * 4,
    duration: 12 + rand() * 8,
    opacity: 0.25 + rand() * 0.35,
  }));
};

const DepthGrid = () => (
  <motion.div
    aria-hidden
    className="absolute inset-0 -z-10 bg-[#030712]"
    style={{
      backgroundImage:
        'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.1), transparent 45%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.12), transparent 55%)',
    }}
    animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
    transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
  />
);

const GridLines = () => (
  <motion.div
    aria-hidden
    className="absolute inset-[-10%] -z-10 opacity-40"
    style={{
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '120px 120px',
    }}
    animate={{ rotate: ['0deg', '1.5deg'] }}
    transition={{ duration: 40, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
  />
);

const AuroraRays = () => (
  <>
    <motion.div
      aria-hidden
      className="absolute left-[10%] top-[10%] h-[60vh] w-[40vw] -translate-y-1/2 rounded-[50%] bg-gradient-to-b from-apple-blue-500/30 via-apple-blue-500/5 to-transparent blur-3xl"
      animate={{ rotate: [0, 8, 0] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      aria-hidden
      className="absolute right-[5%] bottom-[5%] h-[50vh] w-[35vw] translate-y-1/2 rounded-[50%] bg-gradient-to-t from-apple-green-500/25 via-apple-green-500/10 to-transparent blur-[120px]"
      animate={{ rotate: [0, -6, 0] }}
      transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
    />
  </>
);

const FloatingOrbs = ({ seeds }: { seeds: OrbSeed[] }) => (
  <>
    {seeds.map((orb) => (
      <motion.span
        key={orb.id}
        className="absolute -z-10 rounded-full bg-gradient-to-br from-white/40 via-white/5 to-transparent blur-3xl"
        style={{
          width: orb.size,
          height: orb.size,
          top: orb.top,
          left: orb.left,
          opacity: orb.opacity,
          mixBlendMode: 'screen',
        }}
        animate={{
          y: [0, -20, 0],
          x: [0, 15, 0],
          opacity: [orb.opacity, orb.opacity + 0.1, orb.opacity],
        }}
        transition={{
          duration: orb.duration,
          delay: orb.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    ))}
  </>
);

const NoiseOverlay = () => (
  <div
    aria-hidden
    className="absolute inset-0 -z-10 opacity-[0.03]"
    style={{
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'600\' height=\'600\' viewBox=\'0 0 600 600\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'600\' height=\'600\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
    }}
  />
);

const LensFlare = () => (
  <motion.div
    aria-hidden
    className="absolute inset-0 -z-10"
    style={{
      background:
        'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.12), transparent 40%), radial-gradient(circle at 30% 70%, rgba(59,130,246,0.15), transparent 55%)',
    }}
    animate={{ opacity: [0.6, 0.9, 0.6], scale: [1, 1.02, 1] }}
    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
  />
);

export const LoginVisualStage = () => {
  const seeds = useMemo(generateSeeds, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <DepthGrid />
      <GridLines />
      <AuroraRays />
      <FloatingOrbs seeds={seeds} />
      <LensFlare />
      <NoiseOverlay />
    </div>
  );
};
