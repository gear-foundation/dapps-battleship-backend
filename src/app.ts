import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HexString } from '@polkadot/util/types';

import { Accounts } from './entity/Account';
import { AppDataSource } from './data-source';
import { checkAndUpdateVoucher, createVoucher } from './create-voucher';

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

app.post('/', async (req: Request, res: Response) => {
  try {
    const accountUser = req.body.account as HexString;

    const accountRepo = AppDataSource.getRepository(Accounts);
    let account = await accountRepo.findOne({ where: { account: accountUser } });

    if (!account) {
      const result = await createVoucher(accountUser);

      if (result) {
        account = accountRepo.create({
          account: accountUser,
          programId: result.programId,
          voucherId: result.voucherId,
          validForOneHour: result.validForOneHour,
        });

        await accountRepo.save(account);
      }
    }

    if (account) {
      const voucherId = (await checkAndUpdateVoucher({
        accountUser: account.account,
        voucherId: account.voucherId,
      })) as any;

      res.status(200).send(voucherId);
    }
  } catch (error: any) {
    console.error('Error during voucher creation:', error);
    res.status(500).send({ message: error.message || 'Internal Server Error' });
  }
});

app.get('/', async (req: Request, res: Response) => {
  try {
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

AppDataSource.initialize()
  .then(() => {
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error during Data Source initialization:', error);
  });
