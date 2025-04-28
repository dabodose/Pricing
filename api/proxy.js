import { google } from 'googleapis';

export default async (req, res) => {
    const { prompt } = req.body;

    try {
        // Authenticate with Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = 'https://docs.google.com/spreadsheets/d/1RzRXblqIk4H7wBwfr5IbdGPlELG223NrpTzca1Hd6Nc/edit?gid=19078813#gid=19078813'; // Replace with your Google Sheet ID

        // Fetch all sheets to get pricing data
        const sheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId
        });
        const sheetNames = sheetResponse.data.sheets.map(sheet => sheet.properties.title);

        let pricingData = '';
        for (const sheetName of sheetNames) {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A1:Z1000`
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) continue;

            pricingData += `${sheetName}:\n`;
            for (const row of rows) {
                pricingData += `- ${row.join(' | ')}\n`;
            }
            pricingData += '\n';
        }

        // Make the xAI API request
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [{
                    role: 'user',
                    content: `You are a pricing bot named "Easy Total" for Enagic product sales. Tone: Friendly, professional, concise. Use short, clear sentences. Prompt for inputs directly if needed. Avoid extra pleasantries. Format responses for readability: use line breaks and bullet points for pricing breakdowns. Here is the pricing data:\n\n${pricingData}\nUser input: "${prompt}"`
                }],
                max_tokens: 300
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        res.status(200).json({ reply: data.choices[0]?.message?.content || 'No reply', status: 'success' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ reply: `Failed: ${error.message}`, status: 'error' });
    }
};
