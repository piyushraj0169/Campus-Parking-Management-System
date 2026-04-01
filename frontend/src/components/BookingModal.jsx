import { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap';
import API from '../api';

const BookingModal = ({ show, handleClose, selectedSlot, onSuccess }) => {
    const [bookingType, setBookingType] = useState('instant');
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [bookingTime, setBookingTime] = useState({ start: '', end: '' });
    const [duration, setDuration] = useState(1);
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [durationText, setDurationText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset state when modal opens
    useEffect(() => {
        if (show) {
            setBookingType('instant');
            setDuration(1);
            setBookingTime({ start: '', end: '' });
            setError(null);
        }
    }, [show]);

    // Price Calculation
    useEffect(() => {
        if (!selectedSlot) return;

        if (bookingType === 'instant') {
            const hours = Number(duration);
            if (hours > 0) {
                const amount = hours * selectedSlot.pricePerHour;
                setCalculatedPrice(amount);
                setDurationText(`${hours} Hours (Instant)`);
            } else {
                setCalculatedPrice(0);
                setDurationText('Invalid Duration');
            }
        } else {
            if (bookingTime.start && bookingTime.end) {
                const start = new Date(bookingTime.start);
                const end = new Date(bookingTime.end);

                if (end > start) {
                    const diffMs = end - start;
                    const hours = Math.ceil(diffMs / 36e5);
                    const amount = hours * selectedSlot.pricePerHour;
                    const exactHours = Math.floor(diffMs / 36e5);
                    const exactMins = Math.round((diffMs % 36e5) / 60000);
                    setCalculatedPrice(amount);
                    setDurationText(`${exactHours}h ${exactMins}m (Billed as ${hours}h)`);
                } else {
                    setCalculatedPrice(0);
                    setDurationText('Invalid Duration');
                }
            } else {
                setCalculatedPrice(0);
                setDurationText('-');
            }
        }
    }, [bookingType, duration, bookingTime, selectedSlot]);

    const loadRazorpay = (src) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleFinalizeBooking = async (paymentId, orderId) => {
        try {
            setLoading(true);
            let startTime, endTime;
            if (bookingType === 'instant') {
                const now = new Date();
                startTime = now;
                endTime = new Date(now.getTime() + duration * 3600000);
            } else {
                startTime = new Date(bookingTime.start);
                endTime = new Date(bookingTime.end);
            }

            await API.post('/bookings', {
                slotId: selectedSlot._id,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalAmount: calculatedPrice,
                paymentId,
                orderId
            });

            alert('Booking request submitted!');
            onSuccess();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Booking Finalization Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async () => {
        if (!selectedSlot) return;

        let startTime, endTime;
        if (bookingType === 'instant') {
            if (duration <= 0) return;
            const now = new Date();
            startTime = now;
            endTime = new Date(now.getTime() + duration * 3600000);
        } else {
            if (!bookingTime.start || !bookingTime.end) return;
            startTime = new Date(bookingTime.start);
            endTime = new Date(bookingTime.end);
        }

        setLoading(true);
        setError(null);

        try {
            const checkRes = await API.post('/bookings/check-availability', {
                slotId: selectedSlot._id,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            });

            if (!checkRes.data.available) {
                setError(checkRes.data.message || 'Slot is not available for the selected time.');
                setLoading(false);
                return;
            }

            const res = await loadRazorpay('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                setError('Razorpay SDK failed to load. Are you online?');
                setLoading(false);
                return;
            }

            const { data: order } = await API.post('/bookings/create-order', {
                amount: calculatedPrice
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                currency: order.currency,
                amount: order.amount,
                order_id: order.id,
                name: "Campus Parking",
                description: `Booking for Slot ${selectedSlot.slotNumber}`,
                handler: async function (response) {
                    try {
                        await API.post('/bookings/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        await handleFinalizeBooking(response.razorpay_payment_id, response.razorpay_order_id);
                    } catch (err) {
                        setError(err.response?.data?.message || 'Payment Verification Failed');
                    }
                },
                prefill: {
                    name: "User",
                    email: "user@example.com",
                    contact: "9999999999"
                },
                theme: { color: "#3399cc" }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
            setLoading(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Booking initiation failed');
            setLoading(false);
        }
    };


    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>Book Slot {selectedSlot?.slotNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <div className="d-flex mb-4 border rounded overflow-hidden">
                    <button
                        type="button"
                        className={`flex-fill btn ${bookingType === 'instant' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setBookingType('instant')}
                    >
                        ⚡ Instant
                    </button>
                    <button
                        type="button"
                        className={`flex-fill btn ${bookingType === 'future' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setBookingType('future')}
                    >
                        📅 Future
                    </button>
                </div>

                <Form>
                    {bookingType === 'instant' ? (
                        <Form.Group className="mb-3">
                            <Form.Label>Duration (Hours)</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                value={duration}
                                onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                            />
                        </Form.Group>
                    ) : (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Start Time</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    onChange={e => setBookingTime({ ...bookingTime, start: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>End Time</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    onChange={e => setBookingTime({ ...bookingTime, end: e.target.value })}
                                />
                            </Form.Group>
                        </>
                    )}

                    <div className="bg-light p-3 rounded mb-3">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Rate</span>
                            <span className="fw-bold">₹{selectedSlot?.pricePerHour}/hr</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Duration</span>
                            <span className="fw-bold">{durationText}</span>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-2">
                            <span className="fw-bold text-dark">Total</span>
                            <span className="fw-bold text-success fs-5">₹{calculatedPrice}</span>
                        </div>
                    </div>

                    <Button variant="primary" className="w-100 py-2 fw-bold" onClick={handleBook} disabled={calculatedPrice <= 0 || loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : 'Pay & Book'}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default BookingModal;
