import { ServerBootstrap } from './serverBootstrap';

async function bootstrap() {
    await ServerBootstrap.getInstance().start();
}

bootstrap();
