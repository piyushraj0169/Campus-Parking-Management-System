
import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const StaffRoute = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (user && (user.isStaff || user.isAdmin)) ? <Outlet /> : <Navigate to="/login" replace />;
};

export default StaffRoute;
