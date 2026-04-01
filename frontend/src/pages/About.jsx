import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Target, Users, Zap, Shield } from 'lucide-react';

const About = () => {
    return (
        <div className="bg-light min-vh-100">
            {/* Hero Section */}
            <div className="bg-primary text-white py-5 mb-5">
                <Container className="text-center py-5">
                    <h1 className="display-4 fw-bold mb-3">About Us</h1>
                    <p className="lead opacity-90 mx-auto" style={{ maxWidth: '700px' }}>
                        Transforming campus mobility with smart, efficient, and secure parking solutions.
                    </p>
                </Container>
            </div>

            <Container className="mb-5 pb-4">
                {/* Our Mission */}
                <Row className="justify-content-center mb-5">
                    <Col lg={8} className="text-center">
                        <div className="mb-3 d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle p-3">
                            <Target size={32} />
                        </div>
                        <h2 className="fw-bold mb-3">Our Mission</h2>
                        <p className="text-muted fs-5">
                            Our mission is to eliminate the stress of finding parking on campus. By leveraging real-time
                            data and smart technology, we aim to optimize space utilization, reduce congestion,
                            and provide a seamless experience for students, faculty, and visitors.
                        </p>
                    </Col>
                </Row>

                {/* Key Features / Values */}
                <Row className="g-4 mb-5">
                    <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm text-center p-4">
                            <Card.Body>
                                <div className="mb-3 text-warning">
                                    <Zap size={40} />
                                </div>
                                <h4 className="fw-bold mb-3">Efficiency</h4>
                                <p className="text-secondary">
                                    Save time with real-time slot availability. No more circling around looking for a spot.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm text-center p-4">
                            <Card.Body>
                                <div className="mb-3 text-success">
                                    <Shield size={40} />
                                </div>
                                <h4 className="fw-bold mb-3">Security</h4>
                                <p className="text-secondary">
                                    Your vehicle's safety is our priority. Secure entry with QR codes and monitored zones.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm text-center p-4">
                            <Card.Body>
                                <div className="mb-3 text-info">
                                    <Users size={40} />
                                </div>
                                <h4 className="fw-bold mb-3">Community</h4>
                                <p className="text-secondary">
                                    Built for the campus community, ensuring fair access and organized parking for everyone.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Our Story / Team */}
                <div className="bg-white p-5 rounded-4 shadow-sm">
                    <Row className="align-items-center">
                        <Col lg={6} className="mb-4 mb-lg-0">
                            <h3 className="fw-bold mb-3">Our Story</h3>
                            <p className="text-secondary mb-4">
                                "Campus Parking" started as a college project driven by the frustration of overcrowded parking lots.
                                We realized that the problem wasn't just a lack of space, but a lack of efficient management.
                            </p>
                            <p className="text-secondary">
                                Today, it has evolved into a comprehensive system that handles bookings, payments, and live tracking,
                                setting a new standard for campus infrastructure management.
                            </p>
                        </Col>
                        <Col lg={6} className="text-center">
                            <div className="position-relative">
                                <img
                                    src="pic1.jpg"
                                    alt="Our Team"
                                    className="img-fluid rounded-4 shadow-sm"
                                    style={{
                                        maxHeight: '400px',
                                        width: '100%',
                                        objectFit: 'cover',
                                        border: '1px solid rgba(0,0,0,0.05)'
                                    }}
                                />
                                <div className="mt-3 text-muted small d-flex align-items-center justify-content-center">
                                    <Users size={16} className="me-2" />
                                    <span>Designed & Built by the Tech Team</span>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </Container>
        </div>
    );
};

export default About;
