import axios, { AxiosPromise, AxiosProxyConfig } from 'axios';
import * as xsenv from '@sap/xsenv';
import * as tokenCache from './tokenCache';

var tokens = {};

export interface IConnectivityConfig {
    proxy: AxiosProxyConfig,
    headers: {
        'Proxy-Authorization'?: string;
        'SAP-Connectivity-Technical-Authentication'?: string;
        'SAP-Connectivity-SCC-Location_ID'?: string;
    },

    onpremise_proxy_host?: string;
    onpremise_proxy_port?: number;
    onpremise_proxy_http_port?: number,
    access_token?: string,
    onpremise_proxy_ldap_port?: number,
    onpremise_socks5_proxy_port?: number,
    onpremise_proxy_rfc_port?: number
}

interface IConnectivityService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;

    onpremise_proxy_host: string;
    onpremise_proxy_port: string;
    onpremise_proxy_ldap_port: string;
    onpremise_proxy_rfc_port: string;
    onpremise_socks5_proxy_port: string;
    onpremise_proxy_http_port: string;
}

export async function readConnectivity(locationId?: string, principalToken?: string, principalPropagation: boolean = true) {
    const connectivityService = getService();
    const access_token = await createToken(connectivityService, principalToken);
    const proxy: AxiosProxyConfig = {
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

    const result: IConnectivityConfig = {
        proxy,
        headers,
        access_token,
        onpremise_proxy_host: connectivityService.onpremise_proxy_host,
        onpremise_proxy_port: parseInt(connectivityService.onpremise_proxy_port, 10),
        onpremise_proxy_http_port: parseInt(connectivityService.onpremise_proxy_http_port, 10),
        onpremise_proxy_ldap_port: parseInt(connectivityService.onpremise_proxy_ldap_port, 10),
        onpremise_socks5_proxy_port: parseInt(connectivityService.onpremise_socks5_proxy_port, 10),
        onpremise_proxy_rfc_port: parseInt(connectivityService.onpremise_proxy_rfc_port, 10)

    }

    if (locationId) {
        result.headers["SAP-Connectivity-SCC-Location_ID"] = locationId;
    }

    return result;

}

async function createToken(service: IConnectivityService, principalToken?: string): Promise<string> {

    const cacheKey = `${service.clientid}__${principalToken}`;
    const cachedToken = tokenCache.getToken(cacheKey);

    if (cachedToken) {
        return cachedToken.access_token;
    }

    const tokenPromise = await tokenCache.setToken(cacheKey, principalToken ? getPrincipalToken(service, principalToken) : getConnectivityToken(service));
    return tokenPromise ? tokenPromise.access_token : "";
};

function getService(): IConnectivityService {
    const { connectivity } = xsenv.getServices({
        connectivity: {
            tag: 'connectivity'
        }
    });

    if (!connectivity) {
        throw ('No connectivity service available');
    }

    return <IConnectivityService>connectivity;
}

async function getConnectivityToken(service: IConnectivityService) {
    const token: tokenCache.IOauthToken = (await axios({
        url: `${service.url}/oauth/token`,
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

async function getPrincipalToken(service: IConnectivityService, principalToken: string) {

    const refreshToken = (await axios({
        url: `${service.url}/oauth/token`,
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
    const token: tokenCache.IOauthToken = (await axios({
        url: `${service.url}/oauth/token`,
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

