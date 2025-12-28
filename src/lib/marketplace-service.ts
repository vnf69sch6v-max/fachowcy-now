import * as geofire from 'geofire-common';
import { JobService } from "@/lib/job-service";
import { ServiceType } from "@/types/firestore-v2";

export interface PublishJobInput {
    clientId: string;
    clientName: string;
    description: string;
    category: string;
    priceRange: { min: number; max: number };
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    urgency: 'high' | 'medium' | 'low';
    photoUrls?: string[];
}

/**
 * Publishes a job request to the open marketplace using the new Jobs collection
 */
export async function publishJobRequest(input: PublishJobInput): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        // Map urgency to Job type
        const urgencyMap: Record<string, 'asap' | 'today' | 'week' | 'flexible'> = {
            'high': 'asap',
            'medium': 'week',
            'low': 'flexible'
        };

        // Generate geohash
        const hash = geofire.geohashForLocation([input.location.lat, input.location.lng]);

        const jobId = await JobService.createJob({
            clientId: input.clientId,
            clientName: input.clientName,
            title: `${input.category} - ${input.location.address.split(',')[0]}`, // Auto-generate title
            description: input.description,
            category: input.category as ServiceType,

            location: input.location,
            geoHash: hash,

            photoUrls: input.photoUrls || [],
            priceEstimate: input.priceRange,
            urgency: urgencyMap[input.urgency] || 'flexible',

            source: 'ai_chat'
        });

        if (jobId) {
            return { success: true, jobId };
        } else {
            return { success: false, error: 'Failed to create job document' };
        }
    } catch (error) {
        console.error('Error publishing job:', error);
        return { success: false, error: 'Failed to publish job' };
    }
}
