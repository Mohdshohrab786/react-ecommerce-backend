const axios = require('axios');

async function test() {
    try {
        console.log('Sending forgot password request...');
        const res = await axios.post('http://localhost:5000/api/users/forgotpassword', {
            email: 'shohrab0000@gmail.com'
        });
        console.log('Forgot password response:', res.data);
        
        if (res.data.resetToken) {
            console.log('Resetting password with token:', res.data.resetToken);
            const resetRes = await axios.put(`http://localhost:5000/api/users/resetpassword/${res.data.resetToken}`, {
                password: 'newpassword123'
            });
            console.log('Reset password response:', resetRes.data);
        }
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

test();
