import { AppDataSource } from './database';
import { logger } from './logger';
import { Server } from './server';
import { VoucherService } from './voucher.service';

const main = async () => {
  await AppDataSource.initialize();
  const voucherService = await new VoucherService().init();

  const server = new Server(voucherService);

  server.run();
};

main().catch((error) => {
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  process.exit(1);
});
