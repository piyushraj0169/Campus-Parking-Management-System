import { useState, useContext, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, Badge, Spinner, Table } from 'react-bootstrap';
import { QrCode, CheckCircle, XCircle, Search, User, Phone, Calendar, Clock, Truck, Car, Bike, Bus, Camera, CameraOff, CreditCard, Banknote, ArrowRightCircle, LogOut, RotateCcw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { io } from 'socket.io-client';
import API from '../api';
import AuthContext from '../context/AuthContext';

const StaffDashboard = () => {
    const { user } = useContext(AuthContext);
    const [qrInput, setQrInput] = useState('');
    const [bookingDetails, setBookingDetails] = useState(null);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [history, setHistory] = useState([]);

    // Overstay payment states
    const [overstayInfo, setOverstayInfo] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    // Exit summary (shown after exit is fully completed)
    const [exitSummary, setExitSummary] = useState(null);

    // Live slots
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(true);

    // ─── Data Fetching ──────────────────────────────────────────────────────────

    const fetchSlots = async () => {
        try {
            const { data } = await API.get('/slots');
            setSlots(data);
            setSlotsLoading(false);
        } catch (err) {
            console.error('Failed to fetch slots', err);
            setSlotsLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data } = await API.get('/bookings/staff/history');
            setHistory(data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    // ─── Reset form to initial state ─────────────────────────────────────────

    const resetForm = () => {
        setQrInput('');
        setBookingDetails(null);
        setOverstayInfo(null);
        setExitSummary(null);
        setError(null);
        setMessage(null);
    };

    // ─── Socket Setup ──────────────────────────────────────────────────────────

    useEffect(() => {
        fetchHistory();
        fetchSlots();

        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : `http://${window.location.hostname}:5000`;
        const socket = io(socketUrl);

        socket.on('slotUpdate', () => {
            fetchSlots();
        });

        // Listen for online payment confirmed by user OR normal exit completion
        socket.on('exitPaymentSuccess', (data) => {
            setOverstayInfo((prev) => {
                if (prev && prev.booking && String(prev.booking._id) === String(data.bookingId)) {
                    setMessage('✅ Payment Received! Slot Released.');
                    setBookingDetails(null);
                    setExitSummary(null);
                    setQrInput('');
                    fetchSlots();
                    fetchHistory();
                    return null;
                }
                return prev;
            });
            // Also refresh for non-overstay exits triggered by socket
            fetchSlots();
            fetchHistory();
        });

        return () => socket.disconnect();
    }, []);

    // ─── QR Scanner ───────────────────────────────────────────────────────────

    useEffect(() => {
        let scanner;
        if (showScanner) {
            scanner = new Html5QrcodeScanner(
                'reader',
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            scanner.render(onScanSuccess, () => {});
        }
        return () => {
            if (scanner) scanner.clear().catch(() => {});
        };
    }, [showScanner]);

    const onScanSuccess = (decodedText) => {
        setQrInput(decodedText);
        setShowScanner(false);
    };

    // ─── Verify QR (entry / exit / check) ────────────────────────────────────

    const handleVerifyBox = async (action) => {
        if (!qrInput) return;
        setLoading(true);
        setError(null);
        setMessage(null);
        setOverstayInfo(null);
        setExitSummary(null);
        setBookingDetails(null);

        try {
            const { data } = await API.post('/bookings/verify', {
                qrCode: qrInput,
                action,
            });

            if (data.requiresExtraPayment) {
                // Overstay detected
                setOverstayInfo({
                    ...data,
                    booking: data.booking,
                    // Only show payment buttons on actual 'exit' action, not 'check'
                    checkOnly: action === 'check',
                    // Also show waiting spinner if it's already in pending state (from previous request)
                    waitingForOnline: data.booking.status === 'Pending Extra Payment' && action !== 'check',
                });
                setBookingDetails(data.booking);
                if (action === 'check') {
                    setMessage(data.extraAmount > 0 ? '⚠️ Overstay detected — use Verify Exit to process payment' : '⚠️ Payment required — use Verify Exit to process payment');
                }
            } else if (data.exitSummary) {
                // Normal exit completed (no overstay)
                setExitSummary(data.exitSummary);
                setMessage(data.message);
            } else {
                // Entry verification or check
                setBookingDetails(data.booking);
                setMessage(data.message);
            }

            fetchHistory();
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    // ─── Process Overstay Payment (Cash or Online) ────────────────────────────

    const handleProcessExitPayment = async (method) => {
        if (!overstayInfo?.booking) return;
        setProcessingPayment(method);
        setError(null);
        setMessage(null);

        try {
            const { data } = await API.post('/bookings/process-exit', {
                bookingId: overstayInfo.booking._id,
                paymentMethod: method,
            });

            if (method === 'Cash') {
                setOverstayInfo(null);
                setBookingDetails(data.booking);
                setExitSummary(data.exitSummary); // Show exit summary
                setMessage(data.message);
                fetchHistory();
                fetchSlots();
            } else if (method === 'Online') {
                // Update with recalculated server amounts & waiting state
                setOverstayInfo((prev) => ({
                    ...prev,
                    extraAmount: data.extraAmount,
                    totalDue: data.totalDue,
                    baseAmountDue: data.baseAmountDue,
                    extraTimeHours: data.extraTimeHours,
                    waitingForOnline: true,
                }));
                setMessage(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process exit payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    // ─── Force Release (Staff emergency) ────────────────────────────────────

    const handleForceRelease = async (slotId) => {
        if (!confirm('Are you sure you want to FORCE RELEASE this slot? This will also complete any active bookings for it.')) return;
        setLoading(true);
        try {
            await API.post(`/slots/${slotId}/force-release`);
            setMessage('Slot force-released successfully');
            fetchSlots();
            fetchHistory();
        } catch (err) {
            setError(err.response?.data?.message || 'Force release failed');
        } finally {
            setLoading(false);
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const getVehicleIcon = (type) => {
        switch (type) {
            case 'Car': return <Car size={20} />;
            case 'Bike': return <Bike size={20} />;
            case 'Bus': return <Bus size={20} />;
            case 'Truck': return <Truck size={20} />;
            default: return <Car size={20} />;
        }
    };

    const fmt = (date) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const fmtDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
    const fmtFull = (date) => date ? new Date(date).toLocaleString() : '—';

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Container className="py-5">
            <h2 className="mb-4 fw-bold text-secondary border-bottom pb-2">
                Staff Dashboard <Badge bg="info" className="fs-6 align-middle ms-2">Staff: {user?.name}</Badge>
            </h2>

            <Row className="justify-content-center">
                <Col md={8} lg={6}>

                    {/* ── QR Verify Card ─────────────────────────────────── */}
                    <Card className="shadow-lg mb-4 border-0">
                        <Card.Header className="bg-primary text-white py-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <QrCode size={24} /> Verify Booking
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-end mb-3">
                                <Button
                                    variant={showScanner ? 'danger' : 'outline-primary'}
                                    size="sm"
                                    className="w-100"
                                    onClick={() => setShowScanner(!showScanner)}
                                >
                                    {showScanner
                                        ? <><CameraOff size={18} className="me-1" />Stop Scan</>
                                        : <><Camera size={18} className="me-1" />Scan QR Code</>
                                    }
                                </Button>
                            </div>

                            {showScanner && <div id="reader" className="mb-4" />}

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">Scan or Enter QR Code</Form.Label>
                                <div className="input-group input-group-lg">
                                    <span className="input-group-text bg-light"><Search size={20} /></span>
                                    <Form.Control
                                        type="text"
                                        value={qrInput}
                                        onChange={(e) => setQrInput(e.target.value)}
                                        placeholder="Enter Booking QR String"
                                    />
                                    {qrInput && (
                                        <Button variant="outline-secondary" onClick={resetForm} title="Clear">
                                            ✕
                                        </Button>
                                    )}
                                </div>
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button variant="secondary" size="lg" onClick={() => handleVerifyBox('check')} disabled={loading || !qrInput}>
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <Search size={18} className="me-2" />}
                                    Check Details
                                </Button>
                                <div className="d-flex gap-2">
                                    <Button variant="success" size="lg" className="w-50" onClick={() => handleVerifyBox('entry')} disabled={loading || !qrInput}>
                                        <CheckCircle size={20} className="me-2" />Verify Entry
                                    </Button>
                                    <Button variant="danger" size="lg" className="w-50" onClick={() => handleVerifyBox('exit')} disabled={loading || !qrInput}>
                                        <LogOut size={20} className="me-2" />Verify Exit
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* ── Alerts ─────────────────────────────────────────── */}
                    {error && <Alert variant="danger" className="shadow-sm">{error}</Alert>}
                    {message && <Alert variant={message.startsWith('⚠️') ? 'warning' : 'success'} className="shadow-sm">{message}</Alert>}

                    {/* ── Booking Details Card ───────────────────────────── */}
                    {bookingDetails && !exitSummary && (
                        <Card className="shadow-lg border-0 border-top border-5 border-success mb-4">
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <h5 className="fw-bold text-success mb-0">Booking Details</h5>
                                    <Badge
                                        bg={
                                            bookingDetails.status === 'Active' ? 'success' :
                                            bookingDetails.status === 'Booked' ? 'warning' :
                                            bookingDetails.status === 'Pending Extra Payment' ? 'danger' : 'secondary'
                                        }
                                        className="fs-6"
                                    >
                                        {bookingDetails.status}
                                    </Badge>
                                </div>

                                <hr />

                                {/* User Details */}
                                <div className="mb-3">
                                    <h6 className="text-secondary small text-uppercase fw-bold mb-2">User Details</h6>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <User size={18} className="text-primary" />
                                        <span className="fw-bold text-dark fs-5">{bookingDetails.user?.name || 'Guest'}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-muted">
                                        <Phone size={18} />
                                        <span>{bookingDetails.user?.phoneNumber || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Slot & Vehicle */}
                                <div className="mb-3">
                                    <h6 className="text-secondary small text-uppercase fw-bold mb-2">Vehicle & Slot</h6>
                                    <div className="d-flex justify-content-between bg-light p-3 rounded">
                                        <div className="d-flex align-items-center gap-2">
                                            {getVehicleIcon(bookingDetails.slot?.type)}
                                            <div>
                                                <div className="fw-bold">{bookingDetails.slot?.type}</div>
                                                <div className="small text-muted">₹{bookingDetails.slot?.pricePerHour}/hr</div>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <div className="fw-bold text-primary fs-5">Slot {bookingDetails.slot?.slotNumber}</div>
                                            <div className="small text-success fw-semibold">Total: ₹{bookingDetails.totalAmount}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Timing */}
                                <div className="mb-3">
                                    <h6 className="text-secondary small text-uppercase fw-bold mb-2">Booking Time</h6>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <div className="bg-light rounded p-2 text-center">
                                                <div className="small text-muted">Check-in</div>
                                                <div className="fw-bold">{fmt(bookingDetails.startTime)}</div>
                                                <div className="small text-muted">{fmtDate(bookingDetails.startTime)}</div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-light rounded p-2 text-center">
                                                <div className="small text-muted">Booked Until</div>
                                                <div className="fw-bold">{fmt(bookingDetails.endTime)}</div>
                                                <div className="small text-muted">{fmtDate(bookingDetails.endTime)}</div>
                                            </div>
                                        </div>
                                        {bookingDetails.entryTime && (
                                            <div className="col-6">
                                                <div className="bg-success bg-opacity-10 rounded p-2 text-center h-100">
                                                    <div className="small text-muted">Actual Entry</div>
                                                    <div className="fw-bold text-success small">{fmtFull(bookingDetails.entryTime)}</div>
                                                </div>
                                            </div>
                                        )}
                                        {bookingDetails.exitTime && (
                                            <div className="col-6">
                                                <div className="bg-primary bg-opacity-10 rounded p-2 text-center h-100 border border-primary border-opacity-25">
                                                    <div className="small text-muted">Actual Exit</div>
                                                    <div className="fw-bold text-primary small">{fmtFull(bookingDetails.exitTime)}</div>
                                                </div>
                                            </div>
                                        )}
                                        {bookingDetails.status === 'Completed' && bookingDetails.extraAmount > 0 && (
                                            <div className="col-12 mt-2">
                                                <div className="bg-danger bg-opacity-10 rounded p-2 text-center border border-danger border-opacity-25">
                                                    <div className="small text-muted text-danger fw-bold">Overstay Paid</div>
                                                    <div className="fw-bold text-danger">₹{bookingDetails.extraAmount}</div>
                                                    <div className="small text-muted">({bookingDetails.extraTime} hour(s))</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Overstay Payment Panel */}
                                {overstayInfo && (
                                    <div className={`mt-3 p-3 bg-${overstayInfo.extraAmount > 0 ? 'danger' : 'warning'} bg-opacity-10 border border-${overstayInfo.extraAmount > 0 ? 'danger' : 'warning'} rounded`}>
                                        <h5 className={`text-${overstayInfo.extraAmount > 0 ? 'danger' : 'dark'} fw-bold mb-3 d-flex align-items-center gap-2`}>
                                            <XCircle size={20} /> {overstayInfo.extraAmount > 0 ? 'Overstay Detected' : 'Payment Required'}
                                        </h5>

                                        {/* Timing Breakdown */}
                                        <div className="mb-3 small">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Booked Until:</span>
                                                <span className="fw-semibold">{fmtFull(overstayInfo.bookedEndTime || bookingDetails.endTime)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Actual Exit Time:</span>
                                                <span className="fw-semibold">{fmtFull(overstayInfo.actualExitTime || new Date())}</span>
                                            </div>
                                            <hr className="my-2" />
                                            {overstayInfo.baseAmountDue > 0 && (
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="text-muted">Base Booking Amount:</span>
                                                    <span className="fw-semibold">₹{overstayInfo.baseAmountDue}</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Rate:</span>
                                                <span className="fw-semibold">₹{overstayInfo.pricePerHour || bookingDetails.slot?.pricePerHour}/hr</span>
                                            </div>
                                            {overstayInfo.extraAmount > 0 && (
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="text-muted">Extra Time:</span>
                                                    <span className="fw-semibold text-danger">{overstayInfo.extraTimeHours} hr × ₹{overstayInfo.pricePerHour || bookingDetails.slot?.pricePerHour}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount Due */}
                                        <div className={`d-flex justify-content-between align-items-center mb-1 p-2 bg-${overstayInfo.extraAmount > 0 ? 'danger' : 'warning'} bg-opacity-10 rounded border border-${overstayInfo.extraAmount > 0 ? 'danger' : 'warning'}`}>
                                            <span className={`fw-bold text-${overstayInfo.extraAmount > 0 ? 'danger' : 'dark'}`}>Total Amount Due</span>
                                            <span className={`fw-bold text-${overstayInfo.extraAmount > 0 ? 'danger' : 'dark'} fs-3`}>₹{overstayInfo.totalDue || overstayInfo.extraAmount}</span>
                                        </div>
                                        {overstayInfo.extraAmount > 0 && (
                                            <div className="text-center small text-danger mb-3 opacity-75">
                                                * Any overstay is rounded up to the next full hour
                                            </div>
                                        )}

                                        {/* Payment Actions */}
                                        {overstayInfo.checkOnly ? (
                                            <Alert variant="warning" className="mb-0 text-center py-2">
                                                Click <strong>Verify Exit</strong> above to process payment and release slot.
                                            </Alert>
                                        ) : overstayInfo.waitingForOnline ? (
                                            <Alert variant="info" className="mb-0 text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                                    <Spinner animation="border" size="sm" />
                                                    <span className="fw-bold">Waiting for online payment...</span>
                                                </div>
                                                <div className="small text-muted mb-3">Notification sent to user's device</div>
                                                <Button 
                                                    variant="outline-info" 
                                                    size="sm" 
                                                    onClick={() => handleVerifyBox('exit')}
                                                    className="w-100"
                                                >
                                                    <RotateCcw size={14} className="me-1" /> Check Payment Status
                                                </Button>
                                            </Alert>
                                        ) : (
                                            <>
                                                <p className="text-center mb-2">
                                                    Select payment method to collect {overstayInfo.extraAmount > 0 ? 'extra charge' : 'payment'}:
                                                </p>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="success"
                                                        size="lg"
                                                        className="flex-fill fw-bold d-flex flex-column align-items-center justify-content-center py-3 shadow-sm border-0 rounded-4"
                                                        onClick={() => handleProcessExitPayment('Cash')}
                                                        disabled={!!processingPayment}
                                                        style={{ transition: 'transform 0.2s', borderBottom: '4px solid #157347' }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                    >
                                                        {processingPayment === 'Cash'
                                                            ? <Spinner size="sm" animation="border" />
                                                            : <>
                                                                <Banknote size={28} className="mb-1" />
                                                                <div>Collect Cash</div>
                                                            </>
                                                        }
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        size="lg"
                                                        className="flex-fill fw-bold d-flex flex-column align-items-center justify-content-center py-3 shadow-sm border-0 rounded-4"
                                                        onClick={() => handleProcessExitPayment('Online')}
                                                        disabled={!!processingPayment}
                                                        style={{ transition: 'transform 0.2s', borderBottom: '4px solid #0a58ca' }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                    >
                                                        {processingPayment === 'Online'
                                                            ? <Spinner size="sm" animation="border" />
                                                            : <>
                                                                <CreditCard size={28} className="mb-1" />
                                                                <div>Online (UPI/Card)</div>
                                                            </>
                                                        }
                                                    </Button>
                                                </div>
                                                <p className="text-muted small text-center mt-2 mb-0">
                                                    <strong>Cash:</strong> Collect directly and release slot instantly.<br />
                                                    <strong>Online:</strong> Send payment link to user's notification panel.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    )}

                    {/* ── Exit Summary Card (shown after exit is complete) ─ */}
                    {exitSummary && (
                        <Card className="shadow-lg border-0 border-top border-5 border-primary mb-4">
                            <Card.Header className="bg-success text-white py-3">
                                <h5 className="mb-0 d-flex align-items-center gap-2">
                                    <CheckCircle size={22} /> Exit Verified — Slot Released
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-4">
                                {message && <Alert variant="success" className="mb-3">{message}</Alert>}

                                {/* Slot Info */}
                                <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        {getVehicleIcon(exitSummary.slotType)}
                                        <div>
                                            <div className="fw-bold">{exitSummary.slotType || 'Vehicle'}</div>
                                            {exitSummary.pricePerHour && <div className="small text-muted">₹{exitSummary.pricePerHour}/hr</div>}
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="fw-bold text-primary fs-5">Slot {exitSummary.slotNumber}</div>
                                        <Badge bg="success" className="rounded-pill">Released ✓</Badge>
                                    </div>
                                </div>

                                {/* Timing Summary */}
                                <h6 className="text-secondary small text-uppercase fw-bold mb-2">Exit Summary</h6>
                                <div className="row g-2 mb-3">
                                    <div className="col-4">
                                        <div className="rounded p-2 text-center border">
                                            <div className="small text-muted">Entry</div>
                                            <div className="fw-bold small">{fmt(exitSummary.startTime)}</div>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="rounded p-2 text-center border">
                                            <div className="small text-muted">Booked Till</div>
                                            <div className="fw-bold small">{fmt(exitSummary.bookedEndTime)}</div>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="rounded p-2 text-center border border-primary bg-primary bg-opacity-10">
                                            <div className="small text-muted">Actual Exit</div>
                                            <div className="fw-bold small text-primary">{fmt(exitSummary.actualExitTime)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Summary */}
                                <div className="border rounded p-3 bg-light">
                                    <div className="d-flex justify-content-between mb-1">
                                        <span className="text-muted small">Booking Amount</span>
                                        <span className="fw-semibold">₹{exitSummary.totalAmount}</span>
                                    </div>
                                    {exitSummary.extraTimeHours > 0 && (
                                        <div className="d-flex justify-content-between mb-1 text-danger">
                                            <span className="small">Overstay ({exitSummary.extraTimeHours} hr × ₹{exitSummary.pricePerHour})</span>
                                            <span className="fw-semibold">+ ₹{exitSummary.extraAmount}</span>
                                        </div>
                                    )}
                                    {(exitSummary.extraAmount || 0) === 0 && (
                                        <div className="d-flex justify-content-between mb-1 text-success">
                                            <span className="small">On-time exit</span>
                                            <span className="fw-semibold text-success">No extra charge ✓</span>
                                        </div>
                                    )}
                                    <hr className="my-2" />
                                    <div className="d-flex justify-content-between">
                                        <span className="fw-bold">Grand Total</span>
                                        <span className="fw-bold fs-5 text-primary">
                                            ₹{(exitSummary.totalAmount || 0) + (exitSummary.extraAmount || 0)}
                                        </span>
                                    </div>
                                </div>

                                <Button variant="outline-secondary" className="mt-3 w-100" onClick={resetForm}>
                                    <ArrowRightCircle size={18} className="me-2" />Scan Next Vehicle
                                </Button>
                            </Card.Body>
                        </Card>
                    )}

                    {/* ── Upcoming Reservations ──────────────────────────── */}
                    <Card className="shadow-sm border-0 mb-5 overflow-hidden">
                        <Card.Header className="bg-white py-3 border-bottom border-light d-flex justify-content-between align-items-center">
                            <h3 className="h5 mb-0 fw-bold text-secondary d-flex align-items-center gap-2">
                                <Calendar className="text-primary" /> Upcoming Reservations
                            </h3>
                            <Badge bg="info" className="rounded-pill">Next 24 Hours</Badge>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light text-secondary small text-uppercase fw-bold">
                                    <tr>
                                        <th className="py-3 ps-4">Slot</th>
                                        <th className="py-3">User</th>
                                        <th className="py-3">Time Range</th>
                                        <th className="py-3 text-end pe-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="border-top-0">
                                    {slots.filter(s => s.upcomingBooking).length > 0 ? (
                                        slots.filter(s => s.upcomingBooking).map((slot) => (
                                            <tr key={slot._id} className="align-middle border-bottom-light">
                                                <td className="py-3 ps-4"><Badge bg="primary" className="px-3 rounded-pill">{slot.slotNumber}</Badge></td>
                                                <td className="py-3">
                                                    <div className="fw-semibold text-dark">{slot.upcomingBooking.user?.name || 'Guest'}</div>
                                                    <div className="small text-muted">{slot.upcomingBooking.user?.email}</div>
                                                </td>
                                                <td className="py-3 small text-muted">
                                                    <Clock size={14} className="me-1" />
                                                    {fmt(slot.upcomingBooking.startTime)} – {fmt(slot.upcomingBooking.endTime)}
                                                </td>
                                                <td className="py-3 text-end pe-4">
                                                    <Badge bg="warning" text="dark" className="rounded-pill px-3">Reserved</Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-5 text-muted bg-light bg-opacity-50">
                                                <div className="d-flex flex-column align-items-center gap-2">
                                                    <Calendar size={32} className="opacity-25" />
                                                    <span>No upcoming reservations found.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* ── Live Occupancy Table ──────────────────────────────── */}
                <Col md={12} className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="text-secondary border-start border-4 border-success ps-2 mb-0">Live Occupancy</h4>
                        <Button variant="outline-secondary" size="sm" onClick={fetchSlots}>Refresh Slots</Button>
                    </div>
                    <Card className="shadow-sm border-0 mb-5">
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="py-3 ps-4 text-secondary text-uppercase small fw-bold">Slot</th>
                                            <th className="py-3 text-secondary text-uppercase small fw-bold">Current User</th>
                                            <th className="py-3 text-secondary text-uppercase small fw-bold">Vehicle</th>
                                            <th className="py-3 text-secondary text-uppercase small fw-bold">Status</th>
                                            <th className="py-3 text-secondary text-uppercase small fw-bold">Time Range</th>
                                            <th className="py-3 text-end pe-4 text-secondary text-uppercase small fw-bold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slots.filter(s => s.currentBooking && (s.currentBooking.status === 'Active' || s.currentBooking.status === 'Pending Extra Payment' || (s.currentBooking.status === 'Booked' && new Date(s.currentBooking.startTime) <= new Date()))).length > 0 ? (
                                            slots.filter(s => s.currentBooking && (s.currentBooking.status === 'Active' || s.currentBooking.status === 'Pending Extra Payment' || (s.currentBooking.status === 'Booked' && new Date(s.currentBooking.startTime) <= new Date()))).map((slot) => {
                                                const isOverstaying = slot.currentBooking && new Date() > new Date(slot.currentBooking.endTime);
                                                return (
                                                    <tr key={slot._id} className={isOverstaying ? 'table-danger' : ''}>
                                                        <td className="ps-4">
                                                            <Badge bg="primary" className="fs-6">{slot.slotNumber}</Badge>
                                                        </td>
                                                        <td>
                                                            {slot.currentBooking ? (
                                                                <>
                                                                    <div className="fw-bold">{slot.currentBooking.user?.name || 'Guest'}</div>
                                                                    <div className="small text-muted">{slot.currentBooking.user?.email}</div>
                                                                </>
                                                            ) : <span className="text-muted">No active booking</span>}
                                                        </td>
                                                        <td>
                                                            {slot.currentBooking ? (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    {getVehicleIcon(slot.type)}
                                                                    <span>{slot.type}</span>
                                                                </div>
                                                            ) : '–'}
                                                        </td>
                                                        <td>
                                                            {slot.currentBooking?.status === 'Pending Extra Payment' ? (
                                                                <Badge bg="warning" text="dark">Pending Payment</Badge>
                                                            ) : slot.currentBooking?.status === 'Booked' ? (
                                                                <Badge bg="info">Awaiting Arrival</Badge>
                                                            ) : (
                                                                <Badge bg="success">Parked</Badge>
                                                            )}
                                                            {isOverstaying && (
                                                                <Badge bg="danger" className="ms-1 animate__animated animate__flash animate__infinite">Overstay</Badge>
                                                            )}
                                                        </td>
                                                        <td className="small text-muted">
                                                            {slot.currentBooking ? (
                                                                <>
                                                                    {fmt(slot.currentBooking.startTime)} – {fmt(slot.currentBooking.endTime)}
                                                                </>
                                                            ) : '–'}
                                                        </td>
                                                        <td className="text-end pe-4">
                                                            {(slot.isOccupied || slot.currentBooking?.status === 'Booked') && (
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    className="rounded-pill px-3 shadow-sm"
                                                                    onClick={() => handleForceRelease(slot._id)}
                                                                >
                                                                    Force Release
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">No occupied slots currently.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* ── Recent Verifications Table ────────────────────────── */}
                <Col md={12} className="mt-2">
                    <h4 className="mb-3 text-secondary border-start border-4 border-info ps-2">Recent Verifications</h4>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="py-3 ps-4">Time</th>
                                            <th className="py-3">User</th>
                                            <th className="py-3">Slot</th>
                                            <th className="py-3">Booked</th>
                                            <th className="py-3">Exit</th>
                                            <th className="py-3">Extra</th>
                                            <th className="py-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.length > 0 ? (
                                            history.map((item) => (
                                                <tr key={item._id}>
                                                    <td className="ps-4 text-muted small">
                                                        {item.verificationTime ? new Date(item.verificationTime).toLocaleString() : 'N/A'}
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{item.user?.name}</div>
                                                        <div className="small text-muted">{item.user?.phoneNumber}</div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-1">
                                                            <Badge bg="light" text="dark" className="border">{item.slot?.slotNumber}</Badge>
                                                            <span className="small text-muted">{item.slot?.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="small text-muted">
                                                        {fmt(item.startTime)} – {fmt(item.endTime)}
                                                    </td>
                                                    <td className="small text-muted">
                                                        {item.exitTime ? fmt(item.exitTime) : '—'}
                                                    </td>
                                                    <td>
                                                        {item.extraAmount > 0 ? (
                                                            <span className="text-danger fw-semibold small">₹{item.extraAmount}</span>
                                                        ) : (
                                                            <span className="text-success small">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {item.status === 'Active' ? (
                                                            <Badge bg="success" className="px-3 py-2">Entry</Badge>
                                                        ) : item.status === 'Completed' ? (
                                                            <Badge bg="danger" className="px-3 py-2">Exit</Badge>
                                                        ) : item.status === 'Pending Extra Payment' ? (
                                                            <Badge bg="warning" text="dark" className="px-2 py-2">Pending</Badge>
                                                        ) : (
                                                            <Badge bg="secondary">{item.status}</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center py-5 text-muted">
                                                    No verifications yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default StaffDashboard;
