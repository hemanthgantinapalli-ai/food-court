
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

async function testDemoAuth() {
    const demos = [
        { name: "Admin", email: 'admin@foodcourt.com', pass: 'admin123' },
        { name: "Rider", email: 'rider@foodcourt.com', pass: 'rider123' }
    ];

    for (const demo of demos) {
        console.log(`Testing ${demo.name} login...`);
        try {
            const loginRes = await api.post('/auth/login', { email: demo.email, password: demo.pass });
            console.log(`${demo.name} Success:`, loginRes.data.user);
        } catch (error) {
            console.error(`${demo.name} Fail:`, error.response?.data || error.message);
        }
    }
}

testDemoAuth();
