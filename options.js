document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-button');
    const apiKeyInput = document.getElementById('api-key');
    const statusDiv = document.getElementById('status');

    // Load the saved API key when the options page opens
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save the API key when the save button is clicked
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
                statusDiv.textContent = 'API Key saved!';
                statusDiv.style.color = 'green';
                setTimeout(() => { statusDiv.textContent = ''; }, 2000);
            });
        } else {
            statusDiv.textContent = 'Please enter a valid API key.';
            statusDiv.style.color = 'red';
        }
    });
});