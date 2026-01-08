const axios = require('axios');
const qs = require('qs');
let data = qs.stringify({
  'grant_type': 'client_credentials',
  'client_id': 'bac1286c-01a3-43b2-a19a-f7612ef2dfbf',
  'client_secret': 'VAf8Q~0I~ub3Ppg44T9GaOU1cNglr7MwNzeH0cqn',
  'scope': 'https://vault.azure.net/.default' 
});
let config = 
{
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://login.microsoftonline.com/36da45f1-dd2c-4d1f-af13-5abe46b99921/oauth2/v2.0/token',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded', 
      'Cookie': 'fpc=AtgzbR9sBk1Fod660XWA7fgEk2gMAQAAAG6H1twOAAAA; stsservicecookie=estsfd; x-ms-gateway-slice=estsfd'
    },
    data : data
  };

  async function getApiKey() {
    try {
      const response = await axios.post(config.url, config.data, config.headers);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  export default getApiKey
