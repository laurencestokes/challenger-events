'use client';
import React, { useState } from 'react';

// Simple QR code SVG generator
function QRCodeSVG({}: { value: string }) {
  // For brevity, use a placeholder SVG. Replace with a real QR code generator for production.
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mt-2">
      <rect width="120" height="120" fill="#f3f4f6" />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fill="#333">
        QR
      </text>
    </svg>
  );
}

export default function PublicProfileShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="mt-4 flex flex-col items-center">
      <button
        onClick={handleCopy}
        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        {copied ? 'Copied!' : 'Copy Profile Link'}
      </button>
      <QRCodeSVG value={url} />
      <span className="text-xs text-gray-400 mt-1">Scan to view this profile</span>
    </div>
  );
}
