import axios from 'axios';

// Production backend URL — always use Render deployment
// VITE_API_URL env var can override this if needed
const PRODUCTION_API = 'https://campus-parking-management-system.onrender.com/api';

const baseURL = import.meta.env.VITE_API_URL || PRODUCTION_API;

const API = axios.create({
    baseURL,
});

API.interceptors.request.use((req) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            const parsed = JSON.parse(userInfo);
            if (parsed && parsed.token) {
                req.headers.Authorization = `Bearer ${parsed.token}`;
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
            // Optionally clear bad data
            localStorage.removeItem('userInfo');
        }
    }
    return req;
});

export default API;
