import { HexString, decodeAddress } from '@gear-js/api';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { VoucherService } from './voucher.service';
import config from './config';
import { logger } from './logger';

const app = express();

export class Server {
  private _app: Express;

  constructor(private _voucherService: VoucherService) {
    this._app = express();
    this._app.use(express.json());
    this._app.use(cors());
    this._app.use((req, res, next) => {
      let id = Math.random().toString(36).substring(7);
      logger.info('POST ' + req.path, { id, body: req.body });
      res.once('finish', () => {
        logger.info('POST ' + req.path + ' response', { id, status: res.statusCode });
      });
      return next();
    });
    this._app.post('/api/voucher/request', this.requestVoucher.bind(this));
  }

  async requestVoucher(req: Request, res: Response) {
    if (!req.body.account || !req.body.program) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    let address: HexString;
    try {
      address = decodeAddress(req.body.account);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid account address' });
    }

    const program = req.body.program;

    if (!config.voucher.availablePrograms.has(program)) {
      return res.status(400);
    }

    const voucher = await this._voucherService.getVoucher(address, program);

    const { duration, amount } = config.voucher.availablePrograms.get(program)!;

    if (!voucher) {
      try {
        const voucherId = await this._voucherService.issue(address, program, amount, duration);
        return res.json({ voucherId });
      } catch (error) {
        logger.error('Failed to issue voucher', { error: error.message });
        return res.status(500).json({ error: error.message });
      }
    }

    try {
      if (voucher.programs.includes(program)) {
        await this._voucherService.update(voucher, amount, duration);
      } else {
        await this._voucherService.update(voucher, amount, duration, [program]);
      }
      return res.json({ voucherId: voucher.voucherId });
    } catch (error) {
      logger.error('Failed to update voucher', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
  }

  run() {
    this._app.listen(3000, () => {
      logger.info('Server is running on port 3000');
    });
  }
}
