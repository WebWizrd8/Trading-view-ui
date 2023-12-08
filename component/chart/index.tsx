'use client'

import axios from "axios";
import { ChainId, TokenAddress } from "../../types";
import { getAxiosConfig } from "../../utils";
import { BASE_URL } from "../../constants";
import { useEffect } from "react";

interface ChartComponentProps {

}

const ChartComponent: React.FC<ChartComponentProps> = () => {
  const getBars = async (chainId: ChainId, tokenAddress: TokenAddress) => {
    const currentDate = new Date();

    // Get the timestamp for today (midnight) in seconds
    const todayTimestamp = Math.floor(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      ).getTime() / 1000
    );

    // Get the timestamp for yesterday (midnight) in seconds
    const yesterday = new Date();
    yesterday.setDate(currentDate.getDate() - 1);
    const yesterdayTimestamp = Math.floor(
      new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      ).getTime() / 1000
    );
    const query = `
    {
      getBars(
        symbol: "${tokenAddress}:${chainId}"
        from: ${yesterdayTimestamp}
        to: ${todayTimestamp}
        resolution: "1"
        quoteToken: token1
      ) {
        o
        h
        l
        c
        v
        volume
        s
      }
    }
    `
    const config = {
      url: BASE_URL,
      method: "post",
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.NEXT_PUBLIC_DEFINED_API,
      },
      data: JSON.stringify({ query }),
    }

    try {
      const result = await axios(config);
      return result.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
  // const result = getBars(ChainId.ETH, TokenAddress.ETH);
  // console.log(result, 'chart result:');
  useEffect(() => {
    const result = getBars(ChainId.ETH, TokenAddress.ETH);
    console.log(result, 'result: ');
  }, [])
  return <div>This is Chart</div>
}

export default ChartComponent;