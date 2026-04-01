import { useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { Bell, CreditCard, X, Info } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import API from '../api';

const NotificationBell = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [loadingId, setLoadingId] = useState(null);
    const panelRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = (data) => {
        setNotifications(prev => [{
            id: `${Date.now()}-${Math.random()}`,
            type: data.type || 'payment',
            title: data.title || '⚠️ Overstay Payment Required',
            message: data.message,
            extraAmount: data.extraAmount,
            bookingId: data.bookingId,
            timestamp: new Date(),
            read: false,
        }, ...prev]);
        setOpen(true);
    };

    useEffect(() => {
        if (!user) return;

        // Use bare host URL for socket - VITE_API_URL has /api suffix which breaks socket.io
        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : `http://${window.location.hostname}:5000`;
        const socket = io(socketUrl);

        socket.on('paymentRequest', (data) => {
            // Use loose string comparison to handle ObjectId vs string differences
            if (String(data.userId) === String(user._id)) {
                addNotification({
                    type: 'payment',
                    title: '⚠️ Overstay Payment Required',
                    message: data.message || `Please pay ₹${data.extraAmount} for overstaying.`,
                    extraAmount: data.extraAmount,
                    bookingId: data.bookingId,
                });
            }
        });

        return () => socket.disconnect();
    }, [user]);

    // Close when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = () =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const dismiss = (id) =>
        setNotifications(prev => prev.filter(n => n.id !== id));

    const loadRazorpay = (src) => new Promise((resolve) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    const handlePay = async (notif) => {
        setLoadingId(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));

        try {
            const loaded = await loadRazorpay('https://checkout.razorpay.com/v1/checkout.js');
            if (!loaded) {
                alert('Razorpay SDK failed to load. Please check your internet connection.');
                setLoadingId(null);
                return;
            }

            const { data: order } = await API.post('/bookings/create-order', {
                amount: notif.extraAmount,
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                currency: order.currency,
                amount: order.amount,
                order_id: order.id,
                name: 'Campus Parking',
                description: 'Overstay Payment',
                handler: async (response) => {
                    try {
                        await API.post('/bookings/confirm-exit-payment', {
                            bookingId: notif.bookingId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        // Remove the payment notification and add success
                        setNotifications(prev => [
                            {
                                id: `success-${Date.now()}`,
                                type: 'success',
                                title: '✅ Payment Successful',
                                message: 'Overstay fee paid. You may now exit the parking.',
                                timestamp: new Date(),
                                read: false,
                            },
                            ...prev.filter(n => n.id !== notif.id),
                        ]);
                        window.location.reload();
                    } catch (err) {
                        alert(err.response?.data?.message || 'Payment verification failed. Please contact staff.');
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.phoneNumber || '',
                },
                theme: { color: '#dc3545' },
                modal: {
                    ondismiss: () => setLoadingId(null),
                },
            };

            new window.Razorpay(options).open();
        } catch (err) {
            console.error('Payment error:', err);
            alert(err.response?.data?.message || 'Payment initiation failed. Please try again.');
            setLoadingId(null);
        }
    };

    if (!user) return null;

    return (
        <div ref={panelRef} style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
            {/* Bell Button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
                style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                }}
                title="Notifications"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#dc3545', color: 'white',
                        borderRadius: '50%', fontSize: '10px',
                        width: '16px', height: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold',
                        animation: 'pulse 1.5s infinite',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '340px',
                    maxHeight: '420px',
                    overflowY: 'auto',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                    color: '#222',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8f9fa',
                        borderRadius: '12px 12px 0 0',
                        position: 'sticky', top: 0, zIndex: 1,
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                            🔔 Notifications
                            {unreadCount > 0 && (
                                <span style={{ color: '#dc3545', marginLeft: 6, fontSize: '13px' }}>
                                    ({unreadCount} new)
                                </span>
                            )}
                        </span>
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0d6efd', cursor: 'pointer' }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    {notifications.length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: '#bbb' }}>
                            <Info size={36} style={{ marginBottom: 8, opacity: 0.35 }} />
                            <div style={{ fontSize: '13px' }}>No notifications</div>
                        </div>
                    ) : notifications.map(notif => (
                        <div key={notif.id} style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f5f5f5',
                            background: notif.read ? 'white' : (notif.type === 'payment' ? '#fff8f8' : '#f0fff4'),
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{notif.title}</span>
                                <button
                                    onClick={() => dismiss(notif.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 0 }}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px 0' }}>{notif.message}</p>
                            <div style={{ fontSize: '11px', color: '#bbb', marginBottom: notif.type === 'payment' ? 8 : 0 }}>
                                {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {notif.type === 'payment' && (
                                <button
                                    onClick={() => handlePay(notif)}
                                    disabled={!!loadingId}
                                    style={{
                                        width: '100%',
                                        padding: '9px',
                                        background: loadingId ? '#aaa' : '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: loadingId ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <CreditCard size={14} />
                                    {loadingId === notif.id ? 'Opening Payment...' : `Pay ₹${notif.extraAmount} Now`}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
