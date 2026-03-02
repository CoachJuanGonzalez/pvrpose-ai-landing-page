/**
 * Vercel Serverless Function - AI Assessment Submission Handler
 * Sends assessment data directly to Airtable
 * Environment Variables Required:
 * - AIRTABLE_API_KEY: Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Airtable Base ID
 * - AIRTABLE_TABLE_NAME: Airtable Table Name (default: "tblAssessmentSubmissions")
 */

export default async function handler(req, res) {
    // CORS headers - allow all origins for now to debug
    res.setHeader('Access-Control-Allow-Origin', '*');
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

    // Log request for debugging
    console.log('Assessment submission received:', {
        method: req.method,
        body: req.body,
        headers: req.headers
    });

    try {
        const { first_name, email, score, answers, timestamp, fingerprint, source, consent, document, pdf_base64, pdf_filename } = req.body;

        // Validation
        if (!first_name || !email || !score || !answers) {
            console.error('Validation failed - missing fields:', { first_name, email, score, answers: !!answers });
            return res.status(400).json({
                error: 'Missing required fields',
                details: {
                    first_name: !!first_name,
                    email: !!email,
                    score: !!score,
                    answers: !!answers
                }
            });
        }

        // Email validation
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            console.error('Email validation failed:', email);
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Prepare payload
        const payload = {
            first_name: first_name.trim(),
            email: email.trim().toLowerCase(),
            score: parseInt(score),
            answers: answers,
            timestamp: timestamp || new Date().toISOString(),
            fingerprint: fingerprint || '',
            source: source || 'pvrposeailandingpage',
            document: document || '',
            pdf_base64: pdf_base64 || null,
            pdf_filename: pdf_filename || null,
            consent: consent || {
                marketing: true,
                timestamp: new Date().toISOString(),
                jurisdiction: 'CA'
            }
        };

        console.log('Payload prepared:', payload);

        // Submit to Airtable
        const airtableResult = await submitToAirtable(payload);

        console.log('Airtable submission successful:', airtableResult);

        // Success response
        return res.status(200).json({
            success: true,
            message: 'Assessment submitted successfully',
            email: payload.email,
            airtableId: airtableResult.id
        });

    } catch (error) {
        console.error('Assessment submission error:', error);
        return res.status(500).json({
            error: 'Failed to submit assessment',
            message: error.message,
            details: error.toString()
        });
    }
}

/**
 * Submit directly to Airtable
 */
async function submitToAirtable(payload) {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'tblAssessmentSubmissions';
    const apiKey = process.env.AIRTABLE_API_KEY;

    console.log('Airtable config:', {
        baseId: baseId ? 'SET' : 'MISSING',
        tableName,
        apiKey: apiKey ? 'SET' : 'MISSING'
    });

    if (!apiKey || !baseId) {
        throw new Error('Airtable credentials not configured in Vercel environment variables');
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    // Transform answers array to Airtable-friendly format
    const answersText = payload.answers.map(a =>
        `Q${a.questionId}: ${a.question}\nA: ${a.selectedOption.text} (Score: ${a.value})`
    ).join('\n\n');

    // Extract top priority from answers
    const topPriority = extractTopPriority(payload.answers);

    // Build fields object - only include fields that exist in Airtable
    const fields = {
        'first_name': payload.first_name,
        'email': payload.email,
        'score': payload.score,
        'assessment_answers': answersText,
        'source': payload.source,
        'fingerprint': payload.fingerprint,
        'status': 'New',
        'top_priority': topPriority
    };

    // Add document field if provided
    if (payload.document) {
        fields['document'] = payload.document;
    }

    // Add PDF attachment if provided
    if (payload.pdf_base64 && payload.pdf_filename) {
        fields['pdf_report'] = [
            {
                filename: payload.pdf_filename,
                url: `data:application/pdf;base64,${payload.pdf_base64}`
            }
        ];
    }

    // Add optional fields if they're not computed in Airtable
    if (payload.timestamp) {
        fields['submission_date'] = payload.timestamp;
    }

    if (payload.consent.marketing !== undefined) {
        fields['consent_marketing'] = payload.consent.marketing;
    }

    if (payload.consent.timestamp) {
        fields['consent_date'] = payload.consent.timestamp;
    }

    if (payload.consent.jurisdiction) {
        fields['jurisdiction'] = payload.consent.jurisdiction;
    }

    const airtablePayload = {
        records: [
            {
                fields: fields
            }
        ]
    };

    console.log('Sending to Airtable:', airtableUrl);

    const response = await fetch(airtableUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtablePayload)
    });

    const responseText = await response.text();
    console.log('Airtable response:', { status: response.status, body: responseText });

    if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    return result.records[0];
}

/**
 * Extract top priority from assessment answers
 */
function extractTopPriority(answers) {
    const categories = {};

    answers.forEach(answer => {
        if (answer.category) {
            categories[answer.category] = (categories[answer.category] || 0) + answer.weight;
        }
    });

    const topCategory = Object.keys(categories).sort((a, b) => categories[b] - categories[a])[0];

    const categoryMap = {
        'communication': 'Client communication & follow-up automation',
        'scheduling': 'Calendar management & scheduling automation',
        'sales': 'Proposal generation & sales process automation',
        'data': 'Data entry & CRM automation'
    };

    return categoryMap[topCategory] || 'Workflow automation & process optimization';
}
