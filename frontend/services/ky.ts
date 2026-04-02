import ky from "ky";
import { BASE_URL } from "./BASE_URL";

const token = "";

export const kyInstance = ky.create({
  prefixUrl: BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          // handle refresh token logic here
        }
      },
    ],
  },
});
