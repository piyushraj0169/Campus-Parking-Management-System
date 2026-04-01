import axios from 'axios';

// Use the environment variable if available, otherwise fallback to window.location.hostname
const baseURL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

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
