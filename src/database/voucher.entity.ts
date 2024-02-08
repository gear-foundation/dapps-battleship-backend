import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Voucher {
  constructor(props: Voucher) {
    Object.assign(this, props);
  }

  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ name: 'voucher_id', nullable: false, unique: true })
  voucherId: string;

  @Column({ nullable: false, unique: true })
  account: string;

  @Column({ type: 'jsonb' })
  programs: string[];

  @Column({ name: 'created_at', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @Column({ type: 'bigint', name: 'valid_up_to_block', nullable: false })
  validUpToBlock: bigint;

  @Column({ name: 'valid_up_to', type: 'timestamp without time zone', nullable: false })
  validUpTo: Date;
}
