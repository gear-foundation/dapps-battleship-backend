import { HexString } from '@gear-js/api';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Accounts {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  account!: HexString;

  @Column()
  programId!: HexString;

  @Column()
  voucherId!: HexString;

  @Column()
  validForOneHour!: number;
}
