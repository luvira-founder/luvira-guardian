import ky from "ky";
import { getAccessToken } from "@auth0/nextjs-auth0/client";
import { BASE_URL } from "./BASE_URL";

export const kyInstance = ky.create({
  prefixUrl: BASE_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await getAccessToken();
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
