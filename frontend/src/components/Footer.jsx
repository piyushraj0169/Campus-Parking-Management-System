import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Heart } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer bg-dark text-light pt-5 pb-3 mt-auto">
            <Container>
                <Row className="gy-4">
                    <Col lg={4} md={6}>
                        <h5 className="footer-title text-uppercase mb-3 fw-bold text-primary">Campus Parking</h5>
                        <p className="text-secondary small">
                            Campus Parking is your smart solution for hassle-free vehicle management. We provide real-time slot tracking, secure QR-based bookings, and seamless payments to ensure a smooth parking experience for students and staff.
                        </p>
                        <div className="d-flex gap-3 mt-3">
                            <a href="#" className="social-icon"><Facebook size={20} /></a>
                            <a href="#" className="social-icon"><Twitter size={20} /></a>
                            <a href="#" className="social-icon"><Instagram size={20} /></a>
                            <a href="https://www.linkedin.com/in/piyushraj0169" className="social-icon"><Linkedin size={20} /></a>
                        </div>
                    </Col>
                    <Col lg={2} md={6}>
                        <h5 className="footer-title text-uppercase mb-3 fw-bold">Quick Links</h5>
                        <ul className="list-unstyled footer-links">
                            <li><Link to="/" className="footer-link">Home</Link></li>
                            <li><Link to="/dashboard" className="footer-link">Dashboard</Link></li>
                            <li><Link to="/profile" className="footer-link">Profile</Link></li>
                            <li><Link to="/about" className="footer-link">About Us</Link></li>
                        </ul>
                    </Col>
                    <Col lg={3} md={6}>
                        <h5 className="footer-title text-uppercase mb-3 fw-bold">Contact Us</h5>
                        <ul className="list-unstyled footer-contact">
                            <li className="mb-2 d-flex align-items-center gap-2">
                                <MapPin size={18} className="text-primary" />
                                <span className="text-secondary">CGC University, Mohali</span>
                            </li>
                            <li className="mb-2 d-flex align-items-center gap-2">
                                <Phone size={18} className="text-primary" />
                                <span className="text-secondary">+91 2330169000</span>
                            </li>
                            <li className="mb-2 d-flex align-items-center gap-2">
                                <Mail size={18} className="text-primary" />
                                <span className="text-secondary">support@campusparking.com</span>
                            </li>
                        </ul>
                    </Col>
                    <Col lg={3} md={6}>
                        <h5 className="footer-title text-uppercase mb-3 fw-bold">Newsletter</h5>
                        <p className="text-secondary small">Subscribe to get the latest updates and offers.</p>
                        <form className="d-flex mt-2">
                            <input type="email" className="form-control form-control-sm me-2" placeholder="Your email" />
                            <button className="btn btn-primary btn-sm" type="button">Subscribe</button>
                        </form>
                    </Col>
                </Row>
                <hr className="my-4 border-secondary opacity-25" />
                <div className="text-center text-secondary small">
                    <p className="mb-0">
                        &copy; {currentYear} Campus Parking. All rights reserved. Made with <Heart size={14} className="text-danger mx-1 fill-current" /> by the Tech Team.
                    </p>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;
