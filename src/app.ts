import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import {
  GearApi,
  GearKeyring,
  decodeAddress,
  VoucherIssuedData,
} from "@gear-js/api";
import { HexString } from "@polkadot/util/types";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

const NODE_ADDRESS = process.env.NODE_ADDRESS;
const GAME_ADDRESS = process.env.GAME_ADDRESS;
const KEYRING_PATH = process.env.PATH_TO_KEYS || "";
const KEYRING_PASSPHRASE = process.env.KEYRING_PASSPHRASE;

const jsonKeyring = readFileSync(KEYRING_PATH).toString();
const KEYRING = GearKeyring.fromJson(jsonKeyring, KEYRING_PASSPHRASE);

const createVoucher = async () => {
  const api = await GearApi.create({
    providerAddress: NODE_ADDRESS,
  });

  const programId = GAME_ADDRESS as HexString;
  const account = decodeAddress(KEYRING.address);

  const tx = api.voucher.issue(account, programId, 10000);

  const extrinsic = tx.extrinsic;
  const voucherExists = await api.voucher.exists(programId, account);

  if (voucherExists) {
    return true;
  }

  return new Promise((resolve, reject) => {
    try {
      extrinsic.signAndSend(KEYRING, ({ events, status }) => {
        if (status.isInBlock) {
          const viEvent = events.find(
            ({ event }) => event.method === "VoucherIssued"
          );
          const data = viEvent?.event.data as VoucherIssuedData;

          if (data) {
            resolve(true);
          }
        }
      });
    } catch (err) {
      console.log(err);
      new Error("Error during sending transaction");
    }
  });
};

app.get("/", async (req: Request, res: Response) => {
  try {
    const isVoucher = await createVoucher();
    res.send(isVoucher);
  } catch (error) {
    res.status(500);
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
