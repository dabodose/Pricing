export default async (req, res) => {
    const { prompt, history } = req.body;

    try {
        // Fetch pricing data from pricing-data.json
        const pricingDataResponse = await fetch('https://pricing-chat-assistant.vercel.app/pricing-data.json');
        if (!pricingDataResponse.ok) throw new Error('Failed to fetch pricing data');
        const pricingData = await pricingDataResponse.json();

        // Construct the prompt using the fetched data
        let fullPrompt = `${pricingData.promptTemplate.intro}\n${pricingData.promptTemplate.tone}\n${pricingData.promptTemplate.rules}\nHere is the pricing data:\n\n`;

        for (const country in pricingData.pricingData) {
            const countryData = pricingData.pricingData[country];
            fullPrompt += `${country}:\n`;

            // Base Prices
            fullPrompt += "Base Prices:\n";
            countryData.basePrices.forEach(item => {
                fullPrompt += `- ${item.product}: ${item.price} ${item.currency}${item.convertedToCAD ? ` (converted to CAD: $${item.convertedToCAD})` : ''}\n`;
            });

            // Packages
            if (countryData.packages) {
                fullPrompt += "\nPackages:\n";
                countryData.packages.forEach(pkg => {
                    fullPrompt += `- ${pkg.name}: ${pkg.products.join(', ')}\n`;
                });
            }

            // Tax Rates
            if (countryData.taxRates) {
                fullPrompt += "\nTax Rates:\n";
                countryData.taxRates.forEach(tax => {
                    fullPrompt += `- ${tax.region}: ${(tax.rate * 100).toFixed(2)}%\n`;
                });
            }

            // Shipping
            if (countryData.shipping) {
                fullPrompt += "\nShipping:\n";
                countryData.shipping.forEach(ship => {
                    fullPrompt += `- ${ship.region} (${ship.products.join(', ')}): $${ship.cost.toFixed(2)}\n`;
                });
            }

            // International Imports
            if (countryData.internationalImports) {
                fullPrompt += "\nInternational Imports (No tax or shipping, just convert to CAD):\n";
                fullPrompt += `- ${countryData.internationalImports.join(', ')}\n`;
            }

            fullPrompt += '\n';
        }

        // Include conversation history
        let conversationPrompt = "Conversation history:\n";
        history.forEach((msg, index) => {
            conversationPrompt += `${index + 1}. ${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
        conversationPrompt += `\nCurrent user input: "${prompt}"`;

        fullPrompt += conversationPrompt;

        // Make the xAI API request
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [{ role: 'user', content: fullPrompt }],
                max_tokens: 300
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.choices || !data.choices[0]) throw new Error('No choices in response');

        let reply = data.choices[0]?.message?.content || 'No reply';

        // Check if the reply contains a total price (indicating a pricing response)
        if (reply.includes('Total:') && !history.some(msg => msg.content.includes('Are you ready to find out how you can get this financed for $0 down?'))) {
            reply += '\n\nAre you ready to find out how you can get this financed for $0 down?';
        }

        res.status(200).json({ reply: reply, status: 'success' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ reply: `Failed: ${error.message}`, status: 'error' });
    }
};
