import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import API from '../api';
import { LogIn, Key, Smartphone } from 'lucide-react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

const Login = () => {
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // For OTP: 1=Send, 2=Verify
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (loginMethod === 'password') {
                const { data } = await API.post('/users/login', { email, password });
                login(data);
                if (data.isAdmin) {
                    navigate('/admin');
                } else if (data.isStaff) {
                    navigate('/staff-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                // OTP Flow
                if (step === 1) {
                    await API.post('/users/login-otp', { email });
                    setStep(2);
                    alert(`OTP sent to ${email}`);
                } else {
                    const { data } = await API.post('/users/login-verify', { email, otp });
                    login(data);
                    if (data.isAdmin) {
                        navigate('/admin');
                    } else if (data.isStaff) {
                        navigate('/staff-dashboard');
                    } else {
                        navigate('/dashboard');
                    }
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
            <Card className="shadow-lg p-3 p-md-4 rounded-4 w-100" style={{ maxWidth: '450px' }}>
                <Card.Body>
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                            <LogIn size={32} className="text-primary" />
                        </div>
                        <h2 className="fw-bold text-dark">Welcome Back</h2>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {/* Modern Segmented Control for Method Toggle */}
                    <div className="d-flex mb-4 p-1 rounded-pill bg-body-tertiary">
                        <button
                            type="button"
                            className={`flex-fill btn rounded-pill transition-all fw-bold d-flex align-items-center justify-content-center gap-2 ${loginMethod === 'password'
                                    ? 'btn-primary shadow-sm text-white'
                                    : 'btn-transparent text-muted'
                                }`}
                            onClick={() => { setLoginMethod('password'); setError(null); }}
                            style={{ border: 'none' }}
                        >
                            <Key size={18} />
                            Password
                        </button>
                        <button
                            type="button"
                            className={`flex-fill btn rounded-pill transition-all fw-bold d-flex align-items-center justify-content-center gap-2 ${loginMethod === 'otp'
                                    ? 'btn-primary shadow-sm text-white'
                                    : 'btn-transparent text-muted'
                                }`}
                            onClick={() => { setLoginMethod('otp'); setError(null); setStep(1); }}
                            style={{ border: 'none' }}
                        >
                            <Smartphone size={18} />
                            OTP
                        </button>
                    </div>

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                size="lg"
                            />
                        </Form.Group>

                        {loginMethod === 'password' ? (
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    size="lg"
                                />
                                <div className="text-end mt-2">
                                    <Link to="/forgot-password" style={{ fontSize: '0.9rem' }} className="text-primary text-decoration-none">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </Form.Group>
                        ) : (
                            step === 2 && (
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold">Enter OTP</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6-digit OTP"
                                        required
                                        size="lg"
                                        className="text-center letter-spacing-2"
                                        style={{ letterSpacing: '0.2rem' }}
                                    />
                                </Form.Group>
                            )
                        )}

                        <Button variant="primary" type="submit" size="lg" className="w-100 mb-3 fw-bold" disabled={loading}>
                            {loginMethod === 'password' ? 'Sign In' : (step === 1 ? 'Send OTP' : 'Verify & Login')}
                        </Button>
                    </Form>

                    <div className="text-center mt-3">
                        <p className="text-muted">
                            Don't have an account? <Link to="/register" className="text-primary fw-bold text-decoration-none">Sign up</Link>
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Login;
