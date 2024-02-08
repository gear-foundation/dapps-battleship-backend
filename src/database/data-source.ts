import { DataSource } from 'typeorm';
import config from '../config';
import { Voucher } from './voucher.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.user,
  database: config.db.database,
  password: config.db.password,
  entities: [Voucher],
  synchronize: true,
});
