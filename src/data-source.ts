import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Accounts } from './entity/Account';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Accounts],
  synchronize: true,
  logging: false,
});
