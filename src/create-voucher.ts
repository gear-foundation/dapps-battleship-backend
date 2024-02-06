import { readFileSync } from 'fs';
import { GearApi, GearKeyring, decodeAddress } from '@gear-js/api';
import { HexString } from '@polkadot/util/types';
import { EventRecord } from '@polkadot/types/interfaces';
import dotenv from 'dotenv';

dotenv.config();

const NODE_ADDRESS = process.env.NODE_ADDRESS;
const GAME_ADDRESS = process.env.GAME_ADDRESS;
const KEYRING_PATH = process.env.PATH_TO_KEYS || '';
const KEYRING_PASSPHRASE = process.env.KEYRING_PASSPHRASE;

const jsonKeyring = readFileSync(KEYRING_PATH).toString();
const KEYRING = GearKeyring.fromJson(jsonKeyring, KEYRING_PASSPHRASE);

export const createVoucher = async (accountUser: HexString) => {
  const api = await GearApi.create({
    providerAddress: NODE_ADDRESS,
  });

  const expectedBlockTime = api.consts.babe.expectedBlockTime.toNumber() / 1000;
  const programId = GAME_ADDRESS as HexString;
  const account = decodeAddress(accountUser);
  const programs = [programId];
  const validForOneHour = (60 * 60) / expectedBlockTime; // number of blocks in one hour

  const amountForVoucher = 15 * 10 ** api.registry.chainDecimals[0];

  const voucherExists = await api.voucher.exists(account, programId);

  if (voucherExists) {
    const voucherId = await updateVoucher(api, account, amountForVoucher);

    return new Promise((resolve) => {
      resolve({
        voucherId,
        programId,
        validForOneHour,
      });
    });
  }

  const { voucherId, extrinsic } = await api.voucher.issue(account, amountForVoucher, validForOneHour, programs, true);

  return new Promise((resolve, reject) => {
    extrinsic.signAndSend(KEYRING, ({ events, status, isError }) => {
      if (status.isInBlock) {
        const voucherIssuedEvent = events.filter(({ event: { method } }) => method === 'VoucherIssued');

        if (voucherIssuedEvent.length > 0) {
          resolve({
            voucherId,
            programId,
            validForOneHour,
          });
        }
      } else if (isError) {
        const error = new Error(`Failed to create voucher`);
        reject(error);
      }
    });
  });
};

export const updateVoucher = async (api: GearApi, account: string, amountForVoucher: number) => {
  const getAccount = await api.voucher.getAllForAccount(account);

  const voucherId = Object.keys(getAccount)[0];

  const balance = await api.balance.findOut(voucherId);
  const existentialDeposit = api.existentialDeposit;

  if (balance <= existentialDeposit) {
    await api.voucher.update(account, voucherId, {
      balanceTopUp: amountForVoucher,
    });
  }

  return voucherId;
};
