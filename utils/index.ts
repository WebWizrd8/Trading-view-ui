import { BASE_URL } from "../constants";

export const getAxiosConfig = () => {
  return {
    url: BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `${process.env.NEXT_DEFINED_API}`,
    },
  };
}