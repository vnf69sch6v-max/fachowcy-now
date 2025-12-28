
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { categorizeRequest } from "./lib/ai";
export { mediatorAgent } from './chatAi'; // Export the Vertex AI Mediator

admin.initializeApp();

export const onBookingCreated = onDocumentCreated("bookings/{bookingId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }

    const data = snap.data();

    // Use listingSnapshot.title or serviceLocation.address as description
    const description = data.listingSnapshot?.title ||
        data.serviceLocation?.address ||
        data.notes;

    if (!description) {
        logger.info("No description found for booking", event.params.bookingId);
        return;
    }

    logger.info(`Processing booking ${event.params.bookingId} with AI...`);

    try {
        const aiResult = await categorizeRequest(description);

        await snap.ref.update({
            aiCategory: aiResult.category,
            aiPriority: aiResult.priority,
            aiTags: aiResult.tags,
            aiEstimatedDuration: aiResult.estimatedDurationHours,
            aiProcessedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`AI processing complete for ${event.params.bookingId}`, aiResult);
    } catch (error) {
        logger.error("Error processing booking with AI", error);
        await snap.ref.update({
            aiCategory: "Do weryfikacji",
            aiError: true
        });
    }
});

/**
 * onReviewCreated - Updates provider's average rating when a new review is submitted
 * 
 * Trigger: When a new document is created in reviews/{reviewId}
 * Logic:
 * 1. Get the hostId from the review
 * 2. Query all reviews for this host
 * 3. Calculate average rating and count
 * 4. Update the providers/{hostId} document
 */
export const onReviewCreated = onDocumentCreated("reviews/{reviewId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }

    const reviewData = snap.data();
    const hostId = reviewData.hostId;

    if (!hostId) {
        logger.error("Review missing hostId", event.params.reviewId);
        return;
    }

    logger.info(`Processing new review for provider ${hostId}...`);

    try {
        const db = admin.firestore();

        // Get all reviews for this provider
        const reviewsSnapshot = await db.collection("reviews")
            .where("hostId", "==", hostId)
            .get();

        if (reviewsSnapshot.empty) {
            logger.info("No reviews found for provider", hostId);
            return;
        }

        // Calculate average rating
        let totalRating = 0;
        let reviewCount = 0;

        reviewsSnapshot.forEach(doc => {
            const data = doc.data();
            if (typeof data.rating === "number") {
                totalRating += data.rating;
                reviewCount++;
            }
        });

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

        // Update provider document
        await db.collection("providers").doc(hostId).update({
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            reviewCount: reviewCount,
            lastReviewAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Also update public_profiles if it exists
        const publicProfileRef = db.collection("public_profiles").doc(hostId);
        const publicProfileSnap = await publicProfileRef.get();
        if (publicProfileSnap.exists) {
            await publicProfileRef.update({
                rating: Math.round(averageRating * 10) / 10,
                reviewCount: reviewCount
            });
        }

        logger.info(`Updated provider ${hostId} rating to ${averageRating.toFixed(1)} (${reviewCount} reviews)`);

    } catch (error) {
        logger.error("Error updating provider rating:", error);
    }
});
