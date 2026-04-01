import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { MessageSquare, X, Send, Bot, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const Chatbot = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    // Initialize state from localStorage or default
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem('chatbot_messages');
        if (savedMessages) {
            try {
                return JSON.parse(savedMessages);
            } catch (e) {
                console.error("Failed to parse chat history");
            }
        }
        return [{ text: "Hello! I'm your Campus Parking Assistant. How can I help you today?", isBot: true }];
    });

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedFAQs, setSuggestedFAQs] = useState([]);
    const messagesEndRef = useRef(null);

    const faqDatabase = [
        {
            question: "How do I book a parking slot?",
            keywords: ["book", "reserve", "slot", "how to"],
            answer: "To book a slot, go to the Dashboard, select 'New Booking', choose your vehicle type, pick an available slot and a time range, and confirm your payment."
        },
        {
            question: "What are the parking prices?",
            keywords: ["price", "cost", "fee", "rate", "how much"],
            answer: "Pricing varies by vehicle type. Cars are typically ₹50/hr, and Bikes are ₹20/hr. You can check exact rates during the booking process."
        },
        {
            question: "How can I cancel my booking?",
            keywords: ["cancel", "refund", "stop", "delete"],
            answer: "You can cancel active bookings from your Profile's 'My Bookings' tab. Please note that refunds may be subject to our cancellation policy."
        },
        {
            question: "How does QR entry work?",
            keywords: ["qr", "entry", "exit", "scan", "gate"],
            answer: "For entry and exit, go to your Bookings, click 'View Ticket', and show the QR Code to the gate scanner upon arrival or departure."
        }
    ];

    // Filter FAQs based on input
    useEffect(() => {
        if (input.trim().length > 2) {
            const lowerInput = input.toLowerCase();
            const matches = faqDatabase.filter(faq =>
                faq.keywords.some(kw => lowerInput.includes(kw)) ||
                faq.question.toLowerCase().includes(lowerInput)
            );
            setSuggestedFAQs(matches);
        } else {
            setSuggestedFAQs([]);
        }
    }, [input]);

    const quickActions = [
        "Check Available Slots",
        "View My Bookings",
        "Parking Prices",
        "How to book?"
    ];

    const handleClearChat = () => {
        const defaultMessage = [{ text: "Hello! I'm your Campus Parking Assistant. How can I help you today?", isBot: true }];
        setMessages(defaultMessage);
        localStorage.setItem('chatbot_messages', JSON.stringify(defaultMessage));
    };

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e, customText = null) => {
        if (e) e.preventDefault();

        const messageText = customText || input;
        if (!messageText.trim()) return;

        const userMsg = { text: messageText, isBot: false };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestedFAQs([]);
        setIsLoading(true);

        try {
            // We pass the conversation history, excluding the hardcoded greeting to save tokens if we prefer,
            // or pass all text to let the AI know the context.
            const history = messages.map(m => ({ role: m.isBot ? 'assistant' : 'user', content: m.text }));
            const userCurrentMsg = { role: 'user', content: messageText };

            const { data } = await API.post('/chat', {
                history: [...history, userCurrentMsg]
            });

            const botMsg = { text: data.reply, isBot: true };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chat API error:", error);
            setMessages(prev => [...prev, {
                text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
                isBot: true,
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFAQSuggestionClick = (faq) => {
        // Automatically inject the conversation without a backend trip
        const userMsg = { text: faq.question, isBot: false };
        const botMsg = { text: faq.answer, isBot: true };

        setMessages(prev => [...prev, userMsg, botMsg]);
        setInput('');
        setSuggestedFAQs([]);
    };

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-circle shadow-lg d-flex align-items-center justify-content-center bg-primary border-0"
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        width: '60px',
                        height: '60px',
                        zIndex: 1050,
                        transition: 'transform 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={28} color="white" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className="shadow-lg border-0"
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        width: '350px',
                        height: '500px',
                        zIndex: 1050,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center px-3 py-3 border-0">
                        <div className="d-flex align-items-center gap-2 font-weight-bold">
                            <Bot size={24} />
                            <h5 className="mb-0 fs-6 fw-bold">Parking Assistant</h5>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="link" className="text-white p-0" onClick={handleClearChat} title="Clear Chat">
                                <Trash2 size={18} />
                            </Button>
                            <Button variant="link" className="text-white p-0" onClick={() => setIsOpen(false)}>
                                <X size={24} />
                            </Button>
                        </div>
                    </Card.Header>

                    {/* Messages Area */}
                    <Card.Body
                        className="bg-body-tertiary p-3"
                        style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`d-flex ${msg.isBot ? 'justify-content-start' : 'justify-content-end'}`}>
                                <div
                                    className={`px-3 py-2 rounded-4 shadow-sm ${msg.isBot
                                        ? msg.isError ? 'bg-danger text-white' : 'bg-body text-body border'
                                        : 'bg-primary text-white'
                                        }`}
                                    style={{
                                        maxWidth: '85%',
                                        fontSize: '0.9rem',
                                        borderBottomLeftRadius: msg.isBot ? '4px' : '16px',
                                        borderBottomRightRadius: !msg.isBot ? '4px' : '16px',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Quick Actions (Scrollable Horizontal Pills) */}
                        {messages.length === 1 && (
                            <div className="d-flex flex-wrap gap-2 mt-2" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                                {quickActions.map((action, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline-primary"
                                        size="sm"
                                        className="rounded-pill"
                                        style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                        onClick={() => handleSend(null, action)}
                                        disabled={isLoading}
                                    >
                                        {action}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {isLoading && (
                            <div className="d-flex justify-content-start">
                                <div className="px-3 py-2 rounded-4 bg-body border border-subtle text-muted d-flex align-items-center justify-content-center gap-1" style={{ maxWidth: '85%', borderBottomLeftRadius: '4px', height: '40px' }}>
                                    <div className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '0.4rem', height: '0.4rem', animationDelay: '0s' }}></div>
                                    <div className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '0.4rem', height: '0.4rem', animationDelay: '0.2s' }}></div>
                                    <div className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '0.4rem', height: '0.4rem', animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </Card.Body>

                    {/* FAQ Suggestions Overlay */}
                    {suggestedFAQs.length > 0 && (
                        <div className="bg-body border-top p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                            <small className="text-muted d-block mb-2 ms-1 fw-bold">Suggested Answers:</small>
                            <div className="d-flex flex-column gap-1">
                                {suggestedFAQs.map((faq, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-start border shadow-sm text-body text-truncate d-flex align-items-center"
                                        onClick={() => handleFAQSuggestionClick(faq)}
                                    >
                                        <MessageSquare size={14} className="me-2 text-primary" />
                                        {faq.question}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <Card.Footer className="bg-body border-top-0 p-3">
                        <Form onSubmit={handleSend}>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Type a message..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                    className="rounded-start-pill bg-body-tertiary border-0 px-3 text-body"
                                    style={{ boxShadow: 'none' }}
                                />
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={!input.trim() || isLoading}
                                    className="rounded-end-pill px-3"
                                >
                                    <Send size={18} />
                                </Button>
                            </InputGroup>
                        </Form>
                    </Card.Footer>
                </Card>
            )}
        </>
    );
};

export default Chatbot;
