
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Trigger: When a new message is created in a chat
 * Action: Send FCM notification to the recipient
 */
export const onNewMessage = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const messageData = snapshot.data();
    const chatId = event.params.chatId;

    try {
        // 1. Get chat metadata to identify recipient
        const chatDoc = await admin.firestore().collection("chats").doc(chatId).get();
        if (!chatDoc.exists) return;

        const chatData = chatDoc.data();
        if (!chatData) return;

        // Determine sender and recipient
        const senderId = messageData.senderId;
        const recipientId = senderId === chatData.clientId ? chatData.professionalId : chatData.clientId;
        const senderName = senderId === chatData.clientId ? chatData.clientName : chatData.professionalName;

        // 2. Get recipient's FCM tokens
        const tokensDoc = await admin.firestore().collection("fcm_tokens").doc(recipientId).get();

        if (!tokensDoc.exists) {
            console.log(`No FCM tokens found for user ${recipientId}`);
            return;
        }

        const tokens = tokensDoc.data()?.tokens || [];
        if (tokens.length === 0) return;

        // 3. Send Notification
        const payload = {
            notification: {
                title: senderName || "Nowa wiadomość",
                body: messageData.content || messageData.text || "Wysłano zdjęcie",
            },
            data: {
                chatId: chatId,
                type: "NEW_MESSAGE"
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            notification: payload.notification,
            data: payload.data
        });

        console.log(`Sent ${response.successCount} notifications to ${recipientId}`);

        // Cleanup invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    invalidTokens.push(tokens[idx]);
                }
            });

            if (invalidTokens.length > 0) {
                await tokensDoc.ref.update({
                    tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                });
            }
        }

    } catch (error) {
        console.error("Error sending notification:", error);
    }
});
