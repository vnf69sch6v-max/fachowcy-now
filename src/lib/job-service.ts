import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { Job, JobProposal, JobStatus } from "@/types/firestore-v2";

export class JobService {

    /**
     * Create a new job request
     */
    static async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'proposalIds' | 'status'> & { status?: JobStatus }): Promise<string | null> {
        if (!db) return null;

        try {
            const now = serverTimestamp();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

            const newJob = {
                ...jobData,
                status: jobData.status || 'open',
                proposalIds: [],
                createdAt: now,
                updatedAt: now,
                expiresAt: Timestamp.fromDate(expiresAt)
            };

            const docRef = await addDoc(collection(db, 'jobs'), newJob);
            return docRef.id;
        } catch (error) {
            console.error("Error creating job:", error);
            return null;
        }
    }

    /**
     * Submit a proposal for a job
     */
    static async submitProposal(jobId: string, proposal: Omit<JobProposal, 'id' | 'createdAt' | 'status'>): Promise<string | null> {
        if (!db) return null;

        try {
            // 1. Create proposal
            const proposalData = {
                ...proposal,
                jobId,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            const proposalRef = await addDoc(collection(db, 'jobs', jobId, 'proposals'), proposalData);

            // 2. Update Job with proposal ID
            const jobRef = doc(db, 'jobs', jobId);
            // Note: In real app use arrayUnion, but keeping it simple for now or fetch existing first
            // Keeping proposalIds in root document helps with counting without reading subcollection
            // await updateDoc(jobRef, {
            //    proposalIds: arrayUnion(proposalRef.id)
            // });

            return proposalRef.id;
        } catch (error) {
            console.error("Error submitting proposal:", error);
            return null;
        }
    }

    /**
     * Accept a proposal
     */
    static async acceptProposal(jobId: string, proposalId: string): Promise<boolean> {
        if (!db) return false;

        try {
            const jobRef = doc(db, 'jobs', jobId);
            const proposalRef = doc(db, 'jobs', jobId, 'proposals', proposalId);

            // Transaction would be better here
            await updateDoc(jobRef, {
                status: 'accepted',
                updatedAt: serverTimestamp()
                // assignedProId: ... (fetch from proposal)
            });

            await updateDoc(proposalRef, {
                status: 'accepted'
            });

            return true;
        } catch (error) {
            console.error("Error accepting proposal:", error);
            return false;
        }
    }

    /**
     * Get jobs for a specific client
     */
    static async getClientJobs(clientId: string): Promise<Job[]> {
        if (!db) return [];

        try {
            const q = query(
                collection(db, 'jobs'),
                where('clientId', '==', clientId),
                where('status', '!=', 'draft')
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
        } catch (error) {
            console.error("Error fetching client jobs:", error);
            return [];
        }
    }

    /**
     * Get open jobs (for marketplace) via simple query
     * Advanced geo-query should be done via separate logic (like useNearbyProviders style)
     */
    static async getOpenJobs(limit: number = 20): Promise<Job[]> {
        if (!db) return [];

        try {
            const q = query(
                collection(db, 'jobs'),
                where('status', '==', 'open')
                // orderBy('createdAt', 'desc') // Requires index
                // limit(limit)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
        } catch (error) {
            console.error("Error fetching open jobs:", error);
            return [];
        }
    }
}
