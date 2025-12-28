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
    Timestamp,
    runTransaction,
    arrayUnion,
    Firestore
} from "firebase/firestore";
import { Job, JobProposal, JobStatus } from "@/types/firestore-v2";

export class JobService {

    /**
     * Atomically creates a Job and a linked Chat thread.
     * Guarantees that neither exists without the other (Genesis Transaction).
     */
    static async createJobWithChat(
        jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'proposalIds' | 'status' | 'chatId' | 'clientId' | 'clientName'>,
        clientId: string,
        clientName: string
    ): Promise<{ jobId: string; chatId: string } | null> {
        if (!db) return null;

        // 1. Reserve IDs client-side
        const jobRef = doc(collection(db as Firestore, 'jobs'));
        const chatRef = doc(collection(db as Firestore, 'chats'));

        try {
            await runTransaction(db as Firestore, async (transaction) => {
                const now = serverTimestamp();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                // 2. Prepare Job Payload with cross-reference
                const finalJob = {
                    ...jobData,
                    status: 'open',
                    proposalIds: [],
                    chatId: chatRef.id,        // Link to Chat
                    clientId,
                    clientName,
                    createdAt: now,
                    updatedAt: now,
                    expiresAt: Timestamp.fromDate(expiresAt),
                    _lock: null                 // Optimistic lock field
                };

                // 3. Prepare Chat Payload with cross-reference
                const initialChat = {
                    id: chatRef.id,
                    jobId: jobRef.id,          // Link to Job
                    jobTitle: jobData.title,   // For display in messages tab
                    clientId,
                    clientName,
                    participantIds: [clientId], // Initially only client
                    status: 'open',             // Active for AI/System messages
                    isActive: true,
                    lastMessage: 'Zlecenie utworzone. Oczekiwanie na oferty.',
                    lastMessageAt: now,
                    createdAt: now,
                    updatedAt: now,
                    unreadCount: { client: 0, professional: 0 }
                };

                // 4. Atomic Write
                transaction.set(jobRef, finalJob);
                transaction.set(chatRef, initialChat);

                // 5. Initial System Message
                const msgRef = doc(collection(db as Firestore, `chats/${chatRef.id}/messages`));
                transaction.set(msgRef, {
                    content: '📋 Zlecenie zostało utworzone i jest widoczne dla fachowców.',
                    senderId: 'system',
                    senderRole: 'system',
                    type: 'system',
                    createdAt: now
                });
            });

            console.log("Atomic Genesis Transaction successful.");
            return { jobId: jobRef.id, chatId: chatRef.id };

        } catch (error) {
            console.error("Genesis Transaction FAILED:", error);
            return null;
        }
    }

    /**
     * Create a new job request (Legacy - prefer createJobWithChat)
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
     * Accept a proposal transactionally (Double Booking Fix)
     */
    static async acceptProposalAtomic(
        jobId: string,
        proposalId: string,
        providerId: string,
        providerName: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!db) return { success: false, error: 'DB not initialized' };

        const jobRef = doc(db as Firestore, 'jobs', jobId);
        const proposalRef = doc(db as Firestore, 'jobs', jobId, 'proposals', proposalId);

        try {
            await runTransaction(db as Firestore, async (transaction) => {
                // 1. READ: Get current state
                const jobSnap = await transaction.get(jobRef);
                const proposalSnap = await transaction.get(proposalRef);

                if (!jobSnap.exists() || !proposalSnap.exists()) {
                    throw new Error('Job or Proposal not found');
                }

                // 2. LOGIC GATE: Check if status allows acceptance
                const currentStatus = jobSnap.data().status;
                if (currentStatus !== 'open') {
                    throw new Error(`Job already ${currentStatus}. Cannot accept.`);
                }

                // 3. WRITE: Commit changes
                transaction.update(jobRef, {
                    status: 'accepted',
                    assignedProId: providerId,
                    assignedProName: providerName,
                    acceptedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                transaction.update(proposalRef, {
                    status: 'accepted',
                    acceptedAt: serverTimestamp()
                });

                // 4. Update linked chat to include professional
                const chatId = jobSnap.data().chatId;
                if (chatId) {
                    const chatRef = doc(db as Firestore, 'chats', chatId);
                    transaction.update(chatRef, {
                        professionalId: providerId,
                        professionalName: providerName,
                        participantIds: arrayUnion(providerId), // Add pro to participants
                        status: 'active',
                        updatedAt: serverTimestamp()
                    });
                    // Add system message to chat
                    const msgRef = doc(collection(db as Firestore, `chats/${chatId}/messages`));
                    transaction.set(msgRef, {
                        content: `🤝 Oferta fachowca ${providerName} została zaakceptowana.`,
                        senderId: 'system',
                        senderRole: 'system',
                        type: 'system',
                        createdAt: serverTimestamp()
                    });
                }
            });

            return { success: true };

        } catch (error: any) {
            console.error("Accept Proposal Transaction FAILED:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Accept a proposal (Legacy)
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

    /**
     * Get proposals for a specific job
     */
    static async getJobProposals(jobId: string): Promise<JobProposal[]> {
        if (!db) return [];

        try {
            const proposalsRef = collection(db, 'jobs', jobId, 'proposals');
            const snap = await getDocs(proposalsRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobProposal));
        } catch (error) {
            console.error("Error fetching proposals:", error);
            return [];
        }
    }

    /**
     * Professional accepts a job - atomic transaction
     * Updates job status, adds pro to chat, sends system message
     */
    static async acceptJob(
        jobId: string,
        professionalId: string,
        professionalName: string
    ): Promise<boolean> {
        if (!db) return false;

        try {
            await runTransaction(db as Firestore, async (transaction) => {
                const jobRef = doc(db as Firestore, 'jobs', jobId);
                const jobSnap = await transaction.get(jobRef);

                if (!jobSnap.exists()) {
                    throw new Error('Job not found');
                }

                const jobData = jobSnap.data();
                if (jobData.status !== 'open') {
                    throw new Error('Job is no longer available');
                }

                const chatId = jobData.chatId;
                const now = serverTimestamp();

                // 1. Update job status
                transaction.update(jobRef, {
                    status: 'accepted',
                    assignedProId: professionalId,
                    assignedProName: professionalName,
                    acceptedAt: now,
                    updatedAt: now
                });

                // 2. Update chat - add professional to participants
                if (chatId) {
                    const chatRef = doc(db as Firestore, 'chats', chatId);
                    transaction.update(chatRef, {
                        professionalId,
                        professionalName,
                        participantIds: arrayUnion(professionalId),
                        status: 'accepted',
                        updatedAt: now
                    });

                    // 3. Send system message
                    const msgRef = doc(collection(db as Firestore, `chats/${chatId}/messages`));
                    transaction.set(msgRef, {
                        content: `✅ ${professionalName} zaakceptował zlecenie! Możecie teraz rozmawiać.`,
                        senderId: 'system',
                        senderName: 'System',
                        senderRole: 'system',
                        type: 'system',
                        createdAt: now
                    });

                    // Update last message
                    transaction.update(chatRef, {
                        lastMessage: `✅ ${professionalName} zaakceptował zlecenie!`,
                        lastMessageAt: now,
                        'unreadCount.client': 1
                    });
                }
            });

            console.log("Job accepted successfully:", jobId);
            return true;
        } catch (error) {
            console.error("Error accepting job:", error);
            return false;
        }
    }
}
