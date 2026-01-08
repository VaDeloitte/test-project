export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are Genie, a large language model trained by Deloitte. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://tgnpdoaiuks.openai.azure.com';

export const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || 'a8d0a2bcde96415ea589a9a26eda7842';

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '1',
);
export const CLAUDE_SONNET_HOST = process.env.CLAUDE_SONNET_HOST || 'https://podem-mggstpl9-swedencentral.cognitiveservices.azure.com';

export const CLAUDE_SONNET_API_KEY = process.env.CLAUDE_SONNET_API_KEY || 'B4ZAGAG5u94xXd7Pdme6sa6PxfHkbh5ooaN9dZX5RMbICxISoDYJJQQJ99BJACfhMk5XJ3w3AAAAACOGyVqg';

export const CLAUDE_SONNET_API_VERSION = process.env.CLAUDE_SONNET_API_VERSION || '2024-12-01-preview';

export const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export const ALJAIS_API_HOST = process.env.ALJAIS_API_HOST || 'https://laxprasad-0572-resource.services.ai.azure.com';

export const ALJAIS_API_KEY = process.env.ALJAIS_API_KEY || '6e71vJO1qqWJeEigMnas4uJXrD1aVGk2h10V1lzTK9h8t49BkMAtJQQJ99BIACmepeSXJ3w3AAAAACOGVI6j';

export const ALJAIS_API_VERSION = process.env.ALJAIS_API_VERSION || '2024-05-01-preview';

export const AZURE_UPDATE_PROMOPTS = process.env.AZURE_UPDATE_PROMOPTS || " http://localhost:7071/api/rag_entrypoint";

export const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL || " http://localhost:7071";

export const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'rgtaxgenienonprodfa';

export const AZURE_BLOB_BASE_URL = process.env.AZURE_BLOB_BASE_URL || 
  `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/temp-data-sources`;

export const OPENAI_API_TYPE = process.env.OPENAI_API_TYPE || 'azure';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2024-12-01-preview';

export const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID = process.env.AZURE_DEPLOYMENT_ID || '';

export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cosmosdb:taxgenie!122!33@mdbtaxgenienonproduks.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000';

export const DB_NAME = process.env.DB_NAME || 'taxgeniedb-nonprod';

export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'vbWziIgU/51KnXoSByTVgpA2MpoZixWXnWCmWAzcT8Q=';

export const EMAIL_SERVER_HOST = process.env.EMAIL_SERVER_HOST;
export const EMAIL_SERVER_PORT = process.env.EMAIL_SERVER_PORT;
export const EMAIL_SERVER_USER = process.env.EMAIL_SERVER_USER;
export const EMAIL_SERVER_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;
export const EMAIL_FROM = process.env.EMAIL_FROM;
export const APPINSIGHTS_CONNECTIONSTRING = process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTIONSTRING || 'InstrumentationKey=d5b861d5-0710-442c-9e29-9c7909cb83fe;IngestionEndpoint=https://uksouth-1.in.applicationinsights.azure.com/;LiveEndpoint=https://uksouth.livediagnostics.monitor.azure.com/;ApplicationId=91cd84fb-296d-471b-859b-5190510eb11f';
export const APPINSIGHTS_INSTRUMENTATIONKEY = 'd5b861d5-0710-442c-9e29-9c7909cb83fe';

//WEBAPP-TAXGENIE-PROD-UKSOUTH-001
export const APP_INSIGHTS_APP_ID_PROD = process.env.APP_INSIGHTS_APP_ID_PROD || "ab4cef67-bd36-457f-b1cf-0c5aa5ca987d";
export const APP_INSIGHTS_API_KEY_PROD = process.env.APP_INSIGHTS_API_KEY_PROD || "jmlpc8ngkdkyzvs2kqfg1e53papmquv1keg5yk2k";

export const AZURE_ADMIN_GROUP_ID = process.env.NEXT_PUBLIC_AZURE_ADMIN_GROUP_ID || '5aa48f0e-fff3-4cef-89ee-446956ddc2ce';
export const AZURE_GRAPH_MEMBEROF_URL = process.env.NEXT_PUBLIC_AZURE_GRAPH_MEMBEROF_URL || 'https://graph.microsoft.com/v1.0/me/memberOf';


export const EDUCATION = 'https://resources.deloitte.com/sites/global/Services/ai/aiacademy/Pages/AI_Academy_Library.aspx';
export const DELOITTE_AI_INSTITUTE = 'https://www2.deloitte.com/xe/en/pages/strategy-operations/articles/ai-institute.html';
export const GEN_AI_LAMP = 'https://resources.deloitte.com/sites/dme/services/tax/Pages/genie.aspx';
export const API_TOKEN_EXPIRY = '86400';
export const INACTIVITY_TIME = 1200000;