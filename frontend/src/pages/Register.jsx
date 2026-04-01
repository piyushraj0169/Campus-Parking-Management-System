import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import API from '../api';
import { UserPlus } from 'lucide-react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

const Register = () => {
    const [step, setStep] = useState(1); // 1: Details, 2: OTP
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('+91 ');
    const [otp, setOtp] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Password Validation
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            setLoading(false);
            return;
        }
        if (!/^[A-Z]/.test(password)) {
            setError("Password must start with a capital letter");
            setLoading(false);
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            setError("Password must contain at least one special character");
            setLoading(false);
            return;
        }

        if (phoneNumber.length !== 14) {
            setError("Phone number must be exactly 10 digits");
            setLoading(false);
            return;
        }

        try {
            await API.post('/users/register-otp', { name, email, phoneNumber });
            setStep(2);
            alert(`OTP sent to ${email}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data } = await API.post('/users/register', { name, email, password, phoneNumber, otp });
            login(data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
            <Card className="shadow-lg p-3 p-md-4 rounded-4 w-100" style={{ maxWidth: '500px' }}>
                <Card.Body>
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                            <UserPlus size={32} className="text-primary" />
                        </div>
                        <h2 className="fw-bold text-dark">Create Account</h2>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {step === 1 ? (
                        <Form onSubmit={handleSendOTP}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Full Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Phone Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length < 4) {
                                            setPhoneNumber('+91 ');
                                        } else if (val.length <= 14 && /^\+91 \d*$/.test(val)) {
                                            setPhoneNumber(val);
                                        }
                                    }}
                                    placeholder="Enter mobile number"
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    required
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
                                    placeholder="Confirm your password"
                                    required
                                />
                            </Form.Group>

                            <Button variant="primary" type="submit" size="lg" className="w-100 fw-bold" disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Send OTP & Verify'}
                            </Button>
                        </Form>
                    ) : (
                        <Form onSubmit={handleRegister}>
                            <div className="text-center mb-3">
                                <p className="text-muted">OTP sent to <strong>{email}</strong></p>
                            </div>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">Enter OTP</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="6-digit verification code"
                                    required
                                    className="text-center letter-spacing-2"
                                    style={{ letterSpacing: '0.2rem', fontSize: '1.2rem' }}
                                />
                            </Form.Group>

                            <Button variant="success" type="submit" size="lg" className="w-100 fw-bold" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify & Register'}
                            </Button>

                            <Button
                                variant="link"
                                className="w-100 mt-2 text-decoration-none"
                                onClick={() => setStep(1)}
                            >
                                Back to Details
                            </Button>
                        </Form>
                    )}

                    <div className="text-center mt-3">
                        <p className="text-muted">
                            Already have an account? <Link to="/login" className="text-primary fw-bold text-decoration-none">Sign in</Link>
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Register;
