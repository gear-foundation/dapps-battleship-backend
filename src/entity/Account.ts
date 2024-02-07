import { HexString } from '@gear-js/api';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Accounts {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  account!: string;

  @Column()
  programId!: string;

  @Column()
  voucherId!: string;

  @Column()
  validForOneHour!: number;
}
