import axios from "axios";
import { BASE_URL } from "../constants";
import { ChainId, TokenAddress } from "../types";

export const getAxiosConfig = () => {
  return {
    url: BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `${process.env.NEXT_DEFINED_API}`,
    },
  };
}

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
      resolution: "30"
      quoteToken: token1
    ) {
      c
      h
      l
      o
      s
      t
      v
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
    return result.data.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export default getBars;