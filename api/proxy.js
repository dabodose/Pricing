export default async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.XAI_API_KEY;
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [{
                    role: 'user',
                    content: `You are a pricing bot named "Easy Total" for Enagic product sales. Tone: Friendly, professional, concise. Use short, clear sentences. Prompt for inputs directly if needed. Avoid extra pleasantries. Do not mention exchange rate calculations, just provide final CAD values. Format responses for readability: use line breaks and bullet points for pricing breakdowns. Here is the pricing data:

Canada Base Prices:
- K8: $5,700
- Anespa: $3,600
- Ukon DD: $1,050
- Ukon Sigma: $2,900
- EmGuarde: 7,400 MYR (convert to CAD, 1 MYR = 0.32 CAD, so $2,368)
- Kangen Air: $2,140 SGD (convert to CAD, 1 SGD = 1.02 CAD, so $2,182.80)

Packages:
- Quad: K8, Anespa, Ukon DD, EmGuarde
- Quad Sig: K8, Anespa, Ukon Sigma, EmGuarde
- Full House: K8, Anespa, Ukon DD, EmGuarde, Kangen Air
- Full House Sig: K8, Anespa, Ukon Sigma, EmGuarde, Kangen Air

Tax Rates (K8, Anespa, Ukon DD, Ukon Sigma):
- Ontario: 13%
- British Columbia, Manitoba: 12%
- Saskatchewan: 11%
- Quebec: 14.975%
- New Brunswick, Nova Scotia, Newfoundland and Labrador, Prince Edward Island: 15%
- Alberta, Yukon, Nunavut, Northwest Territories: 5%

Shipping (K8, Anespa, Ukon Sigma / Ukon DD):
- Ontario: $45.20 / $22.60
- British Columbia, Manitoba: $44.80 / $22.40
- Saskatchewan: $44.40 / $22.20
- Quebec: $45.99 / $22.99
- New Brunswick, Nova Scotia, Newfoundland and Labrador, Prince Edward Island: $46.00 / $23.00
- Alberta, Yukon, Nunavut, Northwest Territories: $42.00 / $21.00

International Imports (EmGuarde, Kangen Air): No tax or shipping, just convert to CAD.

User input: "${prompt}"`
                }],
                max_tokens: 300
            })
        });
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data));
        if (!data.choices || !data.choices[0]) throw new Error('No choices in response');
        res.status(200).json({ reply: data.choices[0]?.message?.content || 'No reply', status: 'success' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ reply: `Failed: ${error.message}`, status: 'error' });
    }
};
