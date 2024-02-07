import { readFileSync } from 'fs';
import { GearApi, GearKeyring, VoucherIssued, VoucherUpdated, decodeAddress } from '@gear-js/api';
import { HexString } from '@polkadot/util/types';
import dotenv from 'dotenv';

dotenv.config();

const NODE_ADDRESS = process.env.NODE_ADDRESS;
const GAME_ADDRESS = process.env.GAME_ADDRESS;
const KEYRING_PATH = process.env.PATH_TO_KEYS || '';
const KEYRING_PASSPHRASE = process.env.KEYRING_PASSPHRASE;

const jsonKeyring = readFileSync(KEYRING_PATH).toString();
const KEYRING = GearKeyring.fromJson(jsonKeyring, KEYRING_PASSPHRASE);

interface CheckAndUpdateVoucherArgs {
  accountUser: string;
  voucherId: string;
}

export const createVoucher = async (
  accountUser: HexString,
): Promise<{ voucherId?: string; programId: HexString; validForOneHour: number }> => {
  const api = await GearApi.create({
    providerAddress: NODE_ADDRESS,
  });

  const expectedBlockTime = api.consts.babe.expectedBlockTime.toNumber() / 1000;
  const programId = GAME_ADDRESS as HexString;
  const account = decodeAddress(accountUser);
  const programs = [programId];
  const validForOneHour = (60 * 60) / expectedBlockTime; // number of blocks in one hour

  const amountForVoucher = 11 * 10 ** api.registry.chainDecimals[0];

  const { extrinsic } = await api.voucher.issue(account, amountForVoucher, validForOneHour, programs, true);

  return new Promise((resolve, reject) => {
    extrinsic.signAndSend(KEYRING, ({ events, status, isError }) => {
      if (status.isInBlock) {
        const findEvent = events.find(({ event: { method } }) => method === 'VoucherIssued');
        const voucherIssuedEvent = findEvent?.event as VoucherIssued;
        const voucherId = voucherIssuedEvent.data.voucherId.toHex();

        resolve({
          voucherId,
          programId,
          validForOneHour,
        });
      } else if (isError) {
        const error = new Error(`Failed to create voucher`);
        reject(error);
      }
    });
  });
};

export const checkAndUpdateVoucher = async ({ accountUser, voucherId }: CheckAndUpdateVoucherArgs) => {
  const api = await GearApi.create({ providerAddress: NODE_ADDRESS });
  const account = decodeAddress(accountUser);
  const balance = await api.balance.findOut(voucherId);
  const existentialDeposit = api.existentialDeposit;

  if (balance <= existentialDeposit) {
    return new Promise((resolve, reject) => {
      api.voucher
        .update(account, voucherId, { balanceTopUp: 11 * 10 ** 12 })
        .signAndSend(KEYRING, ({ events, status, isError }) => {
          if (status.isInBlock) {
            const findEvent = events.find(({ event: { method } }) => method === 'VoucherUpdated');
            const voucherUpdatedEvent = findEvent?.event as VoucherUpdated;
            const voucherId = voucherUpdatedEvent.data.voucherId.toHex();

            resolve(voucherId);
          } else if (isError) {
            reject(new Error('Failed to update voucher'));
          }
        });
    });
  } else {
    return new Promise((resolve, reject) => {
      resolve(voucherId);
    });
  }
};
