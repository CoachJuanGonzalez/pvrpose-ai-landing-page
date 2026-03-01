/**
 * Vercel Serverless Function - AI Assessment Submission Handler
 * Securely forwards assessment data to Make.com webhook and Airtable
 * Environment Variables Required:
 * - MAKE_WEBHOOK_URL: Make.com webhook endpoint
 * - AIRTABLE_API_KEY: Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Airtable Base ID
 * - AIRTABLE_TABLE_NAME: Airtable Table Name (default: "AI Assessments")
 */

export default async function handler(req, res) {
    // CORS headers for your domain
    const allowedOrigins = [
        'https://pvrpose.ai',
        'https://www.pvrpose.ai',
        'http://localhost:3000', // For local testing
        'http://localhost:8080'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, phone, score, answers, timestamp, fingerprint, source, consent } = req.body;

        // Validation
        if (!name || !email || !score || !answers) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Email validation
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Prepare payload
        const payload = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || '',
            score: parseInt(score),
            answers: answers,
            timestamp: timestamp || new Date().toISOString(),
            fingerprint: fingerprint || '',
            source: source || 'assessment_completion',
            consent: consent || {
                marketing: true,
                timestamp: new Date().toISOString(),
                jurisdiction: 'CA'
            },
            documentType: 'Personalized AI Implementation Roadmap'
        };

        // Send to Make.com webhook (handles PDF generation + email)
        const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

        if (!makeWebhookUrl) {
            console.error('MAKE_WEBHOOK_URL environment variable not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const makeResponse = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!makeResponse.ok) {
            throw new Error(`Make.com webhook failed: ${makeResponse.status}`);
        }

        // Optional: Direct Airtable integration as backup/redundancy
        if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
            try {
                await submitToAirtable(payload);
            } catch (airtableError) {
                // Log but don't fail - Make.com should handle Airtable
                console.error('Airtable direct submission failed:', airtableError);
            }
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: 'Assessment submitted successfully',
            email: payload.email
        });

    } catch (error) {
        console.error('Assessment submission error:', error);
        return res.status(500).json({
            error: 'Failed to submit assessment',
            message: error.message
        });
    }
}

/**
 * Helper function: Submit to Airtable directly (optional redundancy)
 */
async function submitToAirtable(payload) {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'AI Assessments';
    const apiKey = process.env.AIRTABLE_API_KEY;

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    // Transform answers array to Airtable-friendly format
    const answersText = payload.answers.map(a =>
        `Q${a.questionId}: ${a.question}\nA: ${a.selectedOption.text} (Score: ${a.value})`
    ).join('\n\n');

    const airtablePayload = {
        records: [
            {
                fields: {
                    'Name': payload.name,
                    'Email': payload.email,
                    'Phone': payload.phone,
                    'AI Readiness Score': payload.score,
                    'Assessment Answers': answersText,
                    'Timestamp': payload.timestamp,
                    'Source': payload.source,
                    'Consent Marketing': payload.consent.marketing,
                    'Consent Timestamp': payload.consent.timestamp,
                    'Jurisdiction': payload.consent.jurisdiction,
                    'Fingerprint': payload.fingerprint,
                    'Status': 'New'
                }
            }
        ]
    };

    const response = await fetch(airtableUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtablePayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}
