/**
 * Payment Service - Mock Implementation
 * 
 * Simulates payment processing for prototype.
 * Replace with Stripe/PayU when ready for production.
 */

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

export interface PaymentIntent {
    amount: number;
    currency: string;
    description: string;
    bookingId: string;
}

/**
 * Process a mock payment
 * Simulates 2-second processing time
 */
export async function processPayment(intent: PaymentIntent): Promise<PaymentResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
        return {
            success: true,
            transactionId: `MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 11).toUpperCase()}`
        };
    }

    return {
        success: false,
        error: 'Płatność nie powiodła się. Sprawdź dane karty i spróbuj ponownie.'
    };
}

/**
 * Validate card number (Luhn algorithm mock)
 */
export function validateCardNumber(number: string): boolean {
    const cleaned = number.replace(/\s/g, '');
    return /^\d{16}$/.test(cleaned);
}

/**
 * Validate expiry date
 */
export function validateExpiry(expiry: string): boolean {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;

    const [month, year] = expiry.split('/').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Get card type from number
 */
export function getCardType(number: string): 'visa' | 'mastercard' | 'other' {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    return 'other';
}
