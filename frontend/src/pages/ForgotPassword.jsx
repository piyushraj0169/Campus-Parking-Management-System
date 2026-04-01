
import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { KeyRound } from 'lucide-react';
import { Card, Form, Button, Alert } from 'react-bootstrap';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { data } = await API.post('/users/forgot-password', { email });
            setMessage(data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <Card className="shadow-lg p-4 rounded-4" style={{ maxWidth: '450px', width: '100%' }}>
                <Card.Body>
                    <div className="text-center mb-4">
                        <div className="bg-warning bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                            <KeyRound size={32} className="text-warning" />
                        </div>
                        <h2 className="fw-bold text-dark">Forgot Password?</h2>
                        <p className="text-muted">Enter your email to receive a reset link</p>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {message && <Alert variant="success">{message}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your registered email"
                                required
                                size="lg"
                            />
                        </Form.Group>

                        <Button variant="warning" type="submit" size="lg" className="w-100 mb-3 fw-bold text-white" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </Form>

                    <div className="text-center mt-3">
                        <Link to="/login" className="text-decoration-none text-muted">Back to Login</Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default ForgotPassword;
