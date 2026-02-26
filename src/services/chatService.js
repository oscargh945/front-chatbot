// Configuración de endpoints según entorno
const API_CONFIG = {
    local: 'http://localhost:8000', // backend local
    production: 'https://TU-DOMINIO-O-IP-DE-EC2', // reemplaza por tu URL pública en AWS
};

// Permite sobreescribir por query param ?apiBase=...
function getApiBaseUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const customBase = urlParams.get('apiBase');
    if (customBase) return customBase.replace(/\/$/, '');

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const base = isLocalhost ? API_CONFIG.local : API_CONFIG.production;
    return base.replace(/\/$/, '');
}

const API_BASE_URL = getApiBaseUrl();

class ChatService {
    constructor() {
        this.messages = [];
        this.conversationHistory = []; // Historial de conversación para el API
        this.chatWindow = document.querySelector('.chat-window');
        this.messageInput = document.querySelector('#messageInput');
        this.sendButton = document.querySelector('#sendButton');
        this.setupEventListeners();
        this.loadMessages();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Add focus effect
        this.messageInput.addEventListener('focus', () => {
            this.messageInput.parentElement.classList.add('ring-2', 'ring-blue-400');
        });

        this.messageInput.addEventListener('blur', () => {
            this.messageInput.parentElement.classList.remove('ring-2', 'ring-blue-400');
        });
    }

    loadMessages() {
        const savedMessages = localStorage.getItem('chatMessages');
        const savedHistory = localStorage.getItem('conversationHistory');
        
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
            this.chatWindow.innerHTML = '';
            this.messages.forEach(msg => {
                this.addMessageToChat(msg.sender, msg.content, false);
            });
        }

        if (savedHistory) {
            this.conversationHistory = JSON.parse(savedHistory);
        } else {
            this.addWelcomeMessage();
        }
    }

    saveMessages() {
        localStorage.setItem('chatMessages', JSON.stringify(this.messages));
        localStorage.setItem('conversationHistory', JSON.stringify(this.conversationHistory));
    }

    addWelcomeMessage() {
        const welcomeMessage = "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?";
        this.addMessageToChat('bot', welcomeMessage);
        // Añadir mensaje de bienvenida al historial de conversación
        this.conversationHistory.push({
            role: "assistant",
            content: welcomeMessage
        });
        this.saveMessages();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessageToChat('user', message);
        this.messageInput.value = '';

        // Añadir mensaje del usuario al historial de conversación
        this.conversationHistory.push({
            role: "user",
            content: message
        });

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Call your backend API here
            const response = await this.callChatbotAPI(message);
            this.removeTypingIndicator();
            this.addMessageToChat('bot', response);
            
            // Añadir respuesta del bot al historial de conversación
            this.conversationHistory.push({
                role: "assistant",
                content: response
            });
            
            this.saveMessages();
        } catch (error) {
            console.error('Error en sendMessage:', error);
            this.removeTypingIndicator();
            this.addMessageToChat('bot', `Error: ${error.message}`);
        }
    }

    addMessageToChat(sender, message, saveToStorage = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} message-animation`;
        
        const messageContainer = document.createElement('div');
        messageContainer.className = `flex items-end space-x-2 ${sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`;
        
        // Avatar for bot messages
        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0';
            avatar.innerHTML = '<i class="fas fa-robot text-white text-sm"></i>';
            messageContainer.appendChild(avatar);
        }
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `${
            sender === 'user' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                : 'bg-white text-gray-800 shadow-md'
        } px-4 py-2 rounded-2xl max-w-xs text-sm`;
        
        messageBubble.textContent = message;
        messageContainer.appendChild(messageBubble);
        messageDiv.appendChild(messageContainer);
        this.chatWindow.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;

        // Guardar mensaje en el array y en localStorage
        if (saveToStorage) {
            this.messages.push({
                sender,
                content: message,
                timestamp: new Date().toISOString()
            });
            this.saveMessages();
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'flex justify-start message-animation';
        typingDiv.id = 'typing-indicator';
        
        const typingContainer = document.createElement('div');
        typingContainer.className = 'flex items-end space-x-2';
        
        const avatar = document.createElement('div');
        avatar.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0';
        avatar.innerHTML = '<i class="fas fa-robot text-white text-sm"></i>';
        
        const typingBubble = document.createElement('div');
        typingBubble.className = 'bg-white text-gray-800 shadow-md px-4 py-2 rounded-2xl';
        typingBubble.innerHTML = '<div class="flex space-x-1"><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div></div>';
        
        typingContainer.appendChild(avatar);
        typingContainer.appendChild(typingBubble);
        typingDiv.appendChild(typingContainer);
        this.chatWindow.appendChild(typingDiv);
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async callChatbotAPI(message) {
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    messages: this.conversationHistory
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API Error Response:', errorData);
                throw new Error(`Error del servidor: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            return data.answer.answer;
        } catch (error) {
            console.error('Error detallado:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`No se pudo conectar con el servidor. Verifica que el backend esté corriendo en: ${API_BASE_URL}`);
            }
            throw error;
        }
    }
}

// Initialize chat service when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatService();
}); 