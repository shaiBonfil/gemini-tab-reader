// Function to get the API key from user's synced storage
async function getApiKey() {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    return result.geminiApiKey;
}

// Function to get the text content of the active tab
async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        return null;
    }
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
    });
    // Ensure there is a result and it's not empty
    if (results && results[0] && results[0].result) {
        return results[0].result;
    }
    return null;
}

// Main listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ASK_GEMINI') {
        (async () => {
            try {
                const apiKey = await getApiKey();
                if (!apiKey) {
                    sendResponse({ error: "API_KEY_MISSING" });
                    return;
                }

                const pageContent = await getPageContent();
                if (!pageContent) {
                    sendResponse({ error: "Could not retrieve content from the page. Try a different page." });
                    return;
                }

                const userQuestion = request.question;
                const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
                
                // Truncate page content to avoid exceeding API limits (Gemini Pro has a 32k token limit)
                const truncatedContent = pageContent.substring(0, 28000); 
                const prompt = `CONTEXT: You are an expert AI assistant integrated into a Chrome Extension. Your task is to answer questions based *only* on the text provided from a webpage.
                
                WEBPAGE TEXT:
                ---
                ${truncatedContent}
                ---
                
                QUESTION: "${userQuestion}"
                
                ANSWER:`;

                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        // Optional: Add safety settings
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        ],
                    }),
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (data.promptFeedback && data.promptFeedback.blockReason) {
                     sendResponse({ error: `Request was blocked by the API. Reason: ${data.promptFeedback.blockReason}` });
                } else if (data.candidates && data.candidates.length > 0) {
                    const answer = data.candidates[0].content.parts[0].text;
                    sendResponse({ answer: answer.trim() });
                } else {
                    sendResponse({ error: "No valid response from Gemini. The API may have blocked the request for safety reasons or returned an empty response." });
                }

            } catch (error) {
                console.error('Gemini Extension Error:', error);
                sendResponse({ error: error.message });
            }
        })();
        return true; // Indicates asynchronous response
    }
});