import { useState, useEffect } from 'react';
import API from '../api';
import { Plus, Trash2, ShieldCheck, Car, Bike, Search, Activity, DollarSign, Users, CheckCircle, Edit, Download, PieChart, BarChart, XCircle } from 'lucide-react';
import { Container, Row, Col, Card, Form, Button, Table, InputGroup, Alert, Tabs, Tab, Modal, Badge, ProgressBar } from 'react-bootstrap';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AdminDashboard = () => {
    const [slots, setSlots] = useState([]);
    const [newSlot, setNewSlot] = useState({ slotNumber: '', type: 'Car', pricePerHour: 50 });
    const [users, setUsers] = useState([]);
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [analytics, setAnalytics] = useState({
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        dailyRevenue: [],
        recentTransactions: [],
        vehicleTypeStats: [],
        peakHours: [],
        slotUsage: [],
        occupancyRate: 0
    });
    const [timeRange, setTimeRange] = useState('week');
    const [editSlot, setEditSlot] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [editUser, setEditUser] = useState(null);
    const [showEditUserModal, setShowEditUserModal] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSlots();
        fetchAnalytics();
        fetchUsers();
    }, [timeRange]);

    const fetchSlots = async () => {
        try {
            const { data } = await API.get('/slots');
            setSlots(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data } = await API.get(`/bookings/analytics?range=${timeRange}`);
            setAnalytics(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async () => {
        try {
            await API.post('/slots', newSlot);
            fetchSlots();
            setNewSlot({ slotNumber: '', type: 'Car', pricePerHour: 50 });
            setSuccessMessage('Slot is added successfully .');
            setTimeout(() => setSuccessMessage(''), 2000);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create slot');
        }
    };

    const handleDeleteSlot = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await API.delete(`/slots/${id}`);
            fetchSlots();
            setSuccessMessage('Slot is deleted successfully .');
            setTimeout(() => setSuccessMessage(''), 2000);
        } catch (error) {
            alert('Failed to delete slot');
        }
    };

    const handleUpdateSlot = async () => {
        if (!editSlot) return;
        try {
            await API.put(`/slots/${editSlot._id}`, {
                slotNumber: editSlot.slotNumber,
                type: editSlot.type,
                pricePerHour: editSlot.pricePerHour,
                isDisabled: editSlot.isDisabled
            });
            setShowEditModal(false);
            fetchSlots();
        } catch (error) {
            alert('Update failed');
        }
    };

    const fetchUsers = async () => {
        try {
            console.log("Fetching users...");
            const { data } = await API.get('/users');
            console.log("Users fetched:", data);
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users', error.response || error);
            if (error.response && error.response.status === 401) {
                alert("You are not authorized as an admin to view users.");
            }
        }
    };

    const handleToggleUserStatus = async (userId) => {
        try {
            const { data } = await API.put(`/users/${userId}/status`);
            setSuccessMessage(`User status updated to ${data.status}`);
            setTimeout(() => setSuccessMessage(''), 2000);
            fetchUsers();
        } catch (error) {
            alert('Failed to update user status');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you certain you want to delete this user? This action cannot be undone.')) return;
        try {
            await API.delete(`/users/${userId}`);
            setSuccessMessage('User deleted successfully.');
            setTimeout(() => setSuccessMessage(''), 2000);
            fetchUsers();
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const handleUpdateUser = async () => {
        if (!editUser) return;
        try {
            await API.put(`/users/${editUser._id}`, {
                name: editUser.name,
                email: editUser.email,
                role: editUser.role,
                password: editUser.password || undefined
            });
            setShowEditUserModal(false);
            setSuccessMessage('User details updated successfully.');
            setTimeout(() => setSuccessMessage(''), 2000);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.message || 'Update failed');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUserTerm.toLowerCase())
    );

    const handleExport = async () => {
        try {
            const response = await API.get('/bookings/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'bookings_report.csv');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            alert('Export failed');
        }
    };

    // Chart Data Construction
    const revenueData = {
        labels: analytics?.dailyRevenue?.map(d => d._id) || [],
        datasets: [{
            label: 'Daily Revenue',
            data: analytics?.dailyRevenue?.map(d => d.dailyTotal) || [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.3
        }]
    };

    const vehicleData = {
        labels: analytics?.vehicleTypeStats?.map(s => s._id) || [],
        datasets: [{
            data: analytics?.vehicleTypeStats?.map(s => s.count) || [],
            backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
            hoverOffset: 4
        }]
    };

    // Peak Hours Data (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const peakData = {
        labels: hours.map(h => `${h}:00`),
        datasets: [{
            label: 'Bookings by Hour',
            data: hours.map(h => analytics?.peakHours?.find(p => p._id === h)?.count || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }]
    };

    return (
        <Container className="py-5 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <h1 className="h2 fw-bold d-flex align-items-center gap-2">
                    <ShieldCheck className="text-primary" /> Admin Dashboard
                </h1>
                <div className="d-flex gap-2">
                    <Button variant="outline-success" onClick={handleExport} className="d-flex align-items-center gap-2">
                        <Download size={18} /> Export CSV
                    </Button>
                    <Form.Select style={{ width: 150 }} value={timeRange} onChange={e => setTimeRange(e.target.value)}>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">3 Months</option>
                        <option value="half">6 Months</option>
                        <option value="year">1 Year</option>
                    </Form.Select>
                </div>
            </div>

            {/* Key Metrics */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 h-100 p-3">
                        <div className="text-muted small text-uppercase fw-bold">Occupancy Rate</div>
                        <div className="display-6 fw-bold text-primary mt-2">{analytics.occupancyRate}%</div>
                        <ProgressBar now={analytics.occupancyRate} variant={analytics.occupancyRate > 90 ? "danger" : "success"} className="mt-2" style={{ height: 5 }} />
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 h-100 p-3">
                        <div className="text-muted small text-uppercase fw-bold">Active Parking</div>
                        <div className="display-6 fw-bold text-success mt-2">{analytics.activeBookings}</div>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 h-100 p-3">
                        <div className="text-muted small text-uppercase fw-bold">Total Revenue</div>
                        <div className="display-6 fw-bold text-warning mt-2">₹{analytics.totalRevenue}</div>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 h-100 p-3">
                        <div className="text-muted small text-uppercase fw-bold">Total Bookings</div>
                        <div className="display-6 fw-bold text-info mt-2">{analytics.totalBookings}</div>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="analytics" className="mb-4">
                <Tab eventKey="analytics" title="Deep Analytics">
                    <Row className="g-4 mb-4">
                        <Col lg={8}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0 pt-4 px-4 h5 fw-bold">Revenue Trend</Card.Header>
                                <Card.Body>
                                    <Line options={{ responsive: true, plugins: { legend: { position: 'top' } } }} data={revenueData} />
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0 pt-4 px-4 h5 fw-bold">Vehicle Distribution</Card.Header>
                                <Card.Body className="d-flex align-items-center justify-content-center">
                                    <div style={{ maxHeight: 250, maxWidth: 250 }}>
                                        <Doughnut data={vehicleData} />
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    <Row className="g-4 mb-4">
                        <Col lg={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0 pt-4 px-4 h5 fw-bold">Peak Hours Heatmap</Card.Header>
                                <Card.Body>
                                    <Bar options={{ responsive: true }} data={peakData} />
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0 pt-4 px-4 h5 fw-bold">Most Used Slots</Card.Header>
                                <Card.Body>
                                    <Table hover>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Slot Number</th>
                                                <th>Total Bookings</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics?.slotUsage?.map((slot, index) => (
                                                <tr key={index}>
                                                    <td><Badge bg={index < 3 ? 'warning' : 'secondary'} text={index < 3 ? 'dark' : 'light'}>#{index + 1}</Badge></td>
                                                    <td className="fw-bold">{slot.slotNumber}</td>
                                                    <td>{slot.count}</td>
                                                </tr>
                                            ))}
                                            {(!analytics?.slotUsage || analytics.slotUsage.length === 0) && (
                                                <tr><td colSpan="3" className="text-center text-muted">No data available</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Recent Transactions with Drill-down */}
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 pt-4 px-4 h5 fw-bold">Recent Transactions</Card.Header>
                        <Card.Body>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Slot</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics?.recentTransactions?.map(tx => (
                                        <tr key={tx._id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedTransaction(tx); setShowTransactionModal(true); }}>
                                            <td>{tx.user?.name || 'Unknown'}</td>
                                            <td>{tx.slot?.slotNumber}</td>
                                            <td className="text-success fw-bold">₹{tx.totalAmount?.toFixed(2)}</td>
                                            <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <Button size="sm" variant="outline-dark">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!analytics?.recentTransactions || analytics.recentTransactions.length === 0) && (
                                        <tr><td colSpan="5" className="text-center text-muted">No recent transactions</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="manage" title="Manage Parking">
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="px-4">
                            <div className="bg-light p-3 rounded mb-4 border">
                                <h6 className="text-uppercase text-muted small fw-bold mb-3">Add New Slot</h6>
                                <Row className="g-2">
                                    <Col xs={12} md={4}>
                                        <Form.Control
                                            placeholder="Slot No."
                                            value={newSlot.slotNumber}
                                            onChange={(e) => setNewSlot({ ...newSlot, slotNumber: e.target.value })}
                                        />
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <Form.Select
                                            value={newSlot.type}
                                            onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                                        >
                                            <option value="Car">Car</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Bus">Bus</option>
                                            <option value="Truck">Truck</option>
                                        </Form.Select>
                                    </Col>
                                    <Col xs={8} md={3}>
                                        <InputGroup>
                                            <InputGroup.Text>₹</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                value={newSlot.pricePerHour}
                                                onChange={(e) => setNewSlot({ ...newSlot, pricePerHour: e.target.value })}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col xs="auto">
                                        <Button variant="success" onClick={handleCreateSlot}>
                                            <Plus size={20} />
                                        </Button>
                                    </Col>
                                </Row>
                            </div>

                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <Table hover responsive className="mb-0">
                                    <thead className="bg-light sticky-top">
                                        <tr>
                                            <th>Slot</th>
                                            <th>Type</th>
                                            <th>Price</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slots.map(slot => (
                                            <tr key={slot._id} className="align-middle">
                                                <td className="fw-bold">{slot.slotNumber}</td>
                                                <td>
                                                    <Badge bg={slot.type === 'Car' ? 'primary' : 'warning'} className="text-uppercase">
                                                        {slot.type}
                                                    </Badge>
                                                </td>
                                                <td>₹{slot.pricePerHour}/hr</td>
                                                <td>
                                                    {slot.isDisabled ? <Badge bg="secondary">Disabled</Badge> : <Badge bg="success">Active</Badge>}
                                                </td>
                                                <td>
                                                    <Button variant="outline-primary" size="sm" className="me-2"
                                                        onClick={() => { setEditSlot(slot); setShowEditModal(true); }}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteSlot(slot._id)}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="users" title="User Management">
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="px-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="mb-0 fw-bold">User Management</h5>
                                <InputGroup style={{ maxWidth: 300 }}>
                                    <InputGroup.Text className="bg-white"><Search size={18} /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search users..."
                                        value={searchUserTerm}
                                        onChange={(e) => setSearchUserTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </div>

                            <Table hover responsive className="align-middle">
                                <thead className="bg-light text-muted small text-uppercase">
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th className="text-center">Total Bookings</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user._id}>
                                            <td className="fw-bold">{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                {user.isAdmin ? <Badge bg="danger">Admin</Badge> :
                                                    user.isStaff ? <Badge bg="info">Staff</Badge> :
                                                        <Badge bg="secondary">User</Badge>}
                                            </td>
                                            <td className="text-center fw-bold">{user.totalBookings}</td>
                                            <td>
                                                <Badge bg={user.status === 'Blocked' ? 'danger' : 'success'}>
                                                    {user.status || 'Active'}
                                                </Badge>
                                            </td>
                                            <td className="text-end text-nowrap">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => {
                                                        const role = user.isAdmin ? 'Admin' : (user.isStaff ? 'Staff' : 'User');
                                                        setEditUser({ ...user, role, password: '' });
                                                        setShowEditUserModal(true);
                                                    }}
                                                    disabled={user.isAdmin} // Prevent editing other admins 
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant={user.status === 'Blocked' ? 'outline-success' : 'outline-warning'}
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleToggleUserStatus(user._id)}
                                                    disabled={user.isAdmin} // Prevent modifying other admins easily
                                                >
                                                    {user.status === 'Blocked' ? 'Unblock' : 'Block'}
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    disabled={user.isAdmin}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted">
                                                No users found matching "{searchUserTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Edit Slot Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Slot {editSlot?.slotNumber}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editSlot && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Vehicle Type</Form.Label>
                                <Form.Select
                                    value={editSlot.type}
                                    onChange={(e) => setEditSlot({ ...editSlot, type: e.target.value })}
                                >
                                    <option value="Car">Car</option>
                                    <option value="Bike">Bike</option>
                                    <option value="Bus">Bus</option>
                                    <option value="Truck">Truck</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Price Per Hour</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={editSlot.pricePerHour}
                                    onChange={(e) => setEditSlot({ ...editSlot, pricePerHour: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="switch"
                                    label="Disable Slot (Maintenance)"
                                    checked={editSlot.isDisabled}
                                    onChange={(e) => setEditSlot({ ...editSlot, isDisabled: e.target.checked })}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateSlot}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {/* Transaction Drill-down Modal */}
            <Modal show={showTransactionModal} onHide={() => setShowTransactionModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Booking Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTransaction && (
                        <div>
                            <p><strong>Booking ID:</strong> <span className="text-muted">{selectedTransaction._id}</span></p>
                            <p><strong>User:</strong> {selectedTransaction.user?.name}</p>
                            <p><strong>Slot:</strong> {selectedTransaction.slot?.slotNumber} <Badge bg="info">{selectedTransaction.slot?.type}</Badge></p>
                            <hr />
                            <p><strong>Start Time:</strong> {new Date(selectedTransaction.startTime).toLocaleString()}</p>
                            <p><strong>End Time:</strong> {new Date(selectedTransaction.endTime).toLocaleString()}</p>
                            <p><strong>Duration:</strong> {((new Date(selectedTransaction.endTime) - new Date(selectedTransaction.startTime)) / 3600000).toFixed(1)} hrs</p>
                            <hr />
                            <p><strong>Total Amount:</strong> <span className="lead fw-bold text-success">₹{selectedTransaction.totalAmount}</span></p>
                            <p><strong>Status:</strong> <Badge bg={selectedTransaction.status === 'Active' ? 'success' : 'secondary'}>{selectedTransaction.status}</Badge></p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTransactionModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Edit User Modal */}
            <Modal show={showEditUserModal} onHide={() => setShowEditUserModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit User</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editUser && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editUser.name}
                                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={editUser.email}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select
                                    value={editUser.role}
                                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Staff">Staff</option>
                                    <option value="User">User</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>New Password (Optional, leave blank to keep current)</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter new password"
                                    value={editUser.password}
                                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditUserModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateUser}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {/* Success Popup */}
            {successMessage && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1050 }}>
                    <Alert variant="success" className="shadow d-flex align-items-center">
                        <CheckCircle className="me-2" size={20} />
                        {successMessage}
                    </Alert>
                </div>
            )}
        </Container>
    );
};

export default AdminDashboard;
