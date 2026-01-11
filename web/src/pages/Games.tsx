import { Container } from '../components/ui/container';

export default function Games() {
    return (
        <Container>
            <h1 className="text-4xl font-bold mb-8">Recent Games</h1>
            <p>Game data will be loaded from Firestore here.</p>
        </Container>
    );
}
