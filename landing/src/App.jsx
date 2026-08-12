/**
 * Shorthorn Cargo — landing page.
 * Live production build.
 *
 * The hero is a scroll-scrubbed 3D film: the page owns a tall runway, the frame
 * is pinned, and scroll position drives video.currentTime. The clip is re-encoded
 * all-intra (tools note: ffmpeg -g 1 -bf 0) so every frame is a keyframe and
 * seeking lands instantly instead of stuttering between GOPs.
 *
 * "Night Express" is real WebGL: the truck in src/Truck.jsx driving a projected
 * map of the lower 48 with live telemetry.
 */

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, Line } from "@react-three/drei";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import * as THREE from "three";

import Truck, { useRigMaterials } from "./Truck.jsx";
import Monogram from "./Monogram.jsx";

const HERO_VIDEO = {
  large: "/media/hero-1280.mp4",
  small: "/media/mobile-version.mp4",
  poster: "/media/hero-poster.jpg",
};

/* ------------------------------------------------------------------ */
/*  Company facts — single source of truth for every string on screen  */
/* ------------------------------------------------------------------ */

const COMPANY = {
  name: "Shorthorn Cargo",
  legal: "Shorthorn LLC",
  tagline: "Interstate Freight & Dedicated Contract Transport",
  usdot: "3856749",
  mc: "1407566",
  phone: "(708) 668-0045",
  phoneHref: "tel:+17086680045",
  address: "10721 W Capitol Dr, Suite 105",
  city: "Wauwatosa, WI 53222",
  // FMCSA assigns a rating only after a compliance review; carriers without one
  // are officially "Not Rated". Swap this the day a Satisfactory rating is issued.
  safetyRating: "Not Rated",
  states: 42,
  founded: "First registered and active with the FMCSA in April 2022, receiving official interstate common carrier authority on December 9, 2022.",
  tractors: "100 total",
  trailers: "56 total",
  email: "There is no public official corporate email address listed in federal registries or carrier directories.",
  instagram: "@shorthorncargo",
  instagramUrl: "https://www.instagram.com/shorthorncargo/",
};

const STATS = [
  { label: "On-Time Delivery Rate", value: 99.4, suffix: "%", decimals: 1 },
  { label: "Number of Tractors", value: 100, suffix: "", decimals: 0 },
  { label: "States Served", value: COMPANY.states, suffix: "", decimals: 0 },
  { label: "Year Founded", value: 2022, suffix: "", decimals: 0, noComma: true },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const damp = (dt, speed) => 1 - Math.exp(-speed * dt);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (t) => t * t * (3 - 2 * t);

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function useCountUp(to, start, { duration = 2, decimals = 0, noComma = false } = {}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [to, start, duration]);
  if (decimals) return value.toFixed(decimals);
  if (noComma) return String(Math.round(value));
  return Math.round(value).toLocaleString();
}

function useNearViewport(ref, margin = "300px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

/* ================================================================== */
/*  HERO — scroll-scrubbed film                                        */
/* ================================================================== */

/** Everything overlaid on the hero holds for the runway and releases at the end. */
function useHoldThenRelease(progress) {
  const opacity = useTransform(progress, [0, 0.93, 1], [1, 1, 0]);
  const y = useTransform(progress, [0, 0.93, 1], [0, 0, 24]);
  const visibility = useTransform(opacity, (v) => (v < 0.04 ? "hidden" : "visible"));
  return { opacity, y, visibility };
}

function HeroHeadline() {
  return null;
}

/**
 * Frosted stat panel. One sits in each bottom corner of the hero and holds for
 * the whole runway; on phones they shrink to corner chips rather than spanning
 * the width, so the two of them plus the CTA still fit above the fold.
 */
function GlassPanel({ progress, side, mobileRange, eyebrow, figure, unit, body }) {
  // Mobile motion values: appear one-by-one during scroll
  const mobileOpacity = useTransform(progress, mobileRange, [0, 1, 1, 0]);
  const mobileY = useTransform(progress, mobileRange, [24, 0, 0, -20]);
  const mobileVisibility = useTransform(mobileOpacity, (v) => (v < 0.03 ? "hidden" : "visible"));

  // Desktop motion values: present immediately from start (opacity 1), only fading out when hero animation finishes
  const desktopOpacity = useTransform(progress, [0, 0.93, 1], [1, 1, 0]);
  const desktopY = useTransform(progress, [0, 0.93, 1], [0, 0, 24]);
  const desktopVisibility = useTransform(desktopOpacity, (v) => (v < 0.03 ? "hidden" : "visible"));

  const desktopPos =
    side === "left"
      ? "md:left-8 md:right-auto md:items-start md:text-left"
      : "md:right-8 md:left-auto md:items-end md:text-right";

  return (
    <>
      {/* MOBILE VERSION: Frameless, centered above contact button, appears one-by-one on scroll */}
      <motion.aside
        style={{ opacity: mobileOpacity, y: mobileY, visibility: mobileVisibility }}
        className="pointer-events-none absolute bottom-44 sm:bottom-48 left-1/2 -translate-x-1/2 z-10 flex w-[90%] max-w-sm flex-col items-center text-center md:hidden"
      >
        <div className="relative flex w-full flex-col justify-between items-center text-center bg-transparent border-0 p-0 shadow-none backdrop-blur-none">
          <div>
            <p className="flex items-center justify-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-jade">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-jade" />
              {eyebrow}
            </p>

            <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2">
              <span className="font-mono text-3xl font-black tracking-tight text-bone sm:text-4xl">
                {figure}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/60">
                {unit}
              </span>
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-bone/85 max-w-xs mx-auto sm:text-sm">
            {body}
          </p>
        </div>
      </motion.aside>

      {/* DESKTOP VERSION: Rich frosted glass panel, stays visible during the entire hero animation */}
      <motion.aside
        style={{ opacity: desktopOpacity, y: desktopY, visibility: desktopVisibility }}
        className={`pointer-events-none absolute bottom-10 z-10 hidden md:flex md:w-[16rem] lg:w-[20rem] flex-col ${desktopPos}`}
      >
        <div className="relative flex min-h-[200px] lg:min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-5 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
          {/* top edge catch-light */}
          <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          {/* slow specular sweep across the pane */}
          <span className="pointer-events-none absolute -inset-y-8 -left-1/3 w-1/2 rotate-12 animate-[sheen_7s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {/* brand tint pooling in the lower corner */}
          <span className="pointer-events-none absolute -bottom-14 -right-8 h-32 w-32 rounded-full bg-jade/20 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-jade">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-jade" />
                {eyebrow}
              </p>

              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-3xl font-black tracking-tight text-bone lg:text-4xl">
                  {figure}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone/55">
                  {unit}
                </span>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-bone/70 lg:text-sm">
              {body}
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function scrollToSection(e, href) {
  if (href && href.startsWith("#")) {
    e.preventDefault();
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.querySelector(href);
      if (el) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }
  }
}

/** Glass CTA, centred between the two panels. Squarer corners than the panels. */
function HeroContact({ progress }) {
  const { opacity, y, visibility } = useHoldThenRelease(progress);
  return (
    <motion.div
      style={{ opacity, y, visibility }}
      className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 sm:bottom-28 md:bottom-24"
    >
      <motion.a
        href="#contact"
        onClick={(e) => scrollToSection(e, "#contact")}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group relative flex items-center gap-3 overflow-hidden rounded-md border border-white/20 bg-white/[0.09] px-6 py-3 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150 md:px-8 md:py-3.5"
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <span className="pointer-events-none absolute -inset-y-6 -left-1/3 w-1/2 rotate-12 animate-[sheen_7s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        <span className="relative font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bone md:text-xs">
          Contact
        </span>
        <span className="relative text-jade transition-transform group-hover:translate-x-1">
          →
        </span>
      </motion.a>
    </motion.div>
  );
}

function ScrollHero({ reduced, onVideoReady }) {
  const runway = useRef(null);
  const videoRef = useRef(null);
  const target = useRef(0);
  const eased = useRef(0);

  const { scrollYProgress } = useScroll({
    target: runway,
    offset: ["start start", "end end"],
  });
  // Smoothed copy for the copy blocks, so text motion is not glued to the wheel.
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.6 });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    target.current = v;
  });

  // Seek loop: chase the scroll target rather than jumping to it, which keeps
  // fast flicks from turning into a slideshow.
  useEffect(() => {
    if (reduced) return undefined;
    let raf;
    const loop = () => {
      const video = videoRef.current;
      eased.current += (target.current - eased.current) * 0.16;
      if (video && video.readyState >= 2 && video.duration) {
        const t = eased.current * (video.duration - 1 / 24);
        if (Math.abs(video.currentTime - t) > 0.008) video.currentTime = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Safari/iOS will not seek a video that has never been told to play.
  const unlock = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const p = video.play();
    if (p?.then) p.then(() => video.pause()).catch(() => {});
    else video.pause();
  }, []);

  const handleReady = useCallback(() => {
    onVideoReady?.();
    unlock();
  }, [onVideoReady, unlock]);

  /**
   * A cached clip can finish loading before React has attached its media
   * handlers, and `loadeddata` does not replay — so poll readyState on mount
   * as well as listening. Without this the loading terminal never completes.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const check = () => {
      if (video.readyState >= 3) handleReady();
    };
    check();
    video.addEventListener("loadeddata", check);
    video.addEventListener("canplaythrough", check);
    return () => {
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("canplaythrough", check);
    };
  }, [handleReady]);

  const small =
    typeof window !== "undefined" &&
    window.matchMedia?.("(max-width: 768px)").matches;

  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  // Runway length sets the scrub speed: the 10 s clip is spread over this much
  // scrolling, so a taller runway means slower playback per turn of the wheel.
  return (
    <section id="top" ref={runway} className="relative h-[620vh]">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-ink">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={small ? HERO_VIDEO.small : HERO_VIDEO.large}
          poster={HERO_VIDEO.poster}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
          onLoadedData={handleReady}
          onCanPlayThrough={handleReady}
          aria-hidden
        />

        {/* grade the footage toward the brand: lift blacks green, crush the edges */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,transparent_10%,rgba(5,8,10,0.55)_75%,rgba(5,8,10,0.95)_100%)]" />
        {/* Portrait has no room for a side scrim, so the copy sits on a floor gradient. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/55 via-55% to-transparent md:bg-gradient-to-r md:via-ink/70 md:via-45% md:to-transparent md:to-85%" />
        <div className="pointer-events-none absolute inset-0 bg-forest/18 mix-blend-color" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink to-transparent" />

        <HeroHeadline progress={smooth} />

        <GlassPanel
          progress={smooth}
          side="left"
          mobileRange={[0.02, 0.10, 0.42, 0.48]}
          eyebrow="The fleet"
          figure="100"
          unit="power units"
          body="Late-model tractors pulling 53-ft dry vans, dispatched around hours-of-service compliance rather than around it."
        />
        <GlassPanel
          progress={smooth}
          side="right"
          mobileRange={[0.50, 0.58, 0.88, 0.94]}
          eyebrow="The network"
          figure="10.3M+"
          unit="miles / yr"
          body="OTR long-haul and scheduled USPS postal freight, every unit on electronic logs, every load visible end to end."
        />
        <HeroContact progress={smooth} />

        <motion.div
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute right-8 top-24 hidden flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/45 md:flex"
        >
          Scroll
          <span className="h-10 w-px bg-gradient-to-b from-jade to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Geography — lower 48 outline, Albers conic projection              */
/* ------------------------------------------------------------------ */

/**
 * Simplified contiguous-US boundary, clockwise from the Olympic peninsula.
 * Coarse on purpose: it is rasterised into a dot matrix, which reads as a map
 * long before the coastline is survey-accurate.
 */
const USA = [
  [-124.7, 48.4], [-124.1, 47.0], [-124.0, 46.3], [-124.1, 45.0], [-124.4, 43.3],
  [-124.4, 42.0], [-124.2, 40.4], [-123.8, 39.4], [-122.9, 38.1], [-122.5, 37.5],
  [-121.9, 36.6], [-120.9, 35.4], [-120.6, 34.6], [-119.3, 34.0], [-118.4, 33.7],
  [-117.3, 32.9], [-117.1, 32.5],
  [-114.7, 32.7], [-114.8, 32.5], [-111.1, 31.3], [-108.2, 31.3], [-108.2, 31.8],
  [-106.5, 31.8], [-105.0, 30.7], [-104.7, 29.9], [-103.3, 29.0], [-102.4, 29.8],
  [-101.4, 29.8], [-100.0, 28.1], [-99.1, 26.4], [-97.4, 25.9],
  [-97.2, 27.4], [-96.5, 28.4], [-95.3, 29.0], [-94.1, 29.7], [-93.0, 29.7],
  [-91.5, 29.2], [-90.2, 29.1], [-89.4, 29.0], [-89.6, 30.2], [-88.4, 30.4],
  [-87.5, 30.4], [-86.2, 30.4], [-85.0, 29.7], [-84.0, 30.1], [-83.0, 29.1],
  [-82.8, 28.0], [-82.6, 27.3], [-81.9, 26.0], [-81.2, 25.2], [-80.4, 25.2],
  [-80.1, 26.6], [-80.5, 28.5], [-81.0, 29.6], [-81.4, 30.7], [-80.9, 32.0],
  [-79.6, 32.8], [-78.9, 33.7], [-77.9, 34.2], [-76.5, 34.6], [-75.5, 35.2],
  [-75.9, 36.6], [-76.3, 37.0], [-75.9, 37.9], [-75.1, 38.5], [-74.9, 39.0],
  [-74.2, 40.5], [-73.8, 40.8], [-72.3, 41.3], [-71.4, 41.4], [-70.6, 41.7],
  [-70.9, 42.5], [-70.7, 43.1], [-69.8, 43.8], [-68.5, 44.4], [-67.2, 44.7],
  [-67.0, 45.7], [-67.8, 47.1], [-69.2, 47.5], [-70.3, 46.0], [-71.4, 45.2],
  [-72.5, 45.0], [-74.7, 45.0], [-75.3, 44.8], [-76.4, 44.1],
  [-77.0, 43.3], [-78.9, 43.3], [-79.1, 42.8], [-80.5, 42.3], [-82.0, 41.7],
  [-83.1, 41.7], [-83.1, 42.3], [-82.4, 43.0], [-82.5, 44.05], [-83.4, 45.9],
  [-84.75, 45.78], [-85.5, 45.35], [-86.2, 44.4], [-86.5, 43.4], [-86.3, 42.4],
  [-87.1, 42.3], [-87.6, 41.9],
  [-87.8, 43.0], [-87.7, 44.0], [-87.5, 44.6], [-87.0, 45.2], [-87.7, 45.4],
  [-88.1, 46.0], [-89.5, 46.6], [-90.9, 46.9], [-92.1, 46.8], [-92.3, 48.0],
  [-93.5, 48.6], [-95.2, 49.0],
  [-104.0, 49.0], [-114.0, 49.0], [-123.3, 49.0], [-123.2, 48.4],
];

/** Albers equal-area conic — gives the lower 48 its familiar curved top edge. */
const ALBERS = (() => {
  const rad = Math.PI / 180;
  const p1 = 29.5 * rad;
  const p2 = 45.5 * rad;
  const p0 = 37.5 * rad;
  const l0 = -96 * rad;
  const n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const r0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
  return (lon, lat) => {
    const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
    const t = n * (lon * rad - l0);
    return [r * Math.sin(t), r0 - r * Math.cos(t)];
  };
})();

const MAP_WIDTH = 17;

const MAP_FIT = (() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lon, lat] of USA) {
    const [x, y] = ALBERS(lon, lat);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY, scale: MAP_WIDTH / (maxX - minX) };
})();

/**
 * lon/lat → world position on the flat map plane (XZ).
 * Albers y grows northward; world z grows toward the camera, so it is negated
 * to keep north at the top of the screen.
 */
function toMap(lon, lat) {
  const [px, py] = ALBERS(lon, lat);
  const { minX, maxX, minY, maxY, scale } = MAP_FIT;
  return [(px - (minX + maxX) / 2) * scale, -(py - (minY + maxY) / 2) * scale];
}

function insideUSA(lon, lat) {
  let hit = false;
  for (let i = 0, j = USA.length - 1; i < USA.length; j = i++) {
    const [xi, yi] = USA[i];
    const [xj, yj] = USA[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}

/* ------------------------------------------------------------------ */
/*  The run being tracked — a real I-94 / I-35 / I-40 lane             */
/* ------------------------------------------------------------------ */

const ROUTE = [
  { name: "Wauwatosa, WI", lon: -87.99, lat: 43.06, stop: true },
  { name: "Davenport, IA", lon: -90.58, lat: 41.52 },
  { name: "Kansas City, MO", lon: -94.58, lat: 39.1, stop: true },
  { name: "Wichita, KS", lon: -97.34, lat: 37.69 },
  { name: "Oklahoma City, OK", lon: -97.52, lat: 35.47, stop: true },
  { name: "Amarillo, TX", lon: -101.83, lat: 35.22 },
  { name: "Albuquerque, NM", lon: -106.65, lat: 35.08, stop: true },
  { name: "Flagstaff, AZ", lon: -111.65, lat: 35.2 },
  { name: "Phoenix, AZ", lon: -112.07, lat: 33.45, stop: true },
];

const TOTAL_MILES = 1876;

/** Cumulative arc-length parameterisation so the marker moves at even speed. */
const ROUTE_PATH = (() => {
  const points = ROUTE.map((p) => {
    const [x, z] = toMap(p.lon, p.lat);
    return new THREE.Vector3(x, 0, z);
  });
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  const total = lengths[lengths.length - 1];
  return {
    points,
    at(t) {
      const d = clamp01(t) * total;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const span = lengths[i] - lengths[i - 1] || 1;
      const k = (d - lengths[i - 1]) / span;
      return {
        pos: points[i - 1].clone().lerp(points[i], k),
        dir: points[i].clone().sub(points[i - 1]).normalize(),
        legIndex: i,
      };
    },
  };
})();

/* ================================================================== */
/*  NIGHT EXPRESS — 3D GPS map                                         */
/* ================================================================== */

const USA_OUTLINE = (() => {
  const pts = USA.map(([lon, lat]) => {
    const [x, z] = toMap(lon, lat);
    return [x, 0.015, z];
  });
  if (pts.length > 0) pts.push(pts[0]);
  return pts;
})();

function USABoundary() {
  return (
    <Line points={USA_OUTLINE} color="#16c07d" lineWidth={2} transparent opacity={0.85} />
  );
}

function DottedUSA() {
  const mesh = useRef();
  const dots = useMemo(() => {
    const out = [];
    for (let lon = -125; lon <= -66; lon += 0.5) {
      for (let lat = 24.5; lat <= 49.2; lat += 0.38) {
        if (!insideUSA(lon, lat)) continue;
        const [x, z] = toMap(lon, lat);
        out.push({ x, z });
      }
    }
    return out;
  }, []);

  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const probe = new THREE.Vector3();
    dots.forEach((d, i) => {
      dummy.position.set(d.x, 0, d.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);

      probe.set(d.x, 0, d.z);
      let best = Infinity;
      for (const p of ROUTE_PATH.points) best = Math.min(best, probe.distanceTo(p));
      const heat = clamp01(1 - best / 2.5);
      color.setHSL(0.44, 0.6, 0.08 + heat * 0.38);
      mesh.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [dots]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, dots.length]} frustumCulled={false}>
      <circleGeometry args={[0.05, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function RoutePulse({ progress }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const COUNT = 48;

  useFrame((state) => {
    if (!mesh.current) return;
    const head = progress.current;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const k = (i / COUNT + t * 0.035) % 1;
      const at = ROUTE_PATH.at(k * head);
      dummy.position.copy(at.pos);
      dummy.position.y = 0.022;
      dummy.rotation.set(-Math.PI / 2, 0, -Math.atan2(at.dir.z, at.dir.x));
      dummy.scale.setScalar(k > 0.985 ? 0 : 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.22, 0.05]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.95} />
    </instancedMesh>
  );
}

const MAP_RIG_SCALE = 0.09;
const MAP_RIG_OFFSET = 3.95 * MAP_RIG_SCALE;

function MapRig({ progress }) {
  const materials = useRigMaterials();
  const group = useRef();
  const ring = useRef();
  const speedRef = useRef(9);
  const goal = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const at = ROUTE_PATH.at(progress.current);
    if (group.current) {
      goal.set(at.pos.x, 0.02, at.pos.z);
      group.current.position.lerp(goal, damp(d, 3.5));
      const yaw = Math.atan2(-at.dir.z, at.dir.x);
      let delta = yaw - group.current.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      group.current.rotation.y += delta * damp(d, 2.8);
    }
    if (ring.current) {
      const k = (state.clock.elapsedTime % 1.5) / 1.5;
      ring.current.scale.setScalar(0.4 + k * 2.2);
      ring.current.material.opacity = 0.6 * (1 - k);
    }
  });

  return (
    <group ref={group}>
      <group scale={MAP_RIG_SCALE} position={[MAP_RIG_OFFSET, 0, 0]}>
        <Truck speedRef={speedRef} materials={materials} />
      </group>
      {/* Headlight beam projection ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0.45, 0.006, 0]}>
        <planeGeometry args={[1.6, 0.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Dynamic pulsing sonar target ring */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.35, 0.45, 36]} />
        <meshBasicMaterial color="#4fe3a8" transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function CityNodeItem({ p, index, total }) {
  const ringRef = useRef();
  const terminal = index === 0 || index === total - 1;
  const [x, z] = toMap(p.lon, p.lat);

  useFrame((state) => {
    if (!ringRef.current) return;
    const k = ((state.clock.elapsedTime + index * 0.25) % 1.8) / 1.8;
    ringRef.current.scale.setScalar(1 + k * 1.6);
    ringRef.current.material.opacity = 0.55 * (1 - k);
  });

  return (
    <group position={[x, 0.03, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[terminal ? 0.14 : 0.08, 20]} />
        <meshBasicMaterial color={terminal ? "#ffffff" : "#2ef2a0"} toneMapped={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[0.1, 0.16, 24]} />
        <meshBasicMaterial color="#16c07d" transparent toneMapped={false} />
      </mesh>

      {terminal && (
        <Html position={[0, 0.12, 0]} center pointerEvents="none" zIndexRange={[10, 0]}>
          <div className="-translate-y-7 whitespace-nowrap rounded-lg border border-jade/50 bg-ink/90 px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-jade shadow-xl shadow-black/80 backdrop-blur-md">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-jade" />
            {index === 0 ? "Origin" : "Destination"} · {p.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function CityNodes() {
  return (
    <>
      {ROUTE.map((p, i) => (
        <CityNodeItem key={p.name} p={p} index={i} total={ROUTE.length} />
      ))}
    </>
  );
}

function useSweepTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(46,242,160,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 4);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function ScanSweep() {
  const mesh = useRef();
  const falloff = useSweepTexture();
  useFrame((state) => {
    if (!mesh.current) return;
    const t = (state.clock.elapsedTime * 0.18) % 1;
    mesh.current.position.x = lerp(-MAP_WIDTH / 2 - 1, MAP_WIDTH / 2 + 1, t);
    mesh.current.material.opacity = 0.15 * Math.sin(Math.PI * t);
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
      <planeGeometry args={[3.2, 16]} />
      <meshBasicMaterial
        map={falloff}
        color="#2ef2a0"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

const MAP_VIEW_DIR = new THREE.Vector3(0, 0.76, 0.65).normalize();

function MapCamera({ tilt }) {
  const { camera, size } = useThree();
  const goal = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const aspect = size.width / Math.max(size.height, 1);
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const need = (MAP_WIDTH + 3.2) / (2 * Math.tan(halfFov) * Math.min(aspect, 2.1));
    const dist = THREE.MathUtils.clamp(need, 14, 52);

    const lean = tilt.current;
    goal.copy(MAP_VIEW_DIR).multiplyScalar(dist);
    goal.y -= lean * dist * 0.1;
    goal.z += lean * dist * 0.08;
    goal.x += state.pointer.x * 1.4;

    camera.position.lerp(goal, damp(d, 2.5));
    camera.lookAt(0, 0, 0.3);
  });
  return null;
}

function NightExpressScene({ progress, tilt }) {
  const line = useMemo(() => ROUTE_PATH.points.map((p) => [p.x, 0.015, p.z]), []);
  return (
    <>
      <color attach="background" args={["#04080b"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[8, 14, 10]} intensity={1.8} color="#dff5ea" />
      <Suspense fallback={null}>
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={4.5} position={[0, 8, -6]} scale={[24, 6, 1]} color="#bff0d8" />
          <Lightformer form="rect" intensity={3} position={[8, 5, 8]} scale={[12, 6, 1]} color="#16c07d" />
        </Environment>
      </Suspense>

      {/* Cybernetic floor grid */}
      <gridHelper args={[42, 42, "#16c07d", "#0a1e16"]} position={[0, -0.005, 0]} />

      {/* Vector USA Boundary */}
      <USABoundary />

      {/* Matrix map dots */}
      <DottedUSA />

      {/* Core bright neon route line */}
      <Line points={line} color="#2ef2a0" lineWidth={2.5} transparent opacity={0.95} />

      <RoutePulse progress={progress} />
      <CityNodes />
      <MapRig progress={progress} />
      <ScanSweep />
      <MapCamera tilt={tilt} />
    </>
  );
}

/** Telemetry that ticks the way an ELD feed does. */
function useTelemetry(active) {
  const progress = useRef(0.04);
  const [readout, setReadout] = useState(() => ({
    pct: 4,
    miles: 1800,
    speed: 62,
    lat: ROUTE[0].lat,
    lon: ROUTE[0].lon,
    next: ROUTE[1].name,
  }));

  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    const tick = (now) => {
      const dt = Math.min(now - last, 60) / 1000;
      last = now;
      progress.current = (progress.current + dt / 360) % 1;
      accum += dt;
      if (accum > 0.25) {
        accum = 0;
        const p = progress.current;
        const at = ROUTE_PATH.at(p);
        const leg = ROUTE[Math.min(at.legIndex, ROUTE.length - 1)];
        setReadout({
          pct: Math.round(p * 100),
          miles: Math.round(TOTAL_MILES * (1 - p)),
          speed: Math.round(64 + Math.sin(now / 4500) * 2.5),
          lat: lerp(ROUTE[at.legIndex - 1].lat, leg.lat, 0.5),
          lon: lerp(ROUTE[at.legIndex - 1].lon, leg.lon, 0.5),
          next: leg.name,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return { progress, readout };
}

function NightExpress({ webgl }) {
  const hostRef = useRef(null);
  const near = useNearViewport(hostRef);
  const { progress, readout } = useTelemetry(near);
  const tilt = useRef(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    let frame = 0;
    const read = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      tilt.current = clamp01((window.innerHeight - r.top) / (window.innerHeight + r.height)) * 2 - 1;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const eta = useMemo(() => {
    const d = new Date(Date.now() + (readout.miles / 58) * 3600 * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [readout.miles]);

  return (
    <section id="tracking" ref={hostRef} className="relative bg-ink px-5 py-20 sm:px-8 sm:py-28">
      <span
        aria-hidden
        className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent sm:left-8 sm:right-8"
      />
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-jade">
            <span className="h-px w-8 bg-jade" />
            Night Express · Live Lane
          </p>
          <h2 className="mt-5 max-w-2xl text-3xl font-black uppercase leading-tight tracking-[-0.02em] text-bone sm:text-5xl">
            Every load on the map, all night
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone/55">
            100% electronic tracking means dispatch and the shipper watch the same
            screen. This is the Wauwatosa → Phoenix run as the terminal renders it.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-[1fr_320px]">
          <div className="relative aspect-[16/11] bg-ink-2 lg:aspect-auto lg:min-h-[480px]">
            {webgl ? (
              <Canvas
                dpr={[1, 1.5]}
                frameloop={near ? "always" : "never"}
                camera={{ position: [0, 16, 14], fov: 40, near: 0.1, far: 140 }}
                gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
              >
                <Suspense fallback={null}>
                  <NightExpressScene progress={progress} tilt={tilt} />
                </Suspense>
              </Canvas>
            ) : (
              <div className="grid h-full place-items-center font-mono text-xs text-bone/40">
                Live map requires WebGL
              </div>
            )}
            <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-jade/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-jade" />
              Live · ELD feed
            </div>
          </div>

          <div className="bg-ink-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-bone/40">Load</div>
            <div className="mt-1 font-mono text-lg font-bold text-bone">
              SHC-{String(4400 + readout.pct)}
            </div>

            <div className="mt-6 space-y-4">
              {[
                { k: "Origin", v: ROUTE[0].name },
                { k: "Destination", v: ROUTE[ROUTE.length - 1].name },
                { k: "Next waypoint", v: readout.next },
                { k: "Ground speed", v: `${readout.speed} mph` },
                { k: "Miles remaining", v: `${readout.miles.toLocaleString()} mi` },
                { k: "Projected arrival", v: eta },
                {
                  k: "Position",
                  v: `${readout.lat.toFixed(2)}° N ${Math.abs(readout.lon).toFixed(2)}° W`,
                },
              ].map((row) => (
                <div key={row.k} className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-bone/40">
                    {row.k}
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-bone">
                    {row.v}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-bone/40">
                <span>Progress</span>
                <span className="tabular-nums text-jade">{readout.pct}%</span>
              </div>
              <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-forest-2 to-jade-2 transition-[width] duration-300"
                  style={{ width: `${readout.pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  LOADING TERMINAL                                                   */
/* ================================================================== */

function HudCorners() {
  const corner = "absolute h-10 w-10 border-jade/70";
  return (
    <>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
    </>
  );
}

function LoaderStat({ stat, active }) {
  const value = useCountUp(stat.value, active, { duration: 2.1, decimals: stat.decimals });
  return (
    <div className="border-l border-jade/25 pl-3">
      <div className="font-mono text-lg font-semibold tabular-nums text-jade-2 sm:text-xl">
        {value}
        {stat.suffix}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-bone/40">
        {stat.label}
      </div>
    </div>
  );
}

function SimpleLoader() {
  return (
    <motion.div
      key="loader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-jade" />
    </motion.div>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

// Split around the centred monogram.
const NAV_LEFT = [
  { label: "Why Us", href: "#why-choose-us" },
  { label: "Operations", href: "#operations" },
  { label: "Tracking", href: "#tracking" },
];
const NAV_RIGHT = [
  { label: "Drivers", href: "#drivers" },
  { label: "Compliance", href: "#compliance" },
  { label: "Contact", href: "#contact" },
];

/**
 * Transparent over the hero so nothing competes with the film, then it picks up
 * a frosted backing and its hairline rule once the scroll animation has handed
 * off to the page.
 */
function Header({ settled }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-30 transition-colors duration-500 ${
        settled || mobileMenuOpen
          ? "bg-ink/80 backdrop-blur-xl backdrop-saturate-150"
          : "bg-transparent"
      }`}
    >
      {/* DESKTOP NAV (md screens and up) */}
      <nav
        aria-label="Primary Desktop"
        className="hidden mx-auto max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 py-4 sm:px-8 md:grid"
      >
        <ul className="flex items-center justify-evenly gap-x-3 sm:gap-x-4">
          {NAV_LEFT.map((item) => (
            <li key={item.href}>
              <NavLink item={item} />
            </li>
          ))}
        </ul>

        <a
          href="#top"
          onClick={(e) => scrollToSection(e, "#top")}
          aria-label={`${COMPANY.name} — back to top`}
          className="block justify-self-center px-4 text-bone transition-colors hover:text-jade sm:px-6"
        >
          <Monogram className="h-10 w-10 sm:h-12 sm:w-12 rounded-md" title={COMPANY.name} />
        </a>

        <ul className="flex items-center justify-evenly gap-x-3 sm:gap-x-4">
          {NAV_RIGHT.map((item) => (
            <li key={item.href}>
              <NavLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* MOBILE NAV BAR (below md breakpoint) */}
      <div className="flex items-center justify-between px-5 py-3 md:hidden">
        {/* Left balance spacer */}
        <div className="w-9" />

        {/* Center Logo + Shorthorn Cargo */}
        <a
          href="#top"
          onClick={(e) => {
            closeMenu();
            scrollToSection(e, "#top");
          }}
          className="flex items-center gap-2.5 group"
        >
          <Monogram className="h-10 w-10 rounded-md transition-transform group-hover:scale-105" title={COMPANY.name} />
          <div className="flex flex-col leading-none">
            <span className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-bone">
              Shorthorn
            </span>
            <span className="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-jade">
              Cargo
            </span>
          </div>
        </a>

        {/* Right Corner Menu Toggle Icon */}
        <button
          onClick={toggleMenu}
          type="button"
          aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-bone transition-colors hover:border-jade/40 hover:text-jade"
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE MENU DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden bg-ink/95 px-6 py-2 backdrop-blur-2xl md:hidden"
          >
            {/* top hairline — inset */}
            <span className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="flex flex-col">
              {[...NAV_LEFT, ...NAV_RIGHT].map((item, idx) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.97, x: 4 }}
                  onClick={(e) => {
                    e.preventDefault();
                    closeMenu();
                    const target = item.href;
                    setTimeout(() => {
                      if (target === "#top") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
                      }
                    }, 50);
                  }}
                  className="group relative flex items-center gap-3 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-bone/70 transition-colors duration-200 hover:text-jade active:text-jade"
                >
                  {/* jade accent dot */}
                  <motion.span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-jade"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 1.4, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                  />
                  {item.label}
                  {/* arrow that slides in on hover */}
                  <motion.span
                    className="ml-auto font-mono text-jade/70"
                    initial={{ opacity: 0, x: -4 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    →
                  </motion.span>
                  {/* divider hairline — inset */}
                  <span className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <span
        aria-hidden
        className={`absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-500 sm:left-8 sm:right-8 ${
          settled ? "opacity-100" : "opacity-0"
        }`}
      />
    </motion.header>
  );
}

function NavLink({ item }) {
  return (
    <a
      href={item.href}
      onClick={(e) => scrollToSection(e, item.href)}
      className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-bone/60 transition-colors hover:text-jade sm:text-xs sm:tracking-[0.16em]"
    >
      {item.label}
    </a>
  );
}

function Section({ id, eyebrow, title, children, index, hideBorder = false }) {
  return (
    <section id={id} className="relative bg-ink px-5 py-20 sm:px-8 sm:py-28">
      {!hideBorder && (
        <span
          aria-hidden
          className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent sm:left-8 sm:right-8"
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-7xl"
      >
        {(eyebrow || index) && (
          <div className="flex items-baseline gap-5">
            {index && <span className="font-mono text-[11px] tabular-nums text-jade/50">{index}</span>}
            {eyebrow && (
              <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-jade">
                <span className="h-px w-8 bg-jade" />
                {eyebrow}
              </p>
            )}
          </div>
        )}
        <h2 className="mt-5 max-w-3xl text-3xl font-black uppercase leading-[0.98] tracking-[-0.02em] text-bone sm:text-5xl">
          {title}
        </h2>
        <div className="mt-12">{children}</div>
      </motion.div>
    </section>
  );
}

function StatStrip() {
  const ref = useRef(null);
  const seen = useNearViewport(ref, "0px");
  return (
    <div ref={ref} className="relative bg-ink px-5 py-14 sm:px-8">
      <span
        aria-hidden
        className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent sm:left-8 sm:right-8"
      />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <StatCell key={stat.label} stat={stat} active={seen} delay={i * 0.07} />
        ))}
      </div>
    </div>
  );
}

function StatCell({ stat, active, delay }) {
  const value = useCountUp(stat.value, active, { duration: 1.9, decimals: stat.decimals, noComma: stat.noComma });
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="font-mono text-3xl font-black tabular-nums text-jade sm:text-5xl">
        {value}
        {stat.suffix}
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-bone/50">{stat.label}</div>
    </motion.div>
  );
}

const REASONS = [
  {
    icon: (
      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    title: "On-Time Performance",
    body: "Industry-leading delivery rates backed by real data and accountability.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    badgeBg: "bg-indigo-500/15 border-indigo-500/30",
    title: "Asset-Based Capacity",
    body: "Our own fleet means consistent capacity when the market tightens.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    badgeBg: "bg-purple-500/15 border-purple-500/30",
    title: "Live GPS Visibility",
    body: "Real-time tracking and proactive updates throughout every shipment.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    title: "Safety-First Culture",
    body: "Top CSA scores and a team committed to protecting your freight.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    badgeBg: "bg-cyan-500/15 border-cyan-500/30",
    title: "Technology That Delivers",
    body: "Advanced systems that optimize routing, visibility, and communication.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    title: "Proactive Communication",
    body: "Updates before you ask — we keep you informed at every step.",
  },
];

function WhyChooseUs() {
  return (
    <Section
      id="why-choose-us"
      hideBorder={true}
      title={
        <>
          Why companies choose <span className="text-jade">Shorthorn Cargo</span>
        </>
      }
    >
      <p className="-mt-6 text-base text-bone/60">
        Built on reliability, powered by innovation, and committed to your success.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-2/90 p-7 transition-all duration-300 hover:border-jade/40 hover:bg-ink-3 hover:shadow-xl hover:shadow-jade/5"
          >
            <div className={`inline-flex items-center justify-center rounded-xl border p-3 ${item.badgeBg}`}>
              {item.icon}
            </div>
            <h3 className="mt-5 text-lg font-bold text-bone transition-colors group-hover:text-jade">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-bone/60">
              {item.body}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const OPERATIONS = [
  {
    index: "01",
    title: "OTR Long-Haul",
    body: `Coast-to-coast dry van runs across ${COMPANY.states} states, planned around hours-of-service compliance rather than around it.`,
  },
  {
    index: "02",
    title: "USPS Postal Freight",
    body: "Scheduled postal network moves held to fixed windows, with trailer status visible end to end.",
  },
  {
    index: "03",
    title: "Dedicated Contract",
    body: "Committed equipment and scheduled drivers for shippers who need consistent capacity on the same lane every week.",
  },
];

function Operations() {
  return (
    <Section
      id="operations"
      index="02"
      eyebrow="What we haul"
      title="Freight built around dedicated capacity"
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
        {OPERATIONS.map((op) => (
          <div
            key={op.index}
            className="group relative bg-ink p-8 transition-colors duration-300 hover:bg-ink-3"
          >
            <span className="font-mono text-xs text-jade">{op.index}</span>
            <h3 className="mt-4 text-xl font-bold uppercase tracking-wide text-bone">{op.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-bone/55">{op.body}</p>
            <span className="mt-6 block h-px w-0 bg-jade transition-all duration-500 group-hover:w-full" />
          </div>
        ))}
      </div>
    </Section>
  );
}

function Drivers() {
  return (
    <Section
      id="drivers"
      index="04"
      eyebrow="Careers · CDL-A"
      title="Run for a fleet that pays on the miles you actually drive"
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="rounded-2xl border border-jade/30 bg-forest/25 p-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-jade">
              Driver Pay
            </div>
            <div className="mt-3 whitespace-nowrap font-mono text-3xl font-black text-bone sm:text-5xl">
              $3,000<span className="text-bone/40">–</span>$3,800
            </div>
            <div className="mt-1 text-sm font-medium tracking-wide text-bone/50">per week</div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-bone/55">
              OTR long-haul and postal freight seats with 100% electronic tracking on every load and transparent weekly pay.
            </p>
          </div>
          <a
            href={COMPANY.phoneHref}
            className="mt-6 inline-block rounded-full bg-jade px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink transition-transform hover:scale-[1.02] hover:bg-jade-2"
          >
            Call Recruiting · {COMPANY.phone}
          </a>
        </div>

        <ul className="space-y-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
          {[
            "Valid CDL-A with OTR long-haul experience",
            "Clean MVR and current DOT medical card",
            "Electronic logs — every unit tracked, no paper games",
            "Late-model tractors pulling 53-ft dry vans",
          ].map((line) => (
            <li key={line} className="flex items-start gap-4 bg-ink px-6 py-5 text-sm text-bone/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-jade" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Compliance() {
  return (
    <Section
      id="compliance"
      index="05"
      eyebrow="Authority & compliance"
      title="Registered, tracked, accountable"
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { term: "USDOT", value: COMPANY.usdot },
          { term: "MC Number", value: COMPANY.mc },
          { term: "Safety Rating", value: COMPANY.safetyRating },
          { term: "Equipment", value: "53-ft Dry Van" },
        ].map((item) => (
          <div key={item.term} className="bg-ink px-6 py-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/40">
              {item.term}
            </div>
            <div className="mt-2 font-mono text-lg font-bold text-bone">{item.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-bone/45">
        {COMPANY.legal}, doing business as {COMPANY.name}, operates under active USDOT and
        MC authority as a for-hire interstate motor carrier. Verify current authority and
        safety data on the FMCSA SAFER system.
      </p>
    </Section>
  );
}

function Contact() {
  return (
    <Section id="contact" index="06" eyebrow="Brokers & shippers" title="Get capacity on your lane">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/40">
              Dispatch
            </div>
            <a
              href={COMPANY.phoneHref}
              className="mt-2 block font-mono text-3xl font-black text-jade transition-colors hover:text-jade-2 sm:text-4xl"
            >
              {COMPANY.phone}
            </a>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/40">
              Terminal
            </div>
            <address className="mt-2 not-italic text-sm leading-relaxed text-bone/70">
              {COMPANY.address}
              <br />
              {COMPANY.city}
            </address>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-2 p-8">
          <h3 className="text-lg font-bold uppercase tracking-wide text-bone">
            Broker / Freight Portal
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-bone/55">
            Have a dedicated lane or a load that needs a 53-ft dry van? Call dispatch and we
            will confirm equipment availability and transit.
          </p>
          <a
            href={COMPANY.phoneHref}
            className="mt-6 inline-block rounded-full border border-jade px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-jade transition-colors hover:bg-jade hover:text-ink"
          >
            Request Capacity
          </a>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-ink px-5 pt-16 pb-12 sm:px-8">
      {/* Top subtle glow line */}
      <span
        aria-hidden
        className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-jade/50 to-transparent sm:left-8 sm:right-8"
      />

      <div className="mx-auto max-w-7xl">
        {/* Main Footer Grid */}
        <div className="grid gap-10 pb-12 border-b border-white/10 lg:grid-cols-12">
          
          {/* Brand & History Column */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Monogram className="h-9 w-auto object-contain" title={COMPANY.name} />
                <div>
                  <h3 className="font-mono text-base font-bold uppercase tracking-[0.18em] text-bone">
                    {COMPANY.name}
                  </h3>
                  <p className="text-[11px] font-mono text-bone/50 tracking-wider uppercase">
                    {COMPANY.legal}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-bone/60 max-w-sm">
                {COMPANY.tagline}. High-efficiency interstate freight operations connecting critical logistics lanes across the United States.
              </p>
            </div>
          </div>

          {/* Contact & Terminal */}
          <div className="lg:col-span-4">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-jade mb-4">
              Contact & Terminal
            </h4>
            <div className="space-y-4 text-xs">
              <div>
                <span className="block font-mono text-[10px] uppercase text-bone/40 tracking-wider">24/7 Dispatch Phone</span>
                <a
                  href={COMPANY.phoneHref}
                  className="font-mono text-base font-bold text-bone hover:text-jade transition-colors"
                >
                  {COMPANY.phone}
                </a>
              </div>

              <div>
                <span className="block font-mono text-[10px] uppercase text-bone/40 tracking-wider">Corporate Terminal</span>
                <address className="not-italic text-bone/70 leading-relaxed">
                  {COMPANY.address}<br />
                  {COMPANY.city}
                </address>
              </div>
            </div>
          </div>

          {/* Social & Connect */}
          <div className="lg:col-span-3 flex flex-col justify-start">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-jade mb-4">
              Connect & Social
            </h4>
            
            {/* Instagram Card */}
            <a
              href={COMPANY.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-jade/40 hover:bg-white/[0.08]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shrink-0">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-bone/50">Instagram</span>
                <span className="font-mono text-xs font-bold text-bone group-hover:text-jade transition-colors truncate block">{COMPANY.instagram}</span>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs font-mono text-bone/40">
          <div>
            © {new Date().getFullYear()} {COMPANY.legal}. All rights reserved.
          </div>
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, "#top")}
            className="flex items-center gap-2 hover:text-jade transition-colors uppercase tracking-wider text-[11px]"
          >
            Back to Top <span className="text-jade">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================== */
/*  APP                                                                */
/* ================================================================== */

export default function App() {
  const reduced = useReducedMotion() ?? false;
  const webgl = useMemo(() => hasWebGL(), []);

  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const handleVideoReady = useCallback(() => setVideoReady(true), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.dataset.locked = String(loading);
    return () => {
      delete document.body.dataset.locked;
    };
  }, [loading]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      window.history.scrollRestoration = previous ?? "auto";
    };
  }, []);

  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const hero = document.getElementById("top");
      if (!hero) return;
      setSettled(hero.getBoundingClientRect().bottom <= window.innerHeight + 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [loading]);

  return (
    <div className="relative min-h-screen bg-ink text-bone antialiased">
      {/* film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45] opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <AnimatePresence>
        {loading && <SimpleLoader />}
      </AnimatePresence>

      <Header settled={settled} />

      <main>
        <ScrollHero reduced={reduced} onVideoReady={handleVideoReady} />
        <WhyChooseUs />
        <StatStrip />
        <Operations />
        <NightExpress webgl={webgl} />
        <Drivers />
        <Compliance />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
