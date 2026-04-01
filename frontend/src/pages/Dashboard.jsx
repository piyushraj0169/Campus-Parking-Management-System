import { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import API from '../api';
import AuthContext from '../context/AuthContext';
import { Car, Bike, Bus, Truck, Calendar, Clock, CreditCard, XCircle, Timer, PlusCircle, Copy, Check } from 'lucide-react';
import { Container, Row, Col, Card, Button, Modal, Form, Spinner, Badge, ProgressBar } from 'react-bootstrap';
import BookingModal from '../components/BookingModal';

const Dashboard = () => {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingTime, setBookingTime] = useState({ start: '', end: '' });
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [durationText, setDurationText] = useState('');

    // Extension State
    const [extendBookingId, setExtendBookingId] = useState(null);
    const [extensionHours, setExtensionHours] = useState(1);

    useEffect(() => {
        if (authLoading) return; // Wait for auth check

        const fetchData = async () => {
            try {
                const slotsRes = await API.get('/slots');
                setSlots(slotsRes.data);
                if (user) {
                    const bookingsRes = await API.get('/bookings/mybookings');
                    setBookings(bookingsRes.data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Fetch Error:", error);
                setLoading(false);
            }
        };

        fetchData();

        const socket = io(`http://${window.location.hostname}:5000`);

        socket.on('slotUpdate', (data) => {
            if (data.type === 'update') {
                setSlots(prev => prev.map(slot => slot._id === data.slot._id ? data.slot : slot));
            } else if (data.type === 'create') {
                setSlots(prev => [...prev, data.slot]);
            } else if (data.type === 'delete') {
                setSlots(prev => prev.filter(slot => slot._id !== data.id));
            }
        });

        socket.on('overstayAlert', (data) => {
            if (user && data.userId === user._id) {
                // Show a non-blocking alert or update state
                console.log("Overstay Alert:", data.message);
                // We could use a toast library here, but for now we'll just refresh bookings
                // to make sure the "OVERSTAYING" UI is up to date.
                const fetchBookings = async () => {
                    const bookingsRes = await API.get('/bookings/mybookings');
                    setBookings(bookingsRes.data);
                };
                fetchBookings();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user, authLoading]);

    const handleCloseExtendModal = () => setExtendBookingId(null);

    const loadRazorpay = (src) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Smart Countdown Timer Component
    const SmartCountdownTimer = ({ startTime, endTime }) => {
        const [displayTime, setDisplayTime] = useState('');
        const [label, setLabel] = useState('');
        const [badgeColor, setBadgeColor] = useState('secondary');
        const [textColor, setTextColor] = useState('dark');

        useEffect(() => {
            const calculate = () => {
                const now = new Date();
                const start = new Date(startTime);
                const end = new Date(endTime);

                if (now < start) {
                    // ── Not started yet ──
                    const diff = start - now;
                    const h = Math.floor(diff / 36e5);
                    const m = Math.floor((diff % 36e5) / 6e4);
                    const s = Math.floor((diff % 6e4) / 1000);
                    setDisplayTime(`${h}h ${m}m ${s}s`);
                    setLabel('Starts In');
                    setBadgeColor('success');
                    setTextColor('success');
                } else if (now <= end) {
                    // ── Currently active — show time remaining ──
                    const diff = end - now;
                    const h = Math.floor(diff / 36e5);
                    const m = Math.floor((diff % 36e5) / 6e4);
                    const s = Math.floor((diff % 6e4) / 1000);
                    setDisplayTime(`${h}h ${m}m ${s}s`);
                    setLabel('Time Remaining');
                    setBadgeColor('primary');
                    setTextColor('primary');
                } else {
                    // ── Past end time — overstaying ──
                    const diff = now - end;
                    const h = Math.floor(diff / 36e5);
                    const m = Math.floor((diff % 36e5) / 6e4);
                    const s = Math.floor((diff % 6e4) / 1000);
                    setDisplayTime(`+${h}h ${m}m ${s}s`);
                    setLabel('OVERSTAYING');
                    setBadgeColor('danger');
                    setTextColor('danger');
                }
            };
            const timer = setInterval(calculate, 1000);
            calculate();
            return () => clearInterval(timer);
        }, [startTime, endTime]);

        return (
            <div className="text-center">
                <div className={`fw-bold text-${textColor} fs-5 mb-1`}>{displayTime}</div>
                <Badge bg={badgeColor}>{label}</Badge>
            </div>
        );
    };

    useEffect(() => {
        if (selectedSlot && bookingTime.start && bookingTime.end) {
            const start = new Date(bookingTime.start);
            const end = new Date(bookingTime.end);

            if (end > start) {
                const diffMs = end - start;
                const hours = Math.ceil(diffMs / 36e5); // Rounded Billing
                const amount = hours * selectedSlot.pricePerHour;

                const exactHours = Math.floor(diffMs / 36e5);
                const exactMins = Math.round((diffMs % 36e5) / 60000);

                setCalculatedPrice(amount);
                setDurationText(`${exactHours}h ${exactMins}m (Billed as ${hours}h)`);
            } else {
                setCalculatedPrice(0);
                setDurationText('Invalid Duration');
            }
        }
    }, [bookingTime, selectedSlot]);

    if (loading || authLoading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
            <Spinner animation="border" variant="primary" />
        </div>
    );

    const handleBook = async () => {
        if (!selectedSlot || !bookingTime.start || !bookingTime.end) return;

        const start = new Date(bookingTime.start);
        const end = new Date(bookingTime.end);
        const hours = Math.ceil((end - start) / 36e5); // Round up to next hour
        const totalAmount = hours * selectedSlot.pricePerHour;

        try {
            await API.post('/bookings', {
                slotId: selectedSlot._id,
                startTime: bookingTime.start,
                endTime: bookingTime.end,
                totalAmount
            });
            alert('Booking successful!');
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.message || 'Booking failed');
        }
    };

    const handleCancel = async (id) => {
        if (!confirm('Are you sure you want to cancel? Refund applies only if before start time.')) return;
        try {
            await API.post('/bookings/cancel', { bookingId: id });
            alert('Booking cancelled & refunded (if applicable)');
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.message || 'Cancellation failed');
        }
    };

    const handleExtend = async () => {
        const booking = bookings.find(b => b._id === extendBookingId);
        if (!booking || !booking.slot) return;

        setLoading(true);
        try {
            const res = await loadRazorpay('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                alert('Razorpay SDK failed to load. Are you online?');
                setLoading(false);
                return;
            }

            const extraAmount = extensionHours * booking.slot.pricePerHour;
            
            const { data: order } = await API.post('/bookings/create-order', {
                amount: extraAmount
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Campus Parking",
                description: `Extend Booking by ${extensionHours} hours`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        await API.post('/bookings/verify-extension', {
                            ...response,
                            bookingId: extendBookingId,
                            extraHours: Number(extensionHours)
                        });
                        alert('Booking extended successfully!');
                        setExtendBookingId(null);
                        const bookingsRes = await API.get('/bookings/mybookings');
                        setBookings(bookingsRes.data);
                    } catch (err) {
                        alert(err.response?.data?.message || 'Extension Verification Failed');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: { color: "#3399cc" }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error("Extension payment failed", error);
            alert(error.response?.data?.message || 'Extension failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSlotClick = async (slot) => {
        if (!user) {
            alert('Please log in to book a slot.');
            return;
        }

        if (slot.isOccupied || slot.isDisabled || slot.isBooked) return;

        // Check if locked by another user
        if (slot.lockedBy && slot.lockedBy !== user._id) {
            alert('This slot is currently being booked by another user.');
            return;
        }

        try {
            // Lock the slot
            await API.post(`/slots/${slot._id}/lock`);
            setSelectedSlot(slot);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to lock slot');
        }
    };

    const handleCloseModal = async () => {
        if (selectedSlot) {
            try {
                await API.post(`/slots/${selectedSlot._id}/release`);
            } catch (error) {
                console.error("Failed to release lock", error);
            }
        }
        setSelectedSlot(null);
    };

    // Group slots by Zone (e.g., A1 -> Zone A)
    const zones = slots.reduce((acc, slot) => {
        const zone = slot.slotNumber.charAt(0);
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push(slot);
        // Sort numerically within zone if needed
        acc[zone].sort((a, b) => parseInt(a.slotNumber.slice(1)) - parseInt(b.slotNumber.slice(1)));
        return acc;
    }, {});

    return (
        <Container className="py-4">
            <h1 className="display-6 fw-bold mb-4 border-bottom pb-3">Dashboard</h1>

            <div className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="h4 fw-bold text-secondary d-flex align-items-center gap-2">
                        <Car className="text-primary" /> Live Parking Status
                    </h2>
                    <div className="d-flex gap-3 text-muted small flex-wrap">
                        <div className="d-flex align-items-center gap-2"><div className="rounded bg-success bg-opacity-25 border border-success" style={{ width: 20, height: 20 }}></div> Available</div>
                        <div className="d-flex align-items-center gap-2"><div className="rounded bg-danger bg-opacity-25 border border-danger" style={{ width: 20, height: 20 }}></div> Occupied</div>
                        <div className="d-flex align-items-center gap-2"><div className="rounded bg-warning bg-opacity-25 border border-warning" style={{ width: 20, height: 20 }}></div> Locked</div>
                        <div className="d-flex align-items-center gap-2"><div className="rounded bg-secondary bg-opacity-25 border border-secondary" style={{ width: 20, height: 20 }}></div> Maintenance</div>
                    </div>
                </div>

                {Object.keys(zones).length > 0 ? (
                    Object.keys(zones).sort().map(zone => (
                        <div key={zone} className="mb-4">
                            <h5 className="fw-bold text-muted mb-3 border-start border-4 border-primary ps-2">Zone {zone}</h5>
                            <div className="d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                                {zones[zone].map(slot => {
                                    // Determine Status Color
                                    let statusClass = 'border-success bg-light text-success';
                                    let isClickable = true;

                                    if (slot.isOccupied) {
                                        statusClass = 'border-danger bg-danger text-white';
                                        isClickable = false;
                                    } else if (slot.isBooked) {
                                        // Visually distinct for "Booked" but not yet Entered
                                        statusClass = 'border-danger bg-danger text-white opacity-75';
                                        isClickable = false;
                                    } else if (slot.lockedBy) {
                                        if (slot.lockedBy === user?._id) {
                                            statusClass = 'border-primary bg-primary text-white shadow'; // My Lock
                                        } else {
                                            statusClass = 'border-warning bg-warning text-dark'; // Others Lock
                                            isClickable = false;
                                        }
                                    } else if (slot.isDisabled) {
                                        statusClass = 'border-secondary bg-secondary text-white';
                                        isClickable = false;
                                    }

                                    return (
                                        <div
                                            key={slot._id}
                                            className={`
                                                card p-2 text-center pointer transition-all
                                                ${statusClass}
                                                ${selectedSlot?._id === slot._id ? 'ring-2 ring-primary transform scale-105' : ''}
                                            `}
                                            style={{ cursor: isClickable ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                                            onClick={() => isClickable && handleSlotClick(slot)}
                                        >
                                            <div className="fw-bold fs-5 mb-1">{slot.slotNumber}</div>
                                            <div className="small opacity-75 d-flex align-items-center justify-content-center gap-1">
                                                {slot.type === 'Car' && <Car size={14} />}
                                                {slot.type === 'Bike' && <Bike size={14} />}
                                                {slot.type === 'Bus' && <Bus size={14} />}
                                                {slot.type === 'Truck' && <Truck size={14} />}
                                                {slot.type}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-5 bg-light rounded border border-secondary border-dashed text-muted">
                        No parking slots available.
                        <br />
                        <small>Log in as Admin to create slots.</small>
                    </div>
                )}
            </div>

            <BookingModal
                show={!!selectedSlot}
                handleClose={handleCloseModal}
                selectedSlot={selectedSlot}
                onSuccess={() => window.location.reload()}
            />

            <Modal show={!!extendBookingId} onHide={handleCloseExtendModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Extend Booking</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Extension Duration (Hours)</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                value={extensionHours}
                                onChange={e => setExtensionHours(e.target.value)}
                            />
                        </Form.Group>
                        <Button variant="primary" className="w-100" onClick={handleExtend}>
                            Confirm Extension
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <div>
                <h2 className="h4 fw-bold text-secondary mb-4 d-flex align-items-center gap-2">
                    <CreditCard className="text-success" /> My Bookings
                </h2>
                <Row className="g-4">
                    {bookings.map(booking => (
                        <Col lg={6} md={12} key={booking._id}>
                            <Card className="h-100 shadow-sm border-0">
                                <Card.Body className="d-flex align-items-center flex-wrap">
                                    <div className="flex-grow-1 w-100">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <Badge bg="primary">{booking.slot?.slotNumber}</Badge>
                                            <Badge bg={booking.status === 'Active' ? 'success' : booking.status === 'Cancelled' ? 'danger' : 'secondary'}>{booking.status}</Badge>
                                        </div>
                                        <div className="small text-muted mb-3">
                                            <div className="d-flex align-items-center gap-2 mb-1"><Calendar size={14} /> {new Date(booking.startTime).toLocaleDateString()}</div>
                                            <div className="d-flex align-items-center gap-2 mb-1"><Clock size={14} /> {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}</div>
                                            <div className="d-flex align-items-center gap-2">
                                                <CreditCard size={14} />
                                                <span className={booking.paymentStatus === 'Refunded' ? 'text-decoration-line-through text-muted' : 'text-success'}>
                                                    ₹{booking.totalAmount}
                                                </span>
                                                {booking.paymentStatus === 'Refunded' && <span className="text-danger small fw-bold">(Refunded)</span>}
                                            </div>
                                        </div>

                                         {(booking.status === 'Active' || booking.status === 'Booked' || booking.status === 'Pending Extra Payment') && (
                                             <div className={`mb-3 p-2 rounded border border-opacity-25 ${new Date() > new Date(booking.endTime) ? 'bg-danger bg-opacity-10 border-danger' : 'bg-light border-secondary'}`}>
                                                 <SmartCountdownTimer startTime={booking.startTime} endTime={booking.endTime} />
                                             </div>
                                         )}

                                        <div className="d-flex gap-2 align-items-center flex-wrap">
                                            <code className="bg-light p-1 rounded border align-self-center pointer" title="Click to Copy"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(booking.qrCode);
                                                    alert('QR Code Copied!');
                                                }}>
                                                {booking.qrCode}
                                            </code>
                                            <Button size="sm" variant="outline-secondary" onClick={() => {
                                                navigator.clipboard.writeText(booking.qrCode);
                                                alert('QR Code Copied!');
                                            }}>
                                                <Copy size={14} />
                                            </Button>
                                            {booking.status === 'Active' && (
                                                <Button size="sm" variant="outline-primary" onClick={() => setExtendBookingId(booking._id)}>
                                                    <PlusCircle size={14} className="me-1" /> Extend
                                                </Button>
                                            )}
                                            {booking.status === 'Booked' && (
                                                <Button size="sm" variant="outline-danger" onClick={() => handleCancel(booking._id)}>
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded shadow-sm border ms-md-3 mt-3 mt-md-0 mx-auto">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${booking.qrCode}`}
                                            alt="QR Code"
                                            style={{ width: '80px', height: '80px' }}
                                        />
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </Container>
    );
};

export default Dashboard;
