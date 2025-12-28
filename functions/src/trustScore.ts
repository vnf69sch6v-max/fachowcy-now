import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin if not already
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ===========================================
// CONFIGURATION
// ===========================================

// Weights for Trust Score Algorithm
const SCORE_WEIGHTS = {
    bookings: 0.4,    // 40%
    rating: 0.4,      // 40%
    verification: 0.2 // 20%
};

const MAX_BOOKINGS_CAP = 50; // Bookings count for max score part

/**
 * Recalculate Trust Score for a user
 * Triggered when:
 * - A booking is completed
 * - A review is received
 * - Verification status changes
 */
export const recalculateTrustScore = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const newData = change.after.exists ? change.after.data() : null;
        const oldData = change.before.exists ? change.before.data() : null;

        if (!newData) return null; // User deleted

        // Check if relevant fields changed to avoid infinite loops
        const bookingsChanged = newData.completedBookings !== oldData?.completedBookings;
        const ratingChanged = newData.averageRating !== oldData?.averageRating;
        const verificationChanged = newData.isVerified !== oldData?.isVerified;

        if (!bookingsChanged && !ratingChanged && !verificationChanged) {
            return null;
        }

        try {
            // 1. Calculate Booking Score (0-100)
            // Cap at 50 bookings for 100 points in this category
            const bookingsCount = newData.completedBookings || 0;
            const bookingScore = Math.min((bookingsCount / MAX_BOOKINGS_CAP) * 100, 100);

            // 2. Calculate Rating Score (0-100)
            // 5 stars = 100, 1 star = 20
            const rating = newData.averageRating || 0;
            const ratingScore = (rating / 5) * 100;

            // 3. Calculate Verification Score (0 or 100)
            const verificationScore = newData.isVerified ? 100 : 0;

            // 4. Final Weighted Score
            const finalScore = Math.round(
                (bookingScore * SCORE_WEIGHTS.bookings) +
                (ratingScore * SCORE_WEIGHTS.rating) +
                (verificationScore * SCORE_WEIGHTS.verification)
            );

            // Update user document with new score
            // Use update to avoid triggering onWrite if the value hasn't changed effectively
            // (though here we just force update)
            await db.collection("users").doc(userId).update({
                trustScore: finalScore,
                trustScoreUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Updated Trust Score for ${userId}: ${finalScore}`);
            return finalScore;

        } catch (error) {
            console.error("Error calculating trust score:", error);
            return null;
        }
    });
