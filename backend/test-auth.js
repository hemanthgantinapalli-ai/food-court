
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

async function testAuth() {
    const email = `test_${Date.now()}@test.com`;
    const password = "password123";

    try {
        console.log("Registering user...");
        const regRes = await api.post('/auth/register', { name: "Test User", email, password });
        console.log("Register Success:", regRes.data.user);

        console.log("Logging in user...");
        const loginRes = await api.post('/auth/login', { email, password });
        console.log("Login Success:", loginRes.data.user);
    } catch (error) {
        console.error("Auth Fail:", error.response?.data || error.message);
    }
}

testAuth();
