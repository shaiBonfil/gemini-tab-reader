document.addEventListener('DOMContentLoaded', function () {
    const askButton = document.getElementById('ask-button');
    const questionInput = document.getElementById('question-input');
    const answerDiv = document.getElementById('answer');
    const loadingSpinner = document.getElementById('loading-spinner');

    askButton.addEventListener('click', () => {
        const question = questionInput.value;
        if (!question) {
            answerDiv.textContent = 'Please enter a question.';
            return;
        }

        loadingSpinner.classList.remove('hidden');
        answerDiv.innerHTML = '';
        askButton.disabled = true;

        chrome.runtime.sendMessage({ type: 'ASK_GEMINI', question: question }, (response) => {
            loadingSpinner.classList.add('hidden');
            askButton.disabled = false;
            
            if (response.error) {
                if (response.error === "API_KEY_MISSING") {
                    const optionsLink = document.createElement('a');
                    optionsLink.href = "#";
                    optionsLink.textContent = "Please set your Gemini API Key in the options page.";
                    optionsLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        chrome.runtime.openOptionsPage();
                    });
                    answerDiv.appendChild(optionsLink);
                } else {
                    answerDiv.textContent = 'Error: ' + response.error;
                }
            } else {
                const answerText = response.answer;

                // A Regular Expression to detect characters in the Hebrew and Arabic Unicode ranges.
                const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF]/;

                // Check if the response text contains RTL characters.
                if (rtlRegex.test(answerText)) {
                    // If it's an RTL language, align text to the right.
                    answerDiv.style.textAlign = 'right';
                    answerDiv.style.direction = 'rtl';
                } else {
                    // Otherwise, ensure it's aligned to the left (default).
                    // This is important to reset the style after a previous RTL response.
                    answerDiv.style.textAlign = 'left';
                    answerDiv.style.direction = 'ltr';
                }

                // Set the text content of the div.
                answerDiv.textContent = answerText;
            }
        });
    });
});