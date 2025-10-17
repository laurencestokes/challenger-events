import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { AchievementResult } from '@/utils/achievementCalculation';

interface SocialMediaImageGeneratorProps {
  user: {
    name: string;
    publicProfileShowAge?: boolean;
    publicProfileShowBodyweight?: boolean;
    publicProfileShowSex?: boolean;
    dateOfBirth?: unknown;
    bodyweight?: number;
    sex?: string;
  };
  overallTotal: number;
  overallVerifiedTotal: number;
  userRank: {
    name: string;
    color: string;
    image: string;
  };
  strengthTotalAll: number;
  strengthTotalVerified: number;
  enduranceTotalAll: number;
  enduranceTotalVerified: number;
  userAchievements: AchievementResult[];
  competitorAchievement: AchievementResult | null | undefined;
  highestScoreAchievement: AchievementResult | null | undefined;
  specialistAchievements: AchievementResult[];
  bestVerifiedScoresByType: Record<string, number>;
  bestScoresByType: Record<string, number>;
}

export default function SocialMediaImageGenerator({
  user,
  overallTotal,
  overallVerifiedTotal,
  userRank,
  strengthTotalAll,
  strengthTotalVerified,
  enduranceTotalAll,
  enduranceTotalVerified,
  competitorAchievement,
  highestScoreAchievement,
  specialistAchievements,
}: SocialMediaImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate image function
  const generateImage = async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#000000',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        width: 1080,
        height: 1350, // Instagram optimal size
      });

      const imageDataURL = canvas.toDataURL('image/png');
      setGeneratedImage(imageDataURL);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate image when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      generateImage();
    }, 500); // Small delay to ensure the canvas is rendered

    return () => clearTimeout(timer);
  }, []);

  // Age calculation helper
  const calculateAge = (dateOfBirth: unknown): string | number => {
    if (!dateOfBirth) return 'Not set';
    type FirestoreTimestamp = { seconds: number; nanoseconds: number };
    const dobRaw = dateOfBirth;
    let dob: Date;
    if (typeof dobRaw === 'object' && dobRaw !== null && 'seconds' in dobRaw) {
      dob = new Date((dobRaw as FirestoreTimestamp).seconds * 1000);
    } else if (typeof dobRaw === 'string') {
      dob = new Date(dobRaw);
    } else {
      return 'Not set';
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return isNaN(age) ? 'Not set' : age;
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.download = `challenger-profile-${user.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = generatedImage;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image generation */}
      <div
        ref={canvasRef}
        className="fixed -top-[9999px] left-0 w-[1080px] h-[1350px] bg-black"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {/* Social Media Optimized Layout */}
        <div className="w-full h-full relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="/event_placeholder.png"
              alt="Background"
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>

          {/* Content - Copy exact profile page layout */}
          <div className="relative z-10 p-8 h-full flex flex-col justify-center">
            {/* Main Profile Card */}
            <div
              className="bg-[#131313]/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 border-b-4 max-w-3xl mx-auto w-full"
              style={{ borderBottomColor: '#e84c04' }}
            >
              {/* Top Section - Two Column Layout */}
              <div className="flex justify-between items-start mb-8">
                {/* Left Side - Name and Main Score */}
                <div className="flex-1 text-center">
                  <h2
                    className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {user.name.split(' ').map((part, index) => (
                      <div key={index}>{part.toUpperCase()}</div>
                    ))}
                  </h2>

                  <h1
                    className="text-6xl md:text-7xl font-bold mb-8 flex items-baseline justify-center gap-3"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <span style={{ color: '#e84c04' }}>{overallTotal}</span>
                    <span
                      className="text-2xl md:text-3xl font-semibold"
                      style={{ color: '#4682B4' }}
                    >
                      {overallVerifiedTotal}
                    </span>
                  </h1>

                  {/* Personal Stats */}
                  <div className="flex items-center justify-center gap-4 text-white text-sm mb-4">
                    {user.publicProfileShowAge && (
                      <span className="uppercase">Age: {calculateAge(user.dateOfBirth)}</span>
                    )}
                    {user.publicProfileShowBodyweight && (
                      <span className="uppercase">
                        Weight:{' '}
                        {typeof user.bodyweight === 'number' ? `${user.bodyweight} kg` : 'Not set'}
                      </span>
                    )}
                    {user.publicProfileShowSex && (
                      <span className="uppercase">
                        Sex: {typeof user.sex === 'string' ? user.sex : 'Not set'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side - Logo and Rank */}
                <div className="lg:w-80">
                  <div className="text-center">
                    <div className="mb-6">
                      <img
                        src="/challengerco-logo-text-only.png"
                        alt="Challenger Co"
                        className="h-12 mx-auto object-contain"
                      />
                    </div>

                    {/* Rank */}
                    <div className="w-32 h-32 mx-auto mb-4">
                      <img
                        src={userRank.image}
                        alt={`${userRank.name} Rank`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ fontFamily: 'Montserrat, sans-serif', color: userRank.color }}
                    >
                      {userRank.name.toUpperCase()}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Orange Divider */}
              <div className="w-full h-1 mb-8" style={{ backgroundColor: '#e84c04' }}></div>

              {/* Stats Section */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-2">VERIFIED SCORE</div>
                  <div className="text-2xl font-bold" style={{ color: '#4682B4' }}>
                    {overallVerifiedTotal}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-2">TOTAL SCORE</div>
                  <div className="text-2xl font-bold" style={{ color: '#e84c04' }}>
                    {overallTotal}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-2">STRENGTH</div>
                  <div className="text-2xl font-bold">
                    <span className="text-white">{strengthTotalAll}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span style={{ color: '#4682B4' }}>{strengthTotalVerified}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-2">ENDURANCE</div>
                  <div className="text-2xl font-bold">
                    <span className="text-white">{enduranceTotalAll}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span style={{ color: '#4682B4' }}>{enduranceTotalVerified}</span>
                  </div>
                </div>
              </div>

              {/* Achievements Section */}
              <div className="text-center mb-8 mt-6">
                <div className="text-lg font-bold text-white mb-4">ACHIEVEMENTS</div>
                <div className="flex justify-center gap-6">
                  {/* Show competitor achievement */}
                  {competitorAchievement && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2">
                        <img
                          src={competitorAchievement.achievement.image}
                          alt={competitorAchievement.achievement.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-white text-sm font-bold">
                        {competitorAchievement.achievement.name}
                      </p>
                    </div>
                  )}

                  {/* Show highest score achievement */}
                  {highestScoreAchievement && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2">
                        <img
                          src={highestScoreAchievement.achievement.image}
                          alt={highestScoreAchievement.achievement.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-white text-sm font-bold">
                        {highestScoreAchievement.achievement.name}
                      </p>
                    </div>
                  )}

                  {/* Show specialist achievements */}
                  {specialistAchievements.slice(0, 2).map((achievementResult) => (
                    <div key={achievementResult.achievement.id} className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2">
                        <img
                          src={achievementResult.achievement.image}
                          alt={achievementResult.achievement.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-white text-sm font-bold">
                        {achievementResult.achievement.name.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Marketing Blurb and Logo */}
            <div className="text-center mt-8">
              <div className="text-white text-lg mb-2">Join the Challenge</div>
              <div className="text-orange-400 text-sm mb-2">challengerco.com</div>
              <div className="text-white text-sm mb-4">#challengeanyone</div>
              <img
                src="/challenger-logo-no-text.png"
                alt="Challenger Co"
                className="h-8 mx-auto object-contain opacity-80"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={downloadImage}
          disabled={!generatedImage}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download Image
        </button>
      </div>

      {/* Preview */}
      <div className="mt-6">
        <h3 className="text-white text-lg font-semibold mb-4">Preview:</h3>
        <div className="max-w-md mx-auto">
          {isGenerating ? (
            <div className="w-full aspect-[4/5] bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="text-gray-300 text-sm">Generating image...</span>
              </div>
            </div>
          ) : generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated social media image"
              className="w-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-full aspect-[4/5] bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image generated</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
