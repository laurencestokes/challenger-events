import { NextResponse } from 'next/server';
import { ChallengerData } from '@challengerco/challenger-data';

export async function GET() {
    try {
        const challengerData = new ChallengerData();

        // Test basic functionality
        const testResult = challengerData.squatScore(100, 'male', 25, 80);

        return NextResponse.json({
            success: true,
            testResult,
            packageVersion: '4.0.0', // Update this to match your package version
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error testing challenger-data:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
} 