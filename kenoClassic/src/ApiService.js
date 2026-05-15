export class ApiService {
    static async draw(selectedNumbers) {
        try {
            const response = await fetch('http://localhost:3001/api/draw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ selectedNumbers }),
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}
