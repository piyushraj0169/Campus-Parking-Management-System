import { useState, useEffect, useContext } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { io } from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import API from '../api';

const GlobalPaymentModal = () => {
    const { user } = useContext(AuthContext);
    const [show, setShow] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;

        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : `http://${window.location.hostname}:5000`;
        const socket = io(socketUrl);

        socket.on('paymentRequest', (data) => {
            // Use String() on both sides to safely compare ObjectId vs string
            if (String(data.userId) === String(user._id)) {
                setPaymentData(data);
                setShow(true);
            }
        });

        const handleManualTrigger = (e) => {
            if (e.detail && e.detail.userId === user._id) {
                setPaymentData(e.detail);
                setShow(true);
            }
        };

        window.addEventListener('triggerPaymentModal', handleManualTrigger);

        return () => {
            socket.disconnect();
            window.removeEventListener('triggerPaymentModal', handleManualTrigger);
        };
    }, [user]);

    const loadRazorpay = (src) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayExtra = async () => {
        if (!paymentData) return;

        setLoading(true);
        setError(null);

        try {
            const res = await loadRazorpay('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                setError('Razorpay SDK failed to load. Are you online?');
                setLoading(false);
                return;
            }

            const { data: order } = await API.post('/bookings/create-order', {
                amount: paymentData.extraAmount
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                currency: order.currency,
                amount: order.amount,
                order_id: order.id,
                name: "Campus Parking",
                description: `Overstay Payment for Booking`,
                handler: async function (response) {
                    try {
                        await API.post('/bookings/confirm-exit-payment', {
                            bookingId: paymentData.bookingId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        alert('Payment Successful! You may now exit the parking.');
                        setShow(false);
                        setPaymentData(null);
                        window.location.reload(); // Refresh dashboard state
                    } catch (err) {
                        setError(err.response?.data?.message || 'Payment Verification Failed');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.phoneNumber || "9999999999"
                },
                theme: { color: "#d9534f" }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Payment initiation failed');
            setLoading(false);
        }
    };

    if (!show || !paymentData) return null;

    return (
        <Modal show={show} onHide={() => setShow(false)} backdrop="static" keyboard={false} centered>
            <Modal.Header>
                <Modal.Title className="text-danger">Extra Payment Required</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <div className="text-center mb-4">
                    <p className="fs-5">{paymentData.message}</p>
                    <h2 className="text-danger fw-bold">₹{paymentData.extraAmount}</h2>
                </div>
                <p className="text-muted small text-center">
                    You have overstayed your booked duration. Please pay the extra amount to complete your exit.
                </p>
                <div className="d-grid mt-4">
                    <Button variant="primary" size="lg" onClick={handlePayExtra} disabled={loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : 'Pay Now'}
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default GlobalPaymentModal;
