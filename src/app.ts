import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import {
  GearApi,
  GearKeyring,
  decodeAddress,
} from "@gear-js/api";
import { HexString } from "@polkadot/util/types";
import { WsProvider } from "@polkadot/api";

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

const NODE_ADDRESS = process.env.NODE_ADDRESS;
const GAME_ADDRESS = process.env.GAME_ADDRESS;
const KEYRING_PATH = process.env.PATH_TO_KEYS || "";
const KEYRING_PASSPHRASE = process.env.KEYRING_PASSPHRASE;

const jsonKeyring = readFileSync(KEYRING_PATH).toString();
const KEYRING = GearKeyring.fromJson(jsonKeyring, KEYRING_PASSPHRASE);

const createVoucher = async (accountUser: HexString) => {
  const provider = new WsProvider(NODE_ADDRESS);
  const api = await GearApi.create({
    provider
  });

  const programId = GAME_ADDRESS as HexString;
  const account = decodeAddress(accountUser);

  const programs = [programId];
  const validForOneHour = (60 * 60) / 3; // number of blocks in one hour
  const amountForVoucher = 15 * 10 ** api.registry.chainDecimals[0];

  const voucherExists = await api.voucher.exists(account, programId)

  if (voucherExists) {
    const getAccount = await api.voucher.getAllForAccount(account);
    const voucherId = Object.keys(getAccount)[0];

    const balance = await api.balance.findOut(voucherId);
    const formattedBalance = Number(balance) / 10 ** api.registry.chainDecimals[0]
    const existentialDeposit = Number(api.existentialDeposit) / 10 ** api.registry.chainDecimals[0]

    if (formattedBalance <= existentialDeposit) {
      await api.voucher.update(account, voucherId, {
        balanceTopUp: amountForVoucher
      })
    }

    return new Promise((resolve, reject) => {
      resolve(voucherId)
    })
  }

  const { voucherId, extrinsic } = await api.voucher.issue(account, amountForVoucher, validForOneHour, programs, true);

  return new Promise((resolve, reject) => {
    extrinsic.signAndSend(KEYRING, ({events, status, isError}) => {
      if (status.isInBlock) {
        const voucherIssuedEvent = events.filter(({ event: { method } }) => method === 'VoucherIssued');
        if (voucherIssuedEvent.length > 0) {
          resolve(voucherId)
        }
      } else if (isError) {
        const error = new Error(`Failed to create voucher`);
        reject(error);
      }
    })
  })
};

app.post("/", async (req: Request, res: Response) => {
  try {
    const accountUser = req.body.account as HexString;

    const voucherId = await createVoucher(accountUser);

    if (voucherId) {
      res.send(voucherId);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/", async (req: Request, res: Response) => {
  try {
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
