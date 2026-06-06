// Neo AI Chat Application
class NeoAI {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.voiceEnabled = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.darkMode = true;
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initSpeechRecognition();
        this.loadTheme();
        this.loadChatHistory();
    }

    cacheDOM() {
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.app = document.getElementById('app');
        this.startBtn = document.getElementById('start-btn');
        this.chatArea = document.getElementById('chat-area');
        this.messagesContainer = document.getElementById('messages');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.micBtn = document.getElementById('mic-btn');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.themeToggle = document.getElementById('theme-toggle');
        this.clearChat = document.getElementById('clear-chat');
        this.voiceOverlay = document.getElementById('voice-overlay');
        this.stopMic = document.getElementById('stop-mic');
        this.charCount = document.querySelector('.char-count');
        this.speakToggle = document.getElementById('speak-toggle');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startApp());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.userInput.addEventListener('input', () => this.handleInput());
        this.micBtn.addEventListener('click', () => this.startVoiceInput());
        this.stopMic.addEventListener('click', () => this.stopVoiceInput());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.clearChat.addEventListener('click', () => this.clearAllChat());
        this.speakToggle.addEventListener('click', () => this.toggleVoiceReply());
    }

    startApp() {
        this.welcomeScreen.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            this.welcomeScreen.classList.add('hidden');
            this.app.classList.remove('hidden');
            setTimeout(() => this.app.classList.add('visible'), 10);
            this.userInput.focus();
        }, 500);
    }

    handleInput() {
        const len = this.userInput.value.length;
        this.charCount.textContent = `${len}/4000`;
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
        this.sendBtn.disabled = len === 0;
    }

    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text || this.isTyping) return;

        this.addMessage(text, 'user');
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        this.charCount.textContent = '0/4000';
        this.saveChatHistory();

        await this.getAIResponse(text);
    }

    addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgDiv.innerHTML = `
            <div class="message-bubble">
                <p>${this.escapeHtml(text)}</p>
            </div>
            <span class="message-time">${time}</span>
        `;
        
        this.messagesContainer.appendChild(msgDiv);
        this.scrollToBottom();
        
        this.messages.push({ text, sender, time });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
    }

    showTyping() {
        this.isTyping = true;
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        this.typingIndicator.classList.add('hidden');
    }

    async getAIResponse(userText) {
        this.showTyping();
        
        try {
            // ✅ WORKER API URL - CHANGE THIS TO YOUR WORKER URL
            const response = await fetch('https://orange-lab-bd4f.prince6onyii.workers.dev/api/chat', {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });

            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const aiText = data.reply || "I'm sorry, I couldn't process that.";
            
            this.hideTyping();
            this.addMessage(aiText, 'ai');
            this.saveChatHistory();
            
            if (this.voiceEnabled) {
                this.speakText(aiText);
            }
            
        } catch (error) {
            this.hideTyping();
            this.addMessage("Connection error: " + error.message, 'ai');
            console.error('Error:', error);
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.micBtn.style.display = 'none';
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                this.userInput.value = finalTranscript;
                this.handleInput();
            }
        };
        
        this.recognition.onerror = () => this.stopVoiceInput();
        this.recognition.onend = () => this.stopVoiceInput();
    }

    startVoiceInput() {
        if (!this.recognition) return;
        this.voiceOverlay.classList.remove('hidden');
        this.micBtn.classList.add('recording');
        this.recognition.start();
    }

    stopVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.voiceOverlay.classList.add('hidden');
        this.micBtn.classList.remove('recording');
    }

    toggleVoiceReply() {
        this.voiceEnabled = !this.voiceEnabled;
        this.speakToggle.textContent = this.voiceEnabled ? '🔊 Voice: On' : '🔊 Voice: Off';
        this.speakToggle.classList.toggle('active', this.voiceEnabled);
    }

    speakText(text) {
        if (!this.synthesis) return;
        this.synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        this.synthesis.speak(utterance);
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
        this.themeToggle.textContent = this.darkMode ? '🌙' : '☀️';
        localStorage.setItem('neo-theme', this.darkMode ? 'dark' : 'light');
    }

    loadTheme() {
        const saved = localStorage.getItem('neo-theme');
        if (saved === 'light') {
            this.darkMode = false;
            document.documentElement.setAttribute('data-theme', 'light');
            this.themeToggle.textContent = '☀️';
        }
    }

    saveChatHistory() {
        localStorage.setItem('neo-chat', JSON.stringify(this.messages));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('neo-chat');
        if (saved) {
            this.messages = JSON.parse(saved);
            this.messages.forEach(msg => {
                if (msg.sender !== 'welcome') {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `message ${msg.sender}-message`;
                    msgDiv.innerHTML = `
                        <div class="message-bubble"><p>${this.escapeHtml(msg.text)}</p></div>
                        <span class="message-time">${msg.time}</span>
                    `;
                    this.messagesContainer.appendChild(msgDiv);
                }
            });
            this.scrollToBottom();
        }
    }

    clearAllChat() {
        if (confirm('Clear all chat history?')) {
            this.messages = [];
            this.messagesContainer.innerHTML = `
                <div class="message ai-message welcome-msg">
                    <div class="message-bubble"><p>Hello! I'm Neo AI. How can I help you today?</p></div>
                    <span class="message-time">Now</span>
                </div>
            `;
            localStorage.removeItem('neo-chat');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new NeoAI());
