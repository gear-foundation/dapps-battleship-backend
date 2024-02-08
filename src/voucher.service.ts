import { GearApi, HexString, IUpdateVoucherParams, VoucherIssuedData, VoucherUpdatedData } from '@gear-js/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { waitReady } from '@polkadot/wasm-crypto';
import { hexToU8a } from '@polkadot/util';

import config from './config';
import { Keyring } from '@polkadot/api';
import { In, Repository } from 'typeorm';
import { AppDataSource, Voucher } from './database';

export class VoucherService {
  private _api: GearApi;
  private _account: KeyringPair;
  private _repo: Repository<Voucher>;

  constructor() {
    this._api = new GearApi({ providerAddress: config.gear.node });
    this._repo = AppDataSource.getRepository(Voucher);
  }

  async init() {
    await Promise.all([this._api.isReadyOrError, waitReady()]);
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 137 });
    const seed = config.gear.seed;
    if (seed.startsWith('0x')) {
      this._account = keyring.addFromSeed(hexToU8a(seed));
    } else if (seed.startsWith('//')) {
      this._account = keyring.addFromUri(seed);
    } else {
      this._account = keyring.addFromMnemonic(seed);
    }
    return this;
  }

  async issue(account: HexString, programId: HexString, amount: number, duration: number): Promise<string> {
    const { extrinsic } = await this._api.voucher.issue(account, amount * 1e12, duration, [programId]);

    const [voucherId, blockHash] = await new Promise<[HexString, HexString]>((resolve, reject) =>
      extrinsic.signAndSend(this._account, ({ events, status }) => {
        if (status.isInBlock) {
          const viEvent = events.find(({ event }) => event.method === 'VoucherIssued');
          if (viEvent) {
            const data = viEvent.event.data as VoucherIssuedData;
            resolve([data.voucherId.toHex(), status.asInBlock.toHex()]);
          } else {
            const efEvent = events.find(({ event }) => event.method === 'ExtrinsicFailed');

            reject(efEvent ? this._api.getExtrinsicFailedError(efEvent?.event) : 'VoucherIssued event not found');
          }
        }
      }),
    );

    const blockNumber = (await this._api.blocks.getBlockNumber(blockHash)).toNumber();
    const validUpToBlock = BigInt(blockNumber + duration);
    const validUpTo = new Date(Date.now() + duration * 3 * 1000);

    await this._repo.save(new Voucher({ account, voucherId, validUpToBlock, validUpTo, programs: [programId] }));

    return voucherId;
  }

  async update(voucher: Voucher, balance: number, prolongDuration?: number, addPrograms?: HexString[]) {
    const voucherBalance = (await this._api.balance.findOut(voucher.voucherId)).toBigInt() / BigInt(1e12);

    const topUp = BigInt(balance) - voucherBalance;

    const params: IUpdateVoucherParams = {};

    if (prolongDuration) {
      params.prolongDuration = prolongDuration;
    }
    if (addPrograms) {
      params.appendPrograms = addPrograms;
      voucher.programs.push(...addPrograms);
    }
    if (topUp > 0) {
      params.balanceTopUp = topUp * BigInt(1e12);
    }

    const tx = this._api.voucher.update(voucher.account, voucher.voucherId, params);

    const blockHash = await new Promise<HexString>((resolve, reject) =>
      tx.signAndSend(this._account, ({ events, status }) => {
        if (status.isInBlock) {
          const vuEvent = events.find(({ event }) => event.method === 'VoucherUpdated');
          if (vuEvent) {
            const data = vuEvent.event.data as VoucherUpdatedData;
            resolve(status.asInBlock.toHex());
          } else {
            const efEvent = events.find(({ event }) => event.method === 'ExtrinsicFailed');

            reject(efEvent ? this._api.getExtrinsicFailedError(efEvent?.event) : 'VoucherUpdated event not found');
          }
        }
      }),
    );

    if (prolongDuration) {
      const blockNumber = (await this._api.blocks.getBlockNumber(blockHash)).toNumber();
      const validUpToBlock = BigInt(blockNumber + prolongDuration);
      const validUpTo = new Date(Date.now() + prolongDuration * 3 * 1000);
      voucher.validUpToBlock = validUpToBlock;
      voucher.validUpTo = validUpTo;
    }

    await this._repo.save(voucher);
  }

  async getVoucher(account: string, program: string): Promise<Voucher | null> {
    const voucher = await this._repo.findOneBy({ account });

    if (!voucher) {
      return null;
    }

    return voucher;
  }
}
