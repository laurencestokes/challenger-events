'use client';

import React from 'react';

interface ErgSpeedometerProps {
  score: number;
  pace?: number;
  power?: number;
  distance?: number;
  heartRate?: number;
  strokeRate?: number;
  calories?: number;
  name: string;
  age: number;
  sex: string;
  weight: number;
  accentColor: string;
  textColor: string;
  compact?: boolean;
  teamScore?: number;
  showTeamScore?: boolean;
}

export default function ErgSpeedometer({
  score,
  pace,
  power,
  distance,
  heartRate,
  strokeRate,
  calories,
  name,
  age,
  sex,
  weight,
  accentColor,
  textColor,
  compact = false,
  teamScore,
  showTeamScore = false,
}: ErgSpeedometerProps) {
  if (compact) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="text-center mb-4">
          <h3 className={`text-lg font-bold mb-1 ${textColor}`}>{name}</h3>
          <p className="text-gray-400 text-sm">
            {age}y • {sex} • {weight}kg
          </p>
        </div>

        {/* Compact Score Display */}
        <div className="text-center mb-4">
          <div
            className="text-3xl font-bold mb-2"
            style={{
              color: accentColor,
              textShadow: `0 0 10px ${accentColor}40`,
            }}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-gray-300 text-sm tracking-wider font-light">SCORE</div>
        </div>

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 gap-3 text-center">
          {pace !== undefined && (
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-2xl font-bold text-cyan-400">{pace}</div>
              <div className="text-gray-300 text-xs">PACE</div>
            </div>
          )}
          {power !== undefined && (
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-2xl font-bold text-blue-400">{power}</div>
              <div className="text-gray-300 text-xs">POWER</div>
            </div>
          )}
        </div>

        {/* Compact Distance */}
        <div className="text-center mt-3">
          <p className={`text-2xl font-bold ${textColor}`}>{distance || 0}m</p>
          <p className="text-gray-400 text-xs">distance</p>
        </div>

        {/* Team Score Display */}
        {showTeamScore && teamScore !== undefined && (
          <div className="text-center mt-3 pt-3 border-t border-gray-600">
            <p className="text-lg font-bold text-yellow-400">{teamScore.toFixed(1)}</p>
            <p className="text-gray-400 text-xs">TEAM TOTAL</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className={`text-4xl font-bold mb-2 ${textColor}`}>{name}</h2>
        <p className="text-gray-400 text-lg">
          {age}y • {sex} • {weight}kg
        </p>
      </div>

      {/* Futuristic Dashboard */}
      <div className="bg-gray-900/90 rounded-2xl p-8 mb-6 relative overflow-hidden border border-gray-700/50 backdrop-blur-sm">
        {/* Background glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${accentColor}20 0%, transparent 70%)`,
          }}
        />

        {/* Main Score Display */}
        <div className="text-center mb-8">
          <div
            className="text-9xl font-bold mb-4 relative"
            style={{
              color: accentColor,
              textShadow: `0 0 20px ${accentColor}40, 0 0 40px ${accentColor}20`,
            }}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-gray-300 text-2xl tracking-wider font-light">SCORE</div>

          {/* Progress bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${(score / 1000) * 100}%`,
                  background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
                  boxShadow: `0 0 10px ${accentColor}40`,
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>0</span>
              <span>1000</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Pace Card */}
          {pace !== undefined && (
            <div className="bg-gray-800/30 rounded-xl p-6 border border-cyan-400/20 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-5xl font-bold text-cyan-400 mb-2">{pace}</div>
                <div className="text-gray-300 text-lg font-medium">PACE</div>
                <div className="text-gray-400 text-sm">s/500m</div>
              </div>
            </div>
          )}

          {/* Power Card */}
          {power !== undefined && (
            <div className="bg-gray-800/30 rounded-xl p-6 border border-blue-400/20 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-400 mb-2">{power}</div>
                <div className="text-gray-300 text-lg font-medium">POWER</div>
                <div className="text-gray-400 text-sm">WATTS</div>
              </div>
            </div>
          )}
        </div>

        {/* Score Range Indicator */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <span>Low (0-200)</span>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50 ml-4"></div>
            <span>Mid (200-600)</span>
            <div className="w-3 h-3 rounded-full bg-green-500/50 ml-4"></div>
            <span>High (600-1000)</span>
          </div>
        </div>
      </div>

      {/* Distance & Metrics Panel */}
      <div
        className={`bg-${textColor.includes('blue') ? 'blue' : 'purple'}-500/20 rounded-xl p-6 w-full max-w-md border border-${textColor.includes('blue') ? 'blue' : 'purple'}-500/30`}
      >
        <div className="text-center mb-4">
          <p className={`text-6xl font-bold mb-1 ${textColor}`}>{distance || 0}</p>
          <p className="text-xl text-gray-300 font-light">meters</p>
        </div>

        <div className="flex justify-center gap-8">
          {heartRate !== undefined && (
            <div className="text-center">
              <p className="text-red-400 text-3xl font-bold">{heartRate}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Heart Rate</p>
            </div>
          )}
          {strokeRate !== undefined && (
            <div className="text-center">
              <p className="text-green-400 text-3xl font-bold">{strokeRate}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Stroke Rate</p>
            </div>
          )}
          {calories !== undefined && (
            <div className="text-center">
              <p className="text-orange-400 text-3xl font-bold">{calories}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Calories</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
