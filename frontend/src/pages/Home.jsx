import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Car, Bike, ShieldCheck, Clock } from 'lucide-react';

const Home = () => {
    return (
        <div className="min-vh-100 bg-light">
            {/* Hero Section */}
            <div className="bg-primary text-white py-5">
                <Container className="py-5">
                    <Row className="align-items-center">
                        <Col lg={6} md={12} className="mb-4 mb-lg-0 text-center text-lg-start">
                            <h1 className="display-4 fw-bold mb-3 fs-1 fs-md-1">
                                Smart Parking <br />
                                <span className="text-warning">Made Easy</span>
                            </h1>
                            <p className="lead mb-4 opacity-90">
                                Book your spot instantly, track real-time availability, and park hassle-free on campus.
                            </p>
                            <div className="d-flex gap-3 flex-column flex-sm-row justify-content-center justify-content-lg-start">
                                <Button
                                    as={Link}
                                    to="/login"
                                    variant="warning"
                                    size="lg"
                                    className="rounded-pill px-4 fw-bold text-dark shadow-sm w-100 w-sm-auto"
                                >
                                    Get Started
                                </Button>
                                <Button
                                    as={Link}
                                    to="/register"
                                    variant="outline-light"
                                    size="lg"
                                    className="rounded-pill px-4 fw-bold shadow-sm w-100 w-sm-auto"
                                >
                                    Create Account
                                </Button>
                            </div>
                        </Col>
                        <Col lg={6} md={12} className="d-flex justify-content-center">
                            <div className="position-relative w-100 ratio ratio-16x9 bg-dark rounded-4 shadow-lg overflow-hidden d-flex align-items-center justify-content-center">
                                {/* Placeholder for an image or illustration */}
                                <Car size={100} className="text-white opacity-25" />
                                <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-opacity-50 bg-black">
                                    <p className="text-white fw-semibold m-0 small fs-md-6">Real-time Availability Tracking</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Features Section */}
            <Container className="py-5">
                <h2 className="text-center fw-bold text-dark mb-5">Why Choose Us?</h2>
                <Row>
                    <Col lg={4} md={6} sm={12} className="mb-4">
                        <FeatureCard
                            icon={<Clock size={40} className="text-primary" />}
                            title="Real-Time Booking"
                            description="View live slot availability and book your spot in seconds."
                        />
                    </Col>
                    <Col lg={4} md={6} sm={12} className="mb-4">
                        <FeatureCard
                            icon={<ShieldCheck size={40} className="text-success" />}
                            title="Secure & Reliable"
                            description="QR-code based entry ensures only authorized vehicles park."
                        />
                    </Col>
                    <Col lg={4} md={6} sm={12} className="mb-4">
                        <FeatureCard
                            icon={<Car size={40} className="text-info" />}
                            title="Multiple Vehicle Types"
                            description="Dedicated slots for Cars and Bikes with tailored pricing."
                        />
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

// Helper Component for Feature Card
const FeatureCard = ({ icon, title, description }) => (
    <Card className="h-100 text-center p-4 border-0 shadow-sm bg-white rounded-4">
        <Card.Body>
            <div className="mb-3 bg-light d-inline-block p-3 rounded-circle">
                {icon}
            </div>
            <Card.Title className="fw-bold mb-2">{title}</Card.Title>
            <Card.Text className="text-muted">{description}</Card.Text>
        </Card.Body>
    </Card>
);

export default Home;
