import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { Sun, Moon } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import NotificationBell from './NotificationBell';

const NavigationBar = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Navbar bg={theme === 'dark' ? 'dark' : 'primary'} variant="dark" expand="lg" sticky="top" className="shadow-sm" collapseOnSelect>
            <Container>
                <img src="/favicon.svg" alt="Campus Parking Logo" width="40" height="40" className="d-inline-block align-top ms-2" />

                &nbsp;
                <Navbar.Brand as={Link} to="/" className="fw-bold">
                    Campus Parking
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">
                        {user ? (
                            <>
                                <span className="text-light me-3">Welcome, {user.name}</span>
                                {user.isAdmin && (
                                    <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
                                )}
                                {user.isStaff && !user.isAdmin && (
                                    <Nav.Link as={Link} to="/staff-dashboard">Staff</Nav.Link>
                                )}
                                <Nav.Link as={Link} to="/profile" eventKey="profile">Profile</Nav.Link>
                                <Nav.Link as={Link} to="/dashboard" eventKey="dashboard">Dashboard</Nav.Link>
                                <NotificationBell />
                                <Button variant="danger" size="sm" onClick={handleLogout} className="ms-2 rounded-pill px-3">
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                                <Button as={Link} to="/register" variant="warning" size="sm" className="ms-2 rounded-pill px-3 fw-bold text-dark">
                                    Register
                                </Button>
                            </>
                        )}
                        <Button
                            variant={theme === 'dark' ? 'outline-light' : 'outline-light'}
                            onClick={toggleTheme}
                            className="ms-3 rounded-circle p-2 d-flex align-items-center justify-content-center"
                            style={{ width: '38px', height: '38px', border: 'none' }}
                            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </Button>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;
