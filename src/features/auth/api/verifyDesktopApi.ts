import axios from "axios";

const BASE_URL = "http://localhost:28080/api/v1";

export const verifyDesktopApi = async (clientInfo: {
  deviceId: string;
  username: string;
  computerName: string;
  os: string;
}) => {
  const response = await axios.post(`${BASE_URL}/auth/desktop/verify`, clientInfo, {
    timeout: 10000,
  });
  return response.data;
};