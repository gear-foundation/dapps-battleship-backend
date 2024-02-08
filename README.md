## Available requests

#### POST /api/voucher/request
**body:**
```json
{
   "account": "kGkLEU3e3XXkJp2WK4eNpVmSab5xUNL9QtmLPh8QfCL2EgotW",
   "program": "0x55842b7263766b22c2144dafeb1c2aed256209df2f4b4b98e60583637fc387ca"
}
```

## Running server
### Prerequisites
1. Setup postgres database.
2. Check out the `.env.example` file to find out the required environment variables.
3. Install dependencies and build the project
```bash
yarn install
yarn build
```

### Run server
```bash
yarn start
```


