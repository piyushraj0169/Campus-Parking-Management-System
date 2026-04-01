
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api';
import { LockKeyhole } from 'lucide-react';
import { Card, Form, Button, Alert } from 'react-bootstrap';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }
        if (!/^[A-Z]/.test(password)) {
            setError("Password must start with a capital letter");
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            setError("Password must contain at least one special character");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data } = await API.post('/users/reset-password', { token, newPassword: password });
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <Card className="shadow-lg p-4 rounded-4" style={{ maxWidth: '450px', width: '100%' }}>
                <Card.Body>
                    <div className="text-center mb-4">
                        <div className="bg-danger bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                            <LockKeyhole size={32} className="text-danger" />
                        </div>
                        <h2 className="fw-bold text-dark">Reset Password</h2>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {message && <Alert variant="success">{message}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                size="lg"
                            />
                            <Form.Text className="text-muted">
                                Min 8 chars, First letter capital, 1 special char.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">Confirm Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                size="lg"
                            />
                        </Form.Group>

                        <Button variant="danger" type="submit" size="lg" className="w-100 mb-3 fw-bold" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default ResetPassword;
