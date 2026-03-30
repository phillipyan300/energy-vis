"use client";

interface TimelineSliderProps {
  currentYear: number;
  isPlaying: boolean;
  minYear: number;
  maxYear: number;
  setYear: (year: number) => void;
  togglePlay: () => void;
  cumulativeMW: number;
  facilityCount: number;
}

export default function TimelineSlider({
  currentYear,
  isPlaying,
  minYear,
  maxYear,
  setYear,
  togglePlay,
  cumulativeMW,
  facilityCount,
}: TimelineSliderProps) {
  const yearRange = maxYear - minYear;
  const tickYears: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    if (y % 2 === 0 || y === minYear || y === maxYear) {
      tickYears.push(y);
    }
  }

  return (
    <div className="panel absolute bottom-8 left-1/2 -translate-x-1/2 z-10 px-5 py-3 flex items-center gap-4 min-w-[520px]">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <rect x="1" y="1" width="4" height="12" rx="1" />
            <rect x="9" y="1" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <path d="M3 1.5v11l9-5.5z" />
          </svg>
        )}
      </button>

      {/* Slider area */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-lg tabular-nums">
            {currentYear}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              <span className="text-white font-semibold">
                {(cumulativeMW / 1000).toFixed(1)}
              </span>{" "}
              GW
            </span>
            <span>
              <span className="text-white font-semibold">{facilityCount}</span>{" "}
              facilities
            </span>
          </div>
        </div>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={currentYear}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="timeline-slider w-full"
          step={1}
        />
        <div className="flex justify-between px-0.5">
          {tickYears.map((y) => (
            <span
              key={y}
              className={`text-[10px] tabular-nums ${
                y <= currentYear ? "text-gray-300" : "text-gray-600"
              }`}
              style={{
                position: "relative",
                left: `${((y - minYear) / yearRange) * 0 /* handled by flex */}%`,
              }}
            >
              {y}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
