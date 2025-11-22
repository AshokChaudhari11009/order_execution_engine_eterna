import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type OrderType = 'limit';
export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tokenIn!: string;

  @Column({ type: 'varchar' })
  tokenOut!: string;

  @Column({ type: 'decimal', precision: 30, scale: 10 })
  amountIn!: string; // store as string to avoid float issues

  @Column({ type: 'decimal', precision: 30, scale: 10 })
  limitPrice!: string;

  @Column({ type: 'varchar', default: 'limit' })
  type!: OrderType;

  @Column({ type: 'varchar', default: 'pending' })
  status!: OrderStatus;

  @Column({ type: 'varchar', nullable: true })
  chosenDex?: string | null;

  @Column({ type: 'varchar', nullable: true })
  txHash?: string | null;

  @Column({ type: 'decimal', precision: 30, scale: 10, nullable: true })
  executedPrice?: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
