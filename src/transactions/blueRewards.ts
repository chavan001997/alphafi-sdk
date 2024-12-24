import { Decimal } from "decimal.js";
import {
  getConf,
  poolInfo,
  coinsList,
  PoolName,
  cetusPoolMap,
} from "../index.js";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
export interface ClaimRewardResponse {
  txb: Transaction;
  coinOut: TransactionResult;
}
export async function claimBlueRewardTxb(
  userAddress: string,
  poolName: PoolName,
): Promise<ClaimRewardResponse | undefined> {
  const { getReceipts } = await import("../index.js");
  try {
    const receipts = await getReceipts(poolName, userAddress, false);
    const txb = new Transaction();
    const pool = poolInfo[poolName];
    let blueBalance;
    if (poolName === "BLUEFIN-AUTOBALANCE-USDT-USDC") {
      blueBalance = txb.moveCall({
        target: `${poolInfo[poolName].packageId}::alphafi_bluefin_type_1_pool::get_user_rewards`,
        typeArguments: [
          coinsList["USDT"].type,
          coinsList["USDC"].type,
          coinsList["BLUE"].type,
          coinsList["SUI"].type,
        ],
        arguments: [
          txb.object(receipts[0].objectId),
          txb.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          txb.object(pool.poolId),
          txb.object(pool.investorId),
          txb.object(getConf().ALPHA_DISTRIBUTOR),
          txb.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          txb.object(getConf().BLUEFIN_USDT_USDC_POOL),
          txb.object(getConf().BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND),
          txb.object(cetusPoolMap["USDC-USDT"]),
          txb.object(cetusPoolMap["USDC-SUI"]),
          txb.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    const blueCoin = txb.moveCall({
      target: "0x2::coin::from_balance",
      typeArguments: [coinsList["BLUE"].type],
      arguments: [blueBalance!],
    });
    return { txb: txb, coinOut: blueCoin };
  } catch (e) {
    console.error("error in claim blue rewards", e);
  }
}

export async function pendingBlueRewardAmount(
  userAddress: string,
  poolName: PoolName,
): Promise<string> {
  const { getReceipts } = await import("../index.js");
  try {
    const receipts = await getReceipts(poolName, userAddress, false);
    const userPendingRewardsAll =
      receipts[0].content.fields.pending_rewards.fields.contents;

    for (let i = 0; i < userPendingRewardsAll.length; i++) {
      if (
        userPendingRewardsAll[i].fields.key.fields.name ==
        coinsList["BLUE"].type.substring(2)
      ) {
        return new Decimal(userPendingRewardsAll[i].fields.value)
          .div(Math.pow(10, coinsList["BLUE"].expo))
          .toString();
      }
    }
    return "0";
  } catch (e) {
    console.error("error in calculate pending blue rewards", e);
    return "0";
  }
}
