import { ServerBootstrap } from './server-bootstrap';

async function bootstrap() {
    await ServerBootstrap.getInstance().start();
}

bootstrap();
