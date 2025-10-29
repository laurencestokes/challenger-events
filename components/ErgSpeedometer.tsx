'use client';

import React from 'react';
import AnimatedCounter from './AnimatedCounter';

// Helper function to create temperature-based gradient
function getScoreGradient(score: number): string {
  if (score <= 100) {
    // Cold blue to cool green (0-100)
    const _intensity = score / 100;
    return `linear-gradient(90deg, #1e40af, #059669)`;
  } else if (score <= 200) {
    // Cool green to warm yellow (100-200)
    const _intensity = (score - 100) / 100;
    return `linear-gradient(90deg, #059669, #eab308)`;
  } else if (score <= 300) {
    // Warm yellow to orange (200-300)
    const _intensity = (score - 200) / 100;
    return `linear-gradient(90deg, #eab308, #f97316)`;
  } else if (score <= 400) {
    // Orange to red-orange (300-400)
    const _intensity = (score - 300) / 100;
    return `linear-gradient(90deg, #f97316, #ea580c)`;
  } else if (score <= 500) {
    // Red-orange to red (400-500)
    const _intensity = (score - 400) / 100;
    return `linear-gradient(90deg, #ea580c, #dc2626)`;
  } else if (score <= 600) {
    // Red to hot pink (500-600)
    const _intensity = (score - 500) / 100;
    return `linear-gradient(90deg, #dc2626, #be185d)`;
  } else if (score <= 700) {
    // Hot pink to purple (600-700)
    const _intensity = (score - 600) / 100;
    return `linear-gradient(90deg, #be185d, #9333ea)`;
  } else if (score <= 800) {
    // Purple to violet (700-800)
    const _intensity = (score - 700) / 100;
    return `linear-gradient(90deg, #9333ea, #7c3aed)`;
  } else if (score <= 900) {
    // Violet to white-hot (800-900)
    const _intensity = (score - 800) / 100;
    return `linear-gradient(90deg, #7c3aed, #fbbf24)`;
  } else {
    // White-hot to pure white (900-1000)
    const _intensity = (score - 900) / 100;
    return `linear-gradient(90deg, #fbbf24, #ffffff)`;
  }
}

// Helper function to create temperature-based glow
function getScoreGlow(score: number): string {
  if (score <= 100) {
    return `0 0 10px #1e40af40`;
  } else if (score <= 200) {
    return `0 0 10px #05966940`;
  } else if (score <= 300) {
    return `0 0 10px #eab30840`;
  } else if (score <= 400) {
    return `0 0 10px #f9731640`;
  } else if (score <= 500) {
    return `0 0 15px #ea580c60`;
  } else if (score <= 600) {
    return `0 0 15px #dc262660`;
  } else if (score <= 700) {
    return `0 0 20px #be185d80`;
  } else if (score <= 800) {
    return `0 0 20px #9333ea80`;
  } else if (score <= 900) {
    return `0 0 25px #7c3aed90`;
  } else {
    return `0 0 30px #ffffff90`;
  }
}

// Helper function to get temperature-based text color
function getScoreTextColor(score: number): string {
  if (score <= 100) {
    return '#1e40af'; // Cold blue
  } else if (score <= 200) {
    return '#059669'; // Cool green
  } else if (score <= 300) {
    return '#eab308'; // Warm yellow
  } else if (score <= 400) {
    return '#f97316'; // Orange
  } else if (score <= 500) {
    return '#ea580c'; // Red-orange
  } else if (score <= 600) {
    return '#dc2626'; // Red
  } else if (score <= 700) {
    return '#be185d'; // Hot pink
  } else if (score <= 800) {
    return '#9333ea'; // Purple
  } else if (score <= 900) {
    return '#7c3aed'; // Violet
  } else {
    return '#fbbf24'; // White-hot
  }
}

// Helper function to get temperature-based text shadow
function getScoreTextShadow(score: number): string {
  if (score <= 100) {
    return `0 0 20px #1e40af40, 0 0 40px #1e40af20`;
  } else if (score <= 200) {
    return `0 0 20px #05966940, 0 0 40px #05966920`;
  } else if (score <= 300) {
    return `0 0 20px #eab30840, 0 0 40px #eab30820`;
  } else if (score <= 400) {
    return `0 0 20px #f9731640, 0 0 40px #f9731620`;
  } else if (score <= 500) {
    return `0 0 25px #ea580c60, 0 0 50px #ea580c30`;
  } else if (score <= 600) {
    return `0 0 25px #dc262660, 0 0 50px #dc262630`;
  } else if (score <= 700) {
    return `0 0 30px #be185d80, 0 0 60px #be185d40`;
  } else if (score <= 800) {
    return `0 0 30px #9333ea80, 0 0 60px #9333ea40`;
  } else if (score <= 900) {
    return `0 0 35px #7c3aed90, 0 0 70px #7c3aed50`;
  } else {
    return `0 0 40px #fbbf2490, 0 0 80px #fbbf2460`;
  }
}

interface ErgSpeedometerProps {
  score: number;
  pace?: number; // seconds per 500m
  power?: number; // watts
  distance?: number; // meters
  duration?: number; // seconds
  heartRate?: number; // bpm
  strokeRate?: number; // strokes per minute
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
  compact = false,
  teamScore,
  showTeamScore = false,
}: ErgSpeedometerProps) {
  if (compact) {
    return (
      <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
        <div className="text-center mb-4">
          <h3
            className="text-lg font-bold mb-1 text-orange-500"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {name.toUpperCase()}
          </h3>
          {/* User stats hidden for privacy */}
          {/* <p className="text-gray-400 text-sm">
            {age}y • {sex} • {weight}kg
          </p> */}
        </div>

        {/* Compact Score Display */}
        <div className="text-center mb-4">
          <div
            className="text-3xl font-bold mb-2"
            style={{
              color: getScoreTextColor(score),
              textShadow: getScoreGlow(score),
            }}
          >
            <span className="score-value">{score.toFixed(1)}</span>
          </div>
          <div
            className="text-orange-500 text-sm tracking-wider font-light"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            CHALLENGER SCORE
          </div>
        </div>

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 gap-3 text-center">
          {pace !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-2 border border-orange-500/20">
              <AnimatedCounter
                value={pace}
                label="PACE"
                unit="s/500m"
                color="text-orange-500"
                size="md"
                precision={1}
              />
            </div>
          )}
          {power !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-2 border border-orange-500/20">
              <AnimatedCounter
                value={power}
                label="POWER"
                unit="WATTS"
                color="text-orange-500"
                size="md"
                precision={0}
              />
            </div>
          )}
        </div>

        {/* Compact Distance */}
        <div className="text-center mt-3">
          <AnimatedCounter
            value={distance || 0}
            label="DISTANCE"
            unit="m"
            color="text-orange-500"
            size="md"
            precision={0}
          />
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
        <h2
          className="text-4xl font-bold mb-2 text-orange-500"
          style={{ fontFamily: 'var(--font-montserrat)' }}
        >
          {name.toUpperCase()}
        </h2>
        {/* User stats hidden for privacy */}
        {/* <p className="text-gray-400 text-lg">
          {age}y • {sex} • {weight}kg
        </p> */}
      </div>

      {/* Futuristic Dashboard */}
      <div className="bg-orange-500/5 rounded-2xl p-8 mb-6 relative overflow-hidden border border-orange-500/10 backdrop-blur-sm">
        {/* Background glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-10"
          style={{
            background: `radial-gradient(circle at center, #FF833320 0%, transparent 70%)`,
          }}
        />

        {/* Main Score Display */}
        <div className="text-center mb-8">
          <div
            className="text-9xl font-bold mb-4 relative"
            style={{
              color: getScoreTextColor(score),
              textShadow: getScoreTextShadow(score),
            }}
          >
            <span className="score-value">{score.toFixed(1)}</span>
          </div>
          <div
            className="text-orange-500 text-2xl tracking-wider font-light"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            CHALLENGER SCORE
          </div>

          {/* Progress bar with temperature gradient */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${(score / 1000) * 100}%`,
                  background: getScoreGradient(score),
                  boxShadow: getScoreGlow(score),
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
            <div className="bg-gray-800/30 rounded-xl p-6 border border-orange-500/20 backdrop-blur-sm">
              <AnimatedCounter
                value={pace}
                label="PACE"
                unit="s/500m"
                color="text-orange-500"
                size="lg"
                precision={1}
              />
            </div>
          )}

          {/* Power Card */}
          {power !== undefined && (
            <div className="bg-gray-800/30 rounded-xl p-6 border border-orange-500/20 backdrop-blur-sm">
              <AnimatedCounter
                value={power}
                label="POWER"
                unit="WATTS"
                color="text-orange-500"
                size="lg"
                precision={0}
              />
            </div>
          )}
        </div>

        {/* Score Range Indicator - Commented out for now */}
        {/* <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <span>Low (0-200)</span>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50 ml-4"></div>
            <span>Mid (200-600)</span>
            <div className="w-3 h-3 rounded-full bg-green-500/50 ml-4"></div>
            <span>High (600-1000)</span>
          </div>
        </div> */}
      </div>

      {/* Distance & Metrics Panel */}
      <div className="bg-orange-500/20 rounded-xl p-6 w-full max-w-md border border-orange-500/30">
        <div className="text-center mb-4">
          <AnimatedCounter
            value={distance || 0}
            label="DISTANCE"
            unit="meters"
            color="text-orange-500"
            size="xl"
            precision={0}
          />
        </div>

        <div className="flex justify-center gap-8">
          {heartRate !== undefined && (
            <AnimatedCounter
              value={heartRate}
              label="HEART RATE"
              unit="BPM"
              color="text-orange-500"
              size="md"
              precision={0}
            />
          )}
          {strokeRate !== undefined && (
            <AnimatedCounter
              value={strokeRate}
              label="STROKE RATE"
              unit="SPM"
              color="text-orange-500"
              size="md"
              precision={0}
            />
          )}
          {calories !== undefined && (
            <AnimatedCounter
              value={calories}
              label="CALORIES"
              unit="CAL"
              color="text-orange-500"
              size="md"
              precision={0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
