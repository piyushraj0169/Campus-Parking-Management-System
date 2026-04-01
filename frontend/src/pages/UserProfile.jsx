import { useState, useEffect, useContext } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { User, Car, Save, Phone, Mail, Hash } from 'lucide-react';
import API from '../api';
import AuthContext from '../context/AuthContext';

const UserProfile = () => {
    const { user: authUser, login } = useContext(AuthContext);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        vehicles: []
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // New Vehicle State
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ name: '', model: '', number: '', type: 'Car' });
    const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await API.get('/users/profile');
                // Handle legacy 'vehicle' object if 'vehicles' is empty? 
                // The backend now returns 'vehicles' array. 
                // If the user was migrated, they might have empty vehicles if I didn't migrate data.
                // But for new/updated users it works.
                setProfile({
                    ...data,
                    phoneNumber: data.phoneNumber || '+91 ',
                    vehicles: data.vehicles || (data.vehicle ? [data.vehicle] : [])
                });
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load profile');
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (value.length < 4) {
            setProfile({ ...profile, phoneNumber: '+91 ' });
        } else if (value.length <= 14 && /^\+91 \d*$/.test(value)) {
            setProfile({ ...profile, phoneNumber: value });
        }
    };

    const handleVehicleChange = (e, index) => {
        const { name, value } = e.target;
        const updatedVehicles = [...profile.vehicles];
        updatedVehicles[index] = { ...updatedVehicles[index], [name]: value };
        setProfile({ ...profile, vehicles: updatedVehicles });
    };

    const handleNewVehicleChange = (e) => {
        const { name, value } = e.target;
        setNewVehicle({ ...newVehicle, [name]: value });
    };

    const addVehicle = () => {
        if (!newVehicle.name || !newVehicle.model || !newVehicle.number) {
            alert("All vehicle fields are required");
            return;
        }
        setProfile({ ...profile, vehicles: [...profile.vehicles, newVehicle] });
        setNewVehicle({ name: '', model: '', number: '', type: 'Car' });
        setShowAddVehicle(false);
    };

    const removeVehicle = (index) => {
        const updatedVehicles = profile.vehicles.filter((_, i) => i !== index);
        setProfile({ ...profile, vehicles: updatedVehicles });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setMessage(null);
        // Check for unsaved new vehicle
        if (showAddVehicle && (newVehicle.name || newVehicle.model || newVehicle.number)) {
            const confirmAdd = window.confirm("You have entered details for a new vehicle but didn't click 'Add to List'. Do you want to include this vehicle?");
            if (confirmAdd) {
                if (!newVehicle.name || !newVehicle.model || !newVehicle.number) {
                    setError("Please complete all vehicle details before saving.");
                    setUpdating(false);
                    return;
                }
                // Determine the updated vehicles list locally for submission
                const updatedVehicles = [...profile.vehicles, newVehicle];

                // Submit with the new vehicle included
                try {
                    const { data } = await API.put('/users/profile', {
                        phoneNumber: profile.phoneNumber,
                        vehicles: updatedVehicles
                    });

                    setProfile({
                        ...data,
                        phoneNumber: data.phoneNumber || '',
                        vehicles: data.vehicles || []
                    });

                    setMessage('Profile updated successfully (including new vehicle)!');
                    setUpdating(false);
                    setEditingVehicleIndex(null);
                    setNewVehicle({ name: '', model: '', number: '' });
                    setShowAddVehicle(false);
                    return; // Exit here as we handled the submission
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to update profile');
                    setUpdating(false);
                    return;
                }
            } else {
                // User said No, just ignore the new vehicle form? Or cancel?
                // Let's assume they want to discard or just proceed with existing.
                // Continuing will trigger the standard submit below.
            }
        }

        try {
            const { data } = await API.put('/users/profile', {
                phoneNumber: profile.phoneNumber,
                vehicles: profile.vehicles
            });

            setProfile({
                ...data,
                phoneNumber: data.phoneNumber || '',
                vehicles: data.vehicles || []
            });

            setMessage('Profile updated successfully!');
            setUpdating(false);
            setEditingVehicleIndex(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <Container className="py-5">
            <h2 className="mb-4 fw-bold text-secondary border-bottom pb-2">User Profile</h2>

            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-primary text-white py-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <User size={20} /> Personal Details
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <Form onSubmit={handleSubmit}>
                                {/* Read Only Fields */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-muted small">Full Name</Form.Label>
                                    <div className="d-flex align-items-center gap-2 fs-5 fw-bold text-dark">
                                        <User size={18} className="text-primary" /> {profile.name}
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-muted small">Email Address</Form.Label>
                                    <div className="d-flex align-items-center gap-2 fs-5 text-dark">
                                        <Mail size={18} className="text-primary" /> {profile.email}
                                    </div>
                                </Form.Group>

                                {/* Editable Phone Number */}
                                <Form.Group className="mb-4">
                                    <Form.Label className="text-muted small">Phone Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={profile.phoneNumber}
                                        onChange={handlePhoneChange}
                                        placeholder="Enter phone number"
                                    />
                                </Form.Group>

                                <hr className="my-4" />

                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <h5 className="mb-0 d-flex align-items-center gap-2 text-secondary">
                                        <Car size={20} /> Vehicle Details
                                    </h5>
                                    <Button variant="outline-primary" size="sm" onClick={() => setShowAddVehicle(!showAddVehicle)}>
                                        {showAddVehicle ? 'Cancel Add' : '+ Add Vehicle'}
                                    </Button>
                                </div>

                                {/* List of Vehicles */}
                                {profile.vehicles.map((v, index) => (
                                    <div key={index} className="bg-light p-3 rounded mb-3 position-relative border">
                                        <div className="d-flex flex-column flex-sm-row justify-content-between">
                                            <span className="fw-bold mb-2 mb-sm-0">{v.name} ({v.model}) - <span className="text-secondary small">{v.type || 'Car'}</span></span>
                                            <div>
                                                <Button variant="link" size="sm" className="text-primary p-0 me-2" onClick={() => setEditingVehicleIndex(index === editingVehicleIndex ? null : index)}>
                                                    {editingVehicleIndex === index ? 'Done' : 'Edit'}
                                                </Button>
                                                <Button variant="link" size="sm" className="text-danger p-0" onClick={() => removeVehicle(index)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="small text-muted">{v.number}</div>

                                        {editingVehicleIndex === index && (
                                            <div className="mt-2 pt-2 border-top">
                                                <Row className="g-2">
                                                    <Col xs={12} sm={3}>
                                                        <Form.Control size="sm" name="name" value={v.name} onChange={(e) => handleVehicleChange(e, index)} placeholder="Name" />
                                                    </Col>
                                                    <Col xs={6} sm={3}>
                                                        <Form.Control size="sm" name="model" value={v.model} onChange={(e) => handleVehicleChange(e, index)} placeholder="Model" />
                                                    </Col>
                                                    <Col xs={6} sm={3}>
                                                        <Form.Control size="sm" name="number" value={v.number} onChange={(e) => handleVehicleChange(e, index)} placeholder="Number" />
                                                    </Col>
                                                    <Col xs={12} sm={3}>
                                                        <Form.Select size="sm" name="type" value={v.type} onChange={(e) => handleVehicleChange(e, index)}>
                                                            <option value="Car">Car</option>
                                                            <option value="Bike">Bike</option>
                                                            <option value="Bus">Bus</option>
                                                            <option value="Truck">Truck</option>
                                                        </Form.Select>
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add New Vehicle Form */}
                                {showAddVehicle && (
                                    <div className="bg-info bg-opacity-10 p-3 rounded mb-3 border border-info">
                                        <h6 className="text-info fw-bold mb-2">New Vehicle</h6>
                                        <Row className="g-2 mb-2">
                                            <Col md={12}>
                                                <Form.Control size="sm" name="name" value={newVehicle.name} onChange={handleNewVehicleChange} placeholder="Vehicle Name (e.g. BMW)" />
                                            </Col>
                                            <Col md={6}>
                                                <Form.Control size="sm" name="model" value={newVehicle.model} onChange={handleNewVehicleChange} placeholder="Model (e.g. X5)" />
                                            </Col>
                                            <Col md={6}>
                                                <Form.Control size="sm" name="number" value={newVehicle.number} onChange={handleNewVehicleChange} placeholder="Plate Number" />
                                            </Col>
                                            <Col md={6}>
                                                <Form.Select size="sm" name="type" value={newVehicle.type} onChange={handleNewVehicleChange}>
                                                    <option value="Car">Car</option>
                                                    <option value="Bike">Bike</option>
                                                    <option value="Bus">Bus</option>
                                                    <option value="Truck">Truck</option>
                                                </Form.Select>
                                            </Col>
                                        </Row>
                                        <Button size="sm" variant="info" className="text-white w-100" onClick={addVehicle}>
                                            Add to List
                                        </Button>
                                    </div>
                                )}

                                <div className="d-grid mt-4">
                                    <Button variant="primary" type="submit" disabled={updating} size="lg">
                                        {updating ? <Spinner size="sm" animation="border" /> : <><Save size={18} className="me-2" /> Save Changes</>}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default UserProfile;
