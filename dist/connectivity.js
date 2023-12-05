"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConnectivity = void 0;
const axios_1 = __importDefault(require("axios"));
const xsenv = __importStar(require("@sap/xsenv"));
const tokenCache = __importStar(require("./tokenCache"));
var tokens = {};
async function readConnectivity(locationId, principalToken, principalPropagation = true, subscribedDomain) {
    const connectivityService = getService();
    const access_token = await createToken(connectivityService, principalToken, subscribedDomain);
    const proxy = {
        host: connectivityService.onpremise_proxy_host,
        port: parseInt(connectivityService.onpremise_proxy_port, 10),
        protocol: 'http'
    };
    const headers = !principalToken && principalPropagation ?
        // technical user = client ID from connectivity service.
        {
            'SAP-Connectivity-Technical-Authentication': `Bearer ${access_token}`
        } : {
        "Proxy-Authorization": `Bearer ${access_token}`
    };
    const result = {
        proxy,
        headers,
        access_token,
        onpremise_proxy_host: connectivityService.onpremise_proxy_host,
        onpremise_proxy_port: parseInt(connectivityService.onpremise_proxy_port, 10),
        onpremise_proxy_http_port: parseInt(connectivityService.onpremise_proxy_http_port, 10),
        onpremise_proxy_ldap_port: parseInt(connectivityService.onpremise_proxy_ldap_port, 10),
        onpremise_socks5_proxy_port: parseInt(connectivityService.onpremise_socks5_proxy_port, 10),
        onpremise_proxy_rfc_port: parseInt(connectivityService.onpremise_proxy_rfc_port, 10)
    };
    if (locationId) {
        result.headers["SAP-Connectivity-SCC-Location_ID"] = locationId;
    }
    return result;
}
exports.readConnectivity = readConnectivity;
async function createToken(service, principalToken, subscribedDomain) {
    const cacheKey = `${service.clientid}__${principalToken}`;
    const cachedToken = tokenCache.getToken(cacheKey);
    if (cachedToken) {
        return cachedToken.access_token;
    }
    const tokenPromise = await tokenCache.setToken(cacheKey, principalToken ? getPrincipalToken(service, principalToken, subscribedDomain) : getConnectivityToken(service, subscribedDomain));
    return tokenPromise ? tokenPromise.access_token : "";
}
;
function getService() {
    const { connectivity } = xsenv.getServices({
        connectivity: {
            tag: 'connectivity'
        }
    });
    if (!connectivity) {
        throw ('No connectivity service available');
    }
    return connectivity;
}
async function getConnectivityToken(service, subscribedDomain) {
    const token = (await (0, axios_1.default)({
        url: subscribedDomain ? `https://${subscribedDomain}.${service.uaadomain}/oauth/token` : `${service.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(service.clientid)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: service.clientid,
            password: service.clientsecret
        }
    })).data;
    return token;
}
async function getPrincipalToken(service, principalToken, subscribedDomain) {
    const refreshToken = (await (0, axios_1.default)({
        url: subscribedDomain ? `https://${subscribedDomain}.${service.uaadomain}/oauth/token` : `${service.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        params: {
            grant_type: 'user_token',
            response_type: 'token',
            client_id: service.clientid
        },
        headers: {
            'Accept': 'application/json',
            'Authorization': principalToken
        },
    })).data.refresh_token;
    const token = (await (0, axios_1.default)({
        url: subscribedDomain ? `https://${subscribedDomain}.${service.uaadomain}/oauth/token` : `${service.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        params: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        },
        headers: {
            'Accept': 'application/json'
        },
        auth: {
            username: service.clientid,
            password: service.clientsecret
        }
    })).data;
    return token;
}
