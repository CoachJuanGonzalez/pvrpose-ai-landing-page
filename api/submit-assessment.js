/**
 * Vercel Serverless Function - AI Assessment Submission Handler
 * Sends assessment data directly to Airtable with PDF upload to Vercel Blob Storage
 * Environment Variables Required:
 * - AIRTABLE_API_KEY: Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Airtable Base ID
 * - AIRTABLE_TABLE_NAME: Airtable Table Name (default: "tblAssessmentSubmissions")
 * - BLOB_READ_WRITE_TOKEN: Vercel Blob Storage token (auto-configured by Vercel)
 */

import { put } from '@vercel/blob';

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

        // Upload PDF to Vercel Blob Storage if provided
        let pdfUrl = null;
        if (payload.pdf_base64 && payload.pdf_filename) {
            try {
                pdfUrl = await uploadPdfToBlob(payload.pdf_base64, payload.pdf_filename, payload.email);
                console.log('PDF uploaded to Blob Storage:', pdfUrl);
            } catch (error) {
                console.error('PDF upload failed, continuing without PDF:', error.message);
                // Continue even if PDF upload fails - don't block the submission
            }
        }

        // Submit to Airtable with PDF URL if available
        const airtableResult = await submitToAirtable(payload, pdfUrl);

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
 * Submit directly to Airtable with optional PDF URL
 */
async function submitToAirtable(payload, pdfUrl = null) {
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

    // Add PDF attachment if URL is provided from Vercel Blob Storage
    if (pdfUrl) {
        fields['pdf_report'] = [
            {
                url: pdfUrl
            }
        ];
        fields['pdf_filename'] = payload.pdf_filename;
        console.log('PDF attachment added with Blob Storage URL:', pdfUrl);
    } else if (payload.pdf_filename) {
        // Store filename even if upload failed
        fields['pdf_filename'] = payload.pdf_filename;
        console.log('PDF filename stored (no URL available)');
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
    console.log('Airtable payload:', JSON.stringify(airtablePayload, null, 2));
    console.log('Field names being sent:', Object.keys(fields));

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

/**
 * Upload PDF to Vercel Blob Storage
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} filename - Original filename
 * @param {string} email - User email for organizing files
 * @returns {Promise<string>} - Public URL of uploaded PDF
 */
async function uploadPdfToBlob(base64Data, filename, email) {
    try {
        // Convert base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Create a clean filename with timestamp and email prefix
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        const cleanFilename = `${timestamp}_${emailPrefix}_${filename}`;

        // Upload to Vercel Blob Storage
        const blob = await put(cleanFilename, buffer, {
            access: 'public',
            contentType: 'application/pdf',
            addRandomSuffix: true // Prevents filename collisions
        });

        console.log('Blob upload successful:', {
            url: blob.url,
            size: buffer.length,
            filename: cleanFilename
        });

        return blob.url;
    } catch (error) {
        console.error('Blob upload error:', error);
        throw new Error(`Failed to upload PDF to Blob Storage: ${error.message}`);
    }
}
