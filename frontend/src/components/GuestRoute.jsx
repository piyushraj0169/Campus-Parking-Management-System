import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const GuestRoute = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (user) {
        if (user.isAdmin) return <Navigate to="/admin" replace />;
        if (user.isStaff) return <Navigate to="/staff-dashboard" replace />;
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
};

export default GuestRoute;
